# GPU evidence companion

Use this gate only when original-level GPU fidelity or an implementation-ready WebGL reconstruction depends on shader, lighting, deformation, framebuffer, pass, sampler/channel, or ping-pong ownership. Behavior-only analysis may stop earlier when it labels these details unresolved.

DSRA's probe records complete shader source. Run the instrumented path only in the public-artifact-assisted track or after equivalent explicit source-assisted authorization, and only when saving non-deliverable research artifacts is authorized. In strict behavior-only or transient analysis-only mode, do not run it: keep GPU proof unresolved and offer the assisted-track/retention choice or an explicit approximation.

## One-way role split

- If DSRA is already primary, return clean visual and behavior evidence to it and do not invoke DSRA again.
- If this skill is primary, resolve `$design-system-reference-analyzer` once and directly follow its installed WebGL contract and bundled scripts; do not recursively invoke the skill.
- If the companion or required browser init-script capability is unavailable, record the GPU producer as `blocked`. Do not copy or recreate its probe or validator here.

## Paired browser runs

1. Capture a clean, uninstrumented run for screenshots, timing, scroll, pointer, touch, idle/random, hover/pointer, resize, reduced motion, and console health.
2. Capture a separate instrumented WebGL/WebGL2 run with DSRA's probe installed before navigation and before renderer startup.
3. Join checkpoints only when viewport, DPR, normalized progress, input, reduced motion, asset state, camera, frame/time, and color-management conditions match. Every instrumented checkpoint needs an external clean visual reference; never use the instrumented frame as visual parity proof.

The DSRA validator shape-checks `externalVisualRef` and conditions but cannot prove the referenced clean artifact exists or semantically matches. Before merging, the primary agent must resolve the reference, verify the clean artifact exists, and compare every join condition.

Keep the raw trace and complete shader source in non-deliverable research evidence. Give a strict clean-room implementer only scrubbed behavior and render contracts, never shader bodies or the analyst transcript. Use meaningful `input`, `camera`, and `colorSettings` objects at every checkpoint; when a field is genuinely inapplicable, record `{ "notApplicable": true, "reason": "reference has no camera state at this checkpoint" }` rather than an empty object.

The companion writes `source/derived/gpu-runtime-trace.json`, validates it into `source/derived/gpu-runtime-status.json`, and merges it with static and clean visual evidence in `source/derived/render-contracts.json`.

Classify the gate before assigning status: use `required` or `not-applicable`. Canvas 2D is `not-applicable`; a bare canvas, requested GLB, or preload does not create a producer or validator status. Keep producer `ready|blocked` separate from validator `blocked|partial|runtime-validated`.

Instrumenting an independently written POC validates only that POC's bounded GL execution. It cannot prove the external target used the same internal pipeline.

## Fail-closed gate

Do not call the GPU-backed work implementation-ready unless `gpu-runtime-status.json.status === "runtime-validated"`, `render-contracts.json.status === "runtime-validated"`, `render-contracts.json.unresolved` is empty, and the required clean checkpoints join to runtime evidence.

Keep the result partial or blocked for late injection, unavailable pre-navigation injection, overflow, dropped records, probe or GL errors, missing clean visual reference, mismatched join conditions, stale or cross-context ownership, temporally invalid state, or WebGPU. The current companion producer covers WebGL/WebGL2 only.

The validator exits nonzero for both `partial` and `blocked`. If it writes `gpu-runtime-status.json`, preserve and report that result. A validator value of `runtime-validated` remains necessary but insufficient until the primary agent verifies semantic draw-to-pass mappings, channel flows, lifecycle/ownership, clean joins, and an empty `render-contracts.json` unresolved list.

## Signature-owner hypotheses

Before implementation, distinguish:

- root transform, camera motion, vertex deformation, and UV/composite motion;
- baked texture/channel lighting and procedural or fragment-stage lighting;
- idle/random, hover/pointer, and scroll/time producers and their GPU consumers;
- direct draw, one render target, multi-pass FBO, and ping-pong state.

When the signature effect owner remains unresolved, implement only a thin replaceable seam. Do not freeze a large inferred scene architecture.

Use this matrix: `ID | question/observation | candidate mechanism | predicted signature | clean evidence refs | falsifying experiment | static/instrumented refs | state | confidence/remaining unknown`. State is one of `open`, `supported`, `disfavored`, `falsified`, or `blocked`.
