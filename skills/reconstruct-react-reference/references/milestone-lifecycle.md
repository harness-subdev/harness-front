# Full Reference Reconstruction Lifecycle

Use this reference when the request covers a full site, multiple milestones, original-runtime restoration, React/Next.js reconstruction, component extraction, or cross-project distribution. Select exactly one current milestone from evidence that exists on disk. Do not select a milestone from intent alone.

## Select the current milestone

- Select Milestone 1 until a replayable Oracle is complete, required runtime and GPU evidence is resolved, and the Oracle lock passes validation.
- Select Milestone 2 only after the Oracle lock passes and while clean reconstruction, parity receipts, or project-catalog promotion remain incomplete.
- Select Milestone 3 only after promoted candidates exist and the work has moved to a real second-project consumer or distribution validation.
- M1 may create a metadata-only validation envelope containing the project marker and Oracle lock because the Oracle-stage validator requires that binding. This envelope is not the clean application target.
- Clean application files, package metadata, and target dependencies begin only after Oracle validation passes. Keep the immutable Oracle and future clean application in separate sibling projects with separate dependency graphs.
- A route, locale, query state, variant, fixture, demo, or specimen inside the source project is not cross-project reuse.

## Milestone 1 - Original runtime oracle

**Goal:** Preserve the complete public runtime as replayable, immutable evidence before authoring a replacement.

Default phases:

1. Full-site scope and checkpoints — use `site-reference-audit` as preflight-only route, locale, query, viewport, interaction, authority, and rights reconnaissance; it does not satisfy Oracle closure and is not written into the target envelope.
2. Public runtime archive and local mirror — exact response bytes, request identity, runtime-discovered assets, and manifest-aware replay.
3. Runtime/GPU evidence and Oracle lock — interaction graph, pre-navigation renderer traces, semantic render contracts, required unresolved closure, and hash lock.

Exit only when the local replay is healthy, required source and runtime evidence is complete, applicable GPU evidence is runtime-validated, blocking unresolved entries are empty, and the Oracle validator passes.

## Milestone 2 - Clean React/Next.js reconstruction

**Goal:** Build an independently authored site from the locked Oracle and promote only evidence-backed reusable candidates.

Use `Page -> Section -> proven UI`:

- Page owns routing, SEO, locale data, and Section ordering. It is normally application composition, not a design-system export.
- Section is the primary reusable unit. It owns its content contract, state, inputs, responsive behavior, asset readiness, fallback, animation lifecycle, and cleanup.
- UI is public only when two Section consumers prove repetition, or when independent consumption has clear value. Do not wrap native elements merely to increase component count.
- Keep controllers, renderer passes, per-frame state, input normalization, and archive resolvers private. Expose an adapter only after two real hosts require the seam.

Every public candidate has two integration profiles:

- `Standalone` is the default. It works without a Provider, global CSS, source DOM ancestors, the Oracle, or the original host. It includes semantic DOM, keyboard/touch/pointer behavior, responsive styles, reduced-motion behavior, asset failure handling, and cleanup.
- `Immersive Runtime` is optional. A host may install a Provider to share scroll, navigation, pointer, preload, audio, route transition, or canvas services. Absence of the Provider must fall back to Standalone behavior.

Default phases:

1. Approved React architecture packet, component design, and clean-room handoff.
2. Vertical reconstruction slices grouped by shared Page template and behavior risk, not one phase per route.
3. Standalone validation, parity receipts, promotion records, and project catalog.

Exit only when every promoted candidate is independently authored, parity-verified, Standalone-tested, bound to current interface and implementation digests, and present in the project catalog. Failed, blocked, and unresolved candidates remain outside the catalog.

## Milestone 3 - Proven cross-project design system

**Goal:** Turn promoted project candidates into a reusable package proven by a real consumer and safe technical distribution checks.

Default phases:

1. Public package, tokens, content schemas, states, variants, fallbacks, and executable specimens.
2. Real second-project reuse proof using the same interface and implementation without a fork.
3. Distribution validation using owned or licensed assets, current receipts, package digests, and forbidden-content scans.

Exit only when a separate project consumes the promoted implementation successfully and the distribution validator finds no research-only asset, Oracle path, original host, or stale digest. Technical validation is not legal approval.

## Phase sizing

- One phase produces one externally verifiable outcome.
- Do not create one phase per route, component, or data record.
- Split template families only when renderer, interaction, evidence, or failure risk warrants an independent gate.
- Each phase receives its own approved brainstorming record and writing plan before implementation.
- Milestone 2 clean implementation also requires an approved `react-reference-architecture` packet bound to the component map and execution plan by exact SHA-256. Create it only after the Oracle stage passes.

## Management and implementation rails

GSD is the management rail only: project onboarding, milestone lifecycle, phase list, progress, audit, summary, and completion.

The implementation rail is:

`brainstorming -> writing-plans -> test-driven-development when code changes -> implement or subagent-driven-development -> requesting-code-review -> verification-before-completion`

Do not use `gsd-discuss-phase`, `gsd-plan-phase`, or `gsd-execute-phase` unless the user explicitly requests GSD-native phase execution.

## Hard stops

Stop without overwriting the last valid artifact when authority is missing, required source/runtime evidence is absent, the Oracle hash changes, the target points to another Oracle, applicable GPU validation is incomplete, a required claim is unresolved, Standalone fails, receipt bindings are stale, or research-only material reaches a distribution root.
