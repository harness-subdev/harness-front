---
name: reconstruct-react-reference
description: Orchestrate evidence-based full reference restoration from an original runtime Oracle through independently authored Next.js/React components and proven cross-project design systems. Use when a public web reference must be archived, reconstructed by Page and Section boundaries, corrected after an existing reconstruction fails comparison or user feedback, promoted with parity receipts, or validated for reusable distribution without modifying the source analyzer or distributing research-only assets.
---

# Reconstruct React Reference

Route a public reference from original-runtime preservation through clean Next.js/React reconstruction to proven cross-project reuse. Keep analysis, clean implementation, research parity, reuse proof, and distribution validation as separate evidence boundaries.

## Preserve these invariants

- Treat `design-system-reference-analyzer` as read-only. Use it only to close upstream archive or analysis gaps.
- Treat `site-reference-audit` as scoped behavior reconnaissance. It narrows routes, checkpoints, responsive substitutions, and risk, but never satisfies the Oracle gate.
- Treat analyzer candidates as leads, never as reconstructed components.
- Never give archived bundle bodies, excerpts, minified identifiers, or analysis transcripts to the clean implementer.
- Keep the replay Oracle and future clean application in separate directories and dependency graphs.
- Freeze any pre-existing target until Oracle validation passes. Afterward, never treat an existing target as the reference implementation; use it only as the implementation under test and as mismatch evidence.
- M1 may create a metadata-only validation envelope for `project.json`, `oracle-lock.json`, and `oracleRoot`; it must contain no clean application files or dependencies.
- Clean application files begin only after Oracle validation passes.
- Clean application planning and files begin only after an exact `react-reference-architecture` packet is approved and bound to the component map.
- Library presence does not prove effect ownership. Require runtime evidence that connects an animation, canvas, or GPU runtime to the observed work.
- Partial GPU validation cannot support an exact-fidelity claim. Keep missing shader, program, framebuffer, pass, texture, draw, or GL-error evidence unresolved.
- Prove the desktop-primary signature slice before broader implementation. The approved schema-v2 policy hash-binds each checkpoint's route/viewport/DPR, input/state/readiness/reduced-motion/time/randomness controls, ordered surface identities and owners, implementation file closure, comparison method/tolerance/metric maxima, and structured GPU contract. The receipt reports observations against those locked fields; it does not choose new criteria.
- For exact fidelity, an Oracle WebGL, WebGL2, or WebGPU surface keeps that renderer class in the parity path. Canvas2D, DOM, SVG, or CSS may be an explicit fallback, but never evidence of parity for the GPU surface.
- Correct a signature mismatch in its proven root owner. Do not compensate with CSS, DOM, screenshot, or checkpoint-conditional overlays, and do not begin broader slices until the `signature` stage passes.
- Exact-fidelity work requires a user-approved comparison method, per-checkpoint tolerance, and acceptance rule before implementation. For time-varying effects, require temporal evidence rather than a still-image-only pass.
- When user feedback or matched comparison exposes a discrepancy, add or reuse its stable observable condition in `evidenceClaims`; keep unreproduced, conflicting, or evidence-incomplete conditions in `unresolved`. Do not create a separate feedback ledger.
- Invalidate before correction. Set a previously verified affected promotion to `parityStatus: stale`; otherwise keep it `unverified`. Withhold the component from `component-catalog/` and replace the receipt only after the current claim set passes a matched recapture.
- Put only reconstructed, parity-verified public candidates in `component-catalog/`.
- Never treat another route, variant, or data record in the source project as cross-project reuse.
- Never describe technical distribution validation as legal approval.
- Treat `README.md` and `DESIGN.md` as downstream documentation, never as parity evidence or substitutes for reconstruction receipts.

## Run the workflow

