# Role-first portable library contract

Profile: `role-first-portable-library`. Version: **2**.

This is the required source layout for new or reconstructed target libraries and
explicitly approved structural migrations designed by web-reference-react-architecture
and implemented by web-reference-react-structure. For an existing app's scoped
behavior-only refactor, preserve its framework, routes, folder layout, styles and
public interfaces. Apply relevant ownership and reuse boundaries without requiring
a full migration. Within an approved structural migration, an older tree is
migration input, not an alternative profile. 승인한 동작 수정은 검토해 적용한다.
변경 범위 밖의 동작·인터페이스는 보존하며 경로·이름·entry·제작 변경을 함께 계획한다.
Changing this skill does not itself migrate existing projects or reapprove their
architecture packets. For a structural migration, revise and rebind an approved
old-layout packet under this contract before source changes; retain the parent's
approval, Oracle and signature gates when applicable.

## Required roots and layout

Record the host application root, portable library root, library source root,
public entry directory, package name when applicable, profile/version, vocabulary
version, and applicable project instructions/classification policy. Use
target-relative paths; do not bake one user's filesystem or page list into the skill.

A single-project Vite layout can keep logical host and library boundaries:

```text
<project>/
├─ app/                              Host entry, routing, content and adapters
│  └─ globals.css                    Document defaults; imports portable CSS
├─ styles/portable.css              Prefixed portable Tailwind input
├─ src/                              Portable UI source root
│  ├─ exports/                       Named public re-exports only
│  │  ├─ init.ts                      InitPage and owner-colocated types
│  │  ├─ <page-key>.ts                One public entry per page implementation
│  │  └─ common.ts                    Public shared interfaces
│  ├─ pages/init/InitPage.tsx         Entry initialization, host-controlled
│  ├─ pages/<page-key-or-common>/
│  ├─ sections/<page-key-or-common>/
│  ├─ components/<ModuleName>/
│  ├─ elements/<ModuleName>/
│  └─ interactions/<ModuleName>/
└─ package.json                      Existing project configuration
```

Logical separation does not require a separate npm package or `packages/` folder.
Version 1 grouped all five roles by page key or common. Treat those paths as
migration input; changing this contract does not move or reapprove existing apps.

Use a separate package root only for an actual independent build/distribution
requirement; its portable source follows the same layout. 신규 템플릿은
`styles/portable.css`를 필수 입력으로 둔다. 문서 reset·body·root 설정은
`app/globals.css`에 둔다. 기존 앱은 승인한 변경 범위에서만 이 경계를 도입한다.
Component styles remain Tailwind classes beside their DOM.

In the Vite template, host `app/` owns BrowserRouter routes, content and adapters.
Existing hosts retain their current framework router, adapter and route-file
locations; introducing a portable library does not replace them with BrowserRouter.
Portable `src/` never imports React Router or host framework routing. Do not
introduce a second Page wrapper when the route only passes data and adapters to
the library Page.

Only the five role directories contain implementation at the source root;
`exports/` is the public interface directory, not a sixth implementation role.
Create directories and entries only when real implementation needs them. The
canonical public paths are `src/exports/<page-key>.ts` and `src/exports/common.ts`,
relative to the selected library root. Do not retain competing root entry files.
Package configuration, environment declarations, generated outputs, site assets and
global styles belong outside the source root; small UI-owned icons may stay beside
the owner and use direct imports or inline SVG; owner-specific support code stays
beside its implementation, including actual type definitions.

| Role directory | Responsibility |
| --- | --- |
| `pages` | Page assembly and page-owned input data/types/state support |
| `sections` | Meaningful page regions, including responsive composition |
| `components` | Composite UI and lifecycle/host infrastructure |
| `elements` | Meaningful detail UI markup/styles: links, buttons, cards, text, media |
| `interactions` | Independently meaningful input/scroll/time/entry motion and effects |

