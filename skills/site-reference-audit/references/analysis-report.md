# Analysis Report Contract

Use this structure selectively. Omit empty sections instead of inventing facts.

## Scope and evidence

- Target URL and exact route boundary
- Viewports and interaction states inspected
- Evidence mode and authorization boundary
- Explicit exclusions

## Reference summary

Describe the experience in one concrete sentence. State its visual thesis and
primary interaction without marketing language.

## Page and layer structure

Show a compact tree when hierarchy materially improves understanding. Separate
semantic content, fixed overlays, media/canvas surfaces, and non-visual
controllers.

## Runtime artifact inventory

For markup, CSS, JS, SVG, images, video, fonts, canvas/GPU surfaces, and external
libraries, state what each class of artifact appears to own. Label each claim as
observed, extracted, inferred, or unresolved when that distinction matters.

## Effects and motion inventory

Prefer a table with these columns:

| Owner | Trigger/input | State | Transform/output | Mechanism | Evidence |
| --- | --- | --- | --- | --- | --- |

Name concrete properties such as transform, scale, clip-path, filter, opacity,
SVG primitives, sticky positioning, or canvas compositing.

## Interaction mechanics

Write each important chain as:

```text
input -> normalized or owned state -> formula/easing -> rendered output
```

Give exact observed values when they help implementation. Do not present an
inferred formula as extracted source behavior.

## Responsive behavior

Compare structure, visibility, media ownership, motion, typography, and layout
between the inspected viewports. Highlight component substitutions and disabled
effects.

## Component and controller map

For each reusable candidate, record:

```text
Name
Purpose:
Rendered root:
Inputs:
Outputs/events:
Owned state:
Visual contract:
Interaction contract:
Required assets/libraries:
Responsive variants:
Evidence and unresolved items:
```

List global controllers separately from visual components. Keep incomplete
candidates under `Unresolved candidates`.

## Design tokens

Group tokens by color, typography, layout, spacing, border/radius, layers, media
treatment, and motion. Explain ownership and purpose, not only values.

## Implementation risk

Rank only meaningful reconstruction risks, such as GPU effects, scroll-linked
state, asset licensing, breakpoint-specific DOM, accessibility gaps, or unstable
external dependencies. Suggest the smallest next investigation that would reduce
each risk.

## Downstream handoff

Include this section when an orchestration workflow will continue from the audit:

- status: `preflight-only`;
- exact route and viewport scope;
- captured behavior checkpoints;
- blocking and non-blocking unknowns;
- source/archive evidence that requires `design-system-reference-analyzer`;
- canvas/GPU evidence that requires `interactive-webgl-analysis-poc`.

This handoff scopes later evidence collection. It is not an Oracle artifact and
must not be presented to a clean implementer as recovered implementation detail.

## Parity checklist

Include observable checks for:

- route and section order;
- DOM/component shape;
- typography and grid geometry;
- fixed and sticky layers;
- load, scroll, menu, pointer, hover, and resize states;
- desktop/mobile substitutions;
- computed transforms, filters, masks, and clip paths;
- canvas/media visibility and sizing;
- console and failed-resource health;
- reduced motion;
- representative screenshots at matched states.

Do not state pixel-perfect, identical, source-complete, or implementation-ready
unless the corresponding specialized workflow has produced and verified the
required evidence.
