---
title: "Chippy: A TUI 6502 Emulator and Debugger from Zero to 1.0"
pubDate: 2026-05-13
tags: ["engineering", "6502", "emulator", "debugger", "go", "tui"]
---

# Why in the f#%k would you write a 6502 emulator?

A while back I posted about finishing the [8-bit breadboard computer][8-bit-post] and committed to doing at least one
hardware-adjacent project a year, with the long-term goal of being able to design something from scratch instead of
following along with someone else's tutorial. Chippy is the next rung on that ladder. It's a software emulator of an
actual historical chip — the MOS 6502, the CPU that ran the Apple I, the Commodore 64, the NES, the BBC Micro, and a
hundred other machines I grew up reading about but never got to touch.

If the breadboard project was about understanding how a CPU works at the gate level — bus transceivers, latches,
microcode in EEPROMs, all the physical wiring that makes a clock pulse turn into a register transfer — then chippy is
about understanding how a CPU works at the **architectural** level. There are no logic gates here. There's a 256-entry
opcode table, a tiny set of registers, an addressing-mode decoder, a flags register, and an interrupt service loop.
That's it. That's a CPU.

The 6502 is also small enough that one person can hold the whole thing in their head, and well-documented enough that
when you implement something wrong, there's a thirty-year-old test ROM written by a guy named Klaus Dormann that will
tell you exactly which opcode you broke. It's the perfect project for someone like me who wants the satisfaction of
"my code is running a real Apple-1 program" without first having to learn x86 protected mode or the ARM exception
levels.

What I didn't expect when I started this project was that it would also turn into a small lesson on what shipping
software actually means. Writing a 6502 core that passes the basic tests took maybe a weekend. Getting from that core
to a v1.0 release — with a debugger, a debug-adapter protocol server, a VS Code extension, a WASM playground, signed
release artifacts, packages for four Linux distros, AUR, Homebrew, an MkDocs site, and CI gates for performance
regressions — took eleven days of obsessive work and produced ninety-eight commits. The CPU was the easy part.

This article is about all of it.

## The Journey to 1.0

Chippy's initial commit lands on **May 2, 2026**: a Go module, an NMOS 6502 core, a Bubble Tea TUI with five panels,
the ca65/cc65 loader, and Klaus Dormann's functional test suite already passing. v1.0 ships on **May 13, 2026**. That's
eleven days of evenings and weekends, ninety-eight commits, nine tagged releases. I don't recommend this pace — I am a
slightly worse person at the end of it — but I do want to honestly describe the rhythm, because the 8-bit breadboard
project took me almost four years of stops and starts, and chippy went the other direction entirely.

The thing that made it possible was setting a hard rule on day one: **every PR ships its docs.** Not "I'll write the
README later." Not "I'll add the help-modal entry next week." If a PR adds a feature, the PR that adds the feature
updates the README's flag table, updates the in-app help modal, updates the architecture handoff doc at
`docs/context.md`, and updates the changelog. A PR that doesn't is incomplete and gets sent back. I put this rule into
the `CLAUDE.md` file at the repo root and stuck to it. By v1.0 the README was 21KB of accurate documentation and I had
not yet experienced the special hell of "wait, what does this flag do again?"

The release arc looks like this:

| Tag     | Date       | What landed                                                    |
| ------- | ---------- | -------------------------------------------------------------- |
| v0.0.1  | 2026-05-11 | NMOS core, TUI, ca65/cc65 loader, MMIO, Klaus in CI, Homebrew tap |
| v0.0.2  | 2026-05-11 | Help-modal paging, stack JSR annotation, memory editor, prompt history + reverse-i-search, execution trace |
| v0.1.0  | 2026-05-12 | DAP transport + initialize/launch/disconnect                   |
| v0.2.0  | 2026-05-12 | DAP v1: step controls, stackTrace, scopes, variables, breakpoints, evaluate |
| v0.3.0  | 2026-05-12 | DAP v2: stepBack, function bps, source content, completions, conditional/log bps, attach v1 |
| v0.3.1  | 2026-05-12 | 65C02 NOP fill widths, CMOS interrupt D-clear, exhaustive BCD pass |
| v0.4.0  | 2026-05-12 | Reverse-step over free-run (CoW snapshots), VS Code extension, WASM playground |
| v1.0.0  | 2026-05-13 | WAI/STP halt, security hardening (cosign + SBOM + govulncheck), Linux packages, MkDocs site, trace replay |

The lesson I took away from this is something I'd half-believed before but really internalized writing chippy: the
**first 70% of a project is fun and fast, and the last 30% is what separates a hobby toy from something you'd want
someone else to actually use.** Klaus passing in CI was satisfying. So was the moment the TUI rendered its first
disassembly. But the work that actually made the 1.0 — bounding the TextOutput buffer so it doesn't OOM on long-running
programs, freezing the state-file schema with `schemaVersion: 1`, adding a perf-regression gate to CI so a thoughtless
refactor can't quietly tank the inner loop, getting Dependabot to track the VS Code extension's npm deps — that work
isn't glamorous, but it's the work that adds up to a stable release.

