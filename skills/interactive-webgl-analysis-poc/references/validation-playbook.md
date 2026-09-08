# Matched-checkpoint validation playbook

Use the same viewport, input mode, content state, and normalized scroll/time
coordinate for the reference and reconstruction. Validation answers what was
actually checked; it must not turn automated build success into a visual claim.

## Define the matrix before comparison

At minimum include applicable rows for:

| Dimension | Representative checks |
| --- | --- |
| Viewport | agreed desktop, mobile portrait, breakpoint edges |
| Time | loading, reveal start/mid/end, steady state |
| Scroll | each segment start/mid/end, forward and reverse |
| Input | center, corners, pointer motion, touch behavior |
| Resilience | one optional asset failure, fatal renderer failure |
| Accessibility | keyboard/semantic DOM, reduced motion, native scroll |
| Runtime health | console errors, failed requests, frame/update stability |

Capture reference metadata and reconstruction metadata beside each image:
viewport pixels, device scale factor, scroll position, normalized progress,
elapsed time, reduced-motion setting, and asset-load state.

## Compare in a useful order

Fix large structural differences before tuning pixels:

1. **Scope/state** — correct sequence and checkpoint reached.
2. **Layout** — DOM bounds, canvas bounds, fixed/sticky ownership.
3. **Projection/framing** — camera model, field of view/scale, crop.
4. **Geometry/silhouette** — object shape, placement, rotation, depth.
5. **Material/light/color** — tonal range, texture orientation, highlights.
6. **Compositing** — masks, blending, opacity, render order, post-process.
7. **Motion** — direction, endpoints, lag, easing, velocity response.
8. **Responsive/input behavior** — breakpoint, touch, resize, reduced motion.

Do not tune a shader to hide a wrong camera or a CSS offset to hide wrong
scroll geometry.

## Difference classes

Classify each mismatch:

| Class | Examples | Typical next check |
| --- | --- | --- |
| Evidence mismatch | wrong asset or checkpoint | revisit ledger and asset consumer |
| Structural | wrong layer, camera, crop, scroll runway | inspect ownership and geometry |
| Temporal | wrong start/end, easing, lag, order | sample more checkpoints |
| Rendering | shader, lighting, color space, blend | isolate passes and inputs |
| Responsive | breakpoint, aspect, touch mapping | repeat exact viewport/input |
| Environmental | font, codec, GPU, CORS, autoplay | inspect console/network/platform |
| Intentional approximation | licensed replacement or simplified effect | document chosen tradeoff |

Attach an evidence ID or chosen-decision ID to every accepted difference.

## Measurement and tolerances

Use hard thresholds only when the user supplied them. Otherwise establish
project-specific tolerances after a baseline pass. Useful measurements include:

- DOM and canvas bounds in pixels;
- landmark screen coordinates and silhouette overlap;
- normalized time/scroll error at transition boundaries;
- average or perceptual image difference within stable regions;
- console/network error count.

Antialiasing, font rasterization, video frame selection, GPU precision, and
color management can create harmless pixel noise. Prefer region masks and
landmark comparisons over one global pixel-perfect threshold.

## Automated versus manual evidence

Automated tests can prove pure equations, state transitions, wiring, types, and
buildability. A real browser is required to prove shader compilation, decoding,
CORS, autoplay behavior, GPU output, input routing, and visual alignment.

If browser automation or localhost is policy-blocked:

1. stop at the blocked boundary;
2. report which automated checks passed;
3. state that visual parity is unverified;
4. give exact manual steps with viewport and checkpoint coordinates;
5. do not switch to another protocol or browser surface to bypass the block.

## Completion gate

The reconstruction can be reported complete only when:

- all required matrix rows have a recorded result;
- no high-severity structural or temporal mismatch remains;
- accepted approximations are explicit and tied to asset/licensing policy;
- failure and reduced-motion paths were exercised;
- console/network health was checked in a real browser;
- any unavailable browser check is reported as an unresolved manual gate;
- wording matches the evidence: `verified at listed checkpoints`, not
  `pixel-perfect` or `identical` without exhaustive matched proof.

When the GPU evidence companion gate applies, completion also requires:

- `gpu-runtime-status.json.status === "runtime-validated"`;
- `render-contracts.json.status === "runtime-validated"`;
- `render-contracts.json.unresolved` is empty; and
- all applicable context, compile/link, FBO, pass/binding/order, GL error,
  channel-flow, and matched clean-visual gates pass.

Runtime validation proves bounded GL execution, not pixel-perfect fidelity.
