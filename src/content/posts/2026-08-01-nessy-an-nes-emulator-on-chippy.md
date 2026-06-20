---
title: "Nessy: An NES Emulator on Top of Chippy, in Eight Releases"
pubDate: 2026-08-01
tags: ["engineering", "nes", "emulator", "6502", "ppu", "apu", "mappers", "go"]
---

# Why a second emulator

The chippy v1.1 post mentioned a `VariantNES` decision — a six-line file that taught chippy's 6502 core the
one specific thing the Ricoh 2A03 does differently from a stock NMOS 6502 (it disables decimal-mode BCD in ADC
and SBC). That decision was the seed. The thing it seeded is **nessy** — an NES emulator built entirely on top of
the chippy 6502 library, in its own repository at [github.com/nkane/nessy][nessy-repo].

The reason for a second project — and not, say, a `cmd/nessy` directory in chippy that grew into a full
emulator — is the dependency graph. The NES needs a PPU, an APU, an iNES loader, a mapper matrix that covers
roughly forty cartridge variants, a game window, an audio sink, and gamepad input. The game window means Ebiten,
which means CGO and X11/GL dev headers on Linux. None of that belongs in a 6502 library that ships clean Go
binaries. Carving nessy out is the v1.2 post's headline; this post is about everything nessy did *on its own
side* of that carve, from `v0.1.0` to the current `v0.8.0`.

Eight releases. NROM-only at the start, every Konami expansion-audio chip and a Mesen2-aligned cycle-precision
oracle at the end. Each release closes a specific accuracy gap or adds a class of mapper. I'm going to walk
them all.

A note on scope before we start: nessy is **not** at 1.0. There's a v1.0 epic tracking the remaining work
(audio mixer correctness, marketplace-grade release pipeline, the last few accuracy ROMs). The eight
0.x releases are the **emulator's working journal** — every release moves the cycle-precision dial or unlocks a
chunk of the licensed library. v1.0 is the version where I'd hand it to someone else; the 0.x releases are
where I'm building toward "would you actually want to play games on this." We're not there yet. We're close.

OK, in chronological order:

## v0.1.0 — NROM, Ebiten, and DAP-attach from the first frame (2026-05-15)

The thesis at v0.1.0: stand up a playable NROM-only NES on top of the chippy 6502 + DAP library, with
source-level debugging wired in from the *very first frame*.

There were five load-bearing calls in this release.

**Build on chippy, never reimplement the 6502.** The CPU comes from the chippy library — `cpu.NewVariant(bus,
cpu.VariantNES)` is the single seam. nessy owns the NES-specific silicon (cart, PPU, APU, joypad) and *only*
that. Every CPU fix lands in chippy and flows in via a `go get -u`. This boundary is the cleanest thing about
the whole project; it's also the boundary the v0.8.0 carve-out used to split the repos along.

**NROM only, with a typed "unsupported" gate.** Mapper 0 (no bank-switching, 16 or 32 KiB PRG + 8 KiB CHR) is
the simplest cartridge mapper. NES games released between 1983 and roughly 1987 are mostly NROM. The first
goal was "boot one." Everything else at the cart layer returned a typed `mapper N unsupported in v0.1` error,
so unsupported ROMs failed *honestly* instead of producing nondeterministic garbage. The `cart.Cartridge`
interface — `CPURead`, `CPUWrite`, `PPURead`, `PPUWrite`, `Mirroring` — is the seam every subsequent mapper
plugs into.

**iNES / NES 2.0 loader as the first nessy-specific code.** The iNES header is fiddly (the mapper number is
assembled from the high nibbles of flags 6 and 7, half of the flags 6 bits encode mirroring and trainer presence,
the PRG/CHR bank counts are post-header byte counts) and a frequent silent-corruption source. The
`internal/nes/ines` package parses iNES files into a `*ROM` with named sentinel errors for `errors.Is()` —
`ErrBadMagic`, `ErrZeroPRG`, `ErrTruncatedPRG`, and so on. NES 2.0 extensions are best-effort ignored at v0.1.

**Ebiten game window behind a build tag.** The Ebiten dependency on Linux requires CGO and X11/GL dev headers
that the chippy monorepo's default CI runners (at this point — nessy still lived inside chippy) didn't carry.
Every Ebiten-dependent file under `cmd/nessy/` got the `//go:build nessy` tag; a no-tag stub printed build
instructions so plain `go build ./...` stayed green. The full build is `go build -tags=nessy ./cmd/nessy`.
The Ebiten game loop runs `~29830` CPU cycles per `Update` (NTSC: 1.789773 MHz ÷ 60 fps) and blits
`ppu.FrameBuffer` via `screen.WritePixels` under `Layout(256, 240)`.

**DAP attach as a first-class one-shell feature.** `cmd/nessy` opens a DAP listener on TCP port `:14785` by
default. `chippy -nessy ROM` launches the game and an attachable debug server from one shell. A
`-wait-for-debugger` flag pauses the CPU at the reset vector until a DAP client attaches — for cases where you
need to break on the first instruction without the launcher racing the game loop. This is the v1.1.1
"server owns CPU execution" ownership model from chippy's side, made real on nessy's side by pausing the
emulator's `Update` loop on attach.

The unit-test pattern that came out of this release and stayed: hand-rolled ca65 demos under `roms/demos/`,
each with a `Makefile` to rebuild the `.nes` from source, each booted headlessly through `buildNES`, advanced
a fixed number of frames, framebuffer-SHA-asserted against a pinned value. The demos at v0.1.0 were `hello-bg`
(a static "HELLO NESSY" title screen testing palette + nametable + reset path), `input-echo` (joypad strobe +
8 indicator boxes lighting up under live input), and `vblank-bounce` (a single tile bouncing inside the
playfield, driven by the `$FFFA` NMI vector). Three demos, three layers of the stack, three regression gates
that need no external assets.

<img src="/assets/nessy-demos/nessy-vblank-bounce.gif" alt="nessy vblank-bounce demo: NMI-driven tile animation" class="center-small-img" />

<img src="/assets/nessy-demos/nessy-input-echo.gif" alt="nessy input-echo demo: joypad-driven indicator boxes" class="center-small-img" />