OK, let's get into the actual computer.

## The CPU Core

The heart of chippy is one Go file's worth of code: `internal/cpu/cpu.go` defines the `CPU` struct, and that struct is
small enough to read in one screen:

```go
type CPU struct {
    A, X, Y, SP, P byte
    PC             uint16
    Cycles         uint64
    Bus            Bus
    Variant        Variant
    Tracer         Tracer

    Halted       bool
    stoppedBySTP bool
    extraCycles  int

    opcodes *[256]Instr

    irqLine    bool
    nmiPending bool
    nmiPrev    bool
}
```

That's the entire processor. A, X, and Y are the three 8-bit general-purpose registers. SP is the 8-bit stack pointer
(the stack lives in page 1, from `$0100` to `$01FF`, and SP is the offset). P is the status register — N, V, U, B, D,
I, Z, C, eight flag bits packed into a byte. PC is the 16-bit program counter. Everything else in the struct is
bookkeeping for the implementation, not part of the silicon spec.

The execution loop is also short. `Step()` services interrupts at the instruction boundary, then fetches and runs one
opcode:

```go
func (c *CPU) Step() int {
    if c.stoppedBySTP {
        return 0
    }
    if c.Halted && c.irqLine && c.hasFlag(FlagI) && !c.nmiPending {
        c.Halted = false
    }
    if c.nmiPending {
        c.Halted = false
        before := c.Cycles
        c.serviceNMI()
        return int(c.Cycles - before)
    }
    if c.irqLine && !c.hasFlag(FlagI) {
        c.Halted = false
        before := c.Cycles
        c.serviceIRQ()
        return int(c.Cycles - before)
    }
    if c.Halted {
        return 0
    }
    startPC := c.PC
    op := c.Bus.Read(c.PC)
    c.PC++
    in := c.opcodes[op]
    addr, pageCrossed := c.resolve(in.Mode)
    c.extraCycles = 0
    in.Exec(c, addr, in.Mode)
    cycles := in.Cycles + c.extraCycles
    if in.PageAdd && pageCrossed {
        cycles++
    }
    c.Cycles += uint64(cycles)
    if c.PC == startPC {
        c.Halted = true
    }
    return cycles
}
```

There's no microcode. There's no pipeline. The opcode byte indexes a 256-entry table of `Instr` records, each of which
carries a name, an addressing mode, a base cycle count, and a function pointer to the handler. The handler reads the
operand bytes, mutates the CPU and bus, and returns. Pages of code I wrote for chippy look like:

```go
func opLDA(c *CPU, addr uint16, m AddrMode) { c.A = c.Bus.Read(addr); c.setZN(c.A) }
func opLDX(c *CPU, addr uint16, m AddrMode) { c.X = c.Bus.Read(addr); c.setZN(c.X) }
func opSTA(c *CPU, addr uint16, m AddrMode) { c.Bus.Write(addr, c.A) }
func opTAX(c *CPU, _ uint16, _ AddrMode)    { c.X = c.A; c.setZN(c.X) }
```

It's almost embarrassingly direct. A 6502 instruction handler is a one-liner. The complexity isn't in any individual
instruction; it's in the cross-cutting concerns — cycle counting, addressing-mode resolution, decimal mode, interrupt
semantics, page-crossing penalties — and most of the bugs I wrote in chippy lived in exactly those cross-cutting paths.

## Cycle Accuracy and the `extraCycles` Side Channel

The very first non-trivial bug I shipped to myself was a cycle-counting bug. The 6502 has variable instruction timing:
a branch instruction takes 2 cycles if not taken, 3 if taken, 4 if taken and the target is on a different page. The
naive way I implemented branches was to mutate `c.Cycles` directly inside the branch handler. The bug: `Step()`
returned `in.Cycles` (the base cycle count from the opcode table), not `c.Cycles - before`. So a taken branch correctly
advanced `c.Cycles` but the `Step()` return value undercounted by 1 or 2 cycles.

That number ended up being the value that the trace logger printed, the value the TUI's speed throttle used to pace
itself, and the value the perf benchmark measured. All wrong. Just barely wrong enough that the basic tests still
passed.

The fix introduced an `extraCycles int` field on the CPU struct that handlers can write into when they need to charge
extra cycles for things that aren't statically predictable. `Step()` resets it before each instruction, adds it after,
and returns the actual total:

```go
c.extraCycles = 0
in.Exec(c, addr, in.Mode)
cycles := in.Cycles + c.extraCycles
if in.PageAdd && pageCrossed {
    cycles++
}
```

This same side channel later got reused for the +1 cycle BCD penalty on the CMOS 65C02. Once you have one place that
handlers can poke for "charge me extra," every weird cycle penalty in the 6502 family becomes a one-line addition.

