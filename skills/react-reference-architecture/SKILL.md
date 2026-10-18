---
name: react-reference-architecture
description: Use when approved public-site reference evidence needs a React and TypeScript architecture before reconstruction, including consistent role-first folders, UI names, public entry points, discovery and reuse contracts. Architecture only; not application implementation or catalog search UI.
---

# Web Reference React Architecture

Translate reference evidence into the smallest React and TypeScript structure
that can support a clean reconstruction. This skill owns architecture decisions,
not live-site analysis and not implementation.

Reply in the user's language.

## Required structure and naming references

Before designing paths or naming modules, read:

- [references/portable-structure.md](references/portable-structure.md): required
  `role-first-portable-library` v2 roots, five roles, page grouping through
  Sections, direct UI module placement, named public entries under `src/exports/`, dependency boundaries and discovery handoff;
- [references/ui-naming-vocabulary.md](references/ui-naming-vocabulary.md): v1
  preferred names, definitions, aliases and semantic boundaries.

Use this structure for every site's target, including an existing implementation
being restructured. An older page-first/features/shared tree is migration input,
not an alternative target. Record paths/names/exports/build transitions while
preserving behavior; do not silently migrate or reapprove existing applications
merely because this skill changed. The skill prepares consistent discovery data;
it does not implement a catalog's global search screen.

## Required inputs

Start from a scoped evidence packet containing:

- target URL and exact route boundary;
- a `site-reference-audit` report or equivalent behavior inventory;
- page/section order, responsive differences, effects, runtime signals, and
  unresolved claims;
- verified `design-system-reference-analyzer` outputs when source-backed fidelity
  was authorized;
- verified render contracts when canvas, WebGL, WebGPU, shaders, or render
  targets affect the architecture;
- a scrubbed `.reference-reconstruction/component-map.json` when invoked by the
  reconstruction orchestrator;
- a draft schema-v2 desktop-primary signature policy naming the route, viewport,
  DPR, per-checkpoint capture controls, ordered observed surfaces and owners,
  comparison criteria, and GPU contracts to approve with the architecture;
- the target repository's existing framework and conventions when it exists.

Consume scrubbed contracts and observable facts. Do not copy bundle bodies,
minified identifiers, recovered internal structure, research transcripts, or
unlicensed assets into the architecture packet.

When invoked by `reconstruct-react-reference`, do not write a persistent target
architecture until its Oracle stage passes. Before that gate, return only a
provisional in-response structure and list what remains blocked.

The parent reconstruction contract uses Next.js App Router, React, and TypeScript.
Preserve that target when invoked by the parent. Standalone use may follow another
existing React/TypeScript stack when the user or repository already selected it.

## Outcome

Produce one architecture packet that downstream planning and clean implementation
must follow. For a gated reconstruction, write it to:

```text
.reference-reconstruction/react-architecture.md
```

Use [references/architecture-contract.md](references/architecture-contract.md)
as the packet contract. Its status begins as `draft`. Only explicit user approval
may change it to `approved`; never self-approve it.

Do not create application source, package metadata, dependencies, assets, or
tests while running this skill.

## Scope branches

Default to landing-page reconstruction: Page/Section composition, static content,
local UI state, responsive styling, assets, and motion/render lifecycles. Do not
add API clients, query providers, form libraries, global stores, or empty feature
folders to a static reference merely to complete a stack.

Select extensions independently from approved behavior and user requirements:

| Trigger | Read only the matching section in the extension guide |
| --- | --- |
| Real API reads/writes or remote freshness requirements | Server state |
| Form submission, validation, or a multi-step input flow | Forms |
| Client-owned state shared by distant consumers or across routes | Shared client state |

For any triggered extension, read
[references/application-extensions.md](references/application-extensions.md).
Branches compose: a contact form may need only Forms; a live search may need
Server state and URL state but no global store. A menu, carousel, static gallery,
or scroll effect alone does not activate these extensions. An observed form or
account button does not authorize building a backend or integrating a service;
record whether its approved behavior is local, mocked, or live.

Record selected branches, evidence, owners, and omitted dependencies in the
architecture packet. Stay within this skill's architecture-only scope.

## Architecture method

### 1. Preserve the target stack

Follow an existing React/TypeScript repository's framework, router, styling and
test conventions within the required structure and vocabulary. For a new target,
choose the smallest stack that meets the approved scope. Do not force Next.js,
Vite, CSS Modules, Tailwind, GSAP,
Framer Motion, React Three Fiber, or any other dependency from visual style alone.

