---
name: react-reference-architecture
description: Convert approved public-site reference evidence into a reusable React and TypeScript architecture contract before reconstruction. Use after site-reference-audit or source-backed reference analysis to define folder structure, Page and Section modules, public interfaces, design tokens, responsive substitutions, motion and GPU ownership, and parity checkpoints; stop before implementation.
---

# React Reference Architecture

Translate reference evidence into the smallest React and TypeScript structure
that can support a clean reconstruction. This skill owns architecture decisions,
not live-site analysis and not implementation.

Reply in the user's language.

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

## Architecture method

### 1. Preserve the target stack

Follow an existing React/TypeScript repository's framework, router, styling, test,
and naming conventions. For a new target, choose the smallest stack that meets
the approved scope. Do not force Next.js, Vite, CSS Modules, Tailwind, GSAP,
Framer Motion, React Three Fiber, or any other dependency from visual style alone.

Use `vercel-react-best-practices` for React/Next.js decisions when applicable.

### 2. Define deep modules

Use `codebase-design` terminology and design modules with small interfaces and
deep implementations. Organize by responsibility:

```text
app composition
pages
page-owned sections
cross-page features
reusable effects
shared layout and UI
design tokens
content and asset contracts
```

Prefer `Page -> Section -> proven UI`:

- A Page owns routing metadata, section order, and route-level content assembly.
- A Section owns its content contract, responsive composition, local interaction,
  readiness, fallback, accessibility, and cleanup.
- A UI module becomes public only when two consumers prove repetition or its
  independent value is clear.
- Controllers, render passes, frame loops, input normalization, and asset
  resolution remain private unless a real second host needs the seam.

Do not create atomic-design wrappers or barrel files merely to increase reuse.

### 3. Separate content, UI state, and frame state

Define serializable TypeScript content models for repeated projects, awards,
navigation, media, or other records. Keep content outside JSX when more than one
record or viewport consumes it.

Assign low-frequency UI state such as menu visibility, selected item, and route
status to React. Keep pointer coordinates, scroll velocity, orbit angles, RAF
time, renderer state, and shader uniforms in refs or lifecycle-owned motion/render
modules so they do not trigger frame-rate React renders.

### 4. Preserve responsive substitutions

Record when desktop and mobile use different structures, assets, effects, or
interaction models. Model these as explicit variants or separate private
implementations behind one Section interface. Do not assume responsive work is
only CSS shrinking.

Specify reduced-motion, keyboard, touch, pointer, resize, loading, asset failure,
and renderer failure behavior for every interactive Section.

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

Architecture may add accessibility and production safety behavior, but must label
it as an independently chosen requirement rather than observed reference behavior.

## Completion gate

An architecture packet is ready for approval only when:

- every in-scope page section maps to one owner;
- every effect maps to a Section, reusable effect, or global controller;
- every named dependency has one reason to exist;
- public interfaces are smaller than their hidden implementation concerns;
- responsive substitutions and reduced-motion behavior are explicit;
- raw research-only material is absent;
- implementation-blocking uncertainty is listed;
- the folder tree, module contracts, data models, tokens, and parity checkpoints
  agree with each other.

After approval, the orchestrator must give the exact approved packet to
`writing-plans` and the clean implementer. If the folder structure, public
interface, state ownership, renderer, or dependency budget changes materially,
return here, revise the packet, and obtain approval again.