The lesson here, which I'd seen before but felt very acutely on this project, is: **regression tests have to assert on
the thing you care about, not the thing that's easy to assert on.** I had tests that asserted on `c.Cycles` and they
all passed. The thing that was wrong was `Step()`'s return value. Once I added a 4-test regression file
(`internal/cpu/cycles_test.go`) that asserted specifically on `Step()`'s return for taken branches, the bug had nowhere
to hide.

## Decimal Mode (Or: Why Bruce Clark Is a National Treasure)

The 6502 supports packed-BCD arithmetic in `ADC` and `SBC` when the D flag is set. Two BCD digits are packed into each
byte (`$23` literally means decimal 23, not 35), and an ADC instruction in decimal mode adjusts the result so that
`$09 + $01 = $10`, not `$0A`. This sounds simple. It is not simple.

The NMOS 6502 has a real quirk: in decimal mode, the A register and the carry flag reflect the decimal result, but the
N, V, and Z flags reflect the *binary* result — the high nibble is partially adjusted but the flags are computed from
the unadjusted intermediate. This is a real hardware behavior, not a bug. It's documented in
[Bruce Clark's tutorial][bcd-tutorial], which is the only document I've ever found that explains the NMOS BCD
semantics correctly enough to reproduce.

The CMOS 65C02 cleaned this up: N, V, and Z reflect the decimal result, and the instruction takes one extra cycle. My
implementation dispatches via the variant:

```go
func opADC(c *CPU, addr uint16, m AddrMode) {
    if c.hasFlag(FlagD) {
        if c.Variant == VariantCMOS65C02 {
            adcDecimalCMOS(c, addr)
            c.extraCycles++
            return
        }
        adcDecimalNMOS(c, addr)
        return
    }
    adcBinary(c, addr)
}
```

The way I actually convinced myself the BCD path was correct was by writing what the codebase calls "the exhaustive
BCD test." It walks every `(N1, N2, cin)` triple through ADC and SBC in decimal mode for both variants — 524,288 cases
per opcode per variant. That test caught a real CMOS BCD bug in my first implementation, on invalid-nibble inputs that
no Klaus test happened to exercise. After fixing it the suite is clean and runs as a build-tagged CI job
(`go test -tags=decimal`) on every push.

The bug-detection power of "exhaustively enumerate the input space" is wildly underrated. The 6502's BCD input space is
small enough that you can iterate the whole thing in a couple of seconds. If your test runs in two seconds and rules
out an entire class of bug forever, you write that test.

## Variant Dispatch: Adding the 65C02

Adding a second CPU variant (the WDC/Rockwell 65C02) to chippy after the NMOS core was already working was one of those
moments where a design decision I'd made on day one paid off without me having to do anything clever. The CPU has a
`Variant` enum and an `opcodes *[256]Instr` pointer:

```go
type Variant int

const (
    VariantNMOS      Variant = iota
    VariantCMOS65C02
)

func (c *CPU) bindTable() {
    switch c.Variant {
    case VariantCMOS65C02:
        c.opcodes = &OpcodesCMOS
    default:
        c.opcodes = &Opcodes
    }
}
```

`Opcodes` is the NMOS table, populated in `opcodes.go`. `OpcodesCMOS` is initialized in `opcodes_cmos.go` by copying
`Opcodes` and then overriding the ~30 slots that the 65C02 changed. The CPU's dispatch path just does
`c.opcodes[op]` — no `switch` on variant, no runtime cost. To add a 65C816 variant later, I'd add a third table file
and a third enum value, and that would be the entire diff.

There's exactly one load-bearing invariant here that I want to flag, because it cost me an hour: **the CMOS table init
relies on Go's `init()` lexicographic file ordering.** `opcodes.go` runs first and fills the NMOS table. Then
`opcodes_cmos.go` copies it into the CMOS table and applies overrides. Then `opcodes_illegal.go` patches the NMOS-only
illegal opcodes into the NMOS table. If you rename `opcodes_cmos.go` to `opcodes_z.go`, illegals start bleeding into
the CMOS table because they get patched in *before* the CMOS copy happens. I've written this down in `CLAUDE.md`'s
"Load-bearing invariants" section so I don't accidentally do it.

## Interrupts (IRQ and NMI)

The 6502 has two interrupt lines. IRQ is level-triggered and maskable — while the line is asserted *and* the I flag is
clear, the CPU services it at the next instruction boundary. NMI is edge-triggered and non-maskable — a rising edge on
NMI sets a latch, and the CPU services it at the next boundary regardless of I.

The implementation has two API surfaces, one per line, mirroring the silicon:

```go
func (c *CPU) AssertIRQ()  { c.irqLine = true }
func (c *CPU) ReleaseIRQ() { c.irqLine = false }

func (c *CPU) TriggerNMI() {
    if !c.nmiPrev {
        c.nmiPending = true
    }
    c.nmiPrev = true
}
func (c *CPU) DeassertNMI() { c.nmiPrev = false }
```

The edge detection on NMI is the part that took me a couple of tries to get right. If a peripheral holds NMI asserted,
the CPU should service one NMI, not one NMI per instruction forever. `nmiPrev` tracks the previous state of the line so
that `TriggerNMI` only latches `nmiPending` on a 0→1 transition.

The B-flag handling on service is the other place that bit me. When the CPU pushes the status register onto the stack
as part of interrupt entry, it pushes `(P | FlagU) &^ FlagB` — B clear, U set. When a `BRK` instruction does the same
push, it pushes `P | FlagU | FlagB` — both set. This is how a service routine can distinguish a hardware interrupt from
a `BRK` by examining the pushed status byte. Klaus's test suite has a vector for this and it caught my initial
implementation that pushed `B` set on every interrupt.

## MMIO Peripherals (Apple-1 Style)

A 6502 by itself can compute things but can't talk to the outside world. The real machines used **memory-mapped I/O**:
specific memory addresses, when read or written, are actually wired to a peripheral chip — a display, a keyboard, a
timer, a sound generator. The Apple-1 famously used `$D010`–`$D013` for the PIA registers, but for chippy I picked
`$F001` for the text output and `$F004`/`$F005` for the keyboard, mostly because they're outside the address range any
of the bundled example ROMs ever uses.

The peripheral interface is one method per direction plus a range:

```go
type Peripheral interface {
    Range() (lo, hi uint16)
    Read(addr uint16) byte
    Write(addr uint16, v byte)
}
```

And there's an `MMIO` Bus implementation that wraps an inner Bus and dispatches reads/writes to registered peripherals
first, falling through to RAM for anything they don't claim. The chain ends up looking like:

```
CPU → tui.WBus → cpu.MMIO → cpu.RAM
```

Each layer wraps the next. `WBus` is the TUI's instrumentation layer that captures hits for memory watchpoints. `MMIO`
is the peripheral router. `RAM` is the final 64 KiB flat backing store. The CPU sees a single `Bus` interface and
doesn't know any of this exists.

The two peripherals that ship in v1.0 are intentionally minimal. `TextOutput` accumulates writes to `$F001` into a
buffer that's rendered as a TUI panel — write `'A'` to `$F001` and an `A` appears on the screen, just like an Apple-1.
`KeyboardInput` is the same in reverse: TUI keypresses get pushed into a queue, the program reads `$F004` to get the
key and `$F005` to check the ready flag. Both peripherals implement a `Snapshotable` interface that the reverse-step
machinery uses to undo MMIO side-effects, which I'll get to in a minute.

There's also one place where I have to deliberately *bypass* the MMIO layer: the ROM loader and the reset-vector
helpers write directly to `RAM`, not through the bus. If they went through the bus, loading a program that happened to
touch `$F001` would write garbage to the output buffer during ROM load. The convention is that anything that's
simulating a "physical" bus cycle (the CPU executing) goes through MMIO, and anything that's loading state from outside
(the loader, save-file restore) goes around it.

## ca65, cc65, and the .dbg File

Writing 6502 assembly by hand was fun the first three times. After that, I wanted a real toolchain. The de facto modern
toolchain for 6502 is [cc65][cc65], which gives you:

- `ca65` — assembler
- `ld65` — linker, with a config-file format for memory layout
- `cc65` — a C compiler that targets 6502

Chippy auto-detects program format by extension and runs the appropriate loader:

| Extension | Format                                                        |
| --------- | ------------------------------------------------------------- |
| `.bin`    | Raw bytes — placed at `-addr` (default `$8000`)               |
| `.prg`    | Commodore-style: first 2 bytes = LE load address              |
| `.hex`    | Intel HEX                                                     |
| `.o`      | ca65/cc65 object — chippy invokes `ld65` for you              |

The real magic happens when there's a sibling `.dbg` file next to the binary. `cc65 -g` emits a `.dbg` file that
contains:

- A symbol table mapping names to addresses
- A source-line map mapping `(file, line)` tuples to PC ranges
- A file table

Chippy parses this and uses it to turn disassembly addresses into names (`JSR init` instead of `JSR $8042`), to resolve
source-line breakpoints (`:bp main.s:42`), to render a source view that follows the current PC, and to support symbol
names in expressions (`:bp main if A == $FF`). The recommended workflow ends up looking like:

```sh
ca65 -g prog.s -o prog.o
ld65 -C linker.cfg -o prog.bin --dbgfile prog.dbg prog.o
chippy -rom prog.bin
```

The `-g` is the important part — without it `ca65` doesn't emit debug info. The `.dbg` is auto-picked up because
chippy looks for `<rom>.dbg` next to whatever `-rom` you pass.

## The TUI

The terminal UI is built on [Bubble Tea][bubbletea], the Elm-architecture framework from Charm. The model holds the
CPU, the RAM, the symbol table, the breakpoint sets, the watch list, and a bunch of view state. The update loop is
keystroke-driven; every keypress returns a `tea.Cmd` that the runtime executes asynchronously, which is how the same
`Update` function can both step the CPU and trigger an auto-save without ever blocking the render.

The layout the user sees looks like this:

```
┌ Registers ──┐ ┌ Disassembly ────────────────┐
│ A:00 X:00 Y │ │ > $8000  LDA #$00           │
│ SP:FD PC:80 │ │   $8002  TAX                │
└─────────────┘ │   ...                       │
┌ Flags ──────┐ └─────────────────────────────┘
│ n v U b d I │ ┌ Memory ─────────────────────┐
└─────────────┘ │ $0000: 00 00 ... ........   │
┌ Stack ──────┐ └─────────────────────────────┘
│ $01FE: 00   │ ┌ Watches ────────────────────┐
└─────────────┘ │ score  $0200  $00           │
                └─────────────────────────────┘
status: ready
```

Every panel is its own little render function. The disassembly panel pulls from `cpu.DisasmCPU` which is variant-aware
— so a 65C02 program shows `BRA` and `STZ` correctly instead of decoding them as the NMOS NOPs at the same opcode
slots. The stack panel detects JSR-pushed return-address pairs (a JSR pushes `(retAddr - 1) hi` then `(retAddr - 1) lo`)
and renders them as `ret $XXXX  callee  file:NN` rows with the inter-frame bytes collapsed. The memory panel has a
byte-level cursor that arrow keys move and `e` enters hex-edit mode at.

The command prompt is the part I'm most happy with. `:` opens it. It has up/down history, Tab completion of verbs and
of symbol names from the loaded `.dbg`, and Ctrl-R reverse-incremental search through the history — the same `Ctrl-R`
that bash and zsh have. The history file lives at `~/.chippy/history`, capped at 100 entries with dedup. None of this
is necessary to debug a 6502 program. All of it is necessary to make the debugger feel like the editors I already use.

## Breakpoints, Watchpoints, and Sigils

The breakpoint syntax is where I let myself get a little extra:

```
:bp $8042                          plain breakpoint at address
:bp main                           breakpoint at symbol
:bp main.s:14                      source-line breakpoint
:bp $8042 once                     one-shot, deletes itself on hit
:bp loop hits 5                    break on the 5th hit
:bp main if A==$FF                 conditional breakpoint
:bp $8000 log A={A} PC={PC}        log point — prints, never pauses
:bp main.s:42 if A==$FF hits 3 log A={A}    composes
```

`if` and `log` expressions go through a small expression compiler in `internal/expr`. Operands are registers, flags,
literals (`$FF` / `0xFF` / `255` / `0b1010`), symbols from the loaded `.dbg`, and memory dereferences (`[$XXXX]` for
the byte at that address; `[score]` works too if `score` is in the symbol table). Operators are the usual C-style set
plus boolean shorts. The compiled form is an `expr.EvalFn` — a closure that takes a CPU pointer and returns the
result. The same evaluator powers the TUI's immediate-mode REPL (`I` opens a modal) and the DAP `evaluate` request, so
the values reported in VS Code's debug console match what the TUI shows.

Memory watchpoints are the other half — `:bpr` / `:bpw` / `:bprw` for read / write / either. The TUI's `WBus` layer
captures every bus access in a small ring buffer, and after each step the TUI scans the ring for hits and pauses if
any match. Watched bytes are also color-coded in the memory hex view: blue for read, red for write, magenta for both.

The gutter glyphs ("sigils") borrow directly from nvim-DAP:

| Sigil | Meaning                                |
| ----- | -------------------------------------- |
| 🛑    | Plain breakpoint                       |
| 🔶    | Conditional breakpoint                 |
| 📜    | Log point (prints, never pauses)       |
| 💩    | Rejected (unresolved source line)      |
| 👁    | Read watch                             |
| ✏    | Write watch                            |
| 🔁    | Read + write watch                     |
| 👉    | Current PC                             |

The `💩` is for when you ask for `:bp some_file.s:200` and the line doesn't have an emitted instruction — instead of
silently dropping the request, the breakpoint enters the "rejected" state and shows up in the breakpoint manager modal
so you can see *why* nothing happened. This was a usability fix I added after the third time I typed a source-line bp,
nothing happened, and I spent five minutes wondering whether the CPU was even running.

## Reverse-Step (Or: How CoW Page Snapshots Saved the Day)

One of the features I wanted from day one was reverse-step — the ability to press `<` and rewind the CPU one
instruction. I knew this would be expensive: to truly undo a step, you have to restore everything the step might have
changed, which for a 6502 means the seven registers (A, X, Y, SP, P, PC, Cycles) plus any RAM bytes that got written.

The naive implementation that I shipped first does exactly that. Before each explicit step (`s`, `S`, `n`, `f`), the
CPU captures a `Snapshot` containing the registers and a full copy of the 64 KiB RAM. The snapshot goes into a
`SnapshotRing` of capacity 256 with FIFO eviction. `<` pops the most recent and restores it.

This works fine for single-stepping. It does **not** work for free-run. Pressing `r` for "run" at the default
throttled speed (a few hundred kHz) means thousands of `Step()` calls per second. Snapshotting on every step means
copying 64 KiB thousands of times per second, which is around 100 MB/s of memcopy just for the snapshot ring. After a
few seconds you've also blown out the 256-entry ring and the rewind history only covers the last 200 ms of execution.

The fix took the better part of a day to design and is one of the most satisfying pieces of code in the project: **the
RAM gained a page-level copy-on-write shadow.** When shadow tracking is enabled, every write to RAM first captures the
affected 256-byte page's pre-write contents (only on the first touch within the current epoch), then performs the
write:

```go
func (r *RAM) Write(addr uint16, v byte) {
    if r.shadow != nil {
        page := byte(addr >> 8)
        if _, ok := r.shadow[page]; !ok {
            var img [256]byte
            base := int(page) << 8
            copy(img[:], r.Data[base:base+256])
            r.shadow[page] = img
        }
    }
    r.Data[addr] = v
}
```

The snapshot then takes the accumulated shadow (the *delta* — only the pages that actually got written) instead of the
full 64 KiB. The capture protocol becomes:

1. Caller takes a register snapshot before the step.
2. Caller calls `ram.ResetShadow()` to start a fresh epoch.
3. Caller runs the step (or multi-step sweep).
4. Caller claims `snap.Pages = ram.TakeShadow()` and pushes onto the ring.

A typical single instruction touches one page, so a typical snapshot is now ~hundreds of bytes instead of 64 KiB. A
1000-iteration tight loop fits in under 1 MiB of total ring storage instead of 64 MiB. The TUI's `tickMsg` loop and
the DAP `runLoop` can both push on every step now, including during free-run, so reverse-step works across an
unattended `:run main`.

The same machinery extended to MMIO peripherals. `cpu.Snapshot` grew a `Peripherals map[string][]byte` field, and the
`peripheral.Snapshotable` interface (Snapshot / Restore) is implemented by both TextOutput and KeyboardInput. So
reverse-stepping across a write to `$F001` now correctly un-types the character from the output panel.

There's a subtle reason this design works that's worth pointing out: **page-level granularity is the right grain.** A
single instruction can touch multiple bytes (a 16-bit store, a stack push of a 16-bit return address, etc.) but those
bytes almost always live in the same page. Capturing at byte granularity would mean a hashmap allocation on every
write, which would absolutely tank the inner loop. Capturing at the full-RAM granularity is what we had before. The
256-byte page is small enough to make snapshots cheap and large enough that the per-page overhead is negligible.

## DAP: One Engine, Three Surfaces

After the TUI was working I wanted chippy to be drivable from a real editor. The standard way to do this is the
[Debug Adapter Protocol][dap-spec] — Microsoft's JSON-RPC-style spec for debug clients (VS Code, nvim-dap, JetBrains
products) to talk to debug servers. If you implement DAP, every editor that speaks DAP can drive you. That's a lot of
editors.

