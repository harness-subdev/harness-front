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
- existing repository conventions that must remain;
- dependency choices and rejected overlaps;
- asset profiles and licensing constraints;
- public/private module promotion rule.

For every non-obvious decision include evidence, rationale, and the condition
that would cause reconsideration.

## 3. Folder structure

Show an exact target-relative tree. Give every listed file or directory one clear
responsibility. Start from the minimum useful structure, for example:

```text
src/
├── app/
├── pages/{route}/
│   ├── {Route}Page.tsx
│   ├── {route}.data.ts
│   └── sections/
├── features/
├── effects/
├── shared/
└── design-system/
```

Omit empty speculative directories. Colocate a Section's private markup, styles,
state, motion lifecycle, and tests until a proven reuse seam exists.

## 4. Module tree and ownership

Show Page, Section, proven UI, effect, and controller relationships. Assign every
observed layer and interaction to exactly one owner. Identify client boundaries
and lifecycle owners.

## 5. Public module contracts

For every public candidate and Section, record:

```text
Name:
Kind: Page | Section | UI | Effect | Controller
Purpose:
Interface: props, slots, events, invariants, error modes
Owned state:
Hidden implementation:
Dependencies:
Assets:
Responsive variants:
Accessibility and reduced motion:
Fallback and cleanup:
Evidence claims:
Parity checkpoints:
Unresolved:
```

Keep helpers and private children out of the public inventory.

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

## 9. Responsive substitution matrix

For each relevant Section compare desktop, mobile, touch, and reduced-motion
structure, content, assets, controls, effects, and fallbacks. Use separate private
implementations when the DOM or interaction model actually differs.

## 10. Dependency budget

For every runtime dependency list owner, behavior, alternatives considered, and
why a native/platform/existing option is insufficient. Mark dependencies that
are research-only and forbidden from distribution.

## 11. Verification and parity map

Map each module to observable DOM, computed-style, interaction, screenshot,
console, asset, accessibility, and GPU checks. Reuse the reference's exact
viewport and state labels where available.

## 12. Implementation slices

Order the smallest vertical slices that produce separately verifiable behavior.
Do not write the implementation plan here. State only slice boundaries,
dependencies, and completion evidence.

## 13. Open and blocking decisions

Separate:

- implementation-blocking uncertainty;
- parity-blocking uncertainty;
- non-blocking approximation;
- deliberately chosen production behavior.

The orchestrator must not begin clean implementation while an item required for
the approved first slice remains implementation-blocking.

## Approval record

After explicit approval, append the approval date and a SHA-256 of the exact
approved file. Downstream plans must cite that hash. A material architecture
change invalidates the approval and requires a new hash and approval record.
