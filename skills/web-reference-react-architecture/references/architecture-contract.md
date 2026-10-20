# React Reference Architecture Contract

Use this structure for `.reference-reconstruction/react-architecture.md`.
Remove sections that are genuinely not applicable; never invent evidence to fill
them.

## Document header

Begin with YAML frontmatter:

```yaml
schemaVersion: 1
status: draft
approvalDate: null
projectId: "{project-id}"
routeScope:
  - "/"
targetStack: "react-typescript"
oracleLock: "{sha256-or-not-applicable}"
componentMap: ".reference-reconstruction/component-map.json"
evidenceMode: "behavior-only-or-source-mirror-assisted"
```

Use only `draft` or `approved` for `status`. The agent may create or revise a
draft. Change it to `approved` only after the user explicitly approves that exact
revision.

## 1. Scope and evidence inputs

List route, viewport, input, readiness, analysis, Oracle, static graph, runtime
graph, GPU, and asset evidence used. Separate unavailable evidence and state how
each gap limits architecture or parity.

## 2. Architecture decisions

Record:

- framework, router, rendering mode, and styling strategy;
- framework/runtime conventions and existing paths that must remain, plus any
  explicitly approved path migrations;
- structure profile `role-first-portable-library` v2 for new or reconstructed
  target libraries and approved structural migrations, plus vocabulary v1;
- host application root, library root/source root, `exports/` entry directory,
  local consumer paths and package name only when independently packaged;
- actual page implementation keys and their route/data-example mapping;
- applicable instruction/classification sources and versions;
- selected scope branches: landing-page baseline plus any server-state, forms,
  or shared-client extensions, with evidence and omitted dependencies;
- dependency choices and rejected overlaps;
- asset profiles and licensing constraints;
- public/private module promotion rule.

For every non-obvious decision include evidence, rationale, and the condition
that would cause reconsideration.

## 3. Folder structure

Read [portable-structure.md](portable-structure.md) and apply its canonical scope:
new or reconstructed target libraries and explicitly approved structural migrations
use the exact role-first-portable-library v2 target-relative tree. Within that
scope, an existing tree is the migration baseline, not an alternative layout.
An existing app's scoped behavior-only refactor preserves its framework, routes,
folder layout, styles and public interfaces; apply relevant ownership and reuse
boundaries without requiring a full migration. This scope applies to standalone
and parent-driven work alike.

The library source root contains the `exports/` public interface directory
(with actual `<page-key>.ts` and `common.ts` entries) and the five implementation roles `pages`, `sections`, `components`, `elements`,
`interactions`. Only `pages` and `sections` group by actual page keys or role-local
`common`. The other three roles contain named modules directly, without page-key
or `common` subdivisions. Ownership and reuse remain explicit metadata. Create
only directories and exports with a meaningful implementation. Framework routes
and adapters stay outside the portable library boundary. For a new Vite-template
target, host `app/` owns them; record its template URL, main branch, stack and
public paths without pinning a template commit during architecture. For an
existing host, record and preserve its actual host, route and adapter paths,
including Next.js Pages Router or `src/app` locations, unless migration of those
paths is explicitly approved.

For every moved implementation, record old/new paths and affected imports,
public symbol/Props names, local public imports or applicable package exports
and JS/type build outputs, generated
source locations, source ranges, examples, catalog links and evidence hashes.
Host/package assets, global CSS and build declarations remain outside the source
root; owner-private support code and actual type definitions remain colocated.
Logical separation does not force a separate npm package or `packages/` directory.
신규 템플릿은 `styles/portable.css`를 전달 입력으로 두며,
문서 설정은 `app/globals.css`가 소유한다. 기존 앱은 승인한 변경 범위를 따른다. Keep Site
composition in the host; the template registers no Site exception. No root shared/common,
page-nested sections, catch-all public-api/index, or page-first target remains.

문서 전역 스타일과 휴대용 토큰의 소유 위치를 구분하고 부모의 Tailwind 규칙을 따른다. Exact values and statically discoverable classes must retain
observed geometry and behavior. 구조 이전은 증거를 보존한다. 승인한 동작 수정은 기대 결과와 영향 검사를 기록한다.
구조 이전 성공만으로 원본 일치를 증명하지 않는다.

