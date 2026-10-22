# Authorized POC brief: synthetic “Orbit Window”

The user authorizes a local POC implementation, focused tests, and local build
or static-server verification. They do not authorize commits, pushes, uploads,
or public deployment.

## Required behavior

- One dependency-free HTML deliverable using semantic DOM plus Canvas 2D.
- A centered oval window reveals a new procedural colored field; no external
  production asset may be embedded or hotlinked.
- From scroll progress 0 to 1, field x-offset goes from 0 to -120 px and oval
  width goes from 20% to 82% of the viewport.
- Pointer x adds at most ±24 px with delta-time-aware smoothing.
- Mobile/touch uses the centered pointer target.
- Reduced motion shows the completed oval immediately, disables pointer lag,
  and keeps native scrolling.
- Canvas failure leaves the heading and a CSS color fallback readable.

## Verification

- Leave one runnable dependency-free check for progress clamping and endpoints.
- Verify syntax and the local static files. If browser automation is unavailable,
  provide exact manual desktop/mobile/reduced-motion checkpoints.
