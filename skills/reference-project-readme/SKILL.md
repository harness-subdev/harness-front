---
name: reference-project-readme
description: Create or refresh the root README for a verified React reference reconstruction, including UI evidence, runtime, structure, extracted components, reuse guidance, and a link to the validated root DESIGN.md. Use after reference-design-document. Do not create design contracts, commit, or push.
---

# Reference Project README

Document the project that actually exists on disk. README summarizes verified implementation evidence and the validated design contract; it does not create new parity authority or replace reconstruction receipts.

## Scope boundary

- Write or update only the project-root `README.md`.
- Do not commit, push, publish, deploy, or change application code unless the user separately requests it.
- Do not copy archived bundle bodies, source-analysis transcripts, private identifiers, or research-only assets into distributable documentation.
- Do not claim exact fidelity unless the current reconstruction receipts support it. State unresolved routes, breakpoints, GPU checks, or reduced-motion behavior plainly.

## Gather current evidence

Read the smallest set of live artifacts that establishes:

1. Project purpose, approved routes, viewport scope, and reconstruction status.
2. Package manager, framework, language, installed motion/rendering libraries, and runnable scripts.
3. Actual top-level folders, Page and Section composition, reusable component exports, and their public props.
4. Checked-in visual evidence suitable for a repository preview.
5. Current reconstruction receipts, GPU status, accessibility behavior, fallbacks, and unresolved limitations.

Prefer implementation files and current receipts over old prose. Never infer effect ownership merely from a dependency being installed.

## Require the design contract

Check for `DESIGN.md` at the project root.

- If it exists, confirm it was validated against the current reconstruction and link it from README.
- If it is absent or stale, run `reference-design-document` before continuing. Do not create or repair the design contract inside this skill.

## Write the README

Keep the README useful to someone evaluating or reusing the reconstruction. Include, when supported:

1. Title and concise scope statement with the public reference URL.
2. `UI preview` using a small set of checked-in representative screenshots with meaningful alt text.
3. `Runtime` listing only dependencies that own observed behavior.
4. A prominent relative link to root `DESIGN.md`.
5. `Project structure` reflecting the real tree and ownership boundaries.
6. `Extracted components` listing responsibility and reusable inputs from actual exports.
7. `Reuse guide` covering composition, data, motion ownership, cleanup, accessibility, and fallbacks.
8. Minimal usage code only when its import path and props match the current source.
9. Local install, development, and verification commands copied from package scripts.

Do not include machine-specific paths, localhost links, secrets, unavailable commands, empty sections, or component names that cannot be resolved in source. Keep detailed tokens and timelines in `DESIGN.md`; summarize and link them from README.

## Verify before finishing

Run checks appropriate to the repository and confirm:

- `README.md` and root `DESIGN.md` exist;
- every local README image and relative Markdown link resolves;
- README headings for project structure, extracted components, and reuse guidance are present;
- documented component names and example imports resolve to current exports;
- install, dev, build, typecheck, and test commands match the package scripts that exist;
- old design-document paths and machine-local URLs are absent;
- Markdown has no whitespace errors with `git diff --check` when Git is available;
- only root `README.md` was changed by this skill.

Report the files written, evidence checked, unresolved documentation gaps, and commands run. Stop after writing and verification; external publication requires a separate user-authorized workflow.
