# Runtime and lifecycle playbook

Read only the sections that match the chosen implementation. The media and
resource sections are generic browser guidance; React, React Three Fiber,
Three.js, smooth-scroll, and FBO sections are stack-specific and must not be
treated as target facts.

## React data ownership

Use React state for infrequent UI state:

- preference resolved;
- ready/fatal flags;
- a loaded texture or model reference;
- a one-time overlay transition.

Use mutable refs for frame-rate state:

- normalized scroll progress and velocity;
- pointer UV/NDC;
- pointer move sequence;
- shader uniforms and previous-frame values;
- offscreen group transforms.

Do not call React state setters from the render loop.

## Resource ownership rule

The code that creates a disposable resource owns its cleanup. Allocate browser
and Three resources in an effect or loader callback, not during React render.

Typical owned resources:

- `HTMLVideoElement` and `VideoTexture`;
- `TextureLoader` result;
- `CanvasTexture` and backing canvas state;
- `DRACOLoader` worker pool;
- cloned GLTF scene geometry, material, and textures;
- framebuffer/render target when not managed by a helper;
- event listeners, GSAP ticker callbacks, and ScrollTriggers.

React Strict Mode can run effect setup, cleanup, and setup again in development.
The pair must remain balanced and late callbacks must be harmless.

## Media settlement is not texture state

A texture value of `null` can mean loading or failed, so it is not a sufficient
global readiness signal. Track settlement separately and count both success and
failure once.

For a video, one-time readiness and current media failure are distinct:

```text
loadeddata -> create pending VideoTexture -> play resolves -> publish + settle
               \-> play rejects -> pause + target-specified fallback + settle
error before resolve -> pause + dispose pending + target-specified fallback + settle
late resolve after error -> pause + dispose, do not publish or settle again
error after success -> pause + dispose owned + target-specified fallback, do not settle again
unmount -> cancel + pause + clear src + dispose pending/owned
```

Write an executable state-machine test for both event orders. A source-string
assertion cannot prove this behavior.

In reduced-motion mode, loading the first frame for a static texture is
acceptable when required, but do not call `play()`. Resolve the media preference
before mounting loaders so a reduced-motion user does not briefly start video.

## Image and model failure isolation

For images and other optional media:

- set the correct color space on success;
- expose the specified poster, placeholder, omission, or `null` and settle on error;
- do not retry in a render/effect loop;
- dispose the requested/loaded texture on cleanup;
- ignore or dispose late callbacks after unmount.

For callback-based GLTF + Draco:

- configure the decoder path before `load`;
- use a cancellation flag because `GLTFLoader.load()` is not an abort handle;
- clone the scene when the clean implementation needs independent ownership;
- omit only the model on error and settle readiness;
- dispose the Draco loader and owned clone resources on cleanup.

## Canvas initialization and fatal fallback

Understand the installed renderer's actual fallback semantics before adding side
effects. In some React Three Fiber versions the `Canvas` fallback is DOM content
inside `<canvas>` and mounts even when WebGL is healthy. An effect inside that
fallback can therefore report a false fatal error on every healthy browser.

Use an inert fallback element. Report a fatal error from the actual renderer
creation path or another seam that runs only when initialization fails. Keep the
semantic DOM header/copy outside the canvas so it survives.

Normalize unknown thrown values to `Error`, report/log once, and avoid a loading
overlay that can remain forever after a fatal initialization path.

## Smooth scroll, reduced motion, and demand rendering

A complete reduced-motion path should:

- resolve `prefers-reduced-motion` before smooth-scroll/canvas media startup;
- omit the chosen smooth-scroll engine, such as Lenis, when one is present;
- retain native document scrolling;
- disable pointer distortion and continuous animation;
- use a representative completed/static scene;
- avoid video playback;
- use demand rendering where appropriate.

Changing a React Three Fiber canvas from `always` to `demand` may reset the loop
without requesting the final static frame. Add a small canvas-internal component
that calls `invalidate()` once when reduced motion becomes active.

## FBO render discipline

Render the offscreen scene before the main scene without taking over the full
render loop unnecessarily. With React Three Fiber, a negative frame priority is
often appropriate; verify against the installed version.

Preserve the current target:

```ts
const previousTarget = gl.getRenderTarget()
try {
  gl.setRenderTarget(renderTarget)
  gl.clear()
  gl.render(offscreenScene, offscreenCamera)
} finally {
  gl.setRenderTarget(previousTarget)
}
```

Never restore blindly to `null`; nested render textures or other consumers may
have installed a different target.

Keep writer/reader ordering explicit. For example:

```text
priority -2: upstream animation writes shared progress
priority -1: offscreen scene reads progress and renders its target
default: main scene samples the target through the composite material
```

The exact priorities are a chosen implementation detail; the dependency order
is the contract.

## Color and aspect handling

- Use sRGB color space for color images/video and no color space for data/mask
  textures.
- Confirm whether the framebuffer is linear and apply output color conversion
  once in the final composite shader/pipeline.
- Preserve source aspect using decoded/public metadata, including failure
  placeholders. Do not assume every video is landscape.
- Derive cover scaling from viewport and source aspect, then test both portrait
  and landscape branches as a pure helper.

## Readiness coordinator

Define a finite set of resource keys from the specification. Classify each as
essential or optional instead of assuming a mask, model, or media type is fatal.
Use a `Set` plus a one-time report gate:

```text
markSettled(key)
  -> add unique key
  -> if all required keys are present and not yet reported
     -> report overall ready once
```

Only resources classified as essential by the specification may trigger the
fatal path. Optional image, video, model, or data failure remains local and still
marks the key settled with its target-specified fallback.

## Test pyramid for a visual runtime

Use all applicable layers and describe what each proves:

1. **Pure executable tests** — easing, progress, opacity, aspect, depth, state
   machines, and renderer mode selection.
2. **Source/integration contracts** — wiring, asset replacement seam, cleanup
   calls, frame priorities, render order. These do not execute the browser.
3. **Type check and production build** — module/API/SSR compilation.
4. **Server startup** — production command reaches Ready; this is not a visual
   test.
5. **Real-browser checkpoints** — shader compilation, CORS, decode, input,
   scroll, responsive layout, GPU output, and console health.

Do not claim browser behavior from layers 1–4.

## High-risk review checklist

- [ ] No disposable allocation occurs during React render.
- [ ] Every event/ticker/trigger has symmetric cleanup.
- [ ] Late loader and play callbacks cannot update an unmounted component.
- [ ] Video error/play races end paused, disposed, and in the specified fallback.
- [ ] Every required asset settles on both success and failure.
- [ ] Canvas fallback does not trigger false fatal behavior.
- [ ] Fatal logging is deduplicated.
- [ ] Demand mode requests the final static frame.
- [ ] FBO restores the real previous target in `finally`.
- [ ] Mask/data and color textures use appropriate color spaces.
- [ ] Reduced-motion users never start smooth scroll or video playback.
- [ ] Tests distinguish executable behavior from source contracts.
