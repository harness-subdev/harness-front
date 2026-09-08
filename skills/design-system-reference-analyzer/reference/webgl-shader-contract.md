# WebGL and shader render contract

Use this contract whenever a reference contains a `canvas`, WebGL/WebGPU/native GL call, Three.js renderer/material, shader source (`.glsl`, `.vert`, `.frag`, `.wgsl`), render target/framebuffer, or GPU asset (`.glb`, `.gltf`, `.bin`, `.ktx2`, `.basis`, `.dds`, `.hdr`, `.exr`, `.wasm`). These are detection triggers, not proof that a frame was rendered.

## Ownership and lifecycle

Record each resource with the strongest observed lifecycle state: `requested`, `loaded`, `preloaded`, `mounted`, or `rendered`. A URL in markup is requested; a bundle reference can indicate loaded; a canvas in DOM is mounted; only an observed draw/present checkpoint establishes rendered. Link a renderer to a canvas only when source explicitly supplies that ownership. Do not turn inferred ownership into a runtime claim.

Keep a render contract for each canvas/renderer:

- context/API and creation source;
- shader stage, raw source and source range, compile/link inputs, uniforms and samplers;
- texture assets, sampled channels, color/alpha semantics, and consumer expressions;
- material/program, renderer state, viewport/scissor/blend/depth/color-space settings;
- framebuffer or render target attachments, size/format, and pass read/write order;
- coordinate spaces (DOM/CSS pixels, backing-buffer pixels, UV, clip/NDC, world/view), plus pointer, scroll, resize, time, camera, and other input consumers.

The scanner records only partial static evidence. It must not claim compiled shaders, a linked program, a complete framebuffer, successful GL calls, or visual parity.

## Required derived artifact

As the primary agent, create `source/derived/render-contracts.json` whenever a GPU trigger is found. Start with the static `gpuContracts` evidence in `source/derived/component-contracts.json` and `source/derived/reference-index.json`, then merge the concrete WebGL trace below and visual observations from `$interactive-webgl-analysis-poc` or browser tooling. Keep source locations, instrumented runtime evidence, and clean visual checkpoints as separate refs; never rewrite static leads as runtime facts.

For WebGL/WebGL2, load `scripts/gpu-runtime-probe.js` as a browser init script before the page navigates. If the selected browser cannot install a pre-page script, record `producerStatus: "blocked"`; installing after page startup cannot observe initialization and is not valid evidence. Exercise the agreed interactions, call `globalThis.__DSRA_GPU_PROBE__.checkpoint(label, conditions)` at each settled state, and export `globalThis.__DSRA_GPU_PROBE__.export()` to `source/derived/gpu-runtime-trace.json`. Every checkpoint must carry an `externalVisualRef` from a separate uninstrumented run and matched viewport, DPR, frame/time, input, camera, and color conditions.

Validate the trace before merging it:

```bash
node scripts/verify-gpu-runtime-trace.mjs \
  source/derived/gpu-runtime-trace.json \
  source/derived/gpu-runtime-status.json
```

The bounded trace records contexts, complete shader sources, compile/link results, uniform locations/writes, texture and sampler-object bindings/state, sequenced framebuffer attachment/detach events and cube-face targets, MRT `drawBuffers`/`readBuffer` routing, framebuffer blits, draw batches, renderer-state changes, application `getError` calls, explicit checkpoint error reads, and probe errors. Every draw/blit carries its effective attachment and completeness snapshot; the validator replays temporal state with fixed independent input limits instead of accepting the union of historical bindings. It hashes shader sources and leaves unresolved evidence for overflow/drop, compile/link failure, unknown, stale, cross-context, or colliding binding/routing evidence, unchecked or incomplete non-default framebuffer, missing draw/checkpoint/visual join, GL error, probe error, or WebGPU. The bundled producer covers WebGL/WebGL2 only; WebGPU remains blocked until an equivalent device/command-encoder probe exists.

Use this compact shape, extending arrays as the reference requires:

