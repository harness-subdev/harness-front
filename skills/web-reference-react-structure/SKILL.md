---
name: web-reference-react-structure
description: Use when implementing an approved React reference architecture, refactoring an existing reconstruction, or porting an existing Next.js reconstruction to React + Vite with portable UI ownership and Tailwind styling.
---

# Web Reference React Structure

Create a reusable React implementation with Site → Page → Section/child ownership and Tailwind styles colocated with their DOM. New libraries and approved structural migrations use `role-first-portable-library` version 2. Read [references/architecture.md](references/architecture.md), the canonical [portable structure](../web-reference-react-architecture/references/portable-structure.md), and [UI naming vocabulary](../web-reference-react-architecture/references/ui-naming-vocabulary.md) before planning or changing code. Apply their structural migration requirements only within the authorized scope.

신규 프로젝트와 Next.js 포팅은 지정 템플릿 clone과 초기·최종 `npm run check`를 반드시 거친다.
구현 전에 [InitPage·portable CSS·다중 TGZ 계약](../web-reference-react-architecture/references/portable-delivery.md)을 읽는다.
기존 Next.js를 발견하면 [React + Vite 포팅 절차](../web-reference-react-architecture/references/portable-structure.md#nextjs-to-vite-port)를 읽고 안내한다.
이미 받은 포팅 승인은 재사용한다. 설계·계획이 있으면 승인한 구현 범위에서 포팅을 진행한다.
설계·계획이 없으면 architecture → writing-plans로 연결한다.

## Choose the baseline

- **Existing Next.js target:** capture its visuals, interactions, URLs, assets, callers and resource lifecycle. Explain the React + Vite port, map Next.js APIs and server requirements, and implement the approved architecture and plan in the designated template. Do not use existing-stack preservation to retain Next.js. Preserve behavior and external contracts through the port; unresolved server requirements block only the affected work.
- **Existing non-Next.js implementation refactor:** capture the current target's visuals, interactions, routes and resource lifecycle before edits. Preserve its framework, routing, layout, public interfaces and styles unless the requested refactor includes changing them. A behavior-only refactor does not authorize a layout or template migration. Target equivalence is not original-reference parity. Do not restart source recovery or demand fresh original approval for an already authorized refactor.
- **New reconstruction:** use the approved architecture and implementation packet provided by the reconstruction workflow. This skill implements structure; it does not grant original-parity, asset-redistribution or publication approval. Keep upstream implementation-mode, signature and parity gates intact; shared extraction waits for a current signature pass.

## Apply

For new projects and Next.js port targets, follow the canonical template clone, collision-check and tracked-copy
procedure in portable-structure.md only when the parent implementation gate permits it.
Record the actual cloned commit once in README, not in architecture. Never overwrite
an existing application. New template projects run `npm run check`, including
`check:architecture`. Next.js ports use a separate empty destination and keep the
original app as the comparison baseline. Existing non-Next.js apps keep their stack and build
configuration; run their existing relevant scripts and boundary checks, and report
unavailable checks rather than requiring template-only commands.
For Next.js ports, also verify route navigation and direct reload, mapped server
behavior, public environment variables, asset paths and production SPA fallback.

1. Locate the actual app, inspect its callers and existing tests, and preserve unrelated working-tree changes. Record a concrete file/responsibility map and baseline. For reuse-only requests, follow the implemented-module intake in [architecture.md](references/architecture.md#implemented-module-intake) before choosing modules. Reuse earlier user decisions; ask only for material missing decisions.
2. For a new library or approved structural migration, apply the approved `role-first-portable-library` v2 contract: five role directories (`pages`, `sections`, `components`, `elements`, `interactions`), page keys or role-local `common` only under `pages` and `sections`, direct named modules without page/common subdivisions under `components`, `elements` and `interactions`, and named public entries `src/exports/<page-key>.ts` plus `src/exports/common.ts`. Keep framework routing/adapters outside the portable source root. Keep actual type definitions beside their owner; public entries only re-export them. Logical host/library separation does not require a separate package or `packages/` folder. 신규 템플릿은 `styles/portable.css`를 전달 스타일 입력으로 사용하고 `app/globals.css`에 문서 설정을 둔다. InitPage와 init 공개 entry를 필수로 구현한다. Align preferred names, exports/types, consumer import paths and the discovery inventory; never restore a page-first tree. Build only modules with an actual responsibility, without empty folders or wrappers.
3. Move/extract one cohesive owner and verify it against the approved result. 승인한 수정 범위에서는 기존 동작을 검토해 고친다. 그 밖의 동작은 보존한다. Convert its styles to Tailwind only when style migration is in scope. Keep semantic classes/data attributes used by interaction code or tests, without retaining duplicate styling owners.
4. Preserve motion values, transform order, capability snapshots and lifecycle outside approved behavior changes. Within an approved change, record the problem, correction and expected behavior; verify accessibility, cancellation and media/GPU ownership against that result. Do not collapse unrelated policies into a universal player or animation engine.
5. Use the project's available import-boundary check and verify independent data by temporarily
   replacing host props and restoring them; do not add a verification route or mode branch. Validate the actual component with independent data, two instances, unmount/remount, reduced motion and asset/error handling as applicable. Include its required fonts, theme, CSS, assets and adapters. A bundled site-specific gallery is not a portability test.
6. Run relevant type/lint/build, behavioral, visual and resource checks against the baseline. Update source-path contracts as files move; replace incidental source-text checks with observable assertions where styles or ownership change. Do not weaken behavior checks merely to pass a refactor.
7. TGZ 전달 범위가 있으면 portable-delivery.md의 실제 두 archive 혼합 검증을 실행한다. 기존 제작기·독립 소비자를 재사용한다. CSS AB/BA·반복 인스턴스·부분 해제·폰트·자산·초기화·입력 검사를 정확한 archive hash에 연결한다. 소스 ZIP 수정 검증은 따로 기록한다. 구조 검사만으로 혼합 성공을 선언하지 않는다. 전달이 이번 범위 밖이면 해당 표를 후속 작업으로 인계한다.
8. Document public entry points, required style imports, props, host responsibilities and remaining limitations. Preserve the approved profile/version, roots, vocabulary version, named public entries under `src/exports/`, semantic owners, stable IDs/aliases, actual use sites and catalog handoff; use only supported schema fields. Shared placement and matching names do not prove portability or cross-project reuse. Keep original assets local unless redistribution was explicitly authorized. Do not commit/push/deploy without task authorization.

When asked to integrate this skill into another workflow after refactoring, finish and verify the implementation first, then connect the workflow at architecture planning and approved implementation stages. Preserve that workflow's evidence and approval boundaries.
