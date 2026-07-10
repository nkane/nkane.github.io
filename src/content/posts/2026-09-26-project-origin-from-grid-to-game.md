---
title: "Project Origin: From Tile Grid to Something That Plays Like an RTS"
pubDate: 2026-09-26
tags: ["engineering", "game-engine", "rts", "c", "pathfinding", "graphics"]
---

# The game on top of the engine

The [foundations post][foundations-post] covered the substrate of **Project Origin** — pure C11, arenas, a data-oriented
world, a two-backend GPU abstraction, and a deterministic lockstep sim driven by a command stream.
None of that is a game. This post is about the layer that is: terrain, pathfinding, fog of war, UI,
assets, levels — and the recent stretch of work that took it from "cubes slide around a 40x40 board"
to something that moves, looks, and reads like an RTS.

The through-line for the whole layer is the same rule that governed the foundations: the sim must be
bit-identical on every peer, allocation-free on the frame path, and small enough to hold in your head.
Every system below had to earn its place against that rule, and a couple of the best bug stories are
about what happens when a system quietly violates it.

## Terrain: one rule for cliffs, shared by the mesh and the sim

Terrain (ADR 0012) is a flat tile grid — four contiguous `u8` arrays per map: `blocked`, `height`
(each level is `MAP_HEIGHT_STEP` = 0.75 world units), `material`, and `ramp` (none, or sloping one
level toward `+x`/`-x`/`+z`/`-z`). Flat tiles at different heights form cliffs; ramp tiles connect
levels. No navmesh, no physics query — "can a unit stand here?" is an array read.

The part I care about is how passability is decided. The renderer expands tiles into a mesh by
computing four **corner heights** per tile (ramps raise the two corners on their rising side) and
dropping skirt walls where a tile's edge sits above its neighbor's. The sim computes the *same*
corner levels with `map_corner_levels`, and `map_edge_match` declares two adjacent tiles traversable
exactly when their two shared-edge corner levels are equal. Because that compares the very corner
levels the mesh renders, "the tiles connect at equal height" and "there is no cliff drawn between
them" are the same condition. Units cannot path through a rendered cliff or balk at a rendered ramp —
the sim and the mesh derive from one rule, in integers, with no float comparison anywhere in the
pass/block path.

## Pathfinding: A* for squads, flow fields for armies

Moving one unit and moving three hundred are different problems (ADR 0013), so `world_apply_move`
routes by selection size, splitting at `WORLD_FF_THRESHOLD` (8).

Small selections get per-unit A*: 8-directional, octile heuristic, costs 10/14, no corner cutting
(the same `step_ok` predicate wraps `map_edge_match`), then a greedy line-of-sight smoothing pass so
squads hug corners instead of marching tile centers — except across height changes, where smoothing
refuses and ramps stay tile-by-tile. Large selections get **one** Dijkstra flood from the goal
(`ff_build`) into a shared flow field — a cost field plus a downhill direction per tile — and every
unit in the blob just samples its own tile with `ff_sample`. One flood serves the whole army; there
are `WORLD_MAX_FIELDS` (4) field slots recycled round-robin. Both routers share one static binary
min-heap, one closed set, and one direction table, so passability is defined once and there's no
second pathfinder to keep correct.

That was the machinery. Making it *feel* like an RTS took three more passes of work.

**Per-unit command queues.** The single-order model became an order ring per unit: move, attack-move,
patrol, hold. Shift-right-click appends, `P` patrols (ping-pongs between two points instead of
popping), `H` holds. Queued orders are future sim state, so they're folded into `world_checksum` —
which produced my favorite determinism bug of the project. The first version hashed each `unit_order`
with `sizeof(unit_order)`, and the struct has padding after its `u8 type` field. Hashing undefined
padding bytes passed every test on macOS and diverged on Linux and Windows. The fix (commit
`3624e7a`) is to hash `type`/`x`/`z`/`x2`/`z2` individually. Lockstep is a harsh teacher: the
checksum caught it, exactly as designed, but only once CI ran on a second platform.

