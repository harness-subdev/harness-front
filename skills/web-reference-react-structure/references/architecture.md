# Role-first portable React architecture

## Required source structure and names

New libraries and approved structural migrations follow [portable-structure.md](../../web-reference-react-architecture/references/portable-structure.md), profile `role-first-portable-library`, version 2. Read its exact tree, index, dependency and discovery contracts and the canonical [UI naming vocabulary](../../web-reference-react-architecture/references/ui-naming-vocabulary.md) before implementation. For an existing non-Next.js app's behavior-only refactor, preserve its stack, routes, layout and public interfaces; adoption of a new layout needs an approved structural scope. Existing Next.js targets follow the [React + Vite porting procedure](../../web-reference-react-architecture/references/portable-structure.md#nextjs-to-vite-port). Explain the port, reuse existing authorization and implement its approved architecture and plan. The following roots describe the portable-library target, not permission to silently migrate an existing host.

- The portable source root contains only `pages`, `sections`, `components`, `elements`, `interactions` implementation directories plus `exports/`, whose `<page-key>.ts` / `common.ts` files contain named public re-exports only. The `exports/` directory is an interface directory, not a sixth implementation role. Use the reference site's actual page implementation keys, not a fixed home/works list. Create only directories and public entries with a real responsibility.
- Only `pages` and `sections` contain page-key or optional `common/` implementations. `components`, `elements`, and `interactions` contain named modules directly, without page/common subdivisions. Page ownership and reuse do not change those paths. Do not create root `common`, `features`, `shared` or nested `pages/home/sections` trees. Framework routes/adapters stay in the host application outside this source root. 콘텐츠 자산과 문서 CSS는 호스트가 소유한다. `styles/portable.css`와 필수 자산도 src 역할 디렉터리 밖의 전달 경계를 따른다. Small UI-owned icons may be imported beside the owner or written as inline SVG. Logical separation does not require a separate npm package or `packages/` directory; a single project with host `app/` and portable `src/` is valid.
- Component files and optional module folders use PascalCase, for example `Carousel/Carousel.tsx` and `WorksIntroSection/WorksIntroSection.tsx`. Page keys and ordinary support files use readable kebab-case. Keep the visible Page → Section → child ownership even when their physical role directories differ.
- Use vocabulary names when responsibility matches: Header, Footer, HeroSection and Carousel. Carousel navigates content slides; Slider selects a value. Keep meaningful domain qualifiers and parent context when needed. Preserve ViewportVideos and ViewportScroll for their documented distinct responsibilities, with state classification independent of folder placement.
- Entries in `src/exports/` contain named re-exports only, including types defined beside their implementation. Internal code imports implementation files directly; hosts and examples use the page or common public entry, through a local path/alias or an actual package export. Do not expose every private child or add per-module public entry files. Keep types, helpers, styles, local state and motion beside their owner when they must be understood together; extract only independently meaningful interactions.

Record profile/version, host and library roots, vocabulary version, exact public indices/package exports, owner and source closure, actual use sites, aliases/stable IDs and the catalog handoff in the approved packet. Keep the naming/discovery inventory aligned as paths move. Update generators, build outputs, fixtures and source-path contracts together so they cannot regenerate an obsolete tree. Do not invent component-map/catalog fields; unsupported mappings stay in the Markdown handoff. A consistent contract does not itself implement global-search UI or prove cross-project reuse.

## Implemented-module intake

For a request to reuse only implemented modules, inspect the real implementation files and their private dependency closure. Resolve the intended export/import through the app's actual aliases or package configuration, then trace all actual callers. Record file/owner, public import, callers and missing evidence in the Markdown handoff. A scanner candidate or `CONTRACT_READY` contract is a lead, not proof that an implementation is available. A missing public export is distinct from a missing implementation. Select existing implementations; report absent modules as scope gaps rather than building them under a reuse-only request.

Before sharing math or shader code, compare the callers' input domains/units, coordinate conventions, state ownership, render-pass order, uniform semantics, resource counts/readiness and lifecycle. Matching names or bytes alone do not establish compatible contracts. Extract the smallest real shared responsibility when repetition and compatible contracts justify it; keep distinct interaction policies, texture closures and renderer lifecycles with their owners. Replace cross-owner private imports with imports from that supported shared owner, without exposing its private helpers. A shared formula or shader does not itself call for a generic renderer, store or Provider.

Keep these evidence distinctions explicit without adding JSON states or fields:

| Evidence | What it establishes |
| --- | --- |
| Scanner or contract candidate | A module to investigate; no implementation, parity or reuse proof |
| Actual in-project use | Resolved callers consume the same implementation; private-boundary violations still need correction |
| Portability fixture | Independent data, two-instance isolation, required styles/adapters, teardown and applicable fallback checks pass; no cross-project proof |
| Real cross-project reuse | A different real project consumes the same interface fingerprint and implementation digest without a fork, with the workflow's consumer receipt |