What v0.1.0 doesn't do: scroll mid-frame, sprite-0 hit, audio, anything past NROM.

## v0.2.0 — Super Mario Bros. 1 boots (2026-05-20, with v0.2.1 hardening folded in)

The thesis: move the 2C02 (the NES PPU) from a per-frame blitter to a per-scanline renderer with sprites and
mid-frame scroll, and steal the bus for `$4014` OAMDMA. Enough to boot SMB1.

The four big mechanical changes:

**OAMDMA via CPU bus-steal.** Sprites need their 256-byte OAM populated. Games drive that through a single
`$4014` write that DMAs a CPU page into OAM while stalling the CPU ~513 cycles. v0.2.0 used the chippy
`cpu.Stall(n)` API — queue 513 cycles, drain them as a block on the next `Step`. The block model was coarse:
it skipped the 514-cycle odd-CPU-cycle alignment penalty and didn't account for per-byte sub-cycle DMC
interleaving (no DMC contention to interleave with yet). That seam got replaced in v0.8.0 with Mesen2's
`ProcessPendingDma` model — flag intent from the peripheral (`cpu.SetNeedSpriteDma(page)`), let the CPU drain
it inside its read path at the correct cycle parity. v0.2 was good enough for SMB1; v0.8 made it cycle-exact.

**Per-scanline rendering.** The v0.1 PPU rasterized the whole frame at vblank entry from one scroll/state
snapshot. That cannot express any mid-frame effect, and SMB1's status bar over a scrolling playfield is exactly
a mid-frame change. The refactor walks scanlines 0..239 and renders each row independently from a
`scrollSnapshot{scanline, scrollX, scrollY, baseNametable}`. A single-tile-row cache keeps the common per-pixel
case at one bus read. This is structural prerequisite for everything cycle-accurate-PPU that came later.

