---
title: "Nessy: Shipping an Emulator — the Other Half of the Road to v1.0"
pubDate: 2026-08-29
tags: ["engineering", "nes", "emulator", "release-engineering", "wasm", "go"]
---

# Would you hand it to someone else

The [nessy eight-releases post][v08-post] ended on a definition: v1.0 is the version I'd hand to someone
else. After the v0.8.0 carve-out, the work toward that version split into two tracks that ran in parallel.

One track is accuracy — the last Blargg known-fails, the MMC5 rendering gate, the DMC-DMA convergence — and
that track got [its own post two weeks ago][accuracy-post], because "the emulator computes the right pixels
and samples" is its own story. This post is the other
track: everything that has nothing to do with cycle precision and everything to do with the *hand it to
someone else* test. Can they install it without a Go toolchain? Can they verify the binary they downloaded is
the one CI built? Can they find out whether their ROM's mapper is supported before they try it? Will it hold
60 fps on their machine, and how would I even know if a refactor quietly broke that? Can they try it without
installing anything at all?

Six PRs answer those questions: the release pipeline (#97, with its #99 follow-up fix), the mapper
compatibility matrix (#98), the performance gate (#102), the last debugger features (#103), the full WASM
playground (#104), and the chippy v1.12.0 resync (#106). None of them moved an accuracy dial. All of them
moved the "would you hand it to someone else" dial.

## The release pipeline goreleaser couldn't be (#97, #99)

chippy's release pipeline is a textbook goreleaser flow: pure Go, `CGO_ENABLED=0`, one runner cross-compiles
every target. I wanted the same artifact shape for nessy — per-OS archives, checksums, signatures, SBOMs,
Linux packages, Homebrew, AUR — and I assumed I'd get it the same way.

I couldn't. nessy is an Ebiten CGO app. CGO can't cross-compile from one runner, and goreleaser's OSS tier
can't ingest externally-built CGO binaries — the `prebuilt` builder was removed, and the split/merge workflow
that replaced it is Pro-only. So `.github/workflows/release.yml` hand-rolls the same artifact shape out of
standard tools:

- **A per-OS native build matrix.** `macos-latest` + `macos-15-intel` for darwin arm64/amd64,
  `ubuntu-latest` + `ubuntu-24.04-arm` for linux, `windows-latest`. Each leg builds `nessy` (with
  `-tags=nessy`, the Ebiten/CGO build) and the headless `nessy-record`, stamps `main.version/commit/date`
  via ldflags (both binaries grew a `-version` flag), archives as tar.gz or zip, and uploads.
- **A finalize job on ubuntu-latest.** Collects the archives, writes `checksums.txt`, keyless-cosign-signs
  every artifact (OIDC via `id-token: write` — no key to manage, no secret to rotate), generates a syft SPDX
  SBOM per archive, and builds `.deb` / `.rpm` / `.apk` packages via nfpm before `gh release create`
  publishes the lot.
- **Homebrew + AUR for stable tags only.** The cask goes to `nkane/homebrew-tap` with a postflight that
  clears the macOS quarantine xattr (the binary is cosign-signed but not Apple-notarized); the AUR side ships
  `nessy-bin`. A prerelease tag — anything with a hyphen, like `v0.9.0-rc.1` — builds, signs, packages, and
  publishes a GitHub prerelease but skips both, which makes an `-rc` tag a secret-free end-to-end smoke test
  of the entire pipeline.

The nfpm config (`packaging/nfpm.yaml`) is where the CGO difference shows up again in miniature: unlike
chippy's static binary, the nessy game binary dynamically links GL, X11, and ALSA, so the package declares
`libgl1`, `libx11-6`, `libasound2` and friends as runtime deps — with per-format overrides, because the same
libraries have different package names on rpm-land.

The end state, from the user's side:

```sh
brew install --cask nkane/tap/nessy   # macOS
yay -S nessy-bin                      # Arch
```

and for anyone who wants to check the supply chain:

```sh
cosign verify-blob \
  --certificate-identity=https://github.com/nkane/nessy/.github/workflows/release.yml@refs/tags/<TAG> \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  --bundle nessy_<VERSION>_linux_x86_64.tar.gz.cosign.bundle \
  nessy_<VERSION>_linux_x86_64.tar.gz
```

The smoke test earned its keep immediately. The first end-to-end run died in the finalize job, and the
failure is a nice little parable about toolchain coupling: the workflow installed nfpm with
`go install nfpm@latest`, which compiles it with the runner's Go — but nfpm 2.47 requires go 1.26.4 while
nessy's `go.mod` pins 1.26.2 under `GOTOOLCHAIN=local`. The fix (#99) installs nfpm as a prebuilt binary from
the goreleaser apt repo and drops setup-go from the finalize job entirely. A packaging tool's build
requirements should never be entangled with the project's pinned toolchain; installing tools as binaries
instead of `go install`-ing them is now the house rule.

## Saying what works: the mapper compatibility matrix (#98)

An emulator's honest surface area is its mapper list. nessy's had grown to eleven entries across eight
releases, and the only way to learn what was supported was to read the dispatch switch in
`internal/nes/cart/cart.go` or hit the fail-closed `cart: unsupported mapper N` error at load.

`docs/mapper-compat.md` is the table version: every mapper nessy ships — NROM, MMC1, UxROM, CNROM, MMC3,
MMC5, AOROM, the VRC2/VRC4 family (21/22/23/25), VRC6a/b (24/26), FME-7/Sunsoft 5B (69), VRC7 (85) — with its
PRG/CHR banking scheme, its audio expansion if any, one headliner ROM, and a **known gaps** column that is
allowed to be non-empty. The gaps column is the point. The VRC7 row says out loud that the OPLL is a
*functional* float-FM synth — audible and recognisable, not a cycle-exact log/exp-LUT pipeline — with the
chippy#315 reference for the bit-exact follow-up. The MMC3 row records that both Sharp rev-B and NEC rev-A
IRQ timings are modelled, and that because the iNES header doesn't encode the revision, the rev-A path is
keyed off a `sha256(PRG||CHR)` hash table.

The doc also carries its own maintenance contract: adding a mapper means a `Cartridge` implementation, a
constructor in `Open`'s dispatch switch, a table-driven test, *and* a matrix row in the same change. A
compatibility doc that can drift from the dispatch switch is worse than no doc.

## perfgate: the CI slot that was vacuously green (#102)

This one starts with a confession. The CI workflow had a perf job from early on, and it had been passing on
every commit — because there was no `TestPerfGate` for it to run. A grep-shaped test filter with no matching
test is the quietest possible failure mode: a green checkmark that gates nothing. Meanwhile the per-cycle
CPU↔PPU interleave work (chippy #342/#372/#377) had made per-frame cost a real thing to protect — a
cycle-accurate emulator is exactly the kind of codebase where a well-meaning accuracy fix can shave frame
budget until 60 fps quietly becomes 55 on older hardware.

The real gate lives in `cmd/nessy-record/perfgate_test.go` behind a `perfgate` build tag — in the headless
recorder binary's package, so it needs no Ebiten/CGO and CI runs it with a plain `-tags=perfgate`. Three
benchmarks measure steady-state per-frame emulation cost on committed demo ROMs, each chosen to pin a
distinct hot path:

- `BenchmarkFrame_HelloBG` — background-only per-dot fetch + shift pipeline.
- `BenchmarkFrame_OAMGrid` — full sprite evaluation + fetch every scanline.
- `BenchmarkFrame_MMC3Split` — MMC3 scanline IRQ (A12 low-time filter) plus a mid-frame scroll split over
  rendering; the heaviest path.

`TestPerfGate` runs each via `testing.Benchmark` and fails if ns-per-frame exceeds the committed ceiling in
`testdata/perf-baseline.json` by more than 10% (tolerance 1.10). It also logs the realtime multiple —
`16.64 ms / ns_per_frame` — so the 60 fps headroom is visible in every CI log, not just when it's gone.

The subtle part was the baseline itself. `ns/op` is hardware-absolute, and my dev machine runs these
benchmarks about 5× realtime — a baseline recorded there would false-fail the ubuntu-latest runner on day
one. So the ceilings must be recorded **on the runner class that enforces them**. The PR seeded them
provisionally at the 60 fps budget (16.64 ms/frame), then reseeded from that PR's own CI run (run
28893534177): observed 3.39 / 3.48 / 3.60 ms per frame across the three benchmarks, committed as ceilings of
3.56 / 3.655 / 3.78 ms — observed × ~1.05 as a shared-runner-noise cushion, with the 1.10 gate tolerance on
top putting the effective fail line at ~1.15× a clean run. Runner jitter doesn't trip it; a genuine
regression does. And the numbers say the per-cycle interleave, per-dot PPU emulator holds roughly 4.6–4.9×
realtime on a shared CI runner — comfortable headroom, now with an alarm on it.

`docs/perf-baseline.md` records the reseed recipe and the rule that matters most: ceilings get bumped only
for an intentional, understood cost with justification in the commit — never to paper over an unexplained
regression.

## Closing out the debugger: cpureg breakpoints + run-to-IRQ (#103)

The post-carve stretch had been steadily building a NES-aware debugger over chippy's DAP server — PPU
viewers, per-dot event log, memory heatmap, typed PPU-bus breakpoints. #103 landed the last two open pieces
of the debugger umbrella (#27).

**CPU-register-window breakpoints (`$4000-$4017`).** chippy's CPU-bus breakpoints and the PPU-side typed
breakpoints between them still couldn't reach the peripherals in the `$4000` window — the APU channels,
`$4014` OAMDMA, the `$4016/$4017` joypad ports. A new `cpuRegBreakpoints` sink mirrors the PPU latch shape
(per-address read/write flags → `pendingStop` → `takePendingStop`), and it lives on `dmaBus` — the wrapper
that already sits on every CPU bus access as the single chokepoint (it exists for the DMA-glitch work on the
accuracy track). Two details earn their keep: a `dmaActive` guard suppresses the check while a DMC/OAM DMA
fetch is in flight, so the DMA unit's own internal reads can't trip a user breakpoint; and the whole check is
gated behind a has-flag, so the hot path pays nothing until a breakpoint is armed. Over DAP,
`nessy/setMemBreakpoint` gains the space `"cpureg"` alongside `"ppu"` and `"reg"`, and
`armBreakpointStop` drains both the PPU and cpureg latches so neither is stranded by a short-circuiting `||`.

**Run-to-IRQ.** The step-mode family (`stepScanline`, `stepFrame`, `runToNMI`) gets its missing sibling.
`runToIRQPredicate` fires on the rising edge of *IRQ line asserted AND I flag clear* — the level the 6502
actually samples when deciding to take a hardware interrupt. Defining it that way buys three things at once:
it covers every source behind the shared line (mapper scanline counters, APU frame IRQ, DMC) without
enumerating them, it cleanly skips BRK (no IRQ line involved) and NMI (its own line, its own predicate), and
it needs only chippy's public `IRQAsserted()` and the P register — no chippy change required.
`nessy/runToIRQ` arms it through the same shared stop-predicate slot as the other step modes.

For an emulator whose hardest bugs are all "which cycle did the IRQ land on," *run to the next serviceable
IRQ, then single-step* is the debugging loop I'd been faking with logging. Now it's a DAP request.

## The playground grows up: ROM picker, gamepad, save slots, PWA (#104)

The WASM build had existed since v0.6 as a proof that the core runs in a browser: a default embedded ROM, a
bare file input, nothing else. #104 brings it to parity with the desktop binary as an actual playground.

On the Go side, `cmd/nessy-wasm` expands the `nessy` JS API beyond `loadROM`:

- `setButton(idx, down)` — injected input, OR'd with the keyboard, so gamepads and remapped keys feed the
  same joypad.
- `setKeyboard(on)` — disables the built-in keymap so JS can fully own a custom remap.
- `romHash()` — the save-slot key.
- `screenshot()` — returns the raw RGBA framebuffer from the core, because reading back Ebiten's WebGL
  canvas yields an empty image.
- `saveState()` / `loadState()` — and this is the part I like — reuse the exact desktop save-state
  serialization: the same per-subsystem `FullState` capture, the same gzip(gob) envelope, the same
  magic/version/ROM-hash guard so a slot can't restore into the wrong game. One persistence format, three
  front-ends.

On the shell side, `web/nessy/app.js` (342 lines, no framework) implements the playground: file-picker and
drag/drop ROM loading, standard-mapping gamepad polling, a keyboard remap wizard persisted in localStorage,
IndexedDB save slots with F1–F4 quick-save and Shift+F1–F4 load, PNG screenshots from the core framebuffer,
fullscreen, and PWA plumbing — `manifest.webmanifest` plus a service worker that precaches the shell for
offline. ROMs never leave the browser.

CI can't click a gamepad, but it can catch the failure class that actually bites static shells: the wasm job
now runs `node --check` over `app.js` and `service-worker.js` and validates the manifest JSON, so a typo in
the shell fails the build instead of failing the first visitor.

## The boring dependency bump, which is the whole point (#106)

The last commit before the v1.0 cut is a two-line diff: `go.mod` and `go.sum`, chippy v1.8.0 → v1.12.0.

What the newer chippy contains is mostly a CPU nessy doesn't use — the v1.9–v1.12 arc is 65816 work
(bank-aware 24-bit bus, native/emulation interrupt vectors, cross-bank disassembly). The exported 6502 /
`VariantNES` surface is unchanged: the diff adds `Banked24` and 65816-internal types and removes nothing
nessy depends on — `ProcessPendingDma`, `Step`, `SetNeedDmcDma`, the DAP and host-hook APIs all intact.

So what did the bump buy? Proof that the v0.8 carve-out works as designed. A CPU-core dependency bump on a
cycle-accurate emulator is exactly the change you'd expect to fear, and the verification was entirely
mechanical: `go build -tags=nessy ./...` plus the `GOOS=js GOARCH=wasm` build, the full unit suite, the
accuracy suite (the real regression gate for a CPU bump — per-cycle interleave, DMA-during-read, interrupt
ordering), and the perfgate for the hot paths. All green, no code changes. Four releases of upstream
development absorbed by a version number, with every safety net built this cycle standing between the bump
and a regression. That's what "depend on chippy like a normal Go module" was supposed to feel like, and now
it does.

## The two tracks converge

Line the two tracks up and the shape of the road to v1.0 is symmetric. The accuracy track answers "is the
emulator right" with test ROMs and a reference emulator. This track answers "is the emulator *shippable*"
with its own kinds of receipts: a cosign bundle instead of a `$6000` status byte, a ns/frame ceiling instead
of a framebuffer SHA, a compatibility matrix with an honest gaps column instead of a `knownFail` list —
actually, no, it's exactly a `knownFail` list. That's the pattern underneath the whole cycle: every claim the
project makes, about correctness or about packaging, gets a machine-checked gate or a written-down gap.

What's left before the tag is short: the v1.0 epic (#13) checklist, a final pass over the docs, and an `-rc`
smoke tag through the release pipeline. The definition hasn't changed since the last post — v1.0 is the
version I'd hand to someone else. The difference is that "someone else" now has a `brew install`, an
`yay -S nessy-bin`, a browser tab, a table telling them whether their ROM will run, and a signature they can
verify. That's most of the handing-over already done.

[nessy-repo]: https://github.com/nkane/nessy
[chippy-repo]: https://github.com/nkane/chippy
[v08-post]: /posts/2026-08-01-nessy-an-nes-emulator-on-chippy/
[accuracy-post]: /posts/2026-08-15-nessy-road-to-v1-clearing-the-knownfail-list/