The `internal/dap` package implements the protocol. Transport is Content-Length-framed JSON; the server reads request
messages, dispatches by command, writes responses and events back. The server can run in two modes:

```sh
chippy -dap stdio        # editor pipes stdin/stdout (VS Code default)
chippy -dap tcp:5678     # server listens, editor connects out
```

By v1.0 the implemented request surface is:

- `initialize`, `launch`, `attach`, `disconnect`, `terminate`
- `continue`, `next`, `stepIn`, `stepOut`, `stepBack`, `pause`, `threads`
- `stackTrace`, `scopes`, `variables`, `setVariable`
- `setBreakpoints`, `setInstructionBreakpoints`, `setFunctionBreakpoints`, `setExceptionBreakpoints`
- `breakpointLocations`, `loadedSources`, `source`
- `disassemble` (forwards and backwards), `readMemory`, `writeMemory`
- `evaluate`, `completions`, `exceptionInfo`

Every breakpoint family honors the DAP `condition` / `hitCondition` / `logMessage` triple. The conditions go through
the same `internal/expr` compiler the TUI uses, so a condition written in VS Code evaluates identically to the same
condition written at the `:` prompt. Log messages emit `output` events instead of stopping. Function breakpoints
resolve through the loaded `.dbg` symbol table. Source-line breakpoints resolve through `srcMap.PCToSrc`.