## 3a. 필수 시작·전달 기록

신규 프로젝트는 다음 표를 반드시 채운다. 설계 단계에서는 실행 예정과 완료 근거를 구분한다.
[portable-delivery.md](portable-delivery.md)의 정확한 계약을 적용한다.

| 항목 | 필수 기록 |
| --- | --- |
| 프로젝트 시작 | 템플릿 URL·main·clone/충돌 검사·초기/최종 npm run check의 실행 단계와 소유자 |
| 초기화 | InitPage·init entry·readiness·완료·오류·재시도·해제·목적 URL·포커스 정책 |
| 스타일 | styles/portable.css·호스트 globals·사이트 고유 접두사·토큰·폰트·keyframes·rem·bounds |
| 자산 | 필수 포함 파일·콘텐츠 입력·상대 URL·미리보기 입력·실패 정책 |
| 모션·variation | 포인터·스크롤 소유자·cleanup·접근성·실제 제공하는 variation 입력 |
| 전달 검증 | 실제 두 TGZ의 독립 소비·CSS AB/BA·반복·부분 해제·입력 검사와 소스 ZIP 수정 검사 |

전달 제작이 이번 범위 밖이면 후속 작업의 소유자·입력·완료 근거를 명시한다.
검사 전에는 혼합 소비를 검증 완료로 표시하지 않는다.

## 3b. State ownership and dependency direction

List each meaningful state source, its owner, consumers, lifetime/reset, and
persistence if any. Distinguish static content, local UI, URL, and frame state;
include server data, forms, or shared-client state only when those branches apply.
Do not duplicate router/query state in a client store. Treat editing drafts as
separate intentional state with an explicit initialization and reset policy.

Pages compose Sections and UI. Page-specific implementations and sibling
Sections do not import each other's private implementation. Reusable
modules do not import page internals, default site content, framework adapters
or React Router. Whole-site assembly belongs to the recorded host location,
which is `app/` in the new Vite template. Preserve the existing host's framework
composition paths. Lower UI roles may compose one another without a fixed
hierarchy; owner-private access and module cycles remain forbidden. Apply these boundaries
independently of the module's semantic kind and ownership.

## 4. Module tree and ownership

Show Page, Section, proven UI, effect, and controller relationships. Assign every
observed layer and interaction to exactly one owner. Identify client boundaries
and lifecycle owners.

### 4a. Component composition inventory

Record the target project's instruction/policy source and version when supplied;
otherwise identify the skill's semantic defaults. Classification describes
responsibility; it does not require a physical folder layout or extend the
component-map schema.

For each Page, Section and component, provide an inventory with these columns:

| Owner | Responsibility | Member or source range | Source/planned path | Reuse scope and consumers | Evidence | State/lifecycle owner |
| --- | --- | --- | --- | --- | --- | --- |

Use the responsibilities Element (요소), Interaction/animation
(인터랙션·애니메이션), and State management (상태 관리). Explicitly mark a
responsibility absent when no meaningful member is evidenced. Include child
components as structural links; do not flatten them into these three categories.
Shared components follow the same inventory. Distinguish owned children from
usage references so one implementation does not acquire several owners.

For example, a video stream remains a component: its cards and pause button are
elements, its RAF scrolling and media controls are interaction/animation, and
its explicit pause selection is state management. The component can own all of
these in one file. Its frame coordinates belong to the motion lifecycle rather
than a duplicated React store. A text-splitting renderer can be an element while
its owning Section owns the animation. Pure URL parsing is a dependency; record
the Page's actual query synchronization under state management.

Do not infer a classification from `controller`, React hooks or CSS/JS file
types. Record uncertain responsibilities as unresolved. Keep types, static data
and pure helpers in the dependency closure unless a distinct meaningful
composition responsibility is evidenced.

### 4b. Naming and discovery inventory

Read [ui-naming-vocabulary.md](ui-naming-vocabulary.md). For each meaningful
Page, Section, public candidate or catalogued responsibility, record:

| Project / stable item ID | Preferred/base role / actual name / aliases | Evidence and naming rationale | Semantic kind / owner / page key | Source/range and closure | Public index / package subpath / export / props type | Proven uses and route/data examples | Transfer and verification status |
| --- | --- | --- | --- | --- | --- | --- | --- |