1. For a full-site, milestone, original-runtime, component-extraction, or design-system request, read [references/milestone-lifecycle.md](references/milestone-lifecycle.md) completely and select the current milestone from evidence on disk. In every milestone report, explicitly state the current milestone, the next work allowed now, and the next work forbidden now. For M1, say that only the metadata-only validation envelope (`project.json`, `oracle-lock.json`, and `oracleRoot`) is allowed; clean application files, package metadata, and target dependencies are forbidden until Oracle validation passes.
2. Read [references/workflow.md](references/workflow.md) completely. Validate command inputs and establish the Oracle lock before proposing clean implementation.
3. Run `site-reference-audit` first when the selected route lacks a current scoped behavior audit. Use it to define the route, viewport, interaction, responsive, and risk matrix without treating the result as source closure.
4. If required source, runtime, or GPU evidence is absent, tell the user which Oracle gate is incomplete and route only that gap to `design-system-reference-analyzer` or `interactive-webgl-analysis-poc`; do not modify those skills.
5. After Oracle validation passes, run the existing-target correction intake when a target already exists or correction feedback has arrived. Turn differences into scrubbed claim IDs and checkpoints before architecture approval; do not let the target define expected behavior.
6. Adapt verified evidence and correction claims into a scrubbed schema-v2 component map, then run `react-reference-architecture`. Create a draft `.reference-reconstruction/react-architecture.md` and read [references/contracts.md](references/contracts.md) for both artifacts.
7. Use `brainstorming` to obtain approval for the exact architecture packet, Page, Section, proven UI, public/private boundaries, fidelity, checkpoints, renderer choice, asset profiles, Standalone behavior, and optional Immersive Runtime behavior. Mark that revision approved, bind its exact hash in `.reference-reconstruction/component-map.json`, and run `--stage architecture`. Planning and implementation remain forbidden until it passes.
8. Use `writing-plans` to write and approve a vertical-slice execution plan that cites the approved architecture hash, `desktopSignature.sha256`, correction claim IDs, and root owners before creating implementation files. The first implementation slice is the desktop signature declared in `component-map.json.desktopSignature.policy`.
9. Read [references/implementation-boundary.md](references/implementation-boundary.md). Dispatch a fresh implementer with only the scrubbed packet, approved architecture, approved plan, screenshots, and behavior checkpoints if any current agent inspected deployed code.
10. Implement only the desktop signature with `test-driven-development`. Use `vercel-react-best-practices` for React/Next.js decisions, `interactive-webgl-analysis-poc` only for renderer analysis/specification/audit, and `webapp-testing` for observable parity. Demonstrate runtime ownership before attributing an observed effect to a dependency.
11. Produce the schema-v2 desktop signature receipt and structured GPU status JSON, then run the `signature` stage. If it fails, correct the proven owner and recapture the same locked conditions; broader implementation remains forbidden.
12. After the signature passes, implement the remaining approved slices. For every failed, blocked, or user-reported claim, invalidate the old authority, correct the owning root cause, recapture the exact locked checkpoint, and regenerate the receipt and downstream bindings. Repeat until the affected claim set passes and its `unresolved` list is empty.
13. Write research-parity receipts for passed component claims. Leave failed, blocked, and unresolved claims explicit; never lower a gate to obtain a pass.
14. Promote only reconstructed plus parity-verified public candidates. Emit per-project catalog entries before attempting any cross-project aggregation.
15. Validate technical release boundaries separately with owned or licensed distribution assets.
16. Use `verification-before-completion` before reporting any gate as passed.
17. After the final requested gate is verified, run `reference-design-document`. Create root `DESIGN.md` from current implementation and verified evidence when absent; otherwise validate it and refresh only stale evidence-backed contract content. This step may change only `DESIGN.md` and must not upgrade an unverified parity claim.
18. Run `reference-project-readme` only after the design contract is current. Write and verify the root README's UI preview, runtime, `DESIGN.md` link, project structure, extracted components, and reuse guidance. This step may change only `README.md`. Neither documentation step may commit, push, publish, deploy, or change application code without separate user authorization.

## Validate artifacts

Run the smallest stage that proves the current claim:

```bash
node <SKILL_DIR>/scripts/validate-reconstruction.mjs <target-next-project> --stage oracle
node <SKILL_DIR>/scripts/validate-reconstruction.mjs <target-next-project> --stage architecture
node <SKILL_DIR>/scripts/validate-reconstruction.mjs <target-next-project> --stage signature
node <SKILL_DIR>/scripts/validate-reconstruction.mjs <target-next-project> --stage promotion
node <SKILL_DIR>/scripts/validate-reconstruction.mjs <target-next-project> --stage catalog
node <SKILL_DIR>/scripts/validate-reconstruction.mjs <target-next-project> --stage distribution
```

Do not infer that schema validation proves visual parity, capture provenance, independent authorship, or legal rights. The validator checks artifact integrity and current bindings, not visual parity; the owning comparison must produce the evidence.