**Mid-frame scroll via a per-scanline event log.** With per-scanline rendering in place, scroll writes that
land mid-frame must affect only the rows that follow. SMB1 splits the screen by rewriting scroll mid-frame.
The implementation: `stepDot` snapshots `frameStartScroll` when scanline rolls back to 0, capturing whatever
the game wrote during vblank; any scroll-relevant `$2000`/`$2005`/`$2006` write during scanlines 0..239 appends
a `scrollSnapshot` to a per-frame `scrollEvents` log; `renderFrame` advances through the log row by row.
`scrollFromV()` synthesizes scrollX/scrollY/baseNametable from the 15-bit loopy `v` latch so the `$2006`
mid-frame address pair (SMB1's split mechanism) produces correct snapshots. Horizontal + vertical nametable
wrap at the 256/240 boundaries is honored.

**Sprite layer, sprite-0 hit, sprite-overflow groundwork.** `renderFrame` seeds a `bgOpaque` mask;
`renderSprites` composites the 64-sprite OAM on top with the proper "lower OAM index wins on overlap" rule,
honoring attribute palette, behind-BG priority, h/v flip, 8×8 and 8×16 modes. Sprite-0 hit latches `$2002`
bit 6 whenever an opaque sprite-0 pixel coincides with an opaque BG pixel. Sprite overflow latches bit 5 on
crossing more than 8 sprites per scanline.

The hit and overflow were "simple-correct" at v0.2 — frame-granular hit (not dot-exact), the *>8 sprites* rule
for overflow (not the silicon's actual sprite-overflow bug, which involves attribute-byte misalignment).
Both got upgraded later when the per-dot PPU model landed.

The milestone gate: SMB1 boots, scrolls, shows the split status bar. The v0.2 release wasn't done until that
held end-to-end. The release also folded in the first APU sound output — pulse 1 + pulse 2 channels, the
$4017 frame counter, Ebiten audio sink at 44.1 kHz int16. That's the audio thread the v0.3 release expanded
into a full 5-channel APU.

## v0.3.0 — full 5-channel APU, frame counter, non-linear DAC mixer, MMC1 (2026-05-24)

The thesis: complete the 2A03 audio path. Triangle, noise, DMC join the two pulse channels under a 4-step /
5-step frame counter and a non-linear DAC mixer. And the first serial-shift-register mapper: MMC1.

The audio threads:

**Triangle and noise on the existing `cpu.Ticker` clock.** v0.2's pulse-only APU advanced as a `cpu.Ticker`
(the v1.1 chippy hook). v0.3 adds `triangleChannel` and `noiseChannel` as siblings of `pulseChannel`, each
ticked from `APU.stepCPU`. The pulse and noise timers clock every *other* CPU cycle (`alternateTick`); the
triangle timer clocks *every* CPU cycle, because its 32-step sequencer needs the higher rate to reach audible
frequencies. The ticker hook carries the whole audio stack at zero extra plumbing cost.

**Frame counter: 4-step / 5-step with delayed `$4017` side effects.** `$4017` selects the frame-counter mode
(bit 7: 4-step / 240 Hz IRQ, 5-step / no IRQ) and the IRQ-inhibit flag (bit 6). On silicon the mode latch,
counter reset, and 5-step "immediate" tick are *delayed* 3 or 4 CPU cycles depending on cycle parity. Only the
IRQ-inhibit flag clear is immediate. The implementation models the split explicitly: `SetFrameCounter` applies
the inhibit/flag-clear immediately, then arms `frameResetDelay` (3 or 4 by cycle parity) with the latched
`$4017` byte; `stepCPU` counts down and calls `applyFrameCounterReset`.

This delayed-reset model is load-bearing for interrupt timing — `cpu_interrupts_v2` tests 3-5 fail without it
because the frame IRQ asserts a few cycles early and the calibration trial services an IRQ-hijack-NMI instead
of a plain NMI.

**Non-uniform 6-substep frame-counter table (Mesen-aligned).** The naive 4-step model reloads a uniform 7457
cycles per quarter-frame, summing to 29828 cycles per cycle. That's 2 cycles short of real silicon. The
half-frame tick fires one cycle too early for Blargg `apu_test` length-timing's polling window.

The fix: expand the 4-step sequence into 6 internal sub-steps with a non-uniform interval table, ported from
Mesen2 `ApuFrameCounter.h`:

```
frameStepIntervalsNtsc4Step = [6]int{7456, 7458, 7457, 1, 1, 7457}  // sums to 29830
frameStepIntervalsNtsc5Step = [6]int{7456, 7458, 7458, 7452, 1, 7457}  // sums to 37282
```

The user-visible "step 3" spans 3 CPU cycles (29828, 29829, 29830); the half-frame tick fires at cycle 29829.
This is a permanent invariant recorded in `CLAUDE.md`: the totals (29830 / 37282) and the 6-entry tables must
not be "simplified" back to 4 uniform steps. Same table was ported into chippy in chippy#380.

**DMC channel reusing the OAMDMA stall hook.** The delta-modulation channel (`$4010-$4013`) plays 1-bit delta
samples fetched from CPU memory. Sample-byte fetch steals CPU cycles (DMA stall) and sample exhaustion can
assert an IRQ. The DMC requests a refill via `fetchPending`; the byte read is drained inside the CPU's
`ProcessPendingDma` loop, which issues `bus.Read(APU.GetDmcReadAddress())` and hands the byte back through
`APU.SetDmcReadBuffer`. The DMC clock matches Mesen exactly: 8 fires per byte (not 9), fire-to-fire interval =
period (not period+1), `bitsRemaining` initializes to 8, period reloads to `period - 1`. DMC IRQ rides the
named source `"apu-dmc"`.

Reusing the OAMDMA stall hook avoided a second bespoke DMA path. Several DMC silicon details are pinned in
`CLAUDE.md`: `$4015` read does **not** clear the DMC IRQ flag (only the frame IRQ); `$4015` write or `$4010`
bit-7 clear acks it; `maybeRefill` silences only when buffer empty AND bytes-remaining zero; DMC enable
schedules an initial fetch.

**Non-linear DAC mixer.** v0.2's linear sum approximated channel mixing as `pulse1 + pulse2 + ...`. Real
silicon mixes through two non-linear DACs (a pulse DAC and a triangle/noise/DMC DAC). v0.3 implements the
nesdev formulas. The pulse term depends only on `p1 + p2` (31 distinct values), precomputed into `pulseTable`;
the tnd term has too many input combos (16 × 16 × 128) for a full LUT, so it's evaluated inline per sample.
`mixSample` returns roughly [0, 1.0]; `emitSample` scales to int16.

This *replaced* the v0.2 linear mixer outright. Cartridge expansion-audio chips (Sunsoft 5B, VRC6, VRC7) sum
onto the post-DAC sample, not through `mixSample` — on real hardware those chips live on the cart and mix with
console audio on the cart's analog out, outside the 2A03's DAC. The per-chip scale constants are tuned for
plausible relative level; tightening the balance is deferred to the v1.0 audio epic.

<video src="/assets/nessy-demos/nessy-all-channels.mp4" controls muted loop class="center-small-img" style="max-width:480px;"></video>

The clip above is the `all-channels` demo from this release: pulse 1, pulse 2, triangle, and noise running
together under the non-linear DAC mixer. Captured headlessly via the `cmd/nessy-record` recorder so the
audio is byte-identical to what comes out of the game window.

**MMC1 — the first serial-shift-register mapper.** Mapper 1, behind Zelda 1, Final Fantasy, Metroid,
Castlevania II, Dragon Warrior. Unlike NROM and the parallel-register families, MMC1 assembles a 5-bit value
**one bit per write**. Each write to `$8000-$FFFF` shifts bit 0 into a 5-bit accumulator; on the fifth write
the assembled value commits to one of four internal registers selected by destination-address bits 13-14.
A write with bit 7 set resets the shift register and ORs the PRG-mode bits to 3. Cart powers up with PRG mode
3 latched (last bank fixed at `$C000`). Battery-backed PRG-RAM at `$6000-$7FFF`.

The MMC1 "consecutive-cycle" silicon bug — back-to-back writes from RMW opcodes are ignored — was scoped out
of v0.3 and noted as a known gap.

## v0.4.0 — per-dot PPU, save states, UxROM, CNROM, MMC3 (2026-05-24)

This is the release I want to call out as the largest accuracy step in nessy's history. The thesis: turn the
PPU into a per-dot state machine and ship the persistence + mappers that unlock the bulk of the licensed
library.

The six big changes:

**Per-dot `stepDot` PPU model.** Per-scanline batches (v0.2) made sprite-0 hit land at frame-start (one big
render) and made the odd-frame dot-skip impossible to phase against a `$2001` write at a specific dot. Both
are timing-visible: SMB1 desyncs its scroll without the dot-skip; status-bar splits need sprite-0 latching at
the *real scanline of the overlap*.

`Run(masterClockDeadline)` loops `stepDot()` while `masterClock + PPUMasterClockDividerNTSC <= deadline`,
advancing `masterClock` by one PPU-dot's worth of master clocks per dot. Each `stepDot` increments `dot`,
wraps at `DotsPerScanline` (bumping `scanline`/`frameCount`), and runs the per-dot vblank-set/clear,
per-scanline BG render, and per-scanline sprite-0 detector inline rather than at frame boundaries.

This per-dot deadline loop is the spine every later accuracy refinement hangs off — the MMC3 A12-via-PPUADDR
clocking (v0.8), the deferred `$2006` v-update — they all reason in terms of "the dot the PPU is on."

**Odd-frame dot-skip via a delayed rendering-enabled latch.** On NTSC with rendering on, the pre-render
scanline is one dot shorter on odd frames (the PPU jumps from dot 339 straight to (0,0)). The skip decision
must sample rendering-enabled *at dot 339*, and Mesen2 models that sample with a 1-PPU-clock delay relative
to the live mask.

The latch: `renderingEnabledDelayed` synced at the end of each `stepDot` from the live mask; `oddSkipArmed`
latched at pre-render dot 339; the boundary check shortens the scanline by one only when the four conditions
align. This is the load-bearing "rendering-enabled has a 1 PPU-clock delay" invariant recorded in `CLAUDE.md`.

**Save-state v1 schema: gob + gzip, keyed by ROM SHA-256.** The top-level `nesSaveState` envelope
(`Magic = "NESSAVE\x00"`, `Version = 1`, `ROMHash`) wraps each subsystem's `FullState`. Gob-encoded inside a
gzip wrapper (NES framebuffers compress 10x+). Slot files live at `~/.nessy/states/<rom-hash[:16]>-slot<N>.state`.
Load fails fast on magic/version mismatch and refuses a save captured for a different ROM. Capture/apply run
under `cpuMu` at an instruction boundary; restore applies the CPU last so cart-restore IRQ re-assertions don't
clobber it.

The format is **backward-compatible within v1** — new fields stay optional inside v1.x; a semantic change or
field removal requires bumping `stateVersion` plus a migration. Same v1 contract chippy's state file
maintains; same "freeze on day one, version on rev" pattern. Same v1 contract still holds at v0.8.

**Battery-backed PRG-RAM (.sav).** Separate path under `~/.nessy/sav/<sha256-of-rom>.sav`, keyed by ROM hash.
Cart exposes `BatteryBacked() bool` + `PRGRAM() []byte`; `loadBattery` copies the file into PRG-RAM on boot;
`saveBattery` writes it back. Best-effort — a missing or mismatched `.sav` logs and is ignored, never fatal.

Battery saves are decoupled from save-state slots (different directory, different keying width, raw `[]byte`
not the gob envelope) so the two persistence stories version independently.

**UxROM (mapper 2) and CNROM (mapper 3).** UxROM (Mega Man 1/2, Castlevania, Contra, DuckTales, Metal Gear)
switches a 16 KiB PRG bank at `$8000-$BFFF` from the low nibble of any `$8000-$FFFF` write, hardwires the last
bank, ships 8 KiB CHR-RAM. CNROM (Arkanoid, sport titles) keeps a fixed NROM-style PRG window and switches an
8 KiB CHR bank. Both pin mirroring at construction and modulo bank indices by the real bank count so over-wide
writes wrap. UNROM bus-conflict quirk gated behind iNES 2.0 sub-mapper 2.

**MMC3 (mapper 4) with the A12 scanline IRQ.** The late-NES workhorse: SMB3, Mega Man 3-6, Kirby's Adventure,
Crystalis, Battletoads. The headline feature is the scanline IRQ that fires on A12 rising edges so games split
the screen by fetch timing instead of sprite-0 polling.

Full register file: `$8000`/`$8001` bank select+data, `$A000` mirroring, `$A001` PRG-RAM protect,
`$C000`/`$C001` IRQ latch+reload, `$E000`/`$E001` IRQ disable+ack / enable. The A12 counter clocks on the
rising edge of PPU-bus bit 12 (`clockA12`), debounced by `prevA12` so a low dwell is required before the next
edge counts. On counter underflow with IRQ enabled, it asserts via the named source `"mmc3"`. `$E000` acks.

Both Sharp **RevB** (default) and NEC **RevA** (sub-mapper 3, Klax) reload/fire orderings are implemented.

MMC3 is the first mapper to drive the CPU IRQ line — it establishes the `IRQSink` named-source contract
(`AssertIRQSource`/`ClearIRQSource`) that later expansion-IRQ mappers reuse. At v0.4.0 the counter clocks
purely through CHR fetches in `PPURead`/`PPUWrite`. That under-counts edges the PPU drives via `$2006`/`$2007`
while rendering is off — the `NotifyVRAMAddr` PPUADDR hook (sharing `prevA12` so a single rise can't
double-count) is the v0.8-era refinement that closes the remaining `mmc3_test` sub-tests; the per-dot model
from this release is what makes that hook's "gate on `!renderingEnabled()`" reasoning possible.

## v0.5.0 — VRC2/VRC4, FME-7, Sunsoft 5B audio, $2007 open-bus latch (2026-05-24)

The thesis: bring up the Konami VRC2/VRC4 mapper family and the Sunsoft FME-7 (with its YM2149-clone expansion
audio), and pin the 2C02's shared-bus open-bus behavior.

**One `VRC` type for the whole VRC2/VRC4 family.** Konami shipped the same silicon under four iNES mapper
numbers (21, 22, 23, 25). Register *classes* — `$8000` PRG, `$9000` mirroring/PRG-mode, `$A000` PRG,
`$B000-$E000` CHR, `$F000` IRQ — are identical across all of them; only the wiring of the two "sub-bits"
inside each class differs by pinout. Modeling each mapper number as its own type would have duplicated the
entire bank-switching surface four times.

The solution: a single `cart.VRC` carries the shared wiring; a `vrcVariant` enum (VRC2a/b/c, VRC4a/b/f)
selects the per-variant pin layout; `subBits(addr)` maps a register-write address to its 0..3 sub-index per
variant. `NewVRC` resolves mapper number + sub-mapper to a variant (and an `isVRC4` flag) once at
construction. The VRC2a outlier (mapper 22 routes only the upper 7 of 8 CHR bank bits) is one right-shift at
CHR-read time.

Adding or correcting a pinout is a one-line `subBits` change, not a new mapper. PRG mode 1 (swap
`$8000`/`$C000`) is VRC4-only and gated on `isVRC4`; VRC2 writes to `$F000` IRQ class fall through as no-ops.
Template for VRC6 and VRC7 later.

**VRC4 CPU-clocked IRQ as a `cpu.Ticker`; VRC2 leaves it silent.** VRC4 adds a software IRQ counter (the
scanline counter Konami games lean on for raster splits) that VRC2 omits entirely. Two modes: scanline mode
driven by a 341-CPU-cycle prescaler and CPU mode that ticks every cycle. Plus an "enable after acknowledge"
latch.

`VRC.Tick(cycles)` advances the counter; it early-returns unless `isVRC4 && irqEnable`. VRC2 carts pay nothing
for the IRQ machinery. Routing through a *named* IRQ source means multiple cart/APU IRQ lines share the CPU's
single /IRQ surface without clobbering each other.

**FME-7 (mapper 69) as a command/parameter mapper.** Sunsoft's FME-7 / 5B mapper (Gimmick!, Batman: Return of
the Joker) uses a command-port / parameter-port pair (`$8000` latches a 4-bit command, `$A000` writes its
parameter) covering eight 1 KiB CHR banks, four switchable 8 KiB PRG windows, mirroring, and a 16-bit
down-counter IRQ.

Dedicated `cart.FME7` with the command/parameter decode in `applyParameter`, fixed last-bank pinned at
`$E000`, `Tick`-driven 16-bit counter that fires the named `"fme7"` IRQ source on underflow. Same VRC IRQ-sink
+ ticker shape from above.

**Sunsoft 5B audio in `apu`, fed by the cart through a narrow sink.** Mapper 69 is two chips on one cartridge —
the FME-7 bank-switcher and a Sunsoft 5B audio block (a YM2149 / PSG "SSG" clone: three square channels,
per-channel amplitude, envelope generator, noise generator). The audio block is addressed through the *cart's*
`$C000` (address latch) / `$E000` (data) port pair, but it's conceptually an APU peripheral.

Decoupled: `apu.Sunsoft5B` owns the register file, tone/envelope state, mixing; the cart exposes a one-method
`cart.Sunsoft5BSink` (`Write(addr, v)`) and forwards `$C000`/`$E000` writes to it via `FME7.SetAudioSink`.
The cart package never imports the apu package; the audio chip is testable in isolation. With no sink wired,
the cart silently drops the audio-port writes — matching a real FME-7-without-audio board.

v0.5 ships a minimum-viable 5B: tone channels at the YM2149 /16 prescaler plus sawtooth (shape 0xE) / triangle
(shape 0xA) envelopes — enough for Gimmick!. Noise LFSR and exotic envelope shapes deferred.

**$2007 PPU open-bus latch.** The 2C02's external data bus is shared between CPU and PPU accesses and
behaves as a capacitive latch that retains the last byte driven onto it. Write-only registers
(`$2000`/`$2001`/`$2003`/`$2005`/`$2006`) read back this latch; `$2002` drives only its top 3 bits and leaves
the bottom 5 as latch; palette reads (`$3F00-$3FFF`) drive only 6 bits, leaving the top 2 as latch.
`ppu_open_bus.nes` probes all of this.

A single `openBus byte` field updated on every `$2000-$2007` access. Writes set it to the written byte.
`$2002` returns `(status & 0xE0) | (openBus & 0x1F)` and refreshes the latch's top 3 bits from status.
`$2007` non-palette reads return the read buffer and latch it; palette reads return `pal6 | (openBus & 0xC0)`
and latch only the 6 palette bits.

The latch is part of PPU save-state so it round-trips deterministically. Per-bit DRAM-cell decay (~1 frame on
silicon) is deliberately not modeled — the latch holds indefinitely, which is correct for every shipping ROM
that reads it and keeps captures deterministic.

## v0.6.0 — VRC6 audio, VRC7 cart shell, WASM playground, DMA contention (2026-05-24)

The thesis: broaden Konami expansion-audio mapper coverage, ship an in-browser playground on the shared core,
and start modeling single-DMA-controller bus contention.

**VRC6 3-channel expansion audio (mappers 24 / 26).** Castlevania III (JP) and other Konami VRC6 titles route
a dedicated audio chip — two pulse channels plus a sawtooth — through the cart on top of a VRC4-shape
PRG/CHR/IRQ surface. `cart.VRC6` covers both mapper 24 (VRC6a, A0/A1 routing) and mapper 26 (VRC6b, A1/A0
swapped) via a `subBits()` variant selector. Audio registers (`$9000-$9002` pulse 1, `$A000-$A002` pulse 2,
`$B000-$B002` sawtooth) forward through a `cart.VRC6AudioSink` hook. `apu.VRC6Audio` wires into the mixer via
the `SetAudioSink` type-assertion probe — same shape as Sunsoft 5B for FME-7.

This establishes the cart-audio sink pattern as the seam for every expansion chip: APU mixer gains expansion
inputs without the cart package depending on `apu`. Mixer stays a linear sum + scale post-DAC (non-linear DAC
deferred).

**VRC7 cart shell only; OPLL FM synth deferred (mapper 85).** VRC7 (Lagrange Point) packages a Yamaha YM2413
(OPLL) FM synthesizer alongside a VRC4-shape mapper. The OPLL is large enough that bundling it would have
made one oversized PR. v0.6 ships the cart side only: PRG/CHR banking, VRC4-style IRQ (CPU + scanline modes,
8-bit counter), mirroring/WRAM control, audio-port address routing (`$9010` register select / `$9030` data
write). Audio-register writes forward through a `cart.VRC7AudioSink` so a future `apu.OPLL` drops in without
touching the cart.

Mapper-85 ROMs load and run with FM voices silent. The OPLL completes in v0.7.

**WASM playground on the shared `internal/nes` backend.** An in-browser demo lowers the barrier to trying
nessy, but the desktop binary pulls in Ebiten's CGO/GL desktop path. `cmd/nessy-wasm` (`//go:build js && wasm`),
built with `GOOS=js GOARCH=wasm`, reuses the exact `internal/nes` backend (cart / ppu / apu / dma / joypad)
and Ebiten's js/wasm path (which drives `requestAnimationFrame` internally), with no desktop windowing. A
default demo ROM is embedded so the page boots into live output; a JS-side `nessy.loadROM(Uint8Array)` swaps
the running bus. HTML/JS shell lives in `web/nessy`.

Three front-ends — `cmd/nessy`, `cmd/nessy-record`, `cmd/nessy-wasm` — now share one emulator core. Bus wiring
is duplicated from `cmd/nessy/wiring.go` rather than imported (two `main` packages can't share types without a
refactor). Audio is not yet wired on the wasm path (the js/wasm audio context needs a user-gesture unlock);
samples are drained each frame to keep the ring buffer from filling.

**DMC / OAMDMA single-controller bus contention.** Real silicon has one DMA controller. When a DMC sample
fetch fires inside an in-flight OAMDMA window, the DMC fetch waits for an OAMDMA byte slot and pays an
alignment penalty.

A `PendingStall() int` accessor on the CPU; the `apu.DMCStaller` interface gains it. `dmc.maybeRefill` bumps
the normal 4-cycle DMC stall to 6 when the staller reports non-zero pending DMA debt. The test baselines a
non-contended run, re-runs with `pending=100`, asserts the per-fetch stall went 4 → 6.

Directionally correct and bounded — most shipping ROMs sit outside the contention envelope. A sample-perfect
model needs per-cycle DMA accounting nessy doesn't yet have. That accounting arrives in v0.8 with the Mesen2
`ProcessPendingDma` port, which subsumes this approximation.

<img src="/assets/nessy-demos/nessy-oam-grid.gif" alt="nessy oam-grid demo: 64-sprite OAMDMA stress" class="center-small-img" />

The `oam-grid` demo above stresses all 64 hardware sprites at once via `$4014` OAMDMA. By v0.6 the
single-DMA-controller contention model from D4 above kicks in when DMC fetches collide with this DMA window.

**Daily-driver CLI: recent-ROMs list + controller rebinding.** A recent-ROMs list at `~/.nessy/recent` (up to
5 absolute paths, newest first, deduped). `nessy` with no args prints the numbered list; `nessy N` (1..5)
opens slot N; a positional path opens verbatim. Controller rebinding at `~/.nessy/controller.json` maps
per-player NES button names to Ebiten key names with tolerant identifier normalization (case / whitespace /
dashes / underscores). Missing entries keep the default mapping.

`~/.nessy/` becomes the home for nessy user config alongside the existing save-state directory.

## v0.7.0 — VRC7 OPLL, PAL/Dendy timing, headless recorder, accuracy gate (2026-05-25)

The thesis: round out expansion audio (VRC7 FM), make timing region-aware, and stand up the CI-friendly
capture + accuracy-ROM safety net.

**VRC7 OPLL FM synthesis.** The cart shipped in v0.6 silent. Lagrange Point — the sole commercial NES VRC7
title — needs its Yamaha YM2413 (OPLL) soundtrack to play. The OPLL is a 2-operator FM synth, structurally
unlike the 2A03's subtractive pulse/triangle/noise and unlike the additive VRC6/Sunsoft 5B square-wave
expanders.

`apu.VRC7Audio` — six melodic 2-operator (modulator → carrier) FM voices driven from the 15-entry fixed
instrument patch ROM plus one user-programmable patch, latched through the cart's `$9010` address / `$9030`
data port pair. Implemented as a **functional** FM synth: phase + ADSR envelope advance once per emitted
sample (`Output` called at `apu.SampleRate`) using float sine FM, rather than porting the chip's exact
log/exp LUT pipeline. KSL, vibrato/tremolo depth, precise ADSR rate tables — simplified.

Lagrange Point's soundtrack plays. The deliberate "audible + recognisable, not cycle-exact" fidelity bar keeps
the implementation small and testable. A future bit-exact OPLL pass would be a separate effort.

Expansion-audio coverage is now VRC6, Sunsoft 5B (YM2149 clone), and VRC7 (OPLL) — three distinct synthesis
families behind the one APU mixer.

**Region-aware timing: PAL + Dendy alongside NTSC.** The whole clock/geometry stack (CPU step budget, PPU
scanline grid, APU frame-counter step length) was NTSC-hardcoded. `nes.Timing` is a value struct bundling the
per-region constants — `CPUClockHz`, `FPS`, `CyclesPerFrame`, `ScanlinesPerFrame`, `PreRenderScanline`,
`OddFrameSkip`, `QuarterFrameCycles` — with three instances:

- **NTSC** (2C02): 60 Hz, 1.789773 MHz, 262 scanlines, odd-frame dot-skip.
- **PAL** (2C07): 50 Hz, 1.662607 MHz, 312 scanlines, no dot-skip.
- **Dendy**: 50 Hz at a PAL-ish CPU rate but NTSC-shaped 262-line geometry.

`TimingFor(tv)` maps the iNES/NES 2.0 TV-system field (`flag12`) to a `Timing`; `TVDual` and any unknown value
fall back to NTSC. PAL/Dendy carts run at their native frame cadence and frame-counter periods, with NTSC the
safe default so the existing demo + accuracy corpus stays pinned. Constants that don't vary across regions
(341 dots/scanline, vblank at scanline 241 dot 1, 240 visible lines) are documented as invariant rather than
re-derived per region.

**Headless deterministic recorder (`cmd/nessy-record`).** Capturing a clip for docs/PR review meant
screen-recording an Ebiten window — non-deterministic, GL-dependent, impossible in CI. The emulator already
produces a PPU framebuffer and a drained APU sample batch per frame; nothing forced those through a window to
capture them.

`cmd/nessy-record` drives `internal/nes` with no Ebiten/GL dependency. Steps frame-by-frame, snapshots each
framebuffer as a video frame, each drained APU batch as audio, applies a scripted JSON input timeline to the
joypad. GIF output is pure stdlib (`image/gif`, palette built from frames — NES ≤64 colors, under GIF's 256
cap); MP4 output (H.264 video + AAC audio) shells out to `ffmpeg`.

Same ROM + script = byte-identical recording. Clips become reliable PR smoke artifacts with no timing flake.
Capturing video + audio from the same `stepFrame` keeps them in sync by construction. The recorder shares
`internal/nes` with the game and WASM binaries — it exercises the real emulator core, not a stub.

**Blargg/nesdev accuracy suite + `knownFail` gate pattern.** The cycle-precision CPU/PPU/APU work needed a
standing regression net. Test-ROM corpus is GPL — can't be vendored. Many ROMs expose *real, tracked*
accuracy gaps; a strict pass/fail gate would either be perpetually red or tempt deleting the failing ROMs.

`accuracy`-build-tagged suite (`cmd/nessy/accuracy_test.go`) runs each ROM through the full iNES → cart →
MMIO → CPU+PPU+APU integration and reads Blargg's `$6000` status protocol. ROMs are env-overridable, otherwise
downloaded + SHA-pinned into a local cache (downloads retry transient 5xx/429 with linear backoff so a flaky
GitHub-raw 504 can't red the gate). Each fixture carries an optional `knownFail` string: a ROM that fails is
**skipped with its tracked-gap note** instead of failing the build, while any regression in a currently-passing
ROM is a hard failure.

The passing suite at v0.7: `ppu_vbl_nmi 10/10`, `instr_timing`, `cpu_interrupts_v2 5/5`, `apu_test 8/8`,
`instr_misc 4/4`, `instr_test-v5_official 16/16`, `oam_read`, `mmc3_test 1/2/3/5`. Open gaps (`oam_stress`,
`ppu_open_bus`, `mmc3_test 4/6`, visual-only and init-hanging ROMs) are documented inline against their
tracking issues rather than hidden. Clearing a `knownFail` is the explicit signal that a gap closed.

This harness is the safety net every subsequent accuracy change is measured against.

## v0.8.0 — chippy carve-out + Mesen2 as the cycle-precision reference (2026-05-25)

The thesis: split nessy out of the chippy monorepo into its own repo, stand up the post-carve CI + release
foundation, and adopt Mesen2 as the single source of truth for every cycle-precision invariant.

This is the largest release in nessy's history by structural impact, even though most of the work landed in
the chippy *dependency* rather than nessy's tree.

**Carve nessy into its own repo.** chippy is library-shaped: a 6502 CPU + bus + DAP server with no graphics
dependencies. nessy needs Ebiten, which drags in CGO and X11/GL on Linux. While both lived in one repo,
anyone consuming chippy's CPU as a library had to pull the entire NES + Ebiten dependency graph. The two
sides had also diverged in release cadence: chippy ships clean 6502 library tags, nessy ships emulator
binaries.

The split: nessy becomes its own repository depending on `github.com/nkane/chippy` as a normal pinned module
(`go.mod`), consuming the public `cpu`, `dap`, `peripheral`, `symbols`, `trace`, `loader`, and `expr`
packages. The chippy-side accuracy + sub-cycle work that landed across many PRs while the two were a single
repo becomes a **library dependency** rather than in-tree code — most of the load-bearing CPU invariants now
live in the dep, not this repo.

Each side versions on its own cadence; chippy ships as a clean 6502 library with no GL deps. Cost: a two-repo
dependency edge. A CPU-core fix requires a chippy release + a `go.mod` bump here. chippy's public API is
semver-stable, so bumping is safe within a major.

Git history preserved via `git filter-repo`.

**Rename release tags `nessy-v:v`.** Inside the monorepo, nessy releases were tagged `nessy-v*` to
disambiguate from chippy's bare `vX.Y.Z`. After the carve there's no chippy tag to collide with; the
`nessy-v` prefix breaks goreleaser's default `vX.Y.Z` expectations and the `go install module@vX.Y.Z`
convention. `git filter-repo --tag-rename nessy-v:v` so nessy ships under bare `vX.Y.Z` tags from here.

**Adopt Mesen2 as the cycle-precision reference.** "Cycle-accurate" needs an oracle. The nesdev wiki is
necessary but underspecifies sub-cycle ordering (interrupt poll timing, DMA bus-steal parity, PPU
render-enable latency). Independent guesswork produced ROMs that passed one sub-test and regressed another.

Mesen2's `Core/NES/` is now the single source of truth for every cycle-precision detail. When a behavior is
ambiguous, the implementation matches Mesen2's, and every load-bearing borrow carries an explicit Mesen source
line reference in the PR thread and in `CLAUDE.md`. The per-cycle interleave path is gated on `cpu.VariantNES`
— chippy keeps its instruction-stepped batch tick for NMOS / 65C02 so the chippy debugger, Klaus functional
tests, and BCD sweeps stay byte-identical.

A consistent oracle ended the whack-a-mole. The cost is a hard dependency on one reference emulator's
interpretation; where Mesen models a quirk nessy hasn't ported yet (e.g. the deferred `$2006` v-update, 3 PPU
cycles), the affected sub-tests are tracked-skipped rather than approximated.

**Master-clock model + per-cycle CPU↔PPU interleave (chippy-side).** For `VariantNES`, `cpu.Step` runs 1:1 —
every bus access ticks the chain one cycle, with addressing-mode dummy reads added per template. The
master-clock model uses NTSC 12 mc/CPU cycle, 4 mc/PPU dot, `ppuOffset=1`; a read splits its master-clock
budget +5 pre / +7 post around the bus access, a write +7 pre / +5 post, calling `PPU.Run(deadline)` at each
split. Mirrors Mesen2 `Start/EndCpuCycle`.

The `instrCycles == accounted` assertion at the end of each instruction is a proven invariant guard.

The PPU catches up to the CPU's exact mid-cycle phase, dot by dot. Substrate every PPU- and DMA-timing ROM
depends on.

**Interrupt sub-cycle ordering: NMI hijack, poll-latch delay, branch quirk (chippy-side).** The
`cpu_interrupts_v2` suite pins ordering details:

- The **NMI hijack check sits between `push16(PC)` and `push(P)`** in `serviceVector` (Mesen2 `NesCpu::IRQ`
  order) — cleared `nmi_and_irq` (test 3).
- **NMI/IRQ poll latches sample at the penultimate cycle** via `nmiPollPrev` / `irqPollPrev` one-cycle delay —
  `cli_latency` and `nmi_and_brk` depend on this.
- The **branch IRQ-poll quirk**: a taken non-page-cross branch ignores an IRQ asserted at its last clock;
  `branch()` rolls back `irqPollPrev` if it just rose this cycle.
- The `serviceNMI` edge latch is cleared BEFORE the 7 service cycles or a spurious second NMI fires.

`cpu_interrupts_v2` reaches 5/5.

**Mesen2 `ProcessPendingDma` port (OAMDMA + DMC bus-steal).** OAMDMA (`$4014`) and DMC sample fetches both
steal the bus, and they contend with each other and with interrupt polling on specific cycle parities. The old
`cpu.Stall(513)` model couldn't express the interleave.

Port Mesen2's `ProcessPendingDma`. Peripherals only flag intent — `OAMDMA.Write` → `cpu.SetNeedSpriteDma(page)`,
`dmcChannel.maybeRefill` → `cpu.SetNeedDmcDma()` — both set `needHalt`. On the next `CPU.read` at opcode fetch
where `needHalt` is set, the drain runs: a halt cycle (dummy read at the opcode-fetch PC), then a loop on
cycle parity — sprite reads on getCycle, sprite writes on putCycle, DMC reads merged in, alignment dummies
inserted as needed. The nessy-side `dma/` peripheral is now just the state-signal flag; the bus-steal runs
inside the CPU.

`irq_and_dma` (test 4) passes. DMC↔OAMDMA contention is exact. The CPU owns DMA entirely.

**APU frame counter: non-uniform 6-substep NTSC table (chippy + nessy-side).** Modeling the NTSC 4-step
frame counter as 4×7457 (=29828) cycles puts the half-frame tick on the wrong cycle and fails `apu_test`
IRQ-timing. Mesen2's 6-internal-substep table totals **29830** CPU cycles per cycle:
`[7456, 7458, 7457, 1, 1, 7457]`. The user-visible "step 3" spans CPU cycles 29828–29830; the half-frame tick
fires at cycle 29829 (Mesen step 4), not 29828. The 5-step analogue is `[7456, 7458, 7458, 7452, 1, 7457]`.
Promoted from an earlier 4-entry form and ported to nessy in the same PR.

`apu_test` IRQ-flag and IRQ-timing sub-tests pass.

**DMC clock semantics + `$4015` IRQ-ack rules.** Match Mesen exactly:

- **8 fires per byte** (not 9), fire-to-fire = period (not period+1), schedule-fetch check runs every clock.
- `bitsRemaining` initializes to 8; reload to `period - 1` so the down-counter ticks `period` cycles between
  fires.
- **A `$4015` read does NOT clear the DMC IRQ flag** — only the frame-counter IRQ is cleared on `$4015` read.
  DMC IRQ acks via `$4015` write or `$4010` bit-7 clear.
- `maybeRefill` silences only when buffer empty AND `bytesRemaining == 0`; DMC enable schedules an initial
  fetch when buffer is empty with bytes pending, initialising `bufferEmpty=true, silenced=true`.

`apu_test` reaches 8/8. These four DMC rules are interdependent — `dmc_basics` test 10 pins the
`$4015`-read rule specifically.

**PPU `renderingEnabled` 1-PPU-clock delay (nessy-side).** The NTSC odd-frame dot-skip latch reads the
render-enable state, and reading the *live* mask puts the skip on the wrong frame. The latch uses
`renderingEnabledDelayed` — synced at the end of each `stepDot` from the live mask — NOT the live mask.
Mesen's `NesPpu::UpdateState` comment: "Rendering enabled flag is apparently set with a 1 cycle delay."

`ppu_vbl_nmi` reaches **10/10** — the hard accuracy gate.

## What v0.8 leaves on the pile

The known gaps after v0.8:

- `mmc3_test 4/6` — A12 timing edge cases the per-scanline counter doesn't quite catch. The `NotifyVRAMAddr`
  hook closes them; the underlying per-cycle approach is being moved into the per-dot PPU pipeline.
- `oam_stress` — a sprite-overflow silicon-bug edge case.
- `ppu_open_bus` — DRAM-cell decay timing.
- Several Visual-only ROMs and the init-hanging ROMs.
- `setVariable` for the DAP Globals scope (this lives in chippy, but the nessy debugger benefits when it lands).

The v1.0 epic at issue #13 tracks the remaining work. The release pipeline modernization — cosign signing,
Homebrew tap, AUR, signed artifacts — is tracked at #8. After v0.8 there's an in-flight `feat/per-dot` epic
that lifts the PPU from "per-scanline render + per-dot side effects" to a **fully per-dot pipeline**: per-dot
background fetches, per-dot sprite pipeline with dot-exact sprite-0, per-dot A12 from real fetches. The
batched renderer gets retired. The MMC3 RevA IRQ variant gets a hash-based revision-select. These are
heading toward v0.9.

## What this whole project taught me

Two takeaways from the eight-release arc.

**Build on top of a stable library, never alongside it.** nessy's relationship to chippy isn't "two projects
that share code"; it's "one project that depends on another via `go.mod` like every other Go program in the
world." The carve at v0.8 is what made this clean, and it should have happened earlier than it did — probably
at v0.3, when MMC1 landed and it was clear the cart layer would grow large. The cost of "we'll split later" is
hours per release of dependency-graph friction; the cost of splitting earlier is one Saturday afternoon. The
math is obvious in retrospect.

**Pick one reference emulator and align against it.** Before v0.8 I had been cross-referencing Mesen2,
FCEUX, and the nesdev wiki, and the result was a slow whack-a-mole where fixing one sub-test broke a different
one because the references didn't agree on sub-cycle ordering. Committing to Mesen2 as the single oracle —
and writing down each load-bearing borrow with a source-line citation — collapsed the rate of new-bug
introduction by something like 5×. The cost of being locked to one emulator's interpretation is real
(Mesen2 is an oracle, not a spec; if Mesen2 is wrong on some quirk and I match it, I'm also wrong) but it's a
tractable cost because the quirks where Mesen2 differs from silicon are documented, and I can deviate
intentionally where I have to.

## What's left, and what's next

There are gaps. The accuracy harness lists them honestly. The known-fail list will keep shrinking. Per-dot
PPU work is in flight. MMC5 is in the post-v0.8 tree. v1.0 is on the horizon — that's the version I'd hand to
someone else.

The chippy posts I wrote this past month and a half — six releases, v1.1 through v1.6 — are the story of the
substrate that made nessy possible. This post is the story of what got built on the substrate. The two
projects have always been one story, even when they were two repositories. I hope reading the seven posts in
sequence makes that clear, because writing them did.

Two binaries, one engine. The next project's already in the planning docs — but I'm going to take a beat. The
last seven Fridays have been about looking back. The next one can be about something new.

[chippy-repo]: https://github.com/nkane/chippy
[nessy-repo]: https://github.com/nkane/nessy
[mesen2]: https://github.com/SourMesen/Mesen2
[v1-post]: /posts/2026-05-13-chippy-6502-emulator/
[v1.1-post]: /posts/2026-06-20-chippy-v1.1-dap-and-nessy-seed/
[v1.2-post]: /posts/2026-06-27-chippy-v1.2-public-library-and-nessy-carveout/
[v1.3-post]: /posts/2026-07-04-chippy-v1.3-debugger-ux/
[v1.4-post]: /posts/2026-07-11-chippy-v1.4-custom-requests-and-removing-the-vscode-extension/
[v1.5-post]: /posts/2026-07-18-chippy-v1.5-dap-onramp-cpu-coverage-and-host-hooks/
[v1.6-post]: /posts/2026-07-25-chippy-v1.6-accuracy-tail-and-uxcleanup/
