# Workflow

## Invocation

Use:

```text
$reconstruct-react-reference <reference-workdir> <target-next-project>
```

Require `reference-workdir` to contain a readable, immutable evidence snapshot. Allow `target-next-project` only when absent or marked by a matching `.reference-reconstruction/project.json`. Stop on an unmarked non-empty target or a marker bound to another oracle. Resume by validating existing artifacts; never reset or overwrite implicitly.

## Preflight: Scoped reference audit

Use `site-reference-audit` before deep capture when the selected route has no
current behavior audit. Record the exact route boundary, desktop/mobile
checkpoints, page and layer structure, effect inventory, technology signals,
responsive substitutions, and unresolved risk.

This is bounded reconnaissance. It does not replace source archive, runtime/GPU
evidence, or Oracle validation. Mark its handoff `preflight-only` and do not write
it into the target's Milestone 1 metadata-only envelope.

## Gate 1: Oracle closure

Create `.reference-reconstruction/oracle-lock.json` from exact source-manifest, archive-status, route/checkpoint, interaction, asset, visual, component-contract, and applicable GPU-runtime artifacts. Hash every selected file. Record substitutions and unresolved evidence.

Use analyzer output through a read-only adapter. If required artifacts are absent, pause reconstruction and invoke `design-system-reference-analyzer` only for the missing analysis/archive work. A partial scanner candidate may inform a boundary but cannot satisfy a parity claim.

A dependency URL, package, script tag, or runtime global is only a technology signal. Library presence does not prove effect ownership. Attribute an effect to GSAP, ScrollTrigger, Lenis, Three.js, or another runtime only when execution evidence connects it to the observed timeline, input, DOM mutation, or draw work.

GPU runtime evidence is applicable when a WebGL or WebGPU context is observed or an exact visual claim is owned by that GPU path. Plain Canvas2D is not GPU evidence and is `not-applicable` at this gate. Record the context and version, shader compile results, program link results, framebuffer completeness, pass order and dimensions, texture binding inputs and readiness, draw checkpoints, and GL errors. These establish runtime integrity, not visual parity. Partial GPU validation cannot support an exact-fidelity claim; keep any required missing GPU fact in `unresolved` and retain separate matched visual and behavioral checkpoints.

Run the validator at `--stage oracle`.

## Gate 1.5: Existing-target correction intake

Run this gate after Oracle closure when a target already exists, a baseline mismatch is known, or user feedback or a new parity comparison identifies a discrepancy.

1. Capture the locked Oracle and existing target at the same route state, viewport and DPR, input mode, page or theme state, scroll or timeline position, readiness boundary, and reduced-motion state. Control time and randomness when they affect output.
2. Treat the existing target only as the implementation under test and as mismatch evidence. Its screenshots and traces may demonstrate failure, but neither its code nor its output is a reference implementation or source of truth.
3. Classify each difference by content, layout, typography, assets, motion, GPU rendering, accessibility, lifecycle, or cleanup. Library presence does not prove effect ownership; keep ownership uncertain until runtime evidence connects the library to the effect.
4. Map every affected condition to its component. Reuse an equivalent claim when present; otherwise add a stable observable condition to `evidenceClaims`. Put unreproduced, conflicting, or evidence-incomplete conditions in `unresolved`. Do not create a separate correction or feedback ledger.
5. Invalidate before changing code. Set a previously verified affected promotion to `parityStatus: stale`; otherwise set it to `unverified`. Recompute `claimSetDigest` when claims change, withhold affected catalog entries, apply downstream reuse and distribution staleness, and never retain an invalidated receipt hash or authority.
6. If the discrepancy exposes missing or incorrect Oracle evidence, return to Gate 1 and create a new lock revision. If it materially changes architecture, return the architecture to `draft` and mark the affected plan stale. If it changes only the plan, return to Gate 3; otherwise continue to Gate 4.

## Gate 2: Component map and React architecture approval

Create `.reference-reconstruction/component-map.json`. For each candidate, cite exact visible/behavioral checkpoints and distinguish:

- directly observed behavior;
- source-supported inference;
- independently chosen production behavior;
- unresolved behavior.

Include the correction intake's current claims and unresolved conditions. Assign every correction to one owning Section or deep module (the root owner) and to exact parity checkpoints; do not distribute the same symptom across route-level patches.

Use component-map `schemaVersion: 2` and add `desktopSignature: { status, sha256, policy }` before approval. Set status to `approved` only with explicit approval and bind `sha256` to recursively canonicalized policy JSON. For every checkpoint the policy locks input/state/readiness/reduced-motion/time/randomness controls; the ordered IDs, count, kinds, root owners, and implementation file closure of every observed surface; the comparison method, tolerance, metric IDs/units/maxima; and, for GPU surfaces, context API/version and expected shader, program or pipeline, framebuffer or attachment, pass-order, and texture counts. Choose the smallest slice that exercises the reference's defining behavior. Preserve multiplicity: three observed WebGL2 canvases are three named surfaces, never one generic `webgl2` kind. If WebGL, WebGL2, or WebGPU owns that behavior, the signature must include that surface rather than a CSS, DOM, SVG, or Canvas2D stand-in.

