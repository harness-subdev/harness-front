# Renderer-agnostic visual system analysis

Use this reference to explain a visual effect before naming a library or
choosing an implementation. The goal is a falsifiable layer model that fits the
observations with the fewest assumptions.

## Start with output ownership

For every visible element, ask which surface can produce it:

| Surface | Useful evidence | Common false inference |
| --- | --- | --- |
| Semantic DOM | selectable text, accessibility tree, layout boxes | assuming rasterized text because it overlaps a canvas |
| CSS compositing | computed transforms, filters, masks, pseudo-elements | assuming a shader for every blur or blend |
| Canvas 2D | one bitmap canvas, pixel operations, no GPU context | assuming WebGL from animation smoothness |
| WebGL/WebGPU | GPU context, draw buffers, shader/program errors | inferring Three.js or R3F from WebGL alone |
| Video/image | decoded dimensions, media events, network requests | treating a texture source as a rendered plane |
| Hybrid | stable DOM geometry above/below a canvas | forcing all layers into one renderer |

Record the surface as `observed` only when browser evidence identifies it.
Otherwise use `inferred` and list the smallest experiment that could disprove it.

## Build a layer tree

Represent back-to-front ownership, clipping, and interaction routing:

```text
document scroll runway
fixed visual surface
  background pass
  primary scene or bitmap layer
  optional composite/post-process pass
semantic heading and controls
loading/fatal/reduced-motion fallback
```

Add offscreen targets, masks, portals, or post-processing only after observing
occlusion, sampling, render-order, or public configuration evidence. A visual
cutout can also be CSS masking, alpha video, DOM clipping, or ordinary depth.

## Camera and projection hypotheses

Distinguish projection before estimating constants:

- **Perspective clues:** near objects grow faster, parallel depth lines
  converge, and translation along depth changes apparent scale.
- **Orthographic clues:** scale is stable across depth and framing changes are
  driven by explicit scale or viewport fitting.
- **2D/composite clues:** no parallax, fixed source aspect, and motion expressible
  as UV or CSS transforms.

For a perspective hypothesis, measure at two or more checkpoints. Do not claim
field of view or camera distance from one screenshot: many pairs produce the
same framing. Prefer the combination explicitly exposed in public configuration
or choose a clean pair that matches the observed framing and label it `chosen`.

## Geometry, material, and lighting

Separate what is visible from how it might be implemented:

| Observation | Competing explanations to test |
| --- | --- |
| silhouette changes | object rotation, morph target, vertex displacement, mask |
| highlights move | light motion, normal change, reflection map, baked video |
| surface ripples | displaced geometry, normal map, screen-space distortion |
| translucent overlap | alpha blend, additive pass, premultiplied media, CSS blend |
| soft depth fade | fog, alpha gradient, depth texture, source artwork |

Useful experiments:

1. Hold scroll constant and move the pointer.
2. Hold the pointer still and compare forward/reverse scroll.
3. Resize without scrolling and watch framing versus object scale.
4. Disable or fail one public asset when working on an authorized local POC.
5. Compare DOM geometry with canvas pixels at the same checkpoint.

Do not use destructive changes against the target site.

## Coordinate systems

Document each boundary explicitly:

```text
viewport pixels -> normalized viewport coordinates
document scroll -> segment progress [0, 1]
pointer/touch -> UV [0, 1] or NDC [-1, 1]
source pixels -> aspect-fit/cover rectangle
world/object coordinates -> projection -> screen
```

Record axis direction and origin. A vertical pointer value may be inverted
between DOM coordinates and shader UVs. Test all four corners and the center
when pointer mapping matters.

## Compositing and render order

Look for evidence of:

- fixed versus document-scrolling surfaces;
- depth-tested versus manually ordered layers;
- alpha, additive, multiply, or screen-like blending;
- one pass sampling another pass;
- color-space or premultiplication seams;
- CSS filters applied after the canvas is rendered.

When one visual appears inside another, test whether its motion is independently
controlled. Independent motion plus hard clipping supports a sampled offscreen
pass, but it does not prove an FBO or a particular engine.

## Minimal output

Produce:

1. a back-to-front layer tree;
2. a table of surface ownership with evidence class and confidence;
3. camera/projection hypotheses and disambiguating tests;
4. geometry/material/light observations with competing explanations;
5. coordinate mappings and responsive behavior;
6. unresolved compositing questions and the smallest safe experiment for each.

## Signature-owner hypothesis matrix

For GPU evidence companion work, use this exact matrix:

`ID | question/observation | candidate mechanism | predicted signature | clean evidence refs | falsifying experiment | static/instrumented refs | state | confidence/remaining unknown`

State is one of `open`, `supported`, `disfavored`, `falsified`, or `blocked`.
Instrumented evidence may eliminate low-level candidate mechanisms but cannot
alone prove a semantic pass, camera owner, or visual-fidelity claim.