**Formations.** A group move now assigns each unit an axis-aligned slot around the goal instead of
sending everyone to one tile. Small groups A* to their slots; large groups keep the shared flow field
to reach the goal region, and near the goal — where the field runs out — each unit heads to its own
slot, giving the fan-out for free. Slot layout is integer grid math, deliberately: no float `sqrt` on
the sim path, checksum-stable across runs.

**Crowd settling.** The ugliest movement bug: units ordered to a shared point orbited it forever.
The crowd fills the arrival radius, so trailing units never "arrive"; they seek at full speed into
the clump, the separation push shoves them back out, and the packed center buzzes every tick because
a symmetric velocity push has no fixed point. The fix (ADR 0023) is modeled on StarCraft 2's soft
collision: *arrive* fades seek speed to zero inside `ARRIVE_SLOW` (2.5 u) of the final goal so
separation can cancel it; a unit near its goal that is blocked or cancelled for `STUCK_TICKS` (10)
settles via `order_arrived` — a new per-unit `stuck` counter, spawn-initialized, despawn-swapped, and
hashed into `world_checksum`; and idle separation became positional relaxation — resolve 25%
(`SEP_RELAX`) of remaining pair penetration per tick with a rest deadzone — a geometric decay that
provably converges, where the old velocity push overshot and reversed every tick. Groups now condense
and hold like SC2 instead of jittering. The only per-tick float function on the movement path is
`sqrtf`, which IEEE-754 requires to be correctly rounded, so it's identical everywhere.

## Fog of war: shadowcasting, then making it not flicker

Fog (ADR 0014) is recursive shadowcasting over the tile grid, run per player-unit position each
frame. It's elevation-aware: a viewer's sight level comes from its tile height, `tile_blocks` treats
higher terrain as sight-blocking, and `mark_visible` refuses to mark high tiles — so you see the base
of a cliff but not its top, and high ground genuinely sees farther. One computation feeds two
consumers: a `bright` array uploaded as an `R8` texture the ground shader samples to dim terrain, and
a `state` array the CPU hard-gates on — a hidden enemy emits no instance, no health bar, no minimap
dot. No information leaks through the renderer because it never gets there.

Correct wasn't the same as good. Two rounds of user feedback drove ADR 0022: "pitch black hides
terrain," and "the light edges bounce between lit and unlit." Unseen tiles rendered as a near-black
void, so the fix floors fog at `0.32 + 0.68 * visibility` — fog dims, it never hides shape; height
relief and materials stay legible everywhere. The bounce was worse: the shader gated sun lighting on
fog visibility, so a tile on the vision boundary — where units shuffle a fraction of a tile every
tick — strobed between fully sunlit and flat ambient. Lighting is now computed independently of fog,
and two temporal smoothers stabilize the rest: a tile that loses line-of-sight holds `FOG_VISIBLE`
for a `FOG_GRACE` (8) update window before demoting, and brightness snaps up instantly on reveal but
fades down by `FOG_FADE_STEP` (26) per update. All of this is safe by construction, because fog is
render-only and excluded from `world_checksum` — two peers can hold different fade timers and stay in
perfect lockstep.

## Light, shadows, water

For a long time the scene was flat-shaded cubes on flat-shaded tiles. The lighting stack went up in
deliberate steps. First a single directional sun with lambert shading — normals from screen-space
derivatives (`dFdx`/`dFdy` of world position), so no vertex format change, and the faceted look suits
the low-poly style. Then the engine's first multi-pass frame: a depth-only render from the sun into a
2048² shadow map, with 3x3 PCF in the main pass — landed on Vulkan first, ported to Metal once the
look was confirmed, per the two-backend discipline from the foundations post. The shadow pass is one
extra instanced draw for the whole army; PCF scales with resolution, not unit count.

Water (ADR 0021) is the piece I'm happiest with, because every constraint showed up at once. Water
started as a flat blue material tile that blocked movement. Now it's a *wadeable depression*:
`map_walkable` stopped rejecting it, and `map_surface_y` returns a constant `-MAP_WATER_DEPTH` (0.9)
so a wading unit's feet drop to the bed — a sim-path change, but a pure branch returning a
compile-time constant, so checksums are untouched. The renderer sinks water tiles' corners and the
existing skirt-wall logic carves the basin for free. The see-through surface forced a real renderer
decision: blending is order-dependent, so a translucent surface can only reveal a unit that's already
in the color buffer. Water is therefore its own mesh (`terrain_build_water`, one quad per water tile)
in its own pipeline — alpha-blended, depth *test* on, depth *write* off — drawn strictly **after**
the unit pass on both backends. The shader animates it with summed wavelets and a Blinn sun glint,
clocked by `gfx_set_time` — wall-clock seconds, render-only, because nothing time-animated may ever
touch the deterministic sim.

