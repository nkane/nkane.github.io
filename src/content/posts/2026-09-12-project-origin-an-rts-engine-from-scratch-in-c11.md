---
title: "Project Origin: An RTS Engine From Scratch in C11"
pubDate: 2026-09-12
tags: ["engineering", "game-engine", "rts", "c", "vulkan", "metal", "determinism"]
---

# Why an engine, and why C

The last two projects on this blog were emulators in Go — chippy's 6502 core and nessy, the NES built on
top of it. Emulators are a specific kind of fun: the hardware is the spec, and the job is to converge on it.
**Project Origin** is the opposite kind of fun. There is no spec. It's a cross-platform 3D game engine
written from scratch in pure C11, built to run a top-down real-time strategy game — hundreds of units on
screen, selection, pathfinding, fog of war — on Windows, macOS, and Linux.

The stated goal, straight out of `docs/DESIGN.md`: **learning how engines work**. Build the core systems —
arenas, math, handle pools, a GPU abstraction, an entity store — from scratch, and use third-party libraries
only where they don't rob the lesson. That single sentence decided the language. Go was the right tool for
the emulators: garbage collection and goroutines cost nothing when your hot loop is interpreting 6502
opcodes. But an engine project where the *point* is explicit memory ownership, cache-aware data layout, and
talking to Vulkan and Metal directly is a project where a GC and a runtime are exactly the lessons you'd be
skipping. So: C11. Structs and functions. No C++, no STL, no RAII, no hidden anything.

Everything in this post is recorded as an Architecture Decision Record in the repo — ADRs 0001 through 0023
at the time of writing. Honesty note from the git log: the engine's first commit is a monster ("Origin
Engine: Phases 0-7 — C11 RTS engine with Vulkan + Metal backends"), and the ADRs were written *after* most
of that work landed, as a deliberate pass to write down what had been decided implicitly and why. This post
walks the foundational ones — the language, the layers, the memory model, the entity store, the graphics
seam, and the determinism machinery that everything else was built to enable.

## Pure C11, with the compiler as the safety net (ADR 0001)

The whole engine compiles as `clang -std=c11` with `-Wall -Wextra -Werror` — warnings are errors, no
exceptions for our own code. Debug builds add ASan and UBSan (`-fsanitize=address,undefined
-fno-omit-frame-pointer` at `-O0 -g`); release is `-O2 -DNDEBUG`. C hands you responsibility for undefined
behavior and memory bugs, so the sanitizers carry the weight C++'s type system would.

There is exactly one non-C file in the tree: `src/gfx/mtl_backend.m`, the Metal backend, compiled separately
as Objective-C with ARC and hidden behind a C interface (more on that seam below). Third-party single-header
libs (stb, cgltf) compile without `-Werror` so vendor warnings never gate the build.

No generics means hand-rolling containers, which is the point. All shared primitives come from a single
`src/types.h`: fixed-width aliases (`u8`..`u64`, `i8`..`i64`, `f32`, `f64`, `usize`) plus `ORIGIN_KB/MB/GB`
size macros. The alternatives got real consideration in the ADR — C++ contradicts the from-scratch goal and
invites hidden allocations; Rust's borrow checker would abstract away exactly the manual memory management
the project exists to learn; C17/C23 add nothing this codebase needs over C11's compound literals and
designated initializers.

## Layers that only point down (ADR 0002)

C's flat `#include` model makes it trivial to accidentally couple your Vulkan backend to your game rules. The
defense is a strict layer ordering where every include points at the same layer or a lower one:

```
game          RTS rules, units, world
renderer      camera, picking, terrain mesh
gfx           GPU-agnostic frontend + backend vtable
core          arenas, math, pools, strings, rng, log
platform      window, input, timing (SDL3 behind plat_*)
types.h       fixed-width vocabulary, beneath everything
```

