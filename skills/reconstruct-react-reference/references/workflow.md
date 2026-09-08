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

Run the validator at `--stage oracle`.

## Gate 2: Component map and React architecture approval

Create `.reference-reconstruction/component-map.json`. For each candidate, cite exact visible/behavioral checkpoints and distinguish:

- directly observed behavior;
- source-supported inference;
- independently chosen production behavior;
- unresolved behavior.

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

Stop if the architecture is missing, still `draft`, bound to another Oracle, has
an incorrect hash, or retains an implementation-blocking item required by the
first slice.

## Gate 3: Written implementation plan

Use `writing-plans`. Cite the approved architecture path and SHA-256, then define
one independently testable vertical slice at a time with exact files, interfaces,
test-first steps, capture checkpoints, and comparison commands. Obtain plan
approval before creating the clean target implementation. A material folder,
public-interface, state-ownership, renderer, dependency, or checkpoint change
returns to Gate 2 for a revised architecture approval.

## Gate 4: Clean implementation

Create or resume the separate Next.js/React target from the exact approved
architecture packet. Follow `implementation-boundary.md`. If an agent inspected
deployed implementation code, use a fresh agent without that history as
implementer. The implementer must stop when the architecture hash differs across
the packet, component map, or execution plan.

Implement through `test-driven-development`. Keep normal runtime source free of oracle imports. Use one private reference adapter for research comparisons and a separate distribution asset resolver.

## Gate 5: Research parity

Capture the same route state, viewport, input mode, and readiness boundary as the locked oracle. Check component-owned:

- semantic copy and DOM behavior;
- layout and responsive composition;
- keyboard, focus, announcements, and fallbacks;
- pointer, touch, wheel, route, audio, and history interactions when applicable;
- asset completion and canvas/GPU behavior when observable.

Write one receipt per component. Classify every planned claim as passed, failed, blocked, or not applicable. Bind the receipt to the oracle lock, public interface, implementation, research asset mapping, and output hashes. Any binding change makes it stale.

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
- failed or blocked parity claims;
- stale interface, implementation, asset, consumer, or distribution bindings;
- a research-only asset or oracle import in distribution output.