Then run `react-reference-architecture` with the scrubbed component map, public
screenshots, observable checkpoints, normalized data contracts, and explicit
uncertainty. Create `.reference-reconstruction/react-architecture.md` with exact
folder structure, Page/Section/proven-UI modules, TypeScript content interfaces,
design tokens, responsive substitutions, state ownership, motion/renderer seams,
dependency budget, implementation slices, and parity checkpoints.

Use `brainstorming`. Approve the exact architecture revision, deep public
interfaces, internal ownership, renderer choice, two asset profiles, responsive
states, accessibility additions, and the first vertical slice. Record the
approval date and exact architecture SHA-256 in the component map. Do not expose
a controller merely because it exists internally.

For exact-fidelity scope, approve the comparison method, deterministic capture inputs, and an explicit per-checkpoint tolerance and acceptance rule. “Looks close” and thresholds selected after seeing the target result are not acceptance criteria.

Stop if the architecture is missing, still `draft`, bound to another Oracle, has
an incorrect hash, or retains an implementation-blocking item required by the
first slice. A component named by any signature checkpoint must have an empty
`unresolved` list before architecture validation passes.

Run `--stage architecture` after the exact architecture revision and schema-v2 signature policy are approved and hash-bound. Do not write the plan or application files until this stage passes. A schema-v1 component map remains legacy and may still use `--stage oracle`, but it must be migrated explicitly before architecture or later gates; never reinterpret it silently as schema v2.

## Gate 3: Written implementation plan

Use `writing-plans`. Cite the approved architecture path and SHA-256 plus the approved `desktopSignature.sha256`, then define
one independently testable vertical slice at a time with exact files, interfaces,
test-first steps, capture checkpoints, and comparison commands. Obtain plan
approval before creating the clean target implementation. A material folder,
public-interface, state-ownership, renderer, dependency, or checkpoint change
returns to Gate 2 for a revised architecture approval.

For a correction slice, cite the affected claim IDs, root owner, matched capture conditions, and the receipt or downstream binding that the change must replace.

## Gate 4: Clean implementation

Create or resume the separate Next.js/React target from the exact approved
architecture packet. Follow `implementation-boundary.md`. If an agent inspected
deployed implementation code, use a fresh agent without that history as
implementer. The implementer must stop when the architecture hash differs across
the packet, component map, or execution plan.

Implement only the approved desktop signature through `test-driven-development`. Keep normal runtime source free of oracle imports. Use one private reference adapter for research comparisons and a separate distribution asset resolver. Broader slices remain blocked until Gate 4.5 passes.

Correct the root owner that produces the mismatch. Do not add viewport-, timestamp-, or screenshot-specific overlays that merely hide a failed checkpoint.

## Gate 4.5: Desktop signature proof

Capture the Oracle and target only under the conditions already approved in `component-map.json.desktopSignature`: route, viewport, DPR, input mode, UI or timeline state, readiness boundary, reduced-motion state, and explicit time/randomness control. Write the schema-v2 `.reference-reconstruction/receipts/desktop-signature.json` using `contracts.md`. The receipt repeats locked identities where needed and reports implementation digests, observed metric values, output hashes, and GPU status bindings; it must not introduce new tolerances, maxima, owners, surfaces, or capture criteria.

For each approved checkpoint:

1. Require the policy's component claim to remain current and its entire component `unresolved` list to be empty. Bind every ordered surface to the exact approved kind, root owner, implementation file closure, and recomputed implementation digest.
2. Preserve surface identity and multiplicity. Exact fidelity forbids renderer substitution: a WebGL, WebGL2, or WebGPU owner cannot pass through Canvas2D, DOM, SVG, or CSS output. A fallback may exist, but it is not the parity surface.
3. Run the approved matched comparison and hash distinct reference and target outputs plus the comparison evidence. Canonicalize each output with `realpath`; reference and target paths must not resolve to the same physical file or symlink alias. Report only each locked metric's observed value and unit; the validator compares it with the policy maximum.
4. For each WebGL/WebGL2 surface, bind a structured GPU status JSON record. The validator parses its matching checkpoint/surface ID, context API/version, every shader compile and program link result, every framebuffer's `FRAMEBUFFER_COMPLETE` status, exact pass order, locked texture count/readiness, positive draw count, and empty error list. WebGPU uses the corresponding shader, pipeline, attachment, pass, resource, draw, and validation-error fields. A PNG or evidence-kind string list cannot satisfy this gate. Plain Canvas2D, DOM, and SVG omit GPU status because it is not applicable.
5. Report observed compensation as an empty list against the policy's exact forbidden set: CSS overlay, DOM overlay, screenshot overlay, and checkpoint-conditional behavior. A mismatch is fixed in the recorded root owner and recaptured; it is never hidden by another rendering layer.

