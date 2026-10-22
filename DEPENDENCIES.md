# Dependencies

`harness-front` itself has no package-manager dependencies. Its bundled
scripts use the Node.js standard library.

## Runtime requirements

- Git
- Node.js 20 or newer for validators, extractors, and tests
- A Codex-compatible skill loader
- A real browser or browser automation surface for live reference inspection
- Access to the designated private React/Vite template for new projects and
  existing Next.js application ports; Next.js is a migration input, not the target
- TypeScript strict, Tailwind CSS, React Router, GSAP and `@gsap/react` in that target
- An existing non-Next.js app keeps its approved stack for scoped behavior changes

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
- `vercel-react-best-practices` — React/Vite implementation decisions
- `webapp-testing` — observable browser parity
- `code-review` — implementation review from
  [harness-global](https://github.com/harness-subdev/harness-global)

## Conditional capabilities

- `web-reference-webgl-poc` is bundled and activates only for relevant
  Canvas, WebGL, WebGPU, shader, render-target, or scroll-linked evidence.
- `imagegen` and `algorithmic-art` may provide original replacement assets when
  the request needs them.
- Browser automation is required for runtime evidence but is a host capability,
  not a vendored library.
- GSD may manage projects, milestones, phases, progress, audits, summaries, and
  completion. GSD-native implementation workflows are not required by default.
- GitHub publication uses `github-workflow` and `github-remote-push` from
  [harness-github](https://github.com/harness-subdev/harness-github).

## Motion capture requirements

- `web-component-motion-capture` reuses the separately installed
  `web-video-optimize` skill for video conversion and verification. Install it
  alongside this skill in the user skill catalog. It is not bundled here.
- Video processing requires ffmpeg/ffprobe. The optional macOS window recorder
  requires Swift and a macOS SDK providing ScreenCaptureKit `SCRecordingOutput`,
  plus the actual execution app’s Screen Recording permission.
- Browser input uses connected Chrome. Sandbox execution approval is separate
  from OS permission; the skill documents how to distinguish them.

## Referenced web libraries

The skills can detect or reason about libraries used by a target website, such
as GSAP, ScrollTrigger, Lenis, Framer Motion, Three.js, React Three Fiber,
Swiper, or p5.js. They are observations or optional target-project choices and
are not dependencies of this repository.