`assets` and `ui` sit above `gfx`/`core`; `src/main.c` is the only file allowed to include across every
layer at once, because its job is wiring them into the frame loop. The invariant that matters most: `core/`
and `platform/` contain *zero* includes of `gfx`, `renderer`, `game`, `ui`, or `assets` — verified by
grepping, not yet by a build gate. The payoff shows up twice later in this post: the GFX backends stay
swappable because no backend type can leak upward, and the deterministic simulation stays trustworthy
because `game/` physically cannot reach sideways into render state.

## Arenas and handles instead of malloc (ADR 0003)

Memory in a game has a small number of lifetimes, and they're known up front: some data lives for the whole
program, some for a level, some for one frame. So the default allocator is an arena — a bump allocator in
`src/core/arena.c`. `arena_create` grabs one zeroed block from the OS; `arena_alloc` bumps a `used` pointer
forward (16-byte aligned, zeroed); there is no per-object free at all. `arena_reset` drops everything at
once. The engine runs three of them by lifetime — permanent, level, frame — plus `arena_temp_begin`/`_end`
for scoped scratch. The concrete sizes in `main.c` today: a 48 MB game arena, 64 MB and 24 MB arenas for the
tooling paths. The house rule is **no hidden allocations**: anything that allocates takes an arena argument,
so ownership and cost are visible at every call site.

Long-lived objects that come and go individually — GPU buffers, textures, pipelines — get the second
primitive: a generic handle pool (`src/core/pool.c`). A `pool_handle` packs `[gen:12][index:20]` into a
`u32`; releasing a slot bumps its generation, so every stale handle to that slot resolves to `NULL` instead
of silently aliasing whatever got the slot next. Use-after-free becomes a detectable, logged event rather
than corruption. Generations start at 1 so `id == 0` is the reserved `POOL_NULL`. The trade is honest: a
12-bit generation wraps after ~4095 reuses of one slot, and capacities are fixed up front — but fixed
capacities are a feature in an engine that wants predictable memory.

## Entities as struct-of-arrays (ADR 0004)

The `world` simulates up to `WORLD_MAX_UNITS` (4096) units at a fixed tick, and every tick sweeps the whole
population several times: steering, combat acquisition, neighbor separation, terrain placement. Each pass
touches the same few fields of *every* unit — `pos`, `mode`, `hp`, `team` — not every field of one unit.
That access pattern picks the layout for you: units are stored as parallel packed arrays in the `world`
struct (`pos[]`, `target[]`, `mode[]`, `hp[]`, `team[]`, `cooldown[]`, waypoints, and so on), each allocated
once from the permanent arena in `world_init`, indexed by a dense id in `[0, count)`.

Spawn appends at `count++`. Despawn is swap-remove: copy the last unit into the freed slot across every
parallel array, decrement `count`. O(1), no gaps, no free lists — every system iterates a tight `[0, count)`
loop. The cost is that entity indices aren't stable across a despawn; combat sidesteps it by re-acquiring
targets each tick and culling the dead after the main loop. If stable references are ever needed, the ADR's
answer is a generational-handle indirection over the dense store — the same trick the pool already uses —
but not before a feature actually demands it.

There's a quieter reason for this layout too, and it's the theme of the back half of this post: contiguous,
allocator-independent state is trivially *checksummable*.

## One GPU API, two backends (ADRs 0005, 0006)

The rendering layer is the stated core learning artifact, so it's the one system the project most refuses to
outsource. macOS forced the portability question early: Apple froze OpenGL at 4.1 and deprecated it, so the
native APIs in play are Vulkan (Windows/Linux, and macOS via MoltenVK translation) and Metal.

The answer is a thin facade. Game code sees only `src/gfx/gfx.h` — a flat set of `gfx_*` calls over plain
data structs (`gfx_instance`, `gfx_vertex`) with compile-time budgets like `GFX_MAX_INSTANCES`. Under it,
`gfx.c` is pure dispatch through a single vtable — `gfx_backend_api`, a struct of function pointers (`init`,
`draw_frame`, `set_ground_mesh`, `update_fog`, ...) that each backend fills in and hands back from
`gfx_vk_get_api()` or `gfx_mtl_get_api()`. The abstraction cost is one indirect call per API invocation, not
per draw. This is the one place in the engine that earns vtable indirection; everywhere else, control flow
stays direct and readable.