## UI: immediate mode, and the one-frame contract

The UI (ADR 0015) is a small immediate-mode layer: widgets declared fresh every frame between
`ui_begin`/`ui_end`, identity is an FNV-1a hash of the label, and only `hot_id` and `active_id`
persist. Everything draws through the gfx HUD pass the renderer already had — panels as solid rects,
text as atlas regions from an stb_truetype bake whose top eight rows are forced solid white so the
same texture carries the white pixel solid rects sample. One atlas, one draw path, nothing to port
per backend.

The load-bearing part is input arbitration. The mouse drives both world picking and UI, and a click
on a toolbar button must never also paint the tile beneath it — *within the same frame*, because the
sim steps deterministically each tick. So UI is declared first in the frame, `ui_end()` reports
mouse capture, and every world-picking site gates on it. That contract is a convention, not a
compiler guarantee, which is why it eventually got tests: a headless `test_ui` drives
`ui_begin`/panel/widget/`ui_end` with a synthetic input stream, plus a capture audit over every
world-interaction site. The test exists because a real regression shipped — `active_id` was cleared
in `ui_begin` instead of `ui_end`, and since a button detects its click on the *release* frame,
clearing the press early meant clicks never registered at all. The test now pins the exact sequence:
press over a button, release over it, must return clicked.

On top of that came a widget set v1 (`ui_toggle`, `ui_segmented`, `ui_slider`, tooltips) that rebuilt
the editor toolbar into segmented controls, and anchored layout (ADR 0020): panels declare one of
nine screen regions (`UI_TL` … `UI_BR`, ordered so `col = a % 3`, `row = a / 3`) plus a pixel inset,
resolved against the live window size every frame. The HUD — status top-left, perf readout top-right,
selection panel bottom-center — now survives a live window resize with zero per-site
`screen_w - w - 8` arithmetic.

## Assets and levels: boring on purpose

Two quieter systems round out the layer. Assets (ADR 0016) decode through vendored single-header
libraries — `stb_image` and `cgltf`, compiled in one non-`-Werror` translation unit — into
caller-owned arenas, with a path-keyed cache on top. Each cached asset owns a private arena; a hot
reload decodes into a *fresh* arena and only destroys the old one after the decode succeeds, so a
mid-save or corrupt file keeps the last good data. The loaders never touch the GPU — callers upload
via `gfx_set_*` — which keeps asset loading headless-testable and the sim deterministic.

Levels (ADR 0017) are a versioned line-oriented text format: an `ORIGIN_LEVEL <version>` header,
a dimensions line, the four grids as character rows, then `asset` and `spawn` records. Version-gated
reads mean a version-1 file still loads today with height/material/ramp zeroed; text means a moved
spawn is a one-line git diff instead of a binary blob. `LEVEL_VERSION` is at 4 and climbing.

## Runtime map size, and the bugs that hide in a stride

The original grid was a compile-time 40x40, and that constant had leaked into ~238 sites across 17
files. ADR 0019's fix is the trick I'd reuse anywhere: keep every map-sized array at a **constant
capacity stride** — `MAP_MAX` (128) per side — and carry the active `w, h` as runtime fields, using
the top-left sub-rectangle. Because the stride stays a compile-time constant, the hot inline
indexers (fog lookups, influence, flow-field neighbor steps) need no map pointer; only bounds, loops,
and the world origin read the active size. A `map` stays a plain value that copies with `memcpy`,
which the editor's undo ring depends on. `map_init` zeroes the whole capacity so unused tiles hash
deterministically, and the bench checksum came through the entire 238-site migration unchanged.