Use the same role-first contract in standalone and parent-driven architecture.
Keep framework routes/adapters outside the portable library source root; Next.js
`pages/` is a router directory in the host. Record profile/version, vocabulary
version, actual page keys, application/library roots and project policy sources.
Preserve the parent's portability and Tailwind rules within those roots. Logical
host/library separation does not require a separate npm package or `packages/`
folder. Keep a single project unless independent packaging is actually required;
reuse the existing host CSS for Tailwind input, tokens and base rules when suitable.

Use `vercel-react-best-practices` for React/Next.js decisions when applicable.

Choose the smallest dependency only after preserving the proven signature owner.
If runtime evidence assigns an exact checkpoint to WebGL, WebGL2, or WebGPU, a
Canvas2D, DOM, SVG, or CSS substitute is a fidelity downgrade rather than a
smaller equivalent implementation.

### 2. Define deep modules

Use `codebase-design` terminology and design modules with small interfaces and
deep implementations. Organize by responsibility:

```text
framework routes and adapters outside the library
library src/{pages,sections}/<page-key|common>
library src/{components,elements,interactions}/<ModuleName>
library src/exports/{<page-key>.ts,common.ts} named public entries only
host assets/global CSS and owner-colocated support code
```

Prefer `Page -> Section -> proven UI`:

- A Page owns routing metadata, section order, and route-level content assembly.
- A Section owns its content contract, responsive composition, local interaction,
  readiness, fallback, accessibility, and cleanup.
- A UI module becomes public only when two consumers prove repetition or its
  independent value is clear.
- Controllers, render passes, frame loops, input normalization, and asset
  resolution remain private unless a real second host needs the seam.

Colocate private content, styles, types, tests, and motion code with their owner
inside the appropriate role. Pages compose Sections; sibling Sections do not
import each other's internals. Reusable modules do not depend on page
internals, default site content or framework imports. Whole-site composition is
permitted only through the packet's named Site composition files, not a blanket
exception for common, Provider, or the Site directory.
Promote an effect to shared only when reuse is proven. Preserve stricter parent
portability rules when present.

Use only the required named public entries under `src/exports/`; do not create per-directory
barrels, atomic-design wrappers, or empty modules merely to increase reuse.

Choose Header, Footer, HeroSection, Carousel and other vocabulary names by actual
responsibility. Keep useful qualifiers and original-name search aliases; align
component/file/export/Props/hook/example names without renaming library APIs or
changing stable registration IDs. Record naming and discovery inventory using
the packet contract, independently of ownership, classification and reuse scope.

### 2a. Record component composition and transfer boundaries

Read the target project's AGENTS.md and classification policy when present.
Record their source and version; otherwise use the semantic defaults below.
Components contain child components and meaningful responsibilities, rather
than competing with those responsibilities as flat categories:

| Composition responsibility | Meaning | Display label |
| --- | --- | --- |
| Element | Meaningful UI markup and styles: button, link, text, card, media | 요소 |
| Interaction/animation | Input responses, timed/entry/scroll motion, media control, execution and cleanup | 인터랙션·애니메이션 |
| State management | Feature-state changes, reads, persistence and synchronization, including URL state | 상태 관리 |

For each Page, Section and component, fill the composition inventory required
by the packet contract. Give each meaningful responsibility one owner, source
path or planned location, evidence and lifecycle; mark absent responsibilities
as absent. A component need not contain all three. UI composition remains a
component even when it contains state and animation. CSS, JavaScript, a hook,
or the name `controller` does not determine classification. Pure parsing helpers,
types and static data remain dependencies rather than invented state owners.

Reuse scope is independent: page-owned and shared components use the same
composition inventory. Record proven consumers separately from ownership.
An independently reusable effect or state owner can remain a private or shared
responsibility without a synthetic component wrapper. Colocation and source
ranges are valid; these categories do not require folders, files or exports.

For a transfer candidate, record its existing interface, full implementation
file closure, styles/assets, host requirements and disposal ownership. Reuse
that interface for wrapping; specify an adapter only for a concrete host mismatch.
Public/shared candidacy does not establish standalone portability. Keep this
inventory in the architecture packet; map it to existing component-map fields
only where the supplied schema supports them. Do not silently extend that schema.

### 3. Separate content, UI state, and frame state

Define serializable TypeScript content models for repeated projects, awards,
navigation, media, or other records. Keep content outside JSX when more than one
record or viewport consumes it.

