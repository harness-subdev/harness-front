# Dependencies

`frontend-harness` itself has no package-manager dependencies. Its bundled
scripts use the Node.js standard library.

## Runtime requirements

- Git
- Node.js 20 or newer for validators, extractors, and tests
- A Codex-compatible skill loader
- A real browser or browser automation surface for live reference inspection
- An existing React/TypeScript or Next.js project only when reconstruction is
  requested

## Required workflow skills

These are resolved from the user's installed skill catalog and are not vendored
here:

- `using-skills` — skill routing
- `brainstorming` — architecture and behavioral approval
- `writing-plans` — hash-bound vertical-slice plans
- `test-driven-development` — implementation changes
- `verification-before-completion` — evidence before completion claims

## Implementation-stage skills

- `frontend-design` — visual-language analysis and implementation direction
- `codebase-design` — deep-module boundaries
- `implement` or `subagent-driven-development` — approved plan execution
- `vercel-react-best-practices` — React and Next.js decisions
- `webapp-testing` — observable browser parity
- `requesting-code-review` — implementation review

## Conditional capabilities

- `interactive-webgl-analysis-poc` is bundled and activates only for relevant
  Canvas, WebGL, WebGPU, shader, render-target, or scroll-linked evidence.
- `imagegen` and `algorithmic-art` may provide original replacement assets when
  the request needs them.
- Browser automation is required for runtime evidence but is a host capability,
  not a vendored library.
- GSD may manage projects, milestones, phases, progress, audits, summaries, and
  completion. GSD-native implementation workflows are not required by default.

## Referenced web libraries

The skills can detect or reason about libraries used by a target website, such
as GSAP, ScrollTrigger, Lenis, Framer Motion, Three.js, React Three Fiber,
Swiper, or p5.js. They are observations or optional target-project choices and
are not dependencies of this repository.