Then the stride bit back. The fog `bright` array now stores rows `MAP_MAX` apart, but the fog texture
upload still copied each row from `bright[z * w]` — the old packed layout. On any non-128-wide map,
every row after the first read from the wrong offset, scrambling the fog texture so units projected
no vision at all. The fix (commit `1351bc1`) threads the source stride through `gfx_update_fog` into
both backends' row copy — `memcpy(&fog_cache[z * FOG_DIM], &bright[z * stride], w)` — and bumps the
fog texture from 64² to 128² so max-size maps fit. A one-parameter bug, but the lesson generalizes:
when you decouple logical width from storage stride, *every* consumer that walks rows is a latent
bug until proven otherwise.

The renderer had four more of those latent assumptions, all silent truncations past ~64x64
(ADR 0024, commit `1d08478`). A 128x128 map is ~130k vertices and ~195k indices — past both the old
mesh budgets and the `u16` index ceiling, so terrain silently referenced wrapped vertices and drew
half a map; ground and water meshes now index with `u32` on both backends. The shadow frustum was
hardcoded to the 40x40 board (ortho half-extent 26), so shadows just vanished partway out on bigger
maps; `gfx_set_world_extent` now feeds the map's half-diagonal to the light's ortho box. The minimap
scaled tiles by `1/w` in x but dots by `1/h` in y onto one square panel — rectangular maps stretched
and dots misaligned — replaced by one shared letterbox transform that tiles, dots, the camera box,
and click-to-pan all go through, downsampling to ≤64x64 cells so a big map can't blow the 8k HUD-rect
budget. And resize itself (`map_resize`, exposed as per-axis 32–128 presets in the editor) is
**centre-anchored** like SC2's Map Bounds: content shifts by half the size delta, and because the
world origin is the map centre, every kept tile keeps its exact world position — units, spawns, and
camera never drift across a resize. Verified live: a 128x128 checkerboard-height stress level at
120 fps on Metal.

## A brain for the other side

The enemy needed to be less of a training dummy. Two pieces landed together: per-unit **stances**
(aggressive, defensive with a leash back to a post when a chase pulls past `LEASH_RANGE`, hold-fire),
with stance and post folded into `world_checksum`; and an **influence map** — a per-team presence
field on the tile grid, each unit stamping a distance-falloff footprint. The strategic AI compares
player vs. enemy influence around its home and either defends against the strongest invader or
attacks the player's weakest-defended unit as a flank, then flows the idle army at the target. The
influence map is transient scratch recomputed each AI tick, so it stays out of the checksum — but the
orders it produces go through the same command stream as everything else, so the resulting sim is
still bit-identical across runs.

## Receipts

The sim is benchmarked headlessly (`--bench N` spawns two armies, orders them through each other,
ticks 600 times) on an Apple M4, clang `-O2`:

| Units | ms/tick | % of a 16.67 ms frame |
|------:|--------:|----------------------:|
|   456 |  0.159  |  1.0 % |
|   944 |  0.478  |  2.9 % |
|  1852 |  1.208  |  7.2 % |
|  2768 |  2.030  | 12.2 % |

At 2768 units — the dense-pack ceiling of the built-in level, past the 2000-unit target — the
deterministic sim costs 12% of a 60 Hz frame, leaving ~14 ms for rendering, and still runs 8x faster
than real time headless, which is what replay verification and a future dedicated server actually
cash in. Same seed, same commands, identical final checksum, every run.

## Where this leaves the project

Six months ago this was an entity array and a swapchain. Now: cliffs and ramps with one passability
rule, two pathfinders sharing one heap, command queues and formations and SC2-style crowd settling,
elevation-aware fog that neither hides the map nor strobes, sun shadows on two GPU backends, water
you can wade into and see through, an immediate-mode UI with a tested input-capture contract, and
maps that resize at runtime up to 128x128 without moving a single tile out from under a unit.

The pattern I keep noticing: almost every hard bug in this stretch — the padding bytes in the order
checksum, the fog row stride, the `u16` index wrap — was a mismatch between a layout the code
*assumed* and a layout the data *had*. The determinism machinery from the foundations post is what
made them findable. The checksum doesn't just guard multiplayer; it's the tripwire that turns "weird
on Linux" into a one-commit fix.

[foundations-post]: /posts/2026-09-12-project-origin-an-rts-engine-from-scratch-in-c11/