Assign low-frequency UI state such as menu visibility, selected item, and route
status to React where locally owned; consume router-owned navigation state from
the existing router rather than duplicating it. Keep shareable search/filter/page
state in the URL and calculate derived values from their source. Additional
server, form, and shared-client ownership follows the selected extension guide.
Keep pointer coordinates, scroll velocity, orbit angles, RAF
time, renderer state, and shader uniforms in refs or lifecycle-owned motion/render
modules so they do not trigger frame-rate React renders.

### 4. Preserve responsive substitutions

Record when desktop and mobile use different structures, assets, effects, or
interaction models. Model these as explicit variants or separate private
implementations behind one Section interface. Do not assume responsive work is
only CSS shrinking.

Specify reduced-motion, keyboard, touch, pointer, resize, loading, asset failure,
and renderer failure behavior for every interactive Section.

Keep fallback surfaces explicit and separate from the parity surface. A static,
DOM, SVG, Canvas2D, or reduced-motion fallback may be production-safe, but it
cannot close an exact claim owned by a different renderer.

### 5. Convert visual evidence into tokens

Define only tokens supported by repeated evidence or needed by multiple modules:

- color and opacity;
- type family, size, weight, line height, and tracking;
- grid, spacing, dimensions, border, and radius;
- layers and compositing;
- duration, easing, blur, scale, depth, and breakpoint values.

Label values as `observed`, `extracted`, `inferred`, or `chosen`. A chosen value
must include the parity checkpoint that will tune it.

### 6. Budget dependencies

Map each dependency to one owned behavior and remove overlaps. Prefer one primary
DOM motion system. Do not add Framer Motion beside GSAP without a distinct need.
Do not add React Three Fiber for one lifecycle-owned canvas when a smaller Three.js
or native WebGL module is sufficient. Do not reproduce SPA transition libraries
when the selected router already provides the required seam.

### 7. Map evidence to verification

Every public or Section module must list:

- evidence claims and matched checkpoints;
- props, slots, events, owned state, and lifecycle;
- assets and dependency ownership;
- desktop/mobile/reduced-motion behavior;
- fallback and cleanup behavior;
- unresolved claims that block implementation or parity.

For the desktop signature owner, also list the Oracle surface kind, parity
surface ID/kind/count/order, root-owner file closure, context/version and exact
GPU resource/pass expectations, matched capture controls, comparison
method/tolerance/metric maxima, fallback surface, and forbidden compensation.

Architecture may add accessibility and production safety behavior, but must label
it as an independently chosen requirement rather than observed reference behavior.

## Completion gate

An architecture packet is ready for approval only when:

- every in-scope page section maps to one owner;
- the only target structure is role-first-portable-library v2, with explicit
  roots, actual page keys and optional common only under pages/sections, and
  direct named modules under components/elements/interactions;
- vocabulary definitions, names, colocated types, `src/exports/` public entries, consumer import paths,
  examples and catalog handoff agree; build/generator migration is included;
- discovery records distinguish actual uses, data examples, same-role other-site
  implementations and proven cross-project reuse, without inventing schema fields
  or claiming that skill installation implements global search;
- every effect maps to a Section, reusable effect, or global controller;
- each component has an element, interaction/animation and state composition
  inventory with absent responsibilities explicit, independent reuse scope,
  and ownership distinguished from references;
- transfer candidates name their interface, file closure, host conditions and
  cleanup owner without speculative wrappers or portability claims;
- every named dependency has one reason to exist;
- selected scope branches have evidence and a single owner per state source;
  unselected branches introduce no dependencies or speculative folders;
- public interfaces are smaller than their hidden implementation concerns;
- responsive substitutions and reduced-motion behavior are explicit;
- raw research-only material is absent;
- implementation-blocking uncertainty is listed;
- the folder tree, module contracts, data models, tokens, and parity checkpoints
  agree with each other;
- the first implementation slice is a desktop-primary signature whose policy is
  represented in `component-map.json.desktopSignature.policy` and explicitly
  approved by its sibling status and canonical SHA-256;
- every signature renderer has one root owner, and any WebGL/WebGL2/WebGPU owner
  retains the same parity surface class;

After approval, the orchestrator must bind the exact packet and schema-v2 policy,
run the parent reconstruction validator at `--stage architecture`, and only then give them to
`writing-plans` and the clean implementer. If the folder structure, public
interface, state ownership, renderer, or dependency budget changes materially,
return here, revise the packet, and obtain approval again.
