---
name: interactive-webgl-analysis-poc
description: Analyze and independently reconstruct an externally observed public interactive WebGL, 3D, shader, canvas, or scroll-linked experience from a target URL, recording, screenshots, or supplied public artifacts. Use when the user wants behavior evidence, an implementation specification, a reconstruction POC, or a fidelity audit of an external interactive experience. Do not trigger for static or CSS-only page work, a greenfield scene with no reference target, debugging or performance work on the user's own app, isolated GLB metadata inspection, general documentation/benchmarking, security analysis, source extraction, or access-control bypass.
---

# Interactive WebGL analysis POC

Reconstruct behavior, not source identity. Treat the external experience as a
system to measure: observe outputs, record permitted inputs, infer the smallest
model that explains them, and validate an original implementation at matched
checkpoints.

Reply in the user's language unless they request another one.

## Choose the operating mode

Infer the narrowest mode that satisfies the request:

1. **Analysis** — inspect read-only and report in the response by default; write
   evidence files only when the user explicitly requests workspace artifacts.
2. **Specification** — turn the evidence into an implementation-ready design and plan.
3. **POC reconstruction** — build and verify a clean implementation.
4. **Audit** — diagnose an existing reconstruction against the observed target.

Do not start implementation when the user asked only for analysis or diagnosis.
If the scope could materially change the result, confirm the target sequence,
viewports, delivery location, and asset policy. Default to procedural/original
placeholders, user-provided assets, or explicitly licensed assets. Treat
production embedding or hotlinking as a separate approval and rights decision.

## Authority by mode

| Mode | Default authority | Requires separate authorization |
| --- | --- | --- |
| Analysis | Read-only inspection and an in-response report | Saving captures/bundles/assets or writing report files |
| Specification | Read evidence and return an in-response design/plan by default | Workspace document files, code, dependencies, server startup, or implementation changes |
| POC reconstruction | Scoped code, dependencies, tests, and local verification needed for the requested POC | Publishing, external uploads/messages, git commit/push, or broader product work |
| Audit | Read-only diagnosis and evidence-backed findings | Applying fixes or changing the target implementation |

Do not infer commit or push authority from a request for a plan or POC.

## Choose the evidence track

Use one track explicitly:

1. **Behavior-only strict clean-room** — rely on repeated browser behavior,
   DOM/network metadata, and permitted asset metadata. Do not inspect bundle
   implementation expressions. This is the universal default unless the user
   explicitly selects or approves the public-artifact-assisted track.
2. **Public-artifact-assisted analysis** — inspect readable configuration in
   publicly delivered HTML/RSC/bundles to improve factual accuracy, while never
   copying implementation bodies. This is source-assisted analysis, not a legal
   guarantee of strict clean-room separation.

If strict clean-room implementation follows public-artifact analysis, use a
separate analyst and fresh implementer. Give the implementer only a scrubbed
behavior specification with facts, equations, assets policy, and checkpoints—
not bundle excerpts, source identifiers, or analysis transcripts.

## Non-negotiable boundaries

- Work only from content the user supplied or that is publicly accessible
  without bypassing authentication, paywalls, access controls, or rate limits.
- Respect applicable site terms and robots guidance, keep requests bounded, and
  never turn the observation pass into a load test.
- Never claim recovered source code when only behavior or minified configuration
  was observed. Write a new implementation with new names and structure.
- Separate facts from inference. Label important claims as `observed`,
  `extracted`, `inferred`, or `chosen`.
- When research artifact capture is explicitly authorized, keep downloaded
  bundles, screenshots, and asset probes in a research/work directory outside
  the deliverable. Public access or permissive CORS is not a redistribution
  license; retained or hotlinked production assets must be licensed or replaced
  before redistribution.
- Remove or mask signed query strings, cookie-derived URLs, access tokens, and
  personal data from reports and manifests.
- Treat production asset URLs as replaceable evidence. Record licensing and
  redistribution risk; centralize any temporary hotlinks in one manifest.
- Clean-room workflow is not a legal opinion. For high-risk commercial reuse,
  recommend legal review and, when appropriate, separate evidence and
  implementation teams so the implementer receives only the behavior spec.
- Respect browser and workspace security policy. If localhost or another target
  is blocked, do not use a different browser surface, raw protocol, curl, or an
  indirect workaround to achieve the same blocked inspection. Document the
  manual verification gap.

## Evidence hierarchy

Prefer stronger evidence and preserve provenance:

1. Repeated live-browser observation at controlled viewport and scroll states.
2. Browser DOM, accessibility, console, computed-style, and network evidence.
3. Public asset metadata and, in the assisted track only, readable configuration
   in delivered bundles.
4. Stable behavior inferred from multiple independent observations.
5. A deliberate implementation choice made to fill an unobservable gap.

Do not promote a lower-confidence inference into an extracted fact. When two
sources conflict, record both and let the stronger/repeated evidence win.

Read [evidence-and-capture.md](references/evidence-and-capture.md) before doing
live-site or bundle analysis. It defines the capture matrix and evidence ledger.

