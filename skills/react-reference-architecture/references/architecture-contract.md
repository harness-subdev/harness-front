# React Reference Architecture Contract

Use this structure for `.reference-reconstruction/react-architecture.md`.
Remove sections that are genuinely not applicable; never invent evidence to fill
them.

## Document header

Begin with YAML frontmatter:

```yaml
schemaVersion: 1
status: draft
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
- framework/runtime conventions that must remain, and old paths that must migrate;
- required structure profile `role-first-portable-library` v2 and vocabulary v1;
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

Read [portable-structure.md](portable-structure.md) and show the exact
role-first-portable-library v2 target-relative tree. This is the only target
layout; an existing tree is the migration baseline, not an alternative example.
The contract applies to standalone and parent-driven reconstructions alike.

The library source root contains the `exports/` public interface directory
(with actual `<page-key>.ts` and `common.ts` entries) and the five implementation roles `pages`, `sections`, `components`, `elements`,
`interactions`. Only `pages` and `sections` group by actual page keys or role-local
`common`. The other three roles contain named modules directly, without page-key
or `common` subdivisions. Ownership and reuse remain explicit metadata. Create
only directories and exports with a meaningful implementation. Framework routes
and adapters stay outside that source root. Keep Next router-reserved locations
separate; do not put generic library UI in the host's `pages` or `src/pages`.

For every moved implementation, record old/new paths and affected imports,
public symbol/Props names, local public imports or applicable package exports
and JS/type build outputs, generated
source locations, source ranges, examples, catalog links and evidence hashes.
Host/package assets, global CSS and build declarations remain outside the source
root; owner-private support code and actual type definitions remain colocated.
Logical separation does not force a separate npm package, `packages/` directory,
or stylesheet folder. Reuse existing host CSS for Tailwind input when suitable;
add separate style delivery only for a concrete package requirement. List only file-specific Site
composition exceptions and their permitted imports. No root shared/common,
page-nested sections, catch-all public-api/index, or page-first target remains.

Keep global styles/tokens in one designated location and preserve the parent's
Tailwind rules. Exact values and statically discoverable classes must retain
observed geometry and behavior. A structural migration preserves evidence,
responsive substitutions and lifecycle; it does not establish reference parity.

## 3a. State ownership and dependency direction

List each meaningful state source, its owner, consumers, lifetime/reset, and
persistence if any. Distinguish static content, local UI, URL, and frame state;
include server data, forms, or shared-client state only when those branches apply.
Do not duplicate router/query state in a client store. Treat editing drafts as
separate intentional state with an explicit initialization and reset policy.

Pages compose Sections and UI. Page-specific implementations and sibling
Sections do not import each other's private implementation. Reusable
modules do not import page internals, default site content, framework adapters
or `next/*`. Whole-site assembly is limited to named Site composition files
listed in section 3, never the whole folder or Provider. Apply these boundaries
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

Include structural checks for the five roles, actual page keys and optional
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

After explicit approval, append the approval date and a SHA-256 of the exact
approved file. Bind the schema-v2 signature policy and run the parent validator's
`--stage architecture` before writing a plan or implementation. Downstream plans
must cite that hash. A material architecture
change invalidates the approval and requires a new hash and approval record.
