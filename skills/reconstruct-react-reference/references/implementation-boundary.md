# Implementation Boundary

## Separate roles

Allow the analysis role to inspect the replay, archive, source graph, screenshots, traces, and bounded deployed-code evidence. Its output is a scrubbed implementation packet, not implementation code.

Give the clean implementer only:

- the exact approved `.reference-reconstruction/react-architecture.md` and its
  component-map SHA-256 binding;
- the approved component map and execution plan;
- public screenshots and observable checkpoints;
- semantic content and normalized data contracts;
- input/output, lifecycle, accessibility, and fallback requirements;
- explicit uncertainty and not-applicable records.

Never give the clean implementer:

- archived JavaScript/CSS bundle bodies or excerpts;
- minified identifiers or recovered internal call graphs;
- analyzer transcripts that describe deployed implementation details;
- original author source claims;
- research-only assets outside the explicit private resolver.

The architecture author receives the same scrubbed inputs as the clean
implementer plus verified component-contract evidence; it must not copy deployed
implementation expressions into the architecture packet. The clean implementer
must verify that the packet hash matches both the component map and plan before
creating application files.

Stop and return to architecture approval when a requested change materially
alters the folder tree, public interface, state ownership, renderer, dependency
budget, or planned parity checkpoints.

If the current agent has inspected deployed implementation code, dispatch a fresh agent without that conversation history for clean implementation. Record the packet hash and implementer boundary in `project.json` or the implementation plan. This is an auditable process boundary, not mathematical proof of independent authorship.

## Next.js/React seam

Use Next.js App Router, React, and TypeScript. Default to server components. Introduce a client boundary only for browser state, input, audio, animation, or rendering lifecycle. Keep content and asset IDs serializable across that boundary.

Choose a renderer in the approved plan. Observation evidence does not force Three.js or React Three Fiber. If a renderer is client-owned, isolate its mount, readiness, resize, context loss, fallback, and disposal behind one deep scene module.

Use `vercel-react-best-practices` for generic React/Next.js decisions. Use `interactive-webgl-analysis-poc` only for renderer-neutral behavior specification, evidence capture, or audit.

## Asset profiles

### `research-parity`

- Private and local only.
- May resolve archived reference artifacts through one explicit adapter.
- Must never enter normal runtime imports or distributable output.
- Produces receipts for comparison with the original oracle.

### `distribution`

- Uses only owned, CC0, or otherwise licensed assets with recorded provenance.
- Rebuilds after substitution and produces its own distribution receipt.
- Does not inherit the research visual output hash.
- Must reject original hosts, mirror URLs, replay paths, archive/evidence paths, research-only bytes, and acceptance diagnostics.

Keep components dependent on semantic asset IDs. Do not add a generic adapter framework before a second real asset source requires it; one private research resolver and one distribution resolver are enough.

## Public boundary

Prefer deep modules that hide controllers, render passes, panels, and overlays. Promote a nested component only when independent evidence or a real consumer needs its interface. Keep router, sound, rendering, and normalized input details private unless cross-project composition proves a stable public seam.