**Vulkan first, Metal second.** Vulkan is the harder, more explicit API — the one that exposes real GPU
mechanics: instance and validation layers, swapchain, staged uploads through host-visible buffers, explicit
descriptors, frames-in-flight sync. And via MoltenVK it reaches all three platforms before a line of Metal
exists. Metal (`mtl_backend.m`) came second, and its real job is to *prove the abstraction* — the same game,
the same shared geometry, driven through a differently-shaped API with zero changes above `gfx.h`.

Two backends means one canonical clip-space convention, and the two APIs disagree: Vulkan's NDC is y-down,
Metal's is y-up. The engine commits to **y-up NDC with `[0,1]` depth**; the camera produces one
backend-agnostic view-projection matrix, Metal uploads it unmodified, and the Vulkan backend adapts by
rendering every pipeline through a negative-height viewport. The ADR is candid that this is a subtle
invariant — any Vulkan pipeline that forgets it renders vertically flipped, and the bug is silent.

## SDL3 at the bottom, behind plat_* (ADR 0007)

Hand-rolling Win32/Cocoa/X11 windowing is a plausible future exercise, but it's weeks of OS glue orthogonal
to the actual learning target. So the platform layer is SDL3 — but confined. The public header
`platform/platform.h` exposes only opaque and plain types (`plat_window` is forward-declared; the
`SDL_Window*` lives privately in `platform_sdl3.c`), and no SDL, Vulkan, or Metal type crosses it: Vulkan
surface creation and the macOS `CAMetalLayer` pass through as `void*`. Swapping in a hand-rolled backend
later means reimplementing one `.c` file against the same header.

The input model matters more than it looks: events are polled exactly once per frame in `plat_poll_events`,
exposed as held state plus per-frame pressed/released edges. One well-defined sampling point keeps OS
nondeterminism at the boundary — which is the setup for everything that follows.

## The determinism spine (ADRs 0008–0011)

If there's one decision that defines this engine, it's this cluster. The simulation is **deterministic by
construction**: the same seed plus the same inputs produces bit-identical world state, on every platform,
every run. Four ADRs build that up.

**Fixed-tick sim, decoupled from render time (0008).** The sim advances only in fixed `SIM_DT` steps —
`1/SIM_HZ` at 60 Hz — driven by a wall-clock accumulator in `main.c`: measure elapsed time, clamp to 0.25 s
to dodge the spiral of death, scale by pause/speed, then step `world_tick` while a full `SIM_DT` is owed,
capped at `MAX_STEPS` (8) per frame. Inside `world_tick`, time is *derived from the tick count* — `t =
tick * SIM_DT` — and the sim never reads the wall clock, the cursor, or frame delta. Pause and the 0.5x–4x
speed control only change how fast the accumulator fills; they change what the game *feels* like, never what
it computes.

**A tick-stamped command stream is the only way in (0009).** Player intent — box select, right-click move,
Ctrl+attack-move, control groups — never mutates the world at the moment the OS event fires. It becomes a
`sim_command` (a flat POD: tick, type, flag, four `f32` payload fields) pushed into a fixed `cmd_queue` of
`CMD_QUEUE_MAX` (16384) entries, stamped for the next tick. `cmd_apply_tick` drains due commands immediately
before each `world_tick`, so the world can only change inside one switch statement. Even selection is a
command — a move order only makes sense against the current selection, so selection has to be reconstructed
in the same order on replay. Camera movement, minimap panning, and editor edits deliberately stay *outside*
the stream: presentation and dev tooling, not sim state.