Availability and fixture success do not grant promotion. In the reconstruction workflow, extraction waits for the current signature pass; promotion still requires current parity receipts and the existing catalog gates. Rebind and recapture affected evidence when shared implementation files change.

## Dependency boundaries

- The host composes library Pages and adapters. Pages compose their Sections and child UI; page-specific modules do not import another page's internals. Navigation owns its private menu and transition state.
- Reusable modules consume injected content/host interfaces and never import Pages, page-only implementations, default site content, host adapters or React Router.
- Whole-site composition stays in `app/`. Lower UI roles may compose one another
  without a fixed import hierarchy. Owner-private access and inter-module cycles
  remain forbidden; Sections cannot import Pages or sibling Section owners.
- Site data is supplied through props. Route-dependent UI receives navigation through an interface/adapter; reusable links remain real anchors with hrefs and preserve modified-click/new-tab behavior.
- Public page/common indices expose only intended components/functions/types with named re-exports. A physical common location does not change semantic ownership, catalog kind, or shared status.
- Readiness signals belong to the transition owner and identify the adapter-committed pathname and query; do not read browser location during an incoming page layout effect because history may commit afterward. Normal navigation must complete without waiting for its failure watchdog; cancel stale transitions and preserve fail-open timeouts. Do not couple a router to another feature's CSS selectors.

## 필수 초기화·전달 계약

신규 프로젝트와 Next.js 포팅은 [portable-delivery.md](../../web-reference-react-architecture/references/portable-delivery.md)를 반드시 읽고 적용한다.
InitPage는 Page이며 호스트가 readiness·오류·재시도·목적 URL을 관리한다.
portable CSS·필수 자산·포인터·variation·혼합 TGZ와 소스 ZIP 검증은 같은 문서의 기준을 따른다.
승인한 동작 수정은 문제·수정 이유·기대 결과를 기록하고 검증한다. 기존 동작 보존이 수정 지시를 막지 않는다.

## Tailwind and motion

신규 템플릿의 Tailwind·전달 입력은 `styles/portable.css`다. `app/globals.css`는 이를 import하고 문서 기본값을 소유한다. TGZ에 전체 globals.css를 넣지 않는다. 기존 앱의 범위 제한 수정은 승인한 스타일 경계를 유지한다.

Use Tailwind classes for layout, typography, responsive rules, hover/focus, state variants, transitions and animations, including complex motion. Preserve measured values with arbitrary values rather than rounding them to the utility scale. Keep complete class strings available to Tailwind's source scanner. Export required CSS/source instructions for reuse.

Use CSS custom properties for continuously changing pointer/scroll/progress inputs. Write them imperatively without per-frame React state. Preserve compound transform order with `[transform:...]` when separate translate/scale utilities would alter it. Give each transform one owner; avoid CSS transitions competing with WAAPI/JS on the same property.

Keep only shared tokens, necessary `@keyframes`, font declarations and genuine host base rules in CSS. Do not hide component styling in a giant `@apply` stylesheet. Use locally named static class strings when a component's variants need readable grouping. Keep document reset in the host: Tailwind Preflight can change geometry and must not enter portable output. Remove migrated legacy selectors; never leave competing class/stylesheet owners.

## Runtime ownership and portability

Preserve distinct initial capability snapshots: unknown capability, reduced motion, and pointer availability are not interchangeable. Share subscription mechanics only when semantics remain explicit.

Keep prepared/visible/playing media states distinct. Poster readiness, delayed menu video retirement, full-film retry and loader readiness have different ownership. Share small source/release helpers without merging those policies. Maintain one native video per displayed stream, bounded active GPU contexts, lazy source attachment, exact listeners/timer/RAF cleanup and no idle render loop.

Reusable effects receive color/intensity and inputs as props or documented CSS variables. Keep site defaults in content/theme. A context/provider is justified only by actual shared ownership. Reuse examples temporarily supply independent host props and restore them after checking two-instance isolation, unmount/remount, reduced motion and asset/error handling as applicable. Document required fonts, CSS/theme and source-scanning inputs, assets and host adapters. Packaging and a framework-free import graph are separate from visual equivalence.

## Tailwind migration checks

Keep selector values statically readable by the source scanner: use unquoted identifiers for `data-state=open`, and literal single quotes for numeric values such as `[data-delay='6000']`. Avoid JavaScript-escaped double quotes inside arbitrary variants. Inspect emitted CSS and real computed styles, not just build success. Font shorthand resets kerning and ligature settings; preserve their intended precedence. Preserve the effective old cascade at breakpoints, including selectors that were overridden later.

For visual baselines, use matching foreground-tab ownership, settled font/image loading and fixed video frames. Compare reduced/static appearance separately from normal temporal motion and GPU ownership. Run performance captures without other browser checks or builds. A browser closed or interrupted by input is an incomplete run, not a measured application regression or a pass.