Use vocabulary names when responsibility matches; retain useful domain qualifiers
and private parent context. Distinguish official patterns, library conventions,
code naming and project responsibility contracts. Preserve existing registration
IDs; scope new IDs to the site and map architecture IDs to catalog IDs when they
differ. Record normalized role and old-name alias search terms where existing
tags support them, e.g. `role:carousel`, `alias:ImageCarousel`. Do not infer kind,
shared status, or independent portability from name, folder, extension or hook.

Record separate uses of the same item, data examples of the same implementation,
and other sites' same-role implementations. Cross-project reuse requires an
actual second consumer and independent host/lifecycle evidence, not a name match.
For each field, identify the existing component-map/catalog mapping or state
that it remains Markdown-only. Never silently add JSON fields. A package subpath
is distinct from an exported symbol. The handoff must name any missing catalog
search/index/UI work; producing this inventory does not implement global search.

## 5. Public module contracts

For every public candidate and Section, record:

```text
Name / preferred base role / original aliases:
Project and stable registration ID (or planned mapping):
Source/planned path and semantic owner:
Public index / package subpath / named symbol / Props type:
Kind: Page | Section | UI | Effect | Controller
Composition inventory: section 4a owner/member links
Reuse scope and proven consumers:
Data/route examples and same-role alternatives (distinct identities):
Purpose:
Interface: props, slots, events, invariants, error modes
Owned state:
Hidden implementation:
Dependencies:
Implementation file closure: private children, helpers, styles and assets
Host requirements: router/provider, DOM targets, CSS/tokens, asset resolution
Transfer boundary: standalone candidate | parent/host required | unresolved
Assets:
Responsive variants:
Accessibility and reduced motion:
Fallback and cleanup:
Evidence claims:
Parity checkpoints:
Unresolved:
```

Public indices expose intended names and types with named re-exports only.
Internal implementation imports the actual file, never its own `exports/` entries.
Hosts and examples use the public entries. Specify local consumer imports or an
applicable package export-map, stylesheet, asset and generator contracts together.

Keep helpers and private children out of the public inventory; reference them
from composition and implementation closure records. Kind above describes the
technical implementation form, not a catalog mapping that turns every
Controller into an effect or state owner. Record export and cleanup ownership
and any concrete host mismatch requiring an adapter. Use existing interfaces
for wrapping; public candidacy and a complete inventory do not prove portability.

## 6. TypeScript content and event models

Define concrete interfaces for repeated content and cross-module events. Prefer
serializable data across server/client or Page/Section seams. Document optional
fields and failure behavior. Do not expose frame-rate state through React props.

## 7. Design-system tokens

Group tokens by color, typography, layout, spacing, border/radius, layers, media,
motion, and breakpoints. For each token state value or formula, evidence class,
owner, consumers, and tuning checkpoint.

## 8. Motion and renderer ownership

Map each chain as:

```text
input -> owned state -> scheduling/easing/formula -> output -> owner
```

Separate DOM animation, smooth scroll, SVG filters, canvas/GPU rendering, and
route transitions. State which values live in React and which stay in refs or
lifecycle-owned modules. Include resize, context loss, cleanup, asset failure,
and reduced-motion behavior.

For every desktop signature renderer, add:

```text
Checkpoint ID:
Capture input/state/readiness/reduced-motion/time/randomness:
Ordered surface ID:
Oracle/parity surface kind: dom | svg | canvas2d | webgl | webgl2 | webgpu
Root owner:
Owner implementation file closure:
GPU context API/version:
Expected shader/program-or-pipeline/framebuffer-or-attachment/texture counts:
Exact pass order:
Approved comparison method/tolerance/metric IDs/units/maxima:
Fallback surface and activation condition:
Forbidden compensation: CSS | DOM | screenshot | checkpoint-conditional
```

Exact fidelity requires the Oracle and parity surface kinds to match. Treat a
Canvas2D, DOM, SVG, CSS, or static fallback as a separate failure/accessibility
path, not as parity evidence for WebGL, WebGL2, or WebGPU. Plain Canvas2D has no
GPU validation requirement. Preserve surface identity, order, and multiplicity:
three observed WebGL2 contexts become three named signature surfaces, even when
they share a renderer kind.