The thing I'm proudest of in the DAP layer is that **the CPU core itself didn't have to change.** Same `cpu.CPU`, same
`cpu.Step()`, same `cpu.SnapshotRing` (which I had to promote from `internal/tui` up to `internal/cpu` so DAP could
reuse it). The DAP server is a different *driver* of the same engine. The WASM playground is a third. The TUI is the
first. From v0.4 on, the README pitch became "TUI + DAP + WASM, one engine, three surfaces" — and that's literally how
the code is structured.

The VS Code extension at `extension/vscode-chippy/` is the front-end for the DAP server. It's a tiny TypeScript package
that registers the `chippy` debug type and supplies a `DebugAdapterDescriptorFactory` that spawns
`chippy -dap stdio`. There's also a TextMate grammar for ca65 assembly with syntax highlighting for NMOS + 65C02
mnemonics, ca65 directives, and the various literal styles. The extension auto-publishes to the VS Code Marketplace
on every tag push via a `vsce publish` job in the release workflow.

## The WASM Playground

The third surface is a browser. `cmd/chippy-wasm/` builds a `js/wasm` Go binary that installs a `window.chippy` global
exposing `load`, `step`, `run`, `state`, `disasm`, `readMem`, `textOutput`, `pushKey`, `setVariant`. The `web/`
directory ships the HTML/JS shell — six panes that render registers, flags, the stack, disassembly, memory, and the
TextOutput buffer. Press a key and it goes into `pushKey`, which feeds the KeyboardInput peripheral.