Use the actual site's page implementation keys in kebab-case. Several detail
URLs using one Page and different data have one key and one index. A second site
with product/category pages uses those keys, not a copied home/works/contacts list.
Only `pages` and `sections` group implementations by page key; their shared
implementations may use role-local `common/`. `components`, `elements`, and
`interactions` place named modules directly under the role, without page-key or
`common/` subdivisions, whether page-owned or shared. Reuse does not require moving
a module. Keep semantic ownership, consumers and public scope in the contract.
There is no root `common/`, `shared/`, `features/`, `effects/`, `hooks/` or `state/`
implementation directory. Do not nest roles as `pages/home/sections`.

React component files and optional module directories use their PascalCase
public name: `Header/Header.tsx`, `WorksIntroSection/WorksIntroSection.tsx`.
Page files use `<Name>Page.tsx`; page regions use `<Name>Section.tsx`. Ordinary
support files use readable kebab-case, such as `viewport-scroll.ts`,
`carousel-motion.ts`, or `home.data.ts`. A component can remain one file without
a directory when no cohesive supporting implementation needs colocation.

## Ownership and dependency direction

The semantic hierarchy remains Site -> Page -> component; a Section is a
component owning a page region. Physical role placement does not determine
catalog kind, semantic owner, sharing, or portability.

- Pages compose their Sections and UI and receive route/content inputs from the
  host. Page-specific implementations do not import another page's internals.
- Reusable modules receive site content and host behavior through their
  interface. They do not import pages, page-only implementations, default site
  content, framework adapters or React Router.
- Whole-site composition belongs in `app/`; no Site composition exception is
  registered by the template. Pages import same-key/common Sections and UI.
  Sections do not import Pages or another Section owner. Lower UI roles may
  compose one another without a fixed hierarchy, but cannot import Pages/Sections.
- Another module imports only the main owner implementation or its contract types.
  Keep private children/helpers inaccessible outside the owner. Do not create
  inter-module cycles, including cycles within the same role.
- A shared physical location does not make a parent's private child publicly
  reusable. Record one semantic owner and separate proven use references.
- Keep private markup, data, types, helpers, local state, motion, styles and tests
  together when understanding them requires the same owner. The `interactions`
  directory is for independently meaningful behavior; do not split every
  callback or RAF calculation out of its UI merely to populate that role.

State is still a composition responsibility. For example, ViewportScroll can
live in `components/ViewportScroll` while retaining a state-management
catalog classification. Pure parsing, static data and types remain dependencies,
not synthetic state owners. Do not add a sixth role or wrap a state module in a
visual component to force classification.

## Names and public indices

Read [ui-naming-vocabulary.md](ui-naming-vocabulary.md) before naming modules.
Use its preferred name when the actual responsibility matches. Useful domain
qualifiers disambiguate different contracts or public-scope collisions; common
names do not require identical props, renderer choices or implementation.

The following is one site's example, not a fixed set of required modules:

```text
src/
├─ exports/
│  ├─ home.ts
│  ├─ works.ts
│  ├─ work-detail.ts
│  └─ common.ts
├─ pages/
│  ├─ home/HomePage.tsx
│  ├─ works/WorksPage.tsx
│  └─ work-detail/WorkDetailPage.tsx
├─ sections/
│  ├─ home/HeroSection/HeroSection.tsx
│  └─ works/WorksIntroSection/WorksIntroSection.tsx
├─ components/
│  ├─ Header/Header.tsx
│  ├─ Carousel/Carousel.tsx
│  ├─ ViewportVideos/ViewportVideos.tsx
│  └─ ViewportScroll/
│     ├─ ViewportScroll.tsx
│     └─ viewport-scroll.ts
└─ elements/Footer/Footer.tsx
```

Entries in `src/exports/` contain explicit named re-exports of the intended public
components/functions and types. No execution, content initialization, registry
array, wildcard export, synthetic Provider or forwarding wrapper belongs there.
Shared entries are exported by `exports/common.ts`, not repeated in every page index.
The public `common.ts` entry does not require a physical `common/` module directory.
No catch-all `index.ts`, `public-api.ts`, per-module package subpaths, or barrels
inside every directory are part of the required target structure.

