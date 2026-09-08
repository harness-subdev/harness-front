# Supplied capture notes: fictional “Aster Field” landing sequence

These notes summarize a user-supplied screen recording. The live URL was not
available to the analyst, so DOM, console, network, and exact browser geometry
remain unverified unless a separate supplied file records them.

## Desktop 1280 × 720

| Checkpoint | Recording timestamp | Approx. scrollY | Notes |
| --- | ---: | ---: | --- |
| loading | 00:00.0 | 0 | off-white full-screen layer; heading is already selectable behind it |
| top settled | 00:01.2 | 0 | fixed full-viewport canvas-like surface behind DOM heading; dark oval occupies center 42% width |
| reveal midpoint | 00:00.6 | 0 | oval opens from center while background remains fixed |
| segment 1 midpoint | 00:03.4 | 540 | heading translates upward with document; visual surface remains fixed; inner colored tiles drift left |
| segment 1 end | 00:05.1 | 1080 | oval fills about 78% width; tiles stop drifting about 0.2s after scrolling stops |
| segment 2 midpoint | 00:07.0 | 1640 | faster scroll produces greater horizontal skew than slow scroll at the same position |
| final handoff | 00:09.2 | 2260 | fixed surface fades; next semantic section becomes dominant |

Pointer pass: moving from the center to the upper-right shifts the colored tiles
right and down with visible lag. The outer oval edge does not move. The recording
does not prove whether the visual is WebGL, Canvas 2D, video, or CSS masking.

## Mobile 390 × 844

| Checkpoint | Recording timestamp | Approx. scrollY | Notes |
| --- | ---: | ---: | --- |
| top settled | 00:01.4 | 0 | heading wraps to three lines; oval is portrait-cropped and about 86% viewport width |
| segment 1 midpoint | 00:04.1 | 620 | visual remains fixed; tiles move with scroll but no touch-position response is visible |
| final handoff | 00:09.8 | 2410 | fade completes later in document coordinates than desktop |

Touch pass: a drag that scrolls the page did not show a separable hover-like
response. Orientation change was not recorded.

## Reduced motion

The supplied reduced-motion capture shows the settled oval immediately, native
scrolling, no opening reveal, no pointer lag, and a still first image inside the
oval. Whether a video element was created or played cannot be determined from
the recording.

## Gaps and constraints

- Live browser inspection was policy-blocked in the original session and was
  not bypassed through another protocol.
- No console log, accessibility snapshot, computed style, or request timing was
  supplied.
- The notes distinguish what the pixels show from likely implementation.
- Asset URLs in the companion manifest are research evidence, not permission to
  redistribute or hotlink them.