You can try it at [nkane.dev/chippy/][playground].

The interesting constraint with the WASM surface is that I deliberately ruled out shelling out to `ld65` from the
browser, so the WASM playground only loads `.bin`, `.prg`, and `.hex` — not `.o` files. Inlining the loaders for the
three pure-data formats in the WASM main was straightforward. Trying to shim a virtual filesystem and run `ld65` in
WASM would have been a project unto itself, and the playground is supposed to be a "paste a binary and see what
happens" demo, not a full toolchain in a browser.

GitHub Pages auto-deploys the playground on every push to `main` via `.github/workflows/pages.yml`. The MkDocs site
(`mkdocs.yml`) builds the documentation pages alongside it and nests the playground at `/chippy/playground/`. The
share button on the playground packs the loaded ROM into a `#rom=<base64>&format=&addr=&variant=` URL fragment, so you
can paste a link to your friend that contains the bytes — the bytes never go through a server, which is the kind of
small thing that makes the playground feel correct.

## Correctness: Klaus Dormann + Exhaustive BCD

The 6502 emulator scene has a gold standard for correctness, and it's a test ROM written by Klaus Dormann that does
something like 30 million instruction executions covering every documented opcode, every addressing mode, every flag
combination, and every interrupt edge case. If your emulator can run Klaus to completion, you have a real 6502. If it
can't, the test halts at the specific address where you went wrong, and you go fix that opcode.

