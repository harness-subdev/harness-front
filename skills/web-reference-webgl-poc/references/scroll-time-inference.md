# Scroll and time inference

Use this reference when motion depends on scroll, time, pointer input, or a
combination. Measure behavior first; a familiar animation-library API is not
evidence that the target uses it.

## Normalize observations

Choose stable measurement coordinates:

```text
segmentProgress = clamp((scrollY - startY) / (endY - startY), 0, 1)
pointerX = clamp(clientX / viewportWidth, 0, 1)
pointerY = clamp(clientY / viewportHeight, 0, 1)
elapsed = timestamp - revealStart
```

These are comparison coordinates, not claims about production code. Record the
raw scroll/time value, normalized value, viewport, input direction, and visible
output at every checkpoint.

## Classify the motion model

Test each candidate with forward, reverse, pause, fast-scroll, and resize runs:

| Model | Observable signature |
| --- | --- |
| Scroll scrub | output stops immediately with scroll and reverses continuously |
| Triggered timeline | crossing a boundary starts motion that continues after scrolling stops |
| Smoothed scrub | output approaches the scroll-derived target after input stops |
| Velocity response | overshoot/distortion depends on scroll speed and direction |
| Sticky/pinned scene | visual remains viewport-fixed while document runway advances |
| Time loop | motion continues at a stable scroll position |
| Hybrid | a time reveal gates a later scroll/pointer scene |

Do not infer a library-specific trigger string from these signatures. Record
element geometry and viewport-relative boundaries instead.

## Estimate boundaries

For a candidate start or end boundary:

1. approach slowly from both directions;
2. record the last unchanged and first changed positions;
3. repeat after viewport resize;
4. compare against element top/bottom and viewport height;
5. report an interval when precision is limited.

If the boundary shifts with viewport height, express it as a relationship such
as “section top reaches 80% of viewport,” not a fixed pixel number. Label exact
constants `extracted` only when a permitted public artifact states them.

## Infer smoothing

A common clean model is exponential approach:

```text
current += (target - current) * (1 - exp(-responsiveness * deltaSeconds))
```

Prefer delta-time-aware smoothing in the reconstruction because it behaves
consistently across refresh rates. A fixed per-frame lerp may fit the target, but
only claim it as extracted when evidence supports it.

To estimate lag, make a quick input step and measure time to reach roughly 63%
of the final change. For a first-order model that time approximates
`1 / responsiveness`. Treat noisy screen recordings as a range.

## Infer velocity and hysteresis

Velocity-driven effects usually show:

- greater amplitude for faster input over the same distance;
- sign reversal when direction reverses;
- decay while scroll position is stationary;
- clamping at high speeds.

Hysteresis or direction locks show different output at the same progress based
on travel direction or prior state. Compare matched checkpoints in both
directions. Keep velocity, direction, and progress as separate state variables
when the evidence requires them.

## Easing and endpoint behavior

Sample start, quarter, midpoint, three-quarter, and end. Compare simple
candidates before inventing a custom curve:

- linear;
- smoothstep or smootherstep;
- quadratic/cubic ease-in/out;
- damped spring only when overshoot and oscillation are observed.

For each equation record:

```text
domain and clamp
formula or lookup samples
expected values at 0, 0.5, and 1
reverse behavior
evidence class and confidence
```

Use tolerances for measured values. If the contract requires a completed state,
handle floating-point endpoints so progress cannot remain visually one step
short of `1`.

## Pointer and touch

Test pointer and touch separately. Mobile may use:

- no hover response;
- the last touch position;
- device orientation;
- a centered/static fallback;
- different amplitude or smoothing.

Do not synthesize hover on touch unless observation or the requested product
behavior supports it. Confirm whether input is viewport-relative, element-
relative, or projected into a scene.

## Frame/update order

When values feed multiple consumers, document order rather than framework hooks:

```text
1. sample input and time
2. update normalized target values
3. apply smoothing/velocity state
4. update dependent scene/layout/material values
5. render offscreen producers, if any
6. render/composite consumers
```

If consumers visibly lag by one frame, test whether that is intentional or an
ordering bug before reproducing it.

## Runnable seam

Non-trivial inferred math should leave one small executable check covering:

- below-start, start, midpoint, end, and above-end values;
- reverse direction;
- a large frame delta or fast scroll;
- reduced-motion/static selection where applicable.
