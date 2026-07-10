---
title: "Nessy: Road to v1.0 — Clearing the knownFail List"
pubDate: 2026-08-15
tags: ["engineering", "nes", "emulator", "ppu", "apu", "accuracy", "go"]
---

# The accuracy half of the gap

The [v0.1–v0.8 retrospective][v08-post] ended on a deliberately unfinished note: "We're not there yet. We're
close." The v1.0 epic had two halves — a marketplace-grade release pipeline, and the last few accuracy ROMs.
This post is the accuracy half. The pipeline half (cosign, SBOM, nfpm, Homebrew, AUR) gets its own post,
because it's a genuinely different kind of work.

The accuracy suite at v0.8.0 was honest about its gaps. The `knownFail` pattern from v0.7 — a failing ROM is
skipped *with its tracked-gap note* instead of reddening the build — meant the remaining work was literally
enumerated in the test file: `ppu_open_bus` (DRAM-cell decay), `oam_stress` (an OAM quirk), the
`dmc_dma_during_read4` suite (a 2A03 DMA glitch nobody models casually), and two "visual-only" ROMs that
predate Blargg's `$6000` status protocol and were assumed to need a framebuffer harness. Plus two things
that weren't ROM failures but were accuracy debt all the same: the non-linear DAC mixer had shipped without
its Blargg validation story, and MMC5 — implemented across seven post-v0.8 PRs — had thorough unit coverage
but no end-to-end gate proving it renders correctly through the full PPU pipeline.

One housekeeping note before the receipts. The retrospective said "Mesen2 is the oracle." Upstream Mesen2
wound down this spring; development continues in the community fork [MesenCE][mesence] (same `Core/NES/`
layout, so every existing source-line citation stays valid). New work cites MesenCE; everything below does.

## ppu_open_bus: modeling the decay I'd deliberately skipped

The v0.5 post described the `$2007` open-bus latch and ended with a deliberate scope cut: "per-bit DRAM-cell
decay (~1 frame on silicon) is deliberately not modeled — the latch holds indefinitely, which is correct for
every shipping ROM that reads it." That was true for shipping ROMs. It was not true for `ppu_open_bus.nes`,
which failed at sub-test 3 — the decay test — precisely because nessy's latch never leaked.