## GPU evidence companion gate

For original-level or implementation-ready GPU fidelity, read
[gpu-evidence-companion.md](references/gpu-evidence-companion.md). Trigger the
gate when shader/light, deformation, framebuffer/render-target, pass order,
sampler/channel, ping-pong, or WebGL/WebGL2/Three/native GL ownership is central.

If DSRA is already primary, return only clean visual/behavior evidence and do not route back to it. Otherwise resolve `$design-system-reference-analyzer`
once and follow its installed WebGL contract and scripts directly, only in the
public-artifact-assisted track or after equivalent explicit authorization
and saved-research authority because its probe records complete shader source.
In strict behavior-only or transient analysis-only mode, keep the proof
unresolved. Do not call GPU-backed work implementation-ready unless
`gpu-runtime-status.json.status === "runtime-validated"`,
`render-contracts.json.status === "runtime-validated"`, and
`render-contracts.json.unresolved` is empty, and the primary agent has verified
matched clean artifacts, semantic pass mappings, channel flows, and ownership.

## Workflow

### 1. Establish scope and a research workspace

Record:

- public target URL or supplied captures;
- exact interaction boundary, including explicit non-goals;
- desktop and mobile viewports;
- analysis-only versus build authorization;
- public-asset policy and final delivery path;
- required accessibility and reduced-motion behavior.

Analysis-only defaults to read-only inspection using transient tool evidence and
existing/user-supplied files. If the user explicitly requested saved research
artifacts, create a non-deliverable research directory and preserve only the
needed screenshots, response metadata, public assets, and bounded excerpts
there. Do not mix these artifacts into the clean implementation.

### 2. Capture the behavior before reading bundles

Use a real browser automation surface when available. A JavaScript-heavy WebGL
page cannot be understood reliably from raw HTML alone.

At minimum capture these checkpoints when they apply to the selected target:

- desktop and mobile top states after fonts/media settle;
- reveal start, midpoint, and completion;
- each scroll-scene boundary and midpoint;
- pointer, touch, resize, and fast-scroll behavior;
- final transition state;
- reduced-motion behavior;
- console errors and failed requests.

For each checkpoint record viewport, scroll position or normalized progress,
visible DOM copy, visual-surface bounds, colors, media ordering, and a screenshot name.
Repeat ambiguous observations before inferring a formula.

### 3. Decompose the visual system without assuming a renderer

Map the page into layers:

- semantic DOM, controls, fallbacks, and fixed overlays;
- CSS transforms, filters, masks, and compositing;
- Canvas 2D, video, WebGL, WebGPU, CSS 3D, or hybrid layers;
- scene/object/camera/material/light hypotheses only where evidence supports them;
- render-to-texture, post-processing, or portal passes only when observed;
- layout scroll geometry, input normalization, and time/progress producers.

When the GPU evidence companion gate triggers, complete its signature-owner
hypothesis matrix before choosing renderer architecture.

Do not assume React Three Fiber, Three.js, FBOs, or any named library from visual
style alone. Record renderer/camera/compositing settings only when evidence
supports them. Read
[visual-system-analysis.md](references/visual-system-analysis.md) for the
renderer-agnostic taxonomy and experiments.

### 4. Inventory public assets and metadata

Build an asset table with URL, type, dimensions/aspect, role, compression,
CORS behavior, failure fallback, and confidence. Include relevant fonts, images,
videos, meshes, textures, data files, and compressed formats without assuming a
specific engine.

Start with public HTML, React Server Component payloads, or CMS-shaped response
data when present; they often provide exact asset order and dimensions with less
ambiguity than minified code. In the assisted track only, use those asset names
as anchors into bundles.

Use the read-only GLB inspector when relevant:

```bash
node scripts/inspect-glb.mjs path/to/model.glb
```

The inspector reports JSON-chunk structure, extensions, scene/node/mesh links,
material texture usage, and available position bounds. It does not decode
compressed geometry.

Do not download private or guessed URLs. Do not treat a successful preload as
proof that an asset is visible; correlate assets with the live render.

### 5. Optionally extract public configuration without reconstructing source

Run this step only for the public-artifact-assisted track. Skip it entirely for
behavior-only strict clean-room work.

Search public bundles using distinctive asset names, DOM labels, shader uniform
names, trigger IDs, and uncommon numeric values. Work outward from known
needles instead of beautifying every chunk.

```bash
node scripts/scan-bundle.mjs --needle "asset-name.glb" --needle "barrel" path/to/chunk.js
```

The scanner returns bounded literal contexts and never imports or evaluates the
input. Run `node scripts/test-tools.mjs` only when validating the tools themselves
and temporary-file writes are permitted; the self-test uses synthetic fixtures
and no network or third-party package.

Extract facts such as:

- camera and renderer settings;
- asset positions, scales, and rotations;
- trigger start/end expressions;
- easing, lerp, fade, fog, and distortion constants;
- loader and decoder paths;
- shader inputs and render-order relationships.

