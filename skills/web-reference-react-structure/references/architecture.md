# Role-first portable React architecture

## Required source structure and names

Every site's target library follows [portable-structure.md](../../react-reference-architecture/references/portable-structure.md), profile `role-first-portable-library`, version 2. Read its exact tree, index, dependency and discovery contracts and the canonical [UI naming vocabulary](../../react-reference-architecture/references/ui-naming-vocabulary.md) before implementation. An existing page-first tree is migration input; it is not an allowed target or compatibility profile.

- The portable source root contains only `pages`, `sections`, `components`, `elements`, `interactions` implementation directories plus `exports/`, whose `<page-key>.ts` / `common.ts` files contain named public re-exports only. The `exports/` directory is an interface directory, not a sixth implementation role. Use the reference site's actual page implementation keys, not a fixed home/works list. Create only directories and public entries with a real responsibility.
- Only `pages` and `sections` contain page-key or optional `common/` implementations. `components`, `elements`, and `interactions` contain named modules directly, without page/common subdivisions. Page ownership and reuse do not change those paths. Do not create root `common`, `features`, `shared` or nested `pages/home/sections` trees. Framework routes/adapters stay in the host application outside this source root. Host/package assets and global styles also stay outside it. Logical separation does not require a separate npm package or `packages/` directory; a single project with host `app/` and portable `src/` is valid.
- Component files and optional module folders use PascalCase, for example `Carousel/Carousel.tsx` and `WorksIntroSection/WorksIntroSection.tsx`. Page keys and ordinary support files use readable kebab-case. Keep the visible Page → Section → child ownership even when their physical role directories differ.
- Use vocabulary names when responsibility matches: Header, Footer, HeroSection and Carousel. Carousel navigates content slides; Slider selects a value. Keep meaningful domain qualifiers and parent context when needed. Preserve ViewportVideos and ViewportScroll for their documented distinct responsibilities, with state classification independent of folder placement.
- Entries in `src/exports/` contain named re-exports only, including types defined beside their implementation. Internal code imports implementation files directly; hosts and examples use the page or common public entry, through a local path/alias or an actual package export. Do not expose every private child or add per-module public entry files. Keep types, helpers, styles, local state and motion beside their owner when they must be understood together; extract only independently meaningful interactions.

Record profile/version, host and library roots, vocabulary version, exact public indices/package exports, owner and source closure, actual use sites, aliases/stable IDs and the catalog handoff in the approved packet. Keep the naming/discovery inventory aligned as paths move. Update generators, build outputs, fixtures and source-path contracts together so they cannot regenerate an obsolete tree. Do not invent component-map/catalog fields; unsupported mappings stay in the Markdown handoff. A consistent contract does not itself implement global-search UI or prove cross-project reuse.

## Dependency boundaries

- The host composes library Pages and adapters. Pages compose their Sections and child UI; page-specific modules do not import another page's internals. Navigation owns its private menu and transition state.
- Reusable modules consume injected content/host interfaces and never import Pages, page-only implementations, default site content, host adapters or `next/*`.
- Whole-site composition is the narrow exception. The packet must name each permitted composition file and its imports individually, for example `components/Site/Site.tsx`, `App.tsx` and `site-content.tsx`. Do not extend the exception to the Site folder, Provider, Header, Carousel, or context/types used by reusable UI.
- Site data is supplied through props. Route-dependent UI receives navigation through an interface/adapter; reusable links remain real anchors with hrefs and preserve modified-click/new-tab behavior.
- Public page/common indices expose only intended components/functions/types with named re-exports. A physical common location does not change semantic ownership, catalog kind, or shared status.
- Readiness signals belong to the transition owner and identify the adapter-committed pathname and query; do not read browser location during an incoming page layout effect because history may commit afterward. Normal navigation must complete without waiting for its failure watchdog; cancel stale transitions and preserve fail-open timeouts. Do not couple a router to another feature's CSS selectors.

## Tailwind and motion

Reuse the existing host CSS as the Tailwind input for shared tokens and host base rules when suitable. A separate `styles/` folder is needed only for a concrete package/style-delivery requirement.

Use Tailwind classes for layout, typography, responsive rules, hover/focus, state variants, transitions and animations, including complex motion. Preserve measured values with arbitrary values rather than rounding them to the utility scale. Keep complete class strings available to Tailwind's source scanner. Export required CSS/source instructions for reuse.

Use CSS custom properties for continuously changing pointer/scroll/progress inputs. Write them imperatively without per-frame React state. Preserve compound transform order with `[transform:...]` when separate translate/scale utilities would alter it. Give each transform one owner; avoid CSS transitions competing with WAAPI/JS on the same property.

Keep only shared tokens, necessary `@keyframes`, font declarations and genuine host base rules in CSS. Do not hide component styling in a giant `@apply` stylesheet. Use locally named static class strings when a component's variants need readable grouping. Preserve existing reset at first: Tailwind Preflight can change geometry. Remove migrated legacy selectors; never leave competing class/stylesheet owners.

## Runtime ownership and portability

Preserve distinct SSR snapshots: unknown capability, reduced motion, and pointer availability are not interchangeable. Share subscription mechanics only when semantics remain explicit.

Keep prepared/visible/playing media states distinct. Poster readiness, delayed menu video retirement, full-film retry and loader readiness have different ownership. Share small source/release helpers without merging those policies. Maintain one native video per displayed stream, bounded active GPU contexts, lazy source attachment, exact listeners/timer/RAF cleanup and no idle render loop.

Reusable effects receive color/intensity and inputs as props or documented CSS variables. Keep site defaults in content/theme. A context/provider is justified only by actual shared ownership. Reuse examples must supply independent data and exercise teardown; packaging and a framework-free import graph are separate from visual equivalence.

## Tailwind migration checks

Keep selector values statically readable by the source scanner: use unquoted identifiers for `data-state=open`, and literal single quotes for numeric values such as `[data-delay='6000']`. Avoid JavaScript-escaped double quotes inside arbitrary variants. Inspect emitted CSS and real computed styles, not just build success. Font shorthand resets kerning and ligature settings; preserve their intended precedence. Preserve the effective old cascade at breakpoints, including selectors that were overridden later.

For visual baselines, use matching foreground-tab ownership, settled font/image loading and fixed video frames. Compare reduced/static appearance separately from normal temporal motion and GPU ownership. Run performance captures without other browser checks or builds. A browser closed or interrupted by input is an incomplete run, not a measured application regression or a pass.