Run `--stage signature`; `--stage architecture` already passed before planning. The `signature` stage binds the approved architecture, signature policy, owner implementation files, capture outputs, exact surface identities, and parsed GPU status. It cannot prove that the comparison method is scientifically valid or that undeclared compensation does not exist; the independent comparison role still owns those judgments.

Do not start another Section, route, viewport, or reusable extraction until every signature checkpoint passes. A failed signature returns to the same owner and repeats Gate 4 and Gate 4.5; it does not proceed to broad CSS tuning.

## Gate 5: Research parity and correction loop

Capture the same route state, viewport, input mode, and readiness boundary as the locked oracle. Check component-owned:

- semantic copy and DOM behavior;
- layout and responsive composition;
- keyboard, focus, announcements, and fallbacks;
- pointer, touch, wheel, route, audio, and history interactions when applicable;
- asset completion and canvas/GPU behavior when observable.

For time-varying effects, temporal evidence must cover GSAP or equivalent timeline ownership, scrub response, easing and duration, input-to-frame behavior, startup and steady-state transitions, and shader evolution across frames. Hash the deterministic trace, frame sequence, or recording as receipt outputs. A still screenshot cannot close a temporal claim.

Write one receipt per component. Classify every planned claim as passed, failed, blocked, or not applicable. Bind the receipt to the oracle lock, public interface, implementation, research asset mapping, and output hashes. Any binding change makes it stale.

For every failed, blocked, or user-feedback claim, follow this loop: reproduce the discrepancy under the locked capture conditions; invalidate its prior authority; correct the root owner; recapture the same checkpoint; and regenerate the receipt and downstream binding. New feedback adds or reuses an `evidenceClaims` entry, stays in `unresolved` until reproduced and resolved, and sets a previously verified affected promotion to `parityStatus: stale`. If the finding materially changes architecture, return it to `draft` and mark the plan stale before implementation resumes.

A correction closes only when every affected current claim is in `passed`, the affected component's `unresolved` array is empty, its `parityStatus` is `parity-verified`, and a fresh receipt is bound to the current Oracle, claim set, interface, implementation, assets, and outputs. A successful promotion-validator run alone is insufficient because unrelated or affected entries may still be `stale` or `unverified`.

The validator checks receipt structure, hashes, and bindings, not visual parity, temporal causality, capture provenance, or whether a tolerance is appropriate. The comparison role must establish those facts under the approved method before writing `passed`.

Run the validator at `--stage promotion`.

## Gate 6: Promotion and catalog

Promote only a public candidate whose implementation is reconstructed and whose parity status is verified. Keep lower states in `.reference-reconstruction/promotion.json`; never put them in `component-catalog/`.

Emit one catalog entry per promoted component and bind it to the exact parity receipt. Run the validator at `--stage catalog`.

## Gate 7: Reuse proof

Record `reuse-proven` only after a different real project consumes the same interface fingerprint and implementation digest without a fork. Bind a consumer receipt to both project IDs, the consumer digest, and the shared interface/implementation identities. A second route, year, variant, demo, or test fixture is not a second project.

## Gate 8: Distribution validation

Build a separate distribution profile with owned or licensed assets. Re-run interface, behavior, accessibility, integrity, and declared visual checks after substitutions; never inherit the research asset output hash.

Scan configured distribution roots, normalized filenames, and file contents for archive paths, mirror paths, original hosts, and project-specific forbidden strings. Reject exact locked-oracle bytes. Require every catalog asset ID to resolve to one hash-bound local file inside those roots with owned or licensed rights. Run the validator at `--stage distribution`; catalog-only validation intentionally refuses to endorse `distribution-validated` without this gate.

## Hard stops

Stop without mutating prior valid artifacts on:

- missing permission or rights authority;
- an oracle hash mismatch;
- a target marker mismatch;
- required unresolved evidence;
- accepted user feedback that is not mapped to an affected component and current claim;
- an unresolved correction, an authoritative stale receipt, or a skipped matched recapture;
- failed or blocked parity claims;
- an exact-fidelity claim based only on library presence or partial GPU validation;
- a missing, stale, failed, renderer-substituted, or compensation-backed desktop signature receipt;
- broader implementation begun before the desktop signature stage passes;
- exact-fidelity scope without a user-approved comparison method and per-checkpoint tolerance;
- a time-varying motion or shader claim closed only by still screenshots;
- stale interface, implementation, asset, consumer, or distribution bindings;
- a research-only asset or oracle import in distribution output.