Record a short excerpt location and confidence for every extracted value. Do not
copy component bodies, private identifiers, comments, or minified implementation
structure into the deliverable.

### 6. Build an interaction model

Express motion as producers, state, and consumers without choosing a framework:

```text
pointer/touch -> normalized coordinates -> interaction state
scroll/time -> normalized progress/velocity -> motion state
motion state -> layout/scene/material/composite consumers
```

Write equations with clamping domains and endpoint expectations. Extract pure
helpers for non-trivial math and test start, midpoint, end, and out-of-range
values. Specify frame ordering when one scene writes a value another scene reads.

Read [scroll-time-inference.md](references/scroll-time-inference.md) when the
target is scroll- or time-linked. For multi-pass render-to-texture work, preserve
and restore the actual previous render target rather than assuming it was null.

### 7. Write the specification before the POC

The specification should include:

- context, goal, non-goals, and delivery location;
- page shell and scene architecture;
- observed formulas and chosen approximations;
- asset manifest and replacement seam;
- data flow and ownership;
- loading, individual-asset failure, and fatal failure behavior;
- accessibility and reduced motion;
- automated and browser verification matrices;
- known constraints and confidence gaps.
- paired clean/instrumented GPU evidence and unresolved ownership when the
  GPU evidence companion gate triggers.

Use [report-templates.md](references/report-templates.md) whenever the user
requested written workspace artifacts, in any mode.

### 8. Implement the smallest faithful vertical slice

When build authorization is present:

- isolate replaceable URLs in one asset module;
- preserve semantic DOM and accessible controls independently from decorative
  rendering;
- follow the existing repository stack or choose the smallest renderer that the
  evidence requires—do not default to React Three Fiber;
- use procedural/original, user-provided, or licensed assets by default;
- keep frame-rate state out of high-cost UI rerender paths appropriate to the
  chosen framework;
- allocate browser/GPU resources in lifecycle-owned code and dispose the exact
  owned instance;
- let independent assets settle success or failure and match the observed local
  fallback without inventing a target-specific black-plane convention;
- reserve global fatal behavior for genuinely essential runtime failures;
- resolve reduced-motion preference before mounting smooth scroll or starting
  video playback;
- retain native scrolling and a representative static scene for reduced motion.

Read [runtime-lifecycle.md](references/runtime-lifecycle.md) only when the chosen
implementation uses React, React Three Fiber, browser media, loaders, or an FBO.

### 9. Verify with executable seams and review loops

Use red/green tests for extracted pure math and lifecycle state machines. Source
contract tests are useful for wiring, but say clearly that they do not execute
React, WebGL, media, or browser behavior.

Low-level GPU proof comes from the companion rather than source/build tests.

Run the project's focused tests, full tests, type check, production build, and
diff check. Remove only generated churn created by the verification command.

Review high-risk seams independently and adapt them to the chosen engine:

- setup/cleanup replay and late asynchronous callbacks;
- renderer initialization and fallback semantics;
- continuous versus on-demand frame transitions;
- media start/error races when media exists;
- multi-pass render-state restoration when multiple passes exist;
- readiness after every success or failure;
- reduced-motion startup ordering.

### 10. Compare the result at matched checkpoints

Use the same viewports and normalized states as the baseline. Compare layout,
camera/projection, geometry, material/light, compositing, motion direction,
timing, responsiveness, and console health as applicable. A visual match at only
the top state is insufficient. Read
[validation-playbook.md](references/validation-playbook.md) for difference
classification and checkpoint gates.

When saved captures were authorized, store comparison captures under the
research directory, not the deliverable.
If automated browser verification is unavailable or policy-blocked, stop at the
safe boundary and list exact manual checks rather than declaring visual parity.

## Common traps this workflow must catch

- A requested/preloaded asset is not automatically the visibly mounted asset;
  trace the consumer or correlate it with observation.
- Vendor-library defaults found in a bundle are not application call-site
  configuration.
- A source-string test can pass while runtime behavior is broken. Test
  production-used pure seams and retain browser checkpoints.
- Floating-point endpoint arithmetic can yield values such as
  `0.9999999999999998`. Test boundaries and use endpoint-safe clamping or
  tolerances where the contract requires an exact completed state.
- Automated tests/builds do not prove shader compilation, media autoplay, GPU
  output, CORS, or visual fidelity.
- A policy-blocked browser path must become an explicit manual handoff, not a
  different browser/protocol workaround.

Stack-specific React/R3F/media/FBO failure patterns live in the conditional
runtime reference rather than defining the general analysis model.

## Completion report

Lead with the outcome, then provide:

1. scope reconstructed and explicit exclusions;
2. selected evidence track and, when relevant, analyst/implementer separation;
3. strongest observed/extracted evidence;
4. files or artifacts produced;
5. automated verification results;
6. browser checkpoints actually inspected;
7. companion status and blocked reasons when applicable;
8. unresolved inference, asset/licensing, and manual-verification risks.

Never state “pixel-perfect” or “identical” without matched visual evidence at
all required checkpoints.