## 9. Responsive substitution matrix

For each relevant Section compare desktop, mobile, touch, and reduced-motion
structure, content, assets, controls, effects, and fallbacks. Use separate private
implementations when the DOM or interaction model actually differs.

## 10. Dependency budget

For every runtime dependency list owner, behavior, alternatives considered, and
why a native/platform/existing option is insufficient. For selected application
extensions, record the trigger, state/cache owner, and simpler option considered;
use the relevant sections of [application-extensions.md](application-extensions.md).
Treat their libraries as candidates, not a required installation list. Mark dependencies that
are research-only and forbidden from distribution.

## 11. Verification and parity map

Map each module to observable DOM, computed-style, interaction, screenshot,
console, asset, accessibility, and GPU checks. Reuse the reference's exact
viewport and state labels where available. For selected application extensions,
add behavior checks for applicable loading/error/empty/success states, form
validation, URL navigation, and store reset or persistence. Specify intended
checks here; do not create tests while running the architecture skill.

Within the approved structural scope, include checks for the five roles, actual page keys and optional
common under pages/sections only, direct named modules in the other three roles,
named entries under `src/exports/`, vocabulary/export/type/example agreement, local public paths or applicable package exports and build/generator
outputs. Require import-boundary and
independent-data mount/unmount checks for implementation when that slice is
allowed. Verify existing catalog mappings and identity/use/example distinctions;
report search ingestion/UI gaps and unproven reuse explicitly. These are planned
checks, not a new schema or permission to implement an early extraction fixture.

Define the mandatory first gate in a block that maps directly to
`component-map.json.desktopSignature.policy`; its wrapper records explicit
`status: approved` and the recursively canonicalized policy SHA-256:

```text
Desktop signature route:
Viewport: width × height @ DPR
Exact fidelity: true
Forbidden compensation set:
For each checkpoint:
  ID and current component claim
  Input/state/readiness/reduced-motion/time/randomness controls
  Ordered surface IDs/kinds/root owners/implementation file closures
  GPU context/version, exact resource counts, and exact pass order
  Comparison method/tolerance/metric IDs/units/maxima
Continuation rule: broader implementation starts only after signature pass
```

Each checkpoint needs distinct hash-bound Oracle and target comparison outputs.
The schema-v2 policy is approved before planning; its recursively canonicalized
digest changes when any locked capture, owner, file closure, surface, tolerance,
metric maximum, or GPU contract changes. The schema-v2 receipt can report only
implementation digests, observed metric values, output hashes, compensation
observations, and structured GPU status against those locked fields.

For WebGL/WebGL2, the GPU status JSON must expose matching checkpoint/surface
identity, context API/version, individual shader compile and program link
results, individual framebuffer completeness, exact pass order, locked texture
count/readiness, positive draws, and zero errors. WebGPU uses individual shader,
pipeline, attachment, resource, pass, draw, and validation-error status. A PNG,
evidence-kind list, or generic health boolean is insufficient. Fix mismatches in
the named root owner; do not plan CSS, DOM, screenshot, or checkpoint-conditional
compensation.

## 12. Implementation slices

Order the smallest vertical slices that produce separately verifiable behavior.
Do not write the implementation plan here. State only slice boundaries,
dependencies, and completion evidence.

The first slice is always the desktop signature. Later Sections, routes,
viewports, public extraction, and generalized design-system work remain blocked
until its matched visual/behavioral comparison and applicable GPU evidence pass.

## 13. Open and blocking decisions

Separate:

- implementation-blocking uncertainty;
- parity-blocking uncertainty;
- non-blocking approximation;
- deliberately chosen production behavior.

Record fallback behavior separately from parity. A fallback required for
resilience or accessibility does not reduce an exact parity obligation and must
not be selected during the locked signature capture.

The orchestrator must not begin clean implementation while an item required for
the approved first slice remains implementation-blocking.

## Approval record

After explicit approval, record `status: approved` and the approval date in the
architecture document. Plans and component-map reference its path; no design-document
hash is required. Bind the schema-v2 signature policy digest and run the parent's
`--stage architecture` before writing a plan or implementation. A material change
returns the architecture and affected plan to review and requires approval again.
