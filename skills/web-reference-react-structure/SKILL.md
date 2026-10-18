---
name: web-reference-react-structure
description: Structure React website reconstructions by page, section, and child components with portable shared effects and Tailwind styling. Use for preserving an existing reconstruction during refactoring or implementing an approved reference architecture.
---

# Web Reference React Structure

Create a reusable React implementation with Site → Page → Section/child ownership and Tailwind styles colocated with their DOM. Every target library uses `role-first-portable-library` version 2. Read [references/architecture.md](references/architecture.md), the canonical [portable structure](../react-reference-architecture/references/portable-structure.md), and [UI naming vocabulary](../react-reference-architecture/references/ui-naming-vocabulary.md) before planning or changing code. An existing layout is migration input, not an alternative target structure.

## Choose the baseline

- **Existing implementation refactor:** capture the current target's visuals, interactions, routes and resource lifecycle before edits. Preserve them unless the user explicitly asks for changes. Target equivalence is not original-reference parity. Do not restart source recovery or demand fresh original approval for an already authorized refactor.
- **New reconstruction:** use the approved, scrubbed architecture and behavioral evidence provided by the reconstruction workflow. This skill implements structure; it does not grant original-parity, asset-redistribution or publication approval. Keep upstream signature and parity gates intact.

## Apply

1. Locate the actual app, inspect its callers and existing tests, and preserve unrelated working-tree changes. Record a concrete file/responsibility map and baseline. Reuse earlier user decisions; ask only for material missing decisions.
2. Apply the approved `role-first-portable-library` v2 contract: five role directories (`pages`, `sections`, `components`, `elements`, `interactions`), page keys or role-local `common` only under `pages` and `sections`, direct named modules without page/common subdivisions under `components`, `elements` and `interactions`, and named public entries `src/exports/<page-key>.ts` plus `src/exports/common.ts`. Keep framework routing/adapters outside the portable source root. Keep actual type definitions beside their owner; public entries only re-export them. Logical host/library separation does not require a separate package or `packages/` folder. Reuse the existing host CSS for Tailwind inputs when suitable; create a separate styles folder only for a concrete packaging need. Align preferred names, exports/types, consumer import paths and the discovery inventory; never restore a page-first tree. Build only modules with an actual responsibility, without empty folders or wrappers.
3. Move/extract one cohesive owner with behavior unchanged, then convert its styles to Tailwind and verify it. Keep semantic classes/data attributes used by interaction code or tests, without retaining duplicate styling owners.
4. Preserve exact motion values, transform order, SSR snapshots, accessibility, cancellation and media/GPU ownership. Do not collapse unrelated policies into a universal player or animation engine.
5. Add a runnable import-boundary check and a data-independent reuse example. Validate the actual component with replacement data, unmount/remount, and its required theme/styles. A bundled site-specific gallery is not a portability test.
6. Run relevant type/lint/build, behavioral, visual and resource checks against the baseline. Update source-path contracts as files move; replace incidental source-text checks with observable assertions where styles or ownership change. Do not weaken behavior checks merely to pass a refactor.
7. Document public entry points, required style imports, props, host responsibilities and remaining limitations. Preserve the approved profile/version, roots, vocabulary version, named public entries under `src/exports/`, semantic owners, stable IDs/aliases, actual use sites and catalog handoff; use only supported schema fields. Shared placement and matching names do not prove portability or cross-project reuse. Keep original assets local unless redistribution was explicitly authorized. Do not commit/push/deploy without task authorization.

When asked to integrate this skill into another workflow after refactoring, finish and verify the implementation first, then connect the workflow at architecture planning and approved implementation stages. Preserve that workflow's evidence and approval boundaries.