I wired Klaus into CI on day three of the project (PR #30), as a build-tagged Go test:

```sh
go test -tags=klaus -timeout 5m -run TestKlaus ./internal/cpu/...
```

The ROM is GPL-3.0 licensed, so I don't vendor it. The test downloads it on demand into the user's cache dir, verifies
a known sha256 (`fa12bfc761e6f9057e4cc01a665a7b800ff01ae91f598af1e39a1201d01953fd`), and runs. CI uses a cache between
runs so the download happens once.

The 65C02 variant has its own Klaus harness (`klaus_cmos_test.go`) against the `65C02_extended_opcodes_test.bin`. That
one initially failed because chippy's CMOS undocumented-opcode slots weren't matching the WDC spec (NOP fill widths
varied across addressing modes — `$44` is a 2-cycle ZP NOP, `$54/$D4/$F4` are 4-cycle ZPX NOPs, `$5C` is a quirky
8-cycle ABS NOP, etc.) plus CMOS doesn't preserve the NMOS bug where interrupt entry doesn't clear the D flag. After
fixing those two things in PR #103, the CMOS Klaus passes end-to-end and runs unconditionally in CI.

The exhaustive BCD test I mentioned earlier rounds out the correctness story. Between Klaus and BCD, every CPU
behavior I implement gets a regression net under it.

## Distribution and Release Hygiene

By the time I tagged v1.0 I had nine releases out, and I'd accumulated enough opinions about how to ship a Go binary
that this section probably warrants its own post. The short version:

[**goreleaser**][goreleaser] does almost all the work. The `.goreleaser.yml` describes the build matrix
(darwin/linux × amd64/arm64, plus windows/amd64), the archive layouts, the nfpm-generated `.deb` / `.rpm` / `.apk`
packages, the AUR PKGBUILD for `chippy-bin`, and the Homebrew formula bump. The `release.yml` workflow runs
goreleaser on every tag push.

**Signing is keyless via cosign + GitHub OIDC.** Every release artifact gets a `*.cosign.bundle` you can verify with:

```sh
cosign verify-blob \
  --certificate-identity=https://github.com/nkane/chippy/.github/workflows/release.yml@refs/tags/v1.0.0 \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  --bundle chippy_1.0.0_linux_amd64.tar.gz.cosign.bundle \
  chippy_1.0.0_linux_amd64.tar.gz
```

No private key on my laptop. The signing identity is the GitHub Actions workflow itself, attested by GitHub's OIDC
provider. If someone else built a chippy binary, the cert wouldn't match.

**SBOMs ship per archive** via syft, in SPDX JSON format. Anyone consuming chippy can run their own vulnerability scan
against the bill of materials.

**Go binaries are built with `-trimpath` and `-buildvcs=true`** for reproducible / verifiable provenance. The build
embeds the commit SHA so `chippy --version` reports a verifiable build.

**`govulncheck` runs in CI on every push.** The job fails the build if any dependency has a known CVE that affects
code paths chippy actually reaches.

**Dependabot covers gomod, github-actions, and the VS Code extension's npm.** The npm side was the last to get
covered; v1.0 added it because the extension's lockfile being out of date had quietly accumulated three patch-version
gaps.

Distribution channels by v1.0:

| Channel             | Mechanism                                                  |
| ------------------- | ---------------------------------------------------------- |
| Homebrew            | `brew tap nkane/tap && brew install chippy` — auto-updated |
| Debian / Ubuntu     | `.deb` via `dpkg -i`                                       |
| Fedora / RHEL       | `.rpm` via `rpm -i`                                        |
| Alpine              | `.apk`                                                     |
| Arch (AUR)          | `yay -S chippy-bin`                                        |
| Prebuilt tarballs   | GitHub releases page                                       |
| `go install`        | `go install github.com/nkane/chippy/cmd/chippy@latest`     |
| VS Code Marketplace | `chippy` debug type via the extension                      |
| Browser             | [nkane.dev/chippy/][playground] (WASM)                     |

The Homebrew-core submission is deferred until the repo hits ~30 stars (`brew tap nkane/tap` is fine in the meantime).
That's the one channel I don't control directly.

## State-File Format Freeze

There's one last decision I want to call out because it's the kind of thing that's easy to skip and impossible to fix
later.

Chippy persists per-ROM state to `~/.chippy/state-<basename>.json` — breakpoints (with their conditions, hit limits,
log templates, source tags), memory watchpoints, the watch panel entries, memory view position, throttle speed, the
disasm scroll anchor, plus a handful of UI booleans I added later (`DisasmFollow`, `StackAnnotate`, `InputMode`,
`DisasmAnchor`, `ImmediateHistory`). The save happens on quit; the load happens on startup. Users do not lose their
breakpoints when they restart chippy.

For v1.0 I froze the format with `schemaVersion: 1` written into every file. The loader:

- treats absent `schemaVersion` as legacy v0 (still decodes — every v0 file in existence keeps working)
- treats `schemaVersion: 1` as current
- treats `schemaVersion > 1` as "an older chippy is reading a newer file" and silently ignores so the file isn't
  destroyed

New fields stay optional inside v1.x. Semantic changes or removals require bumping `StateSchemaVersion` and writing a
migration. The pinned golden file lives at `internal/tui/testdata/state-v1.json` and `TestLoadState_GoldenV1` fails on
any incompatible struct or tag change. The contract is documented at `docs/state-format.md`.

This is exactly the kind of thing that's free to do on day one of v1.0 and a nightmare to retrofit on day 100. If you
ship a tool that persists state and you don't write down what the format is, version it, and pin a golden file,
future-you is going to spend a Saturday parsing thirty different field-shape variations in support of users you didn't
know you had.

## Fin

Chippy is the most complete piece of software I've shipped to myself in a long time, and it is hilariously
disproportionate to the size of its likely audience. There are maybe a few hundred people in the world who want a
debugger-first 6502 emulator with a DAP server, and I have built it for them.

But that wasn't actually the point. The point was the same as the 8-bit breadboard computer: see something complicated
through to the end, and trust that the act of finishing will teach you things you can't get any other way. The 8-bit
project taught me how a CPU works at the gate level. Chippy taught me how to ship one — not just write the inner loop,
but also bound the output buffers, freeze the file formats, sign the artifacts, package for distros I don't use, write
the docs in the same PR as the code, and stop before adding the eighty-second feature.

The final test I ran before tagging v1.0 was the same Apple-1-style program I wrote in the first week — read a byte
from `$F004`, echo it to `$F001`, BRA back to the top — but this time I ran it from the WASM playground in a browser
tab, while a VS Code window sat next to it with the same program loaded, breakpoint set on the echo, conditional
expression `[$F004] == 'q'` waiting to pause the run. Three surfaces, one engine. Same Klaus-passing, BCD-correct,
cycle-accurate CPU underneath all of them.

The repo's at [github.com/nkane/chippy][chippy-repo] and the playground's at [nkane.dev/chippy/][playground]. The next
project's already in `docs/plans/` — an NES emulator built on top of chippy's CPU core. Onward.

[8-bit-post]: /posts/2024-08-23-8-bit-breadboard-computer/
[bcd-tutorial]: http://www.6502.org/tutorials/decimal_mode.html
[cc65]: https://cc65.github.io/
[bubbletea]: https://github.com/charmbracelet/bubbletea
[dap-spec]: https://microsoft.github.io/debug-adapter-protocol/
[goreleaser]: https://goreleaser.com/
[playground]: https://nkane.dev/chippy/
[chippy-repo]: https://github.com/nkane/chippy
