# Read-only fidelity audit evidence: synthetic “Tidal Lens” POC

The user requested diagnosis only. No fix authorization was given.

| Viewport/checkpoint | Reference | Current POC |
| --- | --- | --- |
| 1280×720, p=0 | oval bounds x=448..832 | x=420..860 |
| 1280×720, p=0.5 | inner landmark x=512; heading y=96 | x=590; heading y=96 |
| 1280×720, p=1 | oval width=1,024; fade complete | width=1,024; opacity=0.08 |
| 390×844, p=0.5 | portrait cover crop, centered touch target | landscape contain crop, last touch position retained |
| reduced motion | final static state, native scroll | reveal animates for 900 ms, native scroll |

Runtime notes:

- Focused math tests and production build pass.
- Browser console reports no shader error.
- One video request fails CORS; the current POC shows an empty transparent area.
- The supplied comparison images use matching viewports but unknown device scale
  factor, so pixel-level antialiasing differences are not comparable.
