---
name: reconstruct-react-reference
description: Orchestrate evidence-based full reference restoration from an original runtime Oracle through independently authored Next.js/React components and proven cross-project design systems. Use when a public web reference must be archived, reconstructed by Page and Section boundaries, promoted with parity receipts, or validated for reusable distribution without modifying the source analyzer or distributing research-only assets.
---

# Reconstruct React Reference

Route a public reference from original-runtime preservation through clean Next.js/React reconstruction to proven cross-project reuse. Keep analysis, clean implementation, research parity, reuse proof, and distribution validation as separate evidence boundaries.

## Preserve these invariants

- Treat `design-system-reference-analyzer` as read-only. Use it only to close upstream archive or analysis gaps.
- Treat `site-reference-audit` as scoped behavior reconnaissance. It narrows routes, checkpoints, responsive substitutions, and risk, but never satisfies the Oracle gate.
- Treat analyzer candidates as leads, never as reconstructed components.
- Never give archived bundle bodies, excerpts, minified identifiers, or analysis transcripts to the clean implementer.
- Keep the replay Oracle and future clean application in separate directories and dependency graphs.
- M1 may create a metadata-only validation envelope for `project.json`, `oracle-lock.json`, and `oracleRoot`; it must contain no clean application files or dependencies.
- Clean application files begin only after Oracle validation passes.
- Clean application planning and files begin only after an exact `react-reference-architecture` packet is approved and bound to the component map.
- Put only reconstructed, parity-verified public candidates in `component-catalog/`.
- Never treat another route, variant, or data record in the source project as cross-project reuse.
- Never describe technical distribution validation as legal approval.

## Run the workflow

1. For a full-site, milestone, original-runtime, component-extraction, or design-system request, read [references/milestone-lifecycle.md](references/milestone-lifecycle.md) completely and select the current milestone from evidence on disk. In every milestone report, explicitly state the current milestone, the next work allowed now, and the next work forbidden now. For M1, say that only the metadata-only validation envelope (`project.json`, `oracle-lock.json`, and `oracleRoot`) is allowed; clean application files, package metadata, and target dependencies are forbidden until Oracle validation passes.
2. Read [references/workflow.md](references/workflow.md) completely. Validate command inputs and establish the Oracle lock before proposing clean implementation.
3. Run `site-reference-audit` first when the selected route lacks a current scoped behavior audit. Use it to define the route, viewport, interaction, responsive, and risk matrix without treating the result as source closure.
4. If required source, runtime, or GPU evidence is absent, tell the user which Oracle gate is incomplete and route only that gap to `design-system-reference-analyzer` or `interactive-webgl-analysis-poc`; do not modify those skills.
5. After Oracle validation passes, adapt verified evidence into a scrubbed component map, then run `react-reference-architecture`. Create an approved `.reference-reconstruction/react-architecture.md` and bind its exact hash in `.reference-reconstruction/component-map.json`. Read [references/contracts.md](references/contracts.md) for both artifacts.
6. Use `brainstorming` to obtain approval for the architecture packet, Page, Section, proven UI, public/private boundaries, fidelity, checkpoints, renderer choice, asset profiles, Standalone behavior, and optional Immersive Runtime behavior.
7. Use `writing-plans` to write and approve a vertical-slice execution plan that cites the approved architecture hash before creating implementation files.
8. Read [references/implementation-boundary.md](references/implementation-boundary.md). Dispatch a fresh implementer with only the scrubbed packet, approved architecture, approved plan, screenshots, and behavior checkpoints if any current agent inspected deployed code.
9. Implement with `test-driven-development`. Use `vercel-react-best-practices` for React/Next.js decisions, `interactive-webgl-analysis-poc` only for renderer analysis/specification/audit, and `webapp-testing` for observable parity.
10. Write research-parity receipts for passed component claims. Leave failed, blocked, and unresolved claims explicit; never lower a gate to obtain a pass.
11. Promote only reconstructed plus parity-verified public candidates. Emit per-project catalog entries before attempting any cross-project aggregation.
12. Validate technical release boundaries separately with owned or licensed distribution assets.
13. Use `verification-before-completion` before reporting any gate as passed.

## Validate artifacts

Run the smallest stage that proves the current claim:

```bash
node <SKILL_DIR>/scripts/validate-reconstruction.mjs <target-next-project> --stage oracle
node <SKILL_DIR>/scripts/validate-reconstruction.mjs <target-next-project> --stage promotion
node <SKILL_DIR>/scripts/validate-reconstruction.mjs <target-next-project> --stage catalog
node <SKILL_DIR>/scripts/validate-reconstruction.mjs <target-next-project> --stage distribution
```

Do not infer that schema validation proves visual parity, independent authorship, or legal rights. It verifies the integrity and closure of receipts produced by the owning checks.
