---
name: reference-design-document
description: Create, validate, or refresh the root DESIGN.md for a verified React reference reconstruction from current implementation and parity evidence. Use after reconstruction verification and before repository README documentation. Do not edit application code, README, or publish changes.
---

# Reference Design Document

Produce the design contract that the reconstructed project actually implements. `DESIGN.md` is downstream documentation: it summarizes source and verified receipts but never becomes parity evidence itself.

## Scope boundary

- Write or update only the project-root `DESIGN.md`.
- Do not edit README, application code, reconstruction receipts, captured evidence, or package metadata.
- Do not commit, push, publish, or deploy unless the user separately requests it.
- Do not copy archived bundle bodies, source-analysis transcripts, private identifiers, or research-only assets into the document.
- Do not upgrade partial or unresolved evidence into an exact-fidelity claim.

## Select the document mode

Check for `DESIGN.md` at the project root.

- **Absent:** create it from current implementation and verified evidence.
- **Present and current:** validate its source links and leave its content intact.
- **Present but stale:** update only inaccurate, missing, or broken design-contract content supported by current source or receipts. Preserve unrelated authored material.

## Gather authoritative inputs

Read the smallest set of current artifacts that establishes:

1. Approved route, viewport, responsive, reduced-motion, and fidelity scope.
2. Framework and exact versions for libraries that own observed behavior.
3. Executed style tokens from CSS and typed theme/content sources.
4. Page, Section, reusable component, public prop, and renderer boundaries.
5. GSAP timelines, easing, scroll ownership, DOM hooks, and cleanup behavior.
6. Canvas, WebGL, WebGPU, or Three.js parameters and fallback behavior.
7. Accessibility behavior, verification receipts, GPU status, and unresolved gaps.

Prefer current implementation files and hash-bound receipts over old prose. Library installation alone is not proof of runtime ownership.

## Write the contract

Include only applicable sections:

1. Scope and verification status.
2. Design principles.
3. Colors, typography, layout, spacing, shape, and layer tokens.
4. Page, Section, component, and module contracts with public inputs.
5. Motion system, including GSAP timelines and easing when implemented.
6. GPU/rendering contracts and ownership.
7. State boundaries and stable DOM hooks.
8. Accessibility, reduced-motion behavior, and renderer fallbacks.
9. Folder responsibilities and sources of truth.
10. Verification evidence and unresolved limitations.
11. Reuse sequence for applying the system to another route or project.

Name exact versions, timings, dimensions, selectors, shader passes, or numeric parameters only when they are present in source or locked evidence. Link to project files with root-relative Markdown paths. Describe runtime files as the source of truth; do not duplicate them into a second configuration system.

## Verify before finishing

Confirm that:

- root `DESIGN.md` exists;
- every relative Markdown link resolves from the root file;
- named components, modules, hooks, tokens, and dependencies exist in current source;
- numeric values and parity statements are traceable to implementation or verified receipts;
- partial GPU or responsive coverage remains labeled as partial;
- no archived source excerpts, machine-specific paths, localhost links, secrets, or stale design-document paths remain;
- `git diff --check -- DESIGN.md` passes when Git is available;
- this skill changed no file other than root `DESIGN.md`.

Report whether the document was created, validated unchanged, or refreshed; list the evidence checked, verification commands, and unresolved documentation gaps. Stop before README generation or external publication.