Real silicon's open bus is a capacitive latch with per-bit decay: a bit reads back as written only until its
cell leaks, after which it reads 0. The fix (#92) replaces the single `openBus byte` with the byte plus an
`openBusStamp [8]uint64` — the frame each bit was last driven. Two helpers, mirroring MesenCE's
`NesPpu::SetOpenBus` / `ApplyOpenBus`, centralize every register touch point:

- `setOpenBus(mask, value)` drives the mask-selected bits (refreshing their stamps) and decays any
  unselected bit older than `openBusDecayFrames` — 3 frames, the deliberately conservative MesenCE value —
  to 0 on the next bus access.
- `applyOpenBus(mask, value)` returns the value with the mask-selected bits replaced by the post-decay
  latch, refreshing the bits the access actually drives.

All six open-bus touch points route through the pair: `$2002` becomes `applyOpenBus(0x1F, status&0xE0)`,
palette reads become `applyOpenBus(0xC0, pal)`, write-only registers return `applyOpenBus(0xFF, 0)`, and
the stamps serialize into save-state so captures stay deterministic.

That got the ROM to sub-test 10, which pins a different quirk entirely: the 2C02's OAM attribute byte
(sprite byte 2) has bits 2–4 unimplemented — they always read 0. So `$2004` reads where `oamAddr&3 == 2`
now mask with `0xE3`. With both in place, `ppu_open_bus` reads **11/11 PASS**.

## oam_stress: the free ROM

`oam_stress.nes` writes random data across OAM and reads it back, and it had been failing with status `$01`
since v0.7. The diagnosis turned out to be the sentence above: nessy was returning attribute-byte bits 2–4
verbatim, and a random-data read-back test notices that immediately. The `$2004` mask from #92 fixed it as a
side effect; #93 is a one-commit PR that retires the `knownFail`, notes the shared cause, and changes no
behavior. Two tracked gaps, one silicon quirk. The best kind of bug.

## dmc_dma_during_read4: the last open accuracy ROM

This one took five PRs across two repositories, and it's the most instructive convergence story in the
project so far.

`dma_2007_read.nes` (the representative ROM of Blargg's `dmc_dma_during_read4` suite) tests the 2A03's
DMA-during-register-read glitch: if a DMC DMA halts the CPU *while it's reading an internal register*
(`$4000-$401F`), the DMA unit's fetch conflicts with that register — a stray `$4015` read clears the frame
IRQ, controller reads on `$4016`/`$4017` lose bits, and the byte the DMC plays gets corrupted. The ROM has
no `$6000` shell and no result byte; it runs self-calibrating poll loops that only escape to a terminal
hang when the DMA steal lands on exactly the right cycle. In nessy it didn't hang at the end — it hung at
the *start*, forever.

The diagnosis chain (#89): the ROM spins in a `$4015` poll loop at PRG `$E062-$E076` — enable the DMC, read
`$4015`, loop while bit 4 is set. nessy's `setEnabled` loaded `bytesRemaining` immediately, so the active
bit read as set on every iteration. MesenCE cycle-delays both edges: enable defers the first DMA fetch by a
`transferStartDelay` of 2 or 3 cycles (parity-based), disable defers zeroing `bytesRemaining` similarly.
Porting that (#90) was faithful `dmc_dma_start_test` behavior but didn't converge the ROM — and the trace
showed why: *when* the steal happens is owned by chippy's `ProcessPendingDma`, a pinned dependency. The gap
had a repo boundary running through it.

So the fix landed in halves. The chippy half shipped as **chippy v1.8.0**: a `DmaReadBus` seam that tags
each DMA-window read with a `cpu.DmaKind`, plus steal-timing fixes so `idle()` polls the pending DMA (a
halt can drain on a taken-branch dummy-read cycle — a 4-cycle steal) and the get/put parity uses the true
cycle count. Two phase corrections came out of a cycle-by-cycle MesenCE reference run along the way (#94):
the `$4015` enable parity was inverted (`dbgCycles` runs one ahead of Mesen's `cycleCount` at the write
moment, so Mesen-even means dbgCycles-odd — the raw check armed the first DMC DMA one read late), and the
DMC output timer must initialize to `period`, not 0, or the first bit-boundary fires a cycle early.

The nessy half (#95) is `dmaBus` — a wrapper embedding `*cpu.MMIO`, installed via `processor.SetBus`, that
owns the host side of the glitch. Its `ReadDma(addr, kind)` routes by kind: the halt-cycle `DmaDummyRead`
captures the CPU's pending read address into `haltAddr` *and performs the read for real* (so a dummy read
of `$2007` still increments PPUADDR — the double-2007-read half of the glitch), and `processDmcRead` ports
MesenCE's `NesCpu::ProcessDmaRead`: when the halt landed in `$4000-$401F`, the DMC fetch is redirected to
`$4000 | (addr & $1F)`, with the `$4015` internal-bus read and the `$4016`/`$4017` bit-deletion + bus
conflict falling out of the formula. Off the DMA path it's pure pass-through — normal play unchanged.

Two details from this convergence are worth pinning. First, the root cause was found by a from-boot
`(PC, cycle)` diff against a headless MesenCE run: the two emulators were **bit-identical for 62,741
instructions**, then chippy's DMA halt landed one cycle late on a taken branch. When your oracle is another
emulator, an instruction-level lockstep diff is the best debugging tool you have. Second, the
grading: since the ROM's only success signal is reaching a terminal `JMP *` hang, the harness grew a
`runTerminalLoop` grader that treats sustained execution inside the `$E72F-$E735` window as a pass —
validated cycle-for-cycle against the MesenCE reference before trusting it. `knownFail` retired.

## Grading the visual-only ROMs

Two ROMs — `sprite_hit_tests_2005` (01.basics) and `cpu_timing_test6` — predate Blargg's `$6000` protocol
and had sat in the knownFail list under the assumption they'd need a framebuffer harness someday. Probing
them headlessly (#96) showed both have cheaper machine-readable verdicts:

- **sprite_hit 01.basics** is the same generation as `sprite_overflow`: it parks in a tight self-loop with
  the result in zero-page `$F8` (1 = passed). The existing `runParkedResult` grader covers it verbatim.
- **cpu_timing_test6** prints "6502 TIMING TEST / OFFICIAL INSTRUCTIONS ONLY / PASSED" to the PPU nametable
  and parks. A new `runScreenText` grader runs to park, then decodes the `$2000` nametable through the
  PPU's own `$2006`/`$2007` port — Blargg's font maps tile index equal to ASCII, so the nametable *is* the
  text — and passes iff the screen contains "PASSED" without "FAILED". Machine-readable and tolerant of
  layout shifts, unlike a pixel golden.

Both knownFails retired. At this point the suite passes every gradeable ROM it carries; the only remaining
skip is intentional (`instr_test-v5` test 3 hits `$AB` LXA/ATX, the unstable illegal opcode whose silicon
result depends on analog noise).

## An MMC5 gate: the fifth grading path

MMC5 (mapper 5 — Castlevania III US) landed after v0.8 in phases: CPU-side banking + the `$5205`/`$5206`
multiplier + ExRAM, then per-quadrant nametable mapping, the scanline IRQ, dual CHR banks for 8×16 sprites,
extended-attribute mode, and the 2-pulse + PCM expansion audio. All of it unit-tested in
`internal/nes/cart/mmc5_test.go` — and none of it gated end-to-end through the full PPU pipeline.

Drag's `mmc5test_v2` is the standard mapper exerciser, but it's interactive: no `$6000` shell, no result
byte, no verdict text. It boots to its "MMC5 CHR BANK TEST" menu and waits for input. So the harness grew a
fifth grading path (#100), `gradeScreenGolden`: step a fixed number of frames, encode the framebuffer as a
brightness-ramp ASCII grid (`asciiFrame`, shared with the demo-ASCII goldens from the per-cycle rewrite
safety net), and diff against a committed golden under `testdata/accuracy-screen/`. The menu frame alone
exercises PRG-exec, CHR bank switching, nametable mapping, and font rendering; it's frame-stable from frame
400 (verified bit-identical at 400 vs 600), graded at 450. Any MMC5 rendering regression now trips CI as a
picture diff — regenerable with `-asciiref-update` when a change is intentional.

The five grading paths — `runBlargg`, `runScreenText`, `runTerminalLoop`, `runParkedResult`,
`gradeScreenGolden` — are the quiet infrastructure story of this whole arc. Every test ROM has *some*
machine-readable success signal if you look hard enough; the harness just needed enough vocabulary to read
them all.

## apu_mixer: when the oracle is a human ear

The last accuracy-epic line item (#5) was validating the non-linear DAC mixer against Blargg's `apu_mixer`
ROMs. The mixer itself had shipped back in v0.3 — `pulseTable` for the saturating pulse DAC, the inline tnd
term — so the remaining work was supposed to be "wire four ROMs into the suite."

Probing all four (square / triangle / noise / dmc) headlessly showed they have **no programmatic verdict**.
Each one cancels the channel under test against the DMC DAC to near silence and prints listening
instructions; the `$6000` status reports `$00` meaning *completed*, not *passed*. A human ear is the
oracle. Wiring them into the accuracy suite would green forever regardless of mixer correctness — a gate
that can't fail is worse than no gate.

Instead, #101 pins the exact non-linearities those ROMs exercise as deterministic property tests at the
`mixSample` level, in `internal/nes/apu/mixer_test.go`:

- `TestMixer_SquareCrossAttenuation` — a second square adds less than the first (the pulse term saturates):
  `mix(15,15) < 2*mix(15,0)`.
- `TestMixer_TndCrossAttenuation` — DMC attenuates the triangle through the shared tnd term: combined
  output is less than the channels summed separately.
- `TestMixer_PulseTndGroupsIndependent` — a square's marginal contribution is independent of DMC level,
  because the pulse and tnd DACs are summed, not cross-mixed.

The exclusion rationale went into `CLAUDE.md` so a future session doesn't re-litigate `apu_mixer` as a
missing gate. And the all-channels demo SHA from v0.3 still holds — no mixer-output regression.

## The audit close-out: docs can be born stale

The last item was not a ROM but a claims audit (#105). Reviewing the accuracy docs for the v1.0 close-out
turned up `docs/mapper-compat.md` marking VRC7 audio as "silent — OPLL FM synth not yet wired." The OPLL
shipped in v0.7 — `apu.VRC7Audio`, six 2-operator FM voices, Lagrange Point's soundtrack plays — and the
compatibility matrix was written *after* that landed. It was born stale: written from memory of an older
status instead of from the tree.

The fix is small (the VRC7 row now describes the working synth, with the honest caveat that it's a
functional float-FM implementation rather than a cycle-exact log/exp-LUT OPLL), but the discipline is the
point: accuracy claims in docs are assertions about the emulator, and they rot exactly like stale comments.
The v0.6/v0.7 ADRs keep their "silent" wording — that's accurate provenance for what those releases shipped
at the time. Status docs get corrected; history doesn't.

## Where the dial sits

The knownFail list that closed v0.8 — `ppu_open_bus`, `oam_stress`, `mmc3_test` 4/6, the DMC-DMA suite, the
visual-only ROMs — is now empty of everything except the one intentional unstable-illegal skip. The suite
passes every gradeable ROM it carries, the mixer's non-linearity is pinned by properties instead of an
unwireable listening test, and MMC5 has a rendering gate. Getting there took one new PPU model (per-bit
open-bus decay), one cross-repo cycle-timing convergence (chippy v1.8.0's `DmaReadBus` seam plus nessy's
`dmaBus`), three new grading paths, and a docs audit.

That's the accuracy half of the road to v1.0. The other half — turning "a repo with tags" into "a thing you
can `brew install` and verify the signature on" — ran in parallel over the same weeks, and it's a different
enough discipline that it gets its own post. Between the two, the gap the retrospective ended on is mostly
closed. v1.0 is the version I'd hand to someone else. The hand is extending.

[nessy-repo]: https://github.com/nkane/nessy
[chippy-repo]: https://github.com/nkane/chippy
[mesence]: https://github.com/nesdev-org/MesenCE
[v08-post]: /posts/2026-08-01-nessy-an-nes-emulator-on-chippy/
