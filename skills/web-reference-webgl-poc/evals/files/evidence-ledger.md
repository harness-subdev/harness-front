# Evidence ledger: fictional “Prism Current” sequence

| ID | Claim | Class | Evidence | Checkpoint | Confidence | Open test |
| --- | --- | --- | --- | --- | --- | --- |
| E-01 | Semantic heading remains selectable above a fixed canvas | observed | supplied DOM snapshot + recording | desktop top/mid | high | — |
| E-02 | Canvas exposes a WebGL2 context | observed | supplied browser diagnostics | desktop top | high | — |
| E-03 | The implementation library is Three.js or R3F | inferred | no library marker was supplied | — | low | inspect only if public-artifact track is approved |
| E-04 | Pointer input shifts the inner image but not the clipping silhouette | observed | five-corner pointer capture | desktop top | high | — |
| E-05 | Scroll response is smoothed, not a triggered timeline | inferred | motion decays for 180–240 ms after scroll stops and reverses continuously | segment A | medium | repeat at 120 Hz |
| E-06 | A separate offscreen render target is required | inferred | independent inner motion behind a hard silhouette | segment A | low | compare against alpha-mask/CSS implementations |
| E-07 | Mobile uses a centered static pointer target | observed | touch capture shows scroll motion but no position response | mobile | medium | test stylus/pointer-capable tablet |
| E-08 | Reduced motion shows the final reveal state and native scrolling | observed | supplied reduced-motion recording | desktop | high | verify whether media is instantiated |
| E-09 | Optional video failure leaves poster visible | observed | supplied local failure recording | desktop top | high | — |

## Checkpoints

| Viewport | State | Measurement coordinate | Expected output |
| --- | --- | ---: | --- |
| 1366×768 | reveal start | t=0.0 | 12% wide centered silhouette |
| 1366×768 | reveal midpoint | t=0.55 | 49% wide silhouette, inner image already moving |
| 1366×768 | reveal end | t=1.1 | 82% wide silhouette |
| 1366×768 | scroll midpoint | p=0.5 | inner image x=-0.12 normalized width, skew follows velocity |
| 412×915 | scroll midpoint | p=0.5 | portrait cover crop, no touch-position offset |