```ts
// src/exports/home.ts
export { HomePage, type HomePageProps } from '../pages/home/HomePage';
export {
  HeroSection,
  type HeroSectionProps,
} from '../sections/home/HeroSection/HeroSection';

// src/exports/common.ts
export {
  Carousel,
  type CarouselProps,
} from '../components/Carousel/Carousel';
```

Internal implementation imports the needed implementation file directly, not
its own `exports/` entries. Hosts and examples consume page/common public entries,
for example `../src/exports/home` or a configured alias resolving there. If the
library is packaged, map `@scope/site/home`, `@scope/site/work-detail` and
`@scope/site/common` to those entries and record `package.json` exports and
JS/declaration outputs. Do not add package metadata or a library build solely to
provide local public imports. Record required stylesheet/source-scanning imports
and the asset base contract for either delivery mode. A named re-export may
expose an existing default export under the preferred public name; do not rename
a library API.
Keep file/export/Props/hook names, examples and catalog display aligned, while
preserving stable registration IDs and documented external compatibility needs.

An index is an import surface, not a complete transfer bundle. A public module
requires its private implementation closure, styles, assets, providers, adapters
and lifecycle conditions. Record export-map/build/generator/example/catalog/source
range changes together; a generator that recreates the old tree is an incomplete
migration. Record actual compatibility aliases only for existing consumers that
need them; they do not permit a second target folder layout.

## Discovery and reuse handoff

Provide the Naming and discovery inventory in
[architecture-contract.md](architecture-contract.md). It connects each meaningful
module's identity, preferred role, actual name and aliases to ownership, source,
public import, proven use sites and transfer evidence. This is Markdown contract
data, not permission to invent component-map or catalog JSON fields.

Where an existing catalog supports them, use its name, description, tags, sources,
ownership, uses, examples and delivery fields. Example search terms are
`role:carousel`, `alias:ImageCarousel`, `alias:캐러셀`, `input:drag`; add behavior
tags only with evidence. Normalize role tags to lowercase kebab-case, for example
`HeroSection` -> `role:hero-section`, and record the base role for qualified names.
Search consumers should normalize case. Keep an existing item ID through renames;
scope new IDs to the project and map architecture IDs to registration IDs explicitly.
The public package subpath and exported symbol are separate facts; do not store
one in a field whose schema defines the other.

Distinguish these relationships:

| Relationship | Required basis |
| --- | --- |
| Uses of this implementation | Actual use references to the same project/item identity |
| Data/route examples of it | The same implementation supplied with different content; preserve indirect Page links |
| Same-role implementations in other sites | Separate site/item identities linked by vocabulary role and comparable contracts |
| Verified cross-project reuse | The same implementation actually consumed in another project with host/style/asset/lifecycle evidence |

A matching name, source hash, different route, common folder, build, or local
fixture does not prove cross-project reuse. Do not auto-merge same-role entries.
Unsupported cross-project links stay in the Markdown handoff until schema,
validators and consumers are deliberately extended together.

The skill produces a consistent discovery/reuse contract. Actual global search
requires catalog ingestion, index fields and UI consumers to implement it. Report
that boundary explicitly; changing a skill does not implement a search screen or
retroactively register existing sites.

## Acceptance checks

For new or reconstructed target libraries and approved structural migrations,
the architecture/implementation handoff must establish the following. A scoped
behavior-only refactor instead preserves its existing host/layout and applies
the relevant ownership, reuse and verification checks without a full migration.

1. Exactly this profile/version and explicit application/library roots, without
   retaining a competing legacy target tree.
2. Real page keys and optional role-local common only in pages/sections; direct
   named modules in components/elements/interactions, with only meaningful directories.
3. Vocabulary-based names, matched exports/types/examples and named entries under
   `src/exports/`; local public paths or actual package subpaths, stylesheet/asset
   contracts and generator output locations.