```json
{
  "schemaVersion": 1,
  "status": "partial",
  "staticGpuContracts": [{"evidenceRef": "gpu:program:scene", "rendererId": "scene"}],
  "renderers": [{
    "id": "scene",
    "contexts": [{"api": "webgl2", "surface": "canvas#scene", "created": null, "backingSize": null}],
    "programs": [{"id": "main", "stages": ["vertex", "fragment"], "compile": null, "link": null}],
    "uniforms": [],
    "samplers": [{"name": "bake2", "textureId": "bake", "channels": ["b"], "consumers": ["level0"]}],
    "channelFlows": [{
      "id": "main:bake2.b:outgoingLight",
      "source": {"sampler": "bake2", "textureId": "bake", "channel": "b", "coordinate": "uv"},
      "steps": ["level0", "bakedTone", "outgoingLight"],
      "output": "outgoingLight",
      "evidenceRefs": ["source:fragment:level0-outgoingLight"],
      "runtimeCheckpointRefs": []
    }],
    "textures": [],
    "targets": [],
    "passes": [],
    "rendererState": {},
    "coordinateSpaces": [],
    "inputConsumers": [],
    "lifecycle": [{"resourceId": "canvas#scene", "state": "mounted", "evidenceRef": "runtime:dom:scene"}],
    "checkpoints": []
  }],
  "runtimeEvidenceRefs": [],
  "errors": [],
  "unresolved": ["context creation not observed"]
}
```

Produce and update it as follows:

1. Create the file after static extraction; copy each static `gpuContracts` lead and its evidence ref without upgrading confidence.
2. Capture and validate the pre-page WebGL trace. Keep its stable context/program/resource IDs and shader hashes as runtime evidence; low-level draw batches are not semantic passes until source and visual evidence establish that mapping.
3. Observe the renderer with `$interactive-webgl-analysis-poc` or browser tooling. Capture behavior, coordinate/input consumers, lifecycle transitions, and matched clean visual checkpoints. Represent every sampled channel as an ordered `channelFlows` path from sampler/texture/channel and coordinate through intermediate expressions to its final output; attach source, instrumented runtime, and clean checkpoint refs separately.
4. Merge observations by stable renderer/program/pass/resource IDs. Add runtime evidence refs and advance lifecycle only to the strongest observed state; a requested asset is not renderer ownership.
5. Update `errors` and `unresolved` after every probe. Set `status` to `runtime-validated` only when `gpu-runtime-status.json` is `runtime-validated`, every runtime gate below passes, and `unresolved` is empty; otherwise retain `partial`.

## Runtime gates

Before calling a GPU-backed restoration implementation-ready, capture runtime evidence for:

1. context creation and actual backing-buffer dimensions;
2. vertex/fragment (or WebGPU) compilation and program linking logs;
3. every framebuffer/attachment completeness check;
4. GL/WebGPU error checks around setup and every pass;
5. pass ordering, render-target binds, ping-pong swaps, and texture bindings;
6. each declared `channelFlows` source binding and ordered consumer path, with unresolved branches recorded instead of inferred;
7. visual checkpoints at agreed viewport, DPR, time/frame, input, camera, and color-management conditions.

Source/build success is not rendered output. A shader string can be unused, compile differently on the target, write into an incomplete FBO, render offscreen, or be overwritten by a later pass.

## Example channel contract

Treat this as a dataflow requirement, not an appearance hint:

```glsl
float level0 = texture2D(bake2, uv).b;
float bakedTone = level0 * exposure;
vec3 outgoingLight = vec3(bakedTone);
```

The contract is `bake2.b -> level0 -> bakedTone -> outgoingLight`. Preserve it as a `channelFlows` record, including the sampler binding, `.b` channel selection, coordinate space for `uv`, ordered intermediate expressions, final output, and evidence refs. A replacement texture or RGB-average approximation changes the contract.

## Ping-pong example

```text
pass A: previousState texture -> targetB framebuffer
swap:   targetA <-> targetB
pass B: targetA texture -> screen/default framebuffer
```

Validate the initial texture, both target formats/sizes, bind/write order, swap timing, and the final screen checkpoint. Static source may suggest this flow, but runtime inspection must prove that both passes execute and no GL/FBO error interrupts them.