**Replays and checksums prove it (0010).** "Deterministic by construction" decays silently — one unseeded
read or one new field left out of the hash, and it's gone. So the engine continuously verifies it.
`world_checksum` folds an FNV-1a hash over the entire live sim state — tick, unit count, RNG, and every
per-unit field including raw `f32` bits. `--record` samples `{tick, checksum}` every `REPLAY_CHECK_EVERY`
(30) ticks — about every half second — and writes seed, level path, the full command queue, and the check
array to a little-endian replay file. `--replay` re-seeds a fresh world, re-feeds the commands, and compares
checksums tick-for-tick; on mismatch it logs `replay DIVERGED at tick N` and stops. `--headless` runs the
same verification with no window, no GPU, and no `plat_init`, returning exit code 0 on a verified replay and
2 on divergence — which is exactly the shape CI wants.

**Seeded PCG32, never libc rand (0011).** libc `rand()` is implementation-defined — the same seed yields
different sequences on the three target platforms — and its hidden global state can't be checksummed. The
sim's sole randomness source is a PCG32 generator in `src/core/rng.h`: a 16-byte struct (`u64 state`, odd
`u64 inc` stream selector), all operations `static inline`, `rng_below` rejection-sampling to kill modulo
bias. The `world` owns its `rng` and seeds it in `world_init`, and because the generator's whole state lives
inside the world, it's hashed by `world_checksum` — two runs that agree on the hash have advanced the RNG
identically. The whole algorithm is ~40 lines of readable C, which is the learning goal in miniature.

## The payoff: lockstep multiplayer (ADR 0018)

Here's why all of that discipline was worth it. Multiplayer for an RTS has one dominant constraint:
bandwidth must not scale with unit count. Snapshotting hundreds of units many times a second — the
FPS/Source model — is the wrong scale. The classic RTS answer is **deterministic lockstep**: every client
runs the identical sim, only commands cross the wire, and game state never does. Age of Empires, StarCraft,
Supreme Commander.

The networking research doc puts it in one line: a replay file is already *a recorded lockstep match of one
player*. Multiplayer is the same thing with the commands exchanged live instead of read from disk. The four
hard pieces lockstep needs — a fixed-tick deterministic sim, serializable tick-stamped commands, desync
detection via checksums, and a headless mode — all existed before a single line of netcode did.

The architecture: lockstep relayed through a headless server, with the transport behind a thin `net_*` API
(the same hide-the-backend move as `plat_*` and `gfx_*`). Local commands are scheduled for `tick + D` (an
input delay of roughly 100–200 ms of ticks); the relay orders and broadcasts each peer's commands; a client
only advances tick N once every peer's tick-N commands have arrived. Remote commands feed the *same*
`cmd_queue` and `cmd_apply_tick` path as local ones — the apply-by-tick contract is the seam that makes
local and remote input interchangeable. Clients periodically send their `world_checksum` to the server,
which acts as authoritative auditor and halts the match at the diverging tick on any mismatch.

The failure mode is brutal and clarifying: in lockstep, a one-bit divergence anywhere silently drifts the
games apart, which promotes the checksum tripwire from nice-to-have to load-bearing. It also surfaces the
genuinely hard residual problem — cross-architecture float determinism — and the git log shows that fight
happening for real: transport bootstrapped over raw TCP, then Valve's GameNetworkingSockets for encrypted
UDP with NAT traversal, pinned float-determinism flags, a transcendental removed from the checksummed sim
path for x86/ARM agreement, and reconnect/late-join implemented as a fast headless replay of the command log
from tick 0. Those milestones deserve their own post.

## What this post didn't cover

Everything above is the foundation layer — the decisions that everything else stands on. The engine on top
of it is a playable RTS-lite today: tile-map terrain with elevation and ramps, A* plus flow-field
pathfinding, shadowcasting fog of war, an immediate-mode UI, a live in-game level editor, an asset pipeline
with hot reload, and the rendering work in both backends. Those are ADRs 0012 onward, and they're the
subject of the next post in this series. The multiplayer milestones — TCP relay to GameNetworkingSockets,
checksum authority, late-join catch-up — are a third.

For now, the shape of the thing is what I wanted on record: a C11 engine where every allocation has a
visible owner, every layer points down, every backend hides behind a vtable, and the entire simulation is a
pure function of a seed and a command stream. The emulators taught me to converge on someone else's spec.
This project is about writing one.