4. Semantic owners, classification, consumers and state/lifecycle recorded
   independently of physical placement; Site composition exceptions file by file.
5. Identity/alias/role/source/public-import/use/example/transfer handoff for global
   discovery, with unsupported schema mappings and unverified reuse explicit.
6. Import-boundary and independent-data mounting/teardown checks in implementation,
   plus the existing signature, parity, accessibility and resource lifecycle gates.

Architecture specifies these checks. It does not create application files or
run an implementation fixture before the parent workflow permits that slice.


## Required template and project start

New projects start from `https://github.com/harness-subdev/reference-template`,
private template, default branch `main`. Stack: React, Vite, TypeScript strict,
Tailwind, React Router, GSAP, @gsap/react, npm, ESLint and Prettier. Host root is
`app/`, portable library root/source is `src/`, entries are `src/exports/`.
[portable-delivery.md](portable-delivery.md)의 InitPage·스타일·자산·모션·variation·혼합 검증 계약을 함께 적용한다.
Architecture records these facts and checks the baseline layout; it does not
select a template commit or create the application.

At the parent workflow's implementation gate:

1. Verify private access and the destination's existing files/Git state. Clone
   `main` into a new empty temporary directory with `git clone --branch main
   --single-branch https://github.com/harness-subdev/reference-template.git <temporary>`.
   Stop on authentication or missing-repository errors; never scaffold a substitute.
2. Read `git -C <temporary> ls-files -z`. Check **every** tracked path against the
   destination, including existing directories, symlinks, README.md and AGENTS.md.
   Check parent paths too. If any path collides, report all collisions and copy
   nothing. Preserve `.reference-reconstruction/`, user files and existing Git.
3. Copy only the tracked files, preserving their relative paths. Do not copy `.git`,
   origin, node_modules or build output. If copying fails, report the files added
   by this attempt and stop; do not roll back existing files or proceed.
4. If the destination is not already inside a Git repository, initialize its own
   repository. Record the template URL and actual `git rev-parse HEAD` once in the
   generated README. Do not require an architecture-time commit or separate digest.
5. 반드시 `npm ci`와 초기 `npm run check`를 실행한다. 필수 InitPage·init entry·portable CSS가 없거나 검사가 실패하면 구현을 시작하지 않는다. 구현 후에도 `npm run check`를 통과해야 한다. In a reconstruction replace the starter
   content in the first signature slice; do not add unrelated routes or demos.
   Verify replacement props temporarily in the host, then restore them. Exercise
   real unmount/remount, reduced motion and scoped GSAP cleanup in connected Chrome.
6. Only with task authorization, create a new project's own empty remote and bind
   that remote. A generated project must never point origin at the template.
   Report remote creation as unexecuted when authorization/access is absent.

`npm run check` runs `check:architecture`, `test:architecture`, `node scripts/check-init.mjs`, `typecheck`, `lint`,
`format:check`, `build` sequentially. Structure checks use TypeScript parsing and
resolution for paths/import graphs, including aliases, type imports, reexports,
string dynamic imports and module cycles. Typecheck owns syntax, types, invalid
configuration and unresolved imports. Nonliteral dynamic import, require and
import.meta.glob are rejected in app/src. All source files are checked regardless
of TypeScript include. Runtime UI code is .ts/.tsx; declarations and local icons
are not executable graph nodes. Product code cannot import tests or __tests__.
문서 전역 CSS는 호스트가 소유한다. portable CSS는 전달 계약을 따른다.
콘텐츠 자산 URL은 props로 받고 구현 필수 자산은 검사한 상대 참조로 전달한다.
Keep real href, modified-click and new-tab behavior. Subpath deployment aligns
Vite base, router basename and asset base. Production SPA fallback is a host
requirement, not something Vite's dev server proves.

CI `verify` runs npm ci/check on PRs and main pushes. Branch protection is a
separate repository setting and is not inherited by generated projects.
