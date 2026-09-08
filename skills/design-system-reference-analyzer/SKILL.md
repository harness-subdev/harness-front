---
name: design-system-reference-analyzer
description: Use when a user provides a design-reference URL or source HTML/CSS/JS and asks to analyze or restore components, motion, interactions, or a design system; also use for authorized original runtime archive/mirror requests, or when that reference analysis/restoration includes canvas, WebGL, WebGPU, Three.js, native GL, shaders, or render targets. Not for unrelated coding, README, git, or publishing work.
---

# Design System Reference Analyzer

Use this skill to turn a design reference into an implementation-ready analysis. It normally stops at analysis and structure planning; if the user explicitly asks to build, render, or show the design system as HTML, continue into a small verified static demo. Documentation, commits, pushes, and publishing belong to other skills.

Component extraction must cover HTML, CSS, and JS together. HTML provides structure, CSS defines visual variants and motion contracts, and JS owns state, events, render loops, and side effects. Do not treat an HTML fragment alone as the full component boundary when related CSS or JS exists.

Core rule: make an evidence/authority decision before work. Use `source-mirror-assisted` when capture of publicly served artifacts is authorized; a served production bundle is runtime evidence, never author source. Use `behavior-only` clean-room analysis when retrieval is unavailable or not authorized. If the user asks for an internal “original” backup and public artifact capture is authorized, choose `source-mirror-assisted`; do not silently force clean-room work. Screenshots, captures, and local reimplementations are supporting evidence or blocked-runtime fallbacks, not the starting point for component extraction.

## Scope

Do:
- Inspect the provided reference source, including HTML, CSS, JS, assets, and runtime libraries when available.
- Extract reusable component contracts across markup structure, CSS selectors/tokens/animations, and JS state/events/render loops.
- In `source-mirror-assisted` mode, run the bundled deterministic graph extractor only after verified archived HTML/CSS/JS exists, and use its JSON graph as the structural source of truth for selector, token, motion, event, state, and DOM mutation relationships.
- Build explicit CSS motion and JS interaction inventories before finalizing component boundaries. Static HTML extraction is incomplete when related stylesheets, scripts, or runtime libraries exist.
- If the source uses templates such as HAML, Pug, JSX, Vue, or Svelte, analyze both the source shape and the rendered DOM it produces.
- Use `frontend-design` while analyzing visual direction, typography, layout, palette, and demo presentation choices.
- Use `using-skills` when the task may benefit from additional installed skills, such as `webapp-testing`, `browser:control-in-app-browser`, `imagegen`, `algorithmic-art`, or framework-specific implementation skills.
- Explain the core experience in implementation terms.
- Extract component boundaries, design tokens, motion mechanics, and parity criteria.
- In `source-mirror-assisted` mode, archive authorized public HTML/CSS/JS/assets into `source/` exactly as served before analysis; preserve raw bytes in `source/original/` before screenshots, normalization, decompilation, or analysis, put derived results in `source/derived/`, and keep implementation output outside both roots.
- In `source-mirror-assisted` mode, follow [reference/nextjs-original-source-mirror.md](reference/nextjs-original-source-mirror.md) for Next.js, App Router, RSC, Turbopack, Vercel, or query-dependent bundled sites before using screenshots or local approximations as source evidence.
- When authorized archived source or saved assets exist, treat original DOM structure, inline SVG, images, icons, video, canvas, custom elements, and `data-*` attributes as source-owned component contracts. If they are available, do not replace them with arbitrary icons, shapes, generated placeholders, or simplified stand-ins.
- In `source-mirror-assisted` mode, when archived source JS exists and the user asks to build, render, or show extracted components, use original JS runtime based component extraction by default: rendered component specimens must load the source runtime dependency chain that owns their behavior. In `behavior-only` mode, label any recreation as a clean-room substitution.
- When a source-owned resource cannot be used because it is blocked, session-bound, license-restricted, missing, or runtime-only, record a structured `substitution` with `original`, `replacement`, `reason`, and `preservedContract`.
- Separate raw graph evidence from final design-system components. `data-component` lists, graph `component-candidate` nodes, and DOM landmarks are evidence; final reusable components must be regrouped from connected DOM, CSS, JS, asset, and runtime requirements.
- Confirm a reusable component only when its source-owned root/hook, wrapper/inner markup, attributes, CSS selectors, JS selectors/events/state/mutations, resources, and runtime behavior are all traced. Otherwise keep it out of `Reusable components` and list it under `Unresolved candidates`.
- Recommend an interactive demo structure that can produce results like the current Hyper Scroll design system.
- When the user asks to render or show the result, build a small static HTML design-system page, serve it locally, verify it in a browser, and provide the local URL.
- When rendering a design-system page, include sections in this order: original reference, extracted components, then fonts/styles/design tokens.

Do not:
- Write README files.
- Update root project links.
- Commit, push, or publish.
- Claim exact parity before verifying the source behavior and produced artifact.
- Call production bundles author source, or call an archive `source-complete` or a restoration `implementation-ready` while its required archive or GPU evidence is incomplete.
- Replace script-backed graph extraction with prose-only source inventory when HTML, CSS, or JS source is available.
- Replace authorized archived inline SVG, icons, images, video, canvas, custom elements, or source-owned `data-*` contracts with arbitrary generated assets or generic placeholders.
- Present a raw `data-component` list, graph candidate list, or documentation card inventory as the final reusable design system.
- Present a component as reusable or implementation-ready when source-owned hooks imply CSS, JS, asset, or runtime behavior that has not been traced through the dependency graph.
- Collapse SVG-internal contracts such as `.text path`, `.line path`, grouped paths, masks, clips, or `viewBox` into one generic SVG style.
- Return a component extraction that only covers markup when CSS, JS, animation, event, observer, timer, render-loop, or external interaction artifacts are available. In `source-mirror-assisted` mode, archive and inspect the authorized artifact first; in `behavior-only`, state the unavailable class and keep the contract incomplete.
- Present hand-written JS approximations as if they were extracted original interactions. In `source-mirror-assisted` mode, archived source JS must run in the specimen when possible; in `behavior-only`, label the result as a clean-room substitution and limit parity claims.
- In `source-mirror-assisted` mode, do not treat a screenshot, browser capture, or hand-built recreation as primary evidence before the authorized runtime archive is verified. In `behavior-only`, label these as observation evidence.

## Workflow

1. **Skill routing**
   - Use `frontend-design` before judging or recreating the reference's visual language. Let it shape the visual thesis, typography, palette, layout, signature interaction, and self-critique.
   - Use `using-skills` to check whether other installed skills should be loaded for the specific request. For example, use browser or webapp testing skills for rendered URL verification, image skills for generated bitmap assets, and implementation/framework skills when the target repository requires them.
   - Keep the selected skill set minimal and state the order briefly before doing task work.

2. **Reference intake**
   - Confirm the reference URL or source files, including markup/templates, stylesheets, scripts/modules, assets, and external libraries.
   - If only one artifact is provided, state which related CSS, JS, assets, or runtime behavior are missing and what assumptions are being made.
   - Select and record `source-mirror-assisted` or `behavior-only` before any retrieval: include its authority/retrieval basis. In `behavior-only`, do not fetch or retrieve artifacts; state unavailable or unauthorized classes and limit claims to observed behavior.
   - Only in `source-mirror-assisted` mode, retrieve authorized public artifacts and save served HTML plus discoverable linked/runtime assets before using screenshots or descriptions as source evidence.
   - Identify HTML/CSS/JS, assets, external libraries, event listeners, render loops, and runtime assumptions.
   - Treat IDs, classes, `data-*` attributes, ARIA attributes, CSS custom properties, and JS query selectors as potential component contracts.

3. **Original runtime archive gate**
   - In `source-mirror-assisted` mode, create `source/original/`, `source/derived/`, and `source/source-manifest.json`. Save raw exact response bytes to `original/` before derived work; never overwrite them.
   - The manifest must identify required artifact classes and, for each artifact, its class, exact absolute `originalUrl` including query, safe relative `localPath`, bytes, lowercase SHA-256, response status, content type, discovery/referrer, retrieval method, and capture time. Record every missing or blocked class explicitly; never store credentials, tokens, cookies, or secret-bearing URLs.
   - From `<SKILL_DIR>`, run this gate before extraction or derived analysis:
     ```bash
     node scripts/verify-source-archive.mjs <TASK_WORK_DIR>/source
     ```
     Keep its `source/archive-status.json`. Call an archive `source-complete` only when status has `complete: true`, a snapshot ID, empty `missingDiscoveredArtifacts`, `runtimeDiscovery.status: "complete"`, empty `runtimeDiscovery.missing`, and no missing/blocked items; caller-declared required classes alone are insufficient. See [reference/original-runtime-archive.md](reference/original-runtime-archive.md) for the schema and replay rules, and [reference/nextjs-original-source-mirror.md](reference/nextjs-original-source-mirror.md) for Next.js details.
   - In `behavior-only` mode, do not fabricate an archive. Record the unavailable/unauthorized classes and continue only with clearly labelled clean-room behavior evidence.

4. **Authorized source fetch**
   - Run this step only in `source-mirror-assisted` mode; skip it entirely in `behavior-only` mode.
   - When authorized public source is available, create `source/` in the current task working directory before analysis, design-token extraction, screenshots-as-evidence, or demo construction.
   - In this mode, save fetched artifacts under `source/original/` using stable safe paths that mirror the served path; use only the verified originals as source input. Derived analysis belongs in `source/derived/`.
   - In this mode, preserve exact URL + query mappings for Next.js/RSC chunks, `/_next/image`, route prefetches, and deployment-tagged assets. Follow [reference/nextjs-original-source-mirror.md](reference/nextjs-original-source-mirror.md).
   - In this mode, preserve fetched source as source: do not beautify, minify, transpile, inline, rewrite selectors, or otherwise normalize it before saving.
   - In this mode, prefer canonical raw source endpoints for CodePen, StackBlitz, GitHub, framework demos, or similar hosts; otherwise save authorized rendered HTML plus discovered linked CSS, JS, and assets.
   - In this mode, do not save credentials, cookies, private tokens, or session-local data. If authorized source retrieval is blocked, record the blocker, exact missing artifact classes, and fallback evidence before continuing from rendered/runtime source.
   - In this mode, use verified `source/original/` files as the primary source references for later inventory, component contracts, and output citations.

5. **Deterministic reference graph extraction**
   - Run this step only in `source-mirror-assisted` mode after `source/archive-status.json` verifies the archive and `source/original/` contains archived `.html`, `.htm`, `.css`, `.scss`, `.sass`, `.less`, `.js`, `.mjs`, `.cjs`, `.jsx`, `.ts`, or `.tsx` files. In `behavior-only`, do not generate source-backed contracts.
   - Resolve the skill directory as the directory containing this `SKILL.md`. Do not assume the current working directory is the skill directory.
   - Execute:
     ```bash
     node <SKILL_DIR>/scripts/extract-reference-graph.mjs \
       <TASK_WORK_DIR>/source/original \
       <TASK_WORK_DIR>/source/derived/reference-graph.json
     ```
   - Then produce the implementation-oriented component contract index:
     ```bash
     node <SKILL_DIR>/scripts/extract-reference-index.mjs \
       <TASK_WORK_DIR>/source/derived/reference-graph.json \
       <TASK_WORK_DIR>/source/derived/reference-index.json

     node <SKILL_DIR>/scripts/extract-component-contracts.mjs \
       <TASK_WORK_DIR>/source/derived/reference-graph.json \
       <TASK_WORK_DIR>/source/derived/component-contracts.json \
       <TASK_WORK_DIR>/source/derived/reference-index.json
     ```
   - The bundled scanner always reports `parserBacked: false` and `partial: true`; its graph is static lead evidence and cannot alone promote a component. Promote only after the complete DOM/CSS/JS/asset/GPU contract is resolved by either parser-backed analysis or explicit manual source inspection plus matching runtime checkpoints.
   - For every promoted component, record `promotionEvidence` with the method, source/evidence refs, and runtime checkpoint refs, plus an empty `unresolved` list. If any contract remains unresolved, keep the candidate partial.
   - The JS dependency evidence must connect `DOM hook -> JS selector -> variable alias -> event/controller -> state -> mutation -> affected DOM/CSS contract` whenever source permits it. If scanner edges are insufficient, resolve the chain through exact manual source ranges and runtime mutation checkpoints or leave it unresolved.
   - When the reference can be rendered, produce or request a browser runtime graph as `source/derived/runtime-reference-graph.json`. Keep it separate from `source/derived/reference-graph.json`; static graph evidence says what source declares, runtime graph evidence says what the browser actually loads, computes, listens to, mutates, and animates.
   - If the script exits non-zero, report the stderr, fix source-path issues if possible, and retry once. If it still fails, continue only with an explicit blocker and mark HTML/CSS/JS component contracts incomplete.
   - Primary agent consumption should start from `source/derived/component-contracts.json` when generated. In schemaVersion 2:
     - `componentTree` gives the top-level overview and parent/child component hierarchy.
     - `components` is keyed by stable component id; read only the component objects needed for the current analysis.
     - Component `evidenceRefs` fields (`directRefs`, `inheritedRefs`, and `descendantRefs`) contain evidence IDs only.
     - The centralized `evidence` section contains compact evidence details for those IDs.
     - `patterns` contains repeated items and variants discovered across components.
     - `relationships` uses compact component and evidence IDs for dependency tracing.
   - Read generated v2 outputs in this order:
     1. `source/derived/component-contracts.json` summary fields and `componentTree`.
     2. Selected `components` objects by id.
     3. Selected `evidenceRefs` IDs from `directRefs`, `inheritedRefs`, and `descendantRefs`, then their matching entries in centralized `evidence`.
     4. `source/derived/reference-index.json` for DOM hierarchy, selector lookup, and compact evidence lookup.
     5. `source/derived/reference-graph.json` only for unresolved evidence, debugging, extractor work, or raw source-of-truth review.
   - Treat files under `source/original/` as raw source of truth. Treat `source/derived/reference-graph.json` as partial extracted evidence; primary reading should use `component-contracts.json` and `reference-index.json`, then consult exact original source ranges for promotion or unresolved evidence.
   - When fallback to `source/derived/reference-graph.json` is needed for unresolved evidence, debugging, extractor work, or raw source-of-truth review, read these fields selectively:
     - `artifacts`: archived original source files with `kind`, `filePath`, and line counts.
     - `nodes`: deterministic nodes for `html-file`, `dom-node`, `stylesheet`, `css-rule`, `design-token`, `keyframe`, `motion-contract`, `script-module`, `js-selector`, `event-listener`, `dom-mutation`, `state-variable`, `interaction-controller`, `asset`, `library`, and `component-candidate`.
     - `edges`: deterministic relationships such as `contains`, `loads`, `styles`, `uses_token`, `defines_keyframe`, `drives_motion`, `matches_selector`, `listens_to`, `mutates_class`, `mutates_style`, `mutates_dom`, `controls`, `uses_asset`, `uses_library`, and `depends_on`.
     - `inventories.html`: DOM landmarks, linked stylesheets, linked scripts, inline styles, and inline scripts.
     - `inventories.css`: selectors, declarations, CSS custom properties, keyframes, media queries, motion rules, token references, and keyframe references.
     - `inventories.js`: query selectors, event listeners, state-like variables, scheduling mechanisms, DOM mutations, and detected libraries.
     - `coverage`: unresolved CSS selectors, unresolved JS selectors, motion contract counts, and component candidate counts.
   - Read and use `source/derived/runtime-reference-graph.json` when generated:
     - `loadedScripts`, `loadedChunks`, and `networkAssets`: runtime-loaded scripts, lazy chunks, source maps, styles, media, fonts, and data files.
     - `runtimeDom`: component roots and source-owned hooks found in the viewport, including `data-component`, IDs, classes, custom elements, SVG `viewBox`, and preserved wrapper/inner markup.
     - `eventListeners`, `observers`, `timers`, and `animationFrames`: runtime interaction owners where browser tooling exposes them.
     - `computedStyles`, `animations`, and `transforms`: computed CSS evidence for component roots and SVG-internal selector groups.
     - `mutations`: DOM/class/style/dataset/attribute changes observed after scroll, click, pointer, keyboard, resize, and load simulations.
     - `screenshots`: viewport and representative component specimen captures used for visual verification.
   - Final component contracts must cite both `staticGraphEvidence` and `runtimeGraphEvidence` when runtime evidence exists.
   - Preserve generated JSON files in `source/derived/`: `reference-graph.json`, `reference-index.json`, `component-contracts.json`, `runtime-reference-graph.json`, and, when WebGL signals exist, `gpu-runtime-trace.json`, `gpu-runtime-status.json`, and `render-contracts.json`. Cite their paths in the final analysis.
   - The graph is a first pass, not the final design system. Use LLM judgment only after the graph has exposed the mechanical HTML/CSS/JS relationships.

6. **GPU render contract gate**
   - Trigger this gate for `canvas`, WebGL/WebGPU/Three.js/native GL calls, shader sources, framebuffers/render targets, or GPU assets. Read [reference/webgl-shader-contract.md](reference/webgl-shader-contract.md) and use `$interactive-webgl-analysis-poc` for renderer-agnostic behavior and visual observation. That skill does not by itself prove low-level GL state; use the bundled runtime producer below for WebGL evidence.
   - For WebGL/WebGL2, install `scripts/gpu-runtime-probe.js` through the selected browser surface's supported init-script mechanism **before navigation**. If pre-page injection is unavailable, set `producerStatus: "blocked"`; never inject after renderer startup and call the trace complete. Run this instrumented evidence navigation separately from the uninstrumented visual/timing navigation.
   - Exercise the agreed load, scroll, pointer, resize, and transition states. At each settled state call `globalThis.__DSRA_GPU_PROBE__.checkpoint(label, conditions)` with the clean-run visual evidence ref and matched viewport, DPR, frame/time, input, camera, and color conditions. Export `globalThis.__DSRA_GPU_PROBE__.export()` to `source/derived/gpu-runtime-trace.json`, then validate it:
     ```bash
     node scripts/verify-gpu-runtime-trace.mjs \
       source/derived/gpu-runtime-trace.json \
       source/derived/gpu-runtime-status.json
     ```
     The probe never reads pixels, cookies, storage, or request bodies. It records bounded WebGL calls; overflow, dropped records, probe errors, missing visual joins, and WebGPU detection remain blockers.
   - As the primary agent, create `source/derived/render-contracts.json` by merging static `gpuContracts`, verified `gpu-runtime-trace.json`/`gpu-runtime-status.json`, and `$interactive-webgl-analysis-poc` visual observations. Include contexts/surfaces; programs/stages; uniforms, samplers, and explicit ordered `channelFlows`; textures/targets; draw-batch-to-pass mappings/order; renderer state; coordinate spaces; input/state-to-GPU consumers; lifecycle ownership; checkpoints; errors; and unresolved evidence. Follow [reference/webgl-shader-contract.md](reference/webgl-shader-contract.md) for the producer procedure and schema.
   - Do not call a GPU-backed restoration `implementation-ready` until the derived contract is `runtime-validated`, its unresolved list is empty, and evidence covers context creation, shader compile/link, framebuffer completeness, pass order and bindings, GPU errors, and matched visual checkpoints.

7. **Graph-backed source artifact inventory**
   - Build a quick inventory of source artifacts:
     `Markup/templates`, `CSS`, `JS`, `Assets`, `Libraries`, and `Runtime assumptions`.
   - For each artifact, state what it owns: structure, layout, typography, color, media treatment, animation, event handling, state, data, or external embedding.
   - Start from `component-contracts.json` when it exists, then use `reference-index.json` for compact lookup. Use `reference-graph.json` only when the compact outputs leave evidence unresolved or extractor-level debugging is needed.
   - Mark selectors and attributes that are shared between HTML, CSS, and JS as contract selectors. These must survive refactors unless the component API changes. In graph terms, these are usually `dom-node` nodes connected to `css-rule` by `styles` and/or to `js-selector` by `matches_selector`.
   - Separate global shell concerns from reusable components, overlays, controllers, and utilities.
   - Run a CSS motion inventory for every stylesheet and inline style. Look for `@keyframes`, `animation`, `transition`, `transform`, `opacity`, `filter`, `backdrop-filter`, `clip-path`, `mask`, `mix-blend-mode`, `scroll-*`, `view-transition-*`, `will-change`, responsive motion changes, and `prefers-reduced-motion`. Record selector, trigger/state, timing/easing, affected properties, and owning component or controller.
   - Run a JS interaction inventory for every script/module. Look for `querySelector*`, `getElement*`, `addEventListener`, `on*` handlers, `requestAnimationFrame`, timers, observers, scroll/pointer/touch/keyboard handlers, `classList`, `style` mutations, `dataset`, custom events, media/canvas/WebGL calls, iframe/embed updates, and network or external API calls. Record event source, state mutation, render target, scheduling mechanism, and owning component or controller.
   - Identify motion/interaction libraries separately, including GSAP, ScrollTrigger, Lenis, Locomotive Scroll, Framer Motion, anime.js, Three.js, Matter.js, p5.js, Splitting, Swiper, and framework transition systems. Record what behavior each library owns instead of hiding it under generic page script.

8. **Experience decomposition**
   - Summarize the reference in one concrete sentence.
   - Map input -> state -> transform -> output.
   - Name the core state variables that drive the experience, such as progress, velocity, camera, pointer, active item, or layout bounds.
   - Identify top-level visual layers and z-order responsibilities, such as page shell, content rail, modal/frame overlay, cursor layer, loader, social/nav, canvas, or post-processing overlay.

9. **Graph-backed HTML/CSS/JS component extraction workflow**
   - Start from rendered HTML layers, not raw indentation alone. For template markup, mentally expand loops and conditionals into the DOM shape users interact with.
   - If `component-contracts.json` exists, start from its summary fields and `componentTree`, then inspect selected `components` by id, selected `evidenceRefs` IDs, centralized `evidence`, `patterns`, and compact `relationships`. Use `reference-index.json` for DOM hierarchy, selector, and evidence lookup before opening the raw `reference-graph.json`.
   - If only `reference-graph.json` exists, start from graph `component-candidate` nodes, then inspect their connected `dom-node`, `css-rule`, `motion-contract`, `js-selector`, `event-listener`, `dom-mutation`, `state-variable`, `asset`, and `library` nodes.
   - Define a component boundary as a connected graph subgraph:
     ```text
     Component =
       DOM root/subtree
       + matching CSS selectors
       + CSS variables/tokens used by those rules
       + keyframes/transitions/effects affecting that subtree
       + JS selectors targeting that subtree
       + JS event/state/mutation/render-loop behavior
       + assets/libraries required to render or operate it
     ```
   - Reusable component acceptance requires all of the following evidence:
     1. Source-owned root DOM or hook identified, such as `data-component`, ID, semantic class, custom element, media element, SVG root, or canvas root.
     2. Wrapper/inner markup, full attributes, and contract-bearing descendants preserved; for SVG, preserve `viewBox`, grouped selectors, path groups, masks, clips, and selector-specific styling contracts.
     3. CSS selectors mapped to the component root or descendants, including state selectors, media/supports context, keyframes, transitions, transforms, filters, and computed runtime style when available.
     4. JS selectors, aliases, events/controllers, state variables, observers/timers/RAF loops, and DOM/class/style/dataset/attribute mutations connected through graph edges to the affected DOM and CSS contracts, or graph/inventory evidence that no JS targets the component.
     5. Assets, inline SVG, images, icons, video, canvas/WebGL, fonts, and external libraries mapped to ownership or recorded as structured substitutions.
     6. Browser runtime evidence, when renderable, confirming the component root exists, styles compute, state changes occur, mutations target the expected DOM, and representative screenshots show the specimen.
   - Promotion also requires recorded `promotionEvidence`: either parser-backed analysis or exact manual source inspection plus runtime checkpoints that resolve the full contract, with `unresolved: []`.
   - Components that fail this gate are `Unresolved candidates`, not reusable components. Do not downgrade an interactive source-owned hook to "presentational only" just because JS ownership has not been traced; continue dependency tracing or mark it unresolved.
   - Find repeated blocks and normalize them into data models. Capture title/content fields, tags, media URLs, variant classes, repeated text layers, link targets, and per-item behavior.
   - Map CSS selectors to ownership: component base styles, modifier variants, state classes, layout rules, responsive rules, tokens, keyframes, transitions, and visual effects.
   - Map JS to ownership: initialization, state variables, event listeners, pointer/scroll/touch input, observers, timers, RAF loops, DOM mutations, class toggles, media loading, iframe/embed updates, and external API calls.
   - Treat `data-*`, IDs, semantic classes, CSS custom properties, and JS query selectors as API surface. Rename or wrap them only after preserving the behavior contract.
   - Extract effects as components or controllers when they have their own contract, for example `SplittingText`, `CircularText`, `MotionController`, `ScrollInputAdapter`, `PreviewFrameController`, or `CursorController`.
   - For each candidate component, define a markup contract, CSS contract, and JS contract before deciding final boundaries.
   - Before producing the final component list, account for every discovered stylesheet and script:
     - mapped to a component,
     - mapped to a non-visual controller,
     - mapped to global shell/runtime behavior, or
     - marked irrelevant with evidence.
   - If CSS exists, the CSS contract for each affected component must include animation/transition/keyframe/filter/transform ownership or explicitly state that no motion/effect styles were found for that component.
   - If JS exists, the JS contract for each affected component must include event/state/render-loop ownership or explicitly state that the component is presentational only.
   - If a graph `coverage.unresolvedCssSelectors` or `coverage.unresolvedJsSelectors` entry affects a candidate component, mark the contract incomplete until runtime probing or manual source inspection resolves it.

10. **Interaction mechanics**
   - Trace scroll, wheel, touch, pointer, RAF, timer, resize, and intersection behavior.
   - Extract formulas and contracts that must survive implementation changes.
   - For motion-heavy work, identify smoothing, lerp, easing, velocity, perspective, loop/wrap, section entry, and section exit behavior.
   - Assign each interaction to the component or controller that owns it. Avoid leaving event behavior as an unowned page-level script unless it is truly global orchestration.
   - For each interaction, write the chain as `input -> state -> transform -> output`, including the exact source selectors, listener or observer, state variables, formula/easing, DOM/style/class mutation, and cleanup or lifecycle assumptions.
   - Do not infer JS behavior from class names alone when executable source can be inspected. If scripts are bundled or minified, still identify public selectors, library calls, event names, and visible state changes.

11. **Component boundaries**
   - Split by responsibility, not by DOM shape.
   - Do not name components after arbitrary selectors unless the selector already expresses a domain role.
   - Use role names such as `SceneViewport`, `MotionController`, `ScrollInputAdapter`, `WorldLayer`, `DataCard`, `TypographyMarker`, `ParticleField`, `HUD`, `PostFXOverlay`, `DemoGallery`, `DemoPanel`, `PreviewFrame`, `CustomCursor`, and `Loader`.
   - For each component, state its purpose, inputs, outputs, owned state, markup, CSS, JS behavior, and required assets/libraries.
   - Identify non-visual controllers separately from presentational components.
   - Component contract template:
     ```text
     ComponentName
     Purpose:
     Markup:
     CSS:
     JS behavior:
     Inputs:
     Outputs/events:
     Owned state:
     Required assets/libraries:
     Evidence refs:
     Incomplete/unknown contracts:
     ```
   - Example extraction pattern for a gallery-like HTML source:
     ```text
     DemoShowcasePage
     ├── DemoGallery
     │   ├── GalleryHeading
     │   ├── DemoPanel[]
     │   │   ├── SplittingText
     │   │   └── DemoThumbnail
     │   └── GalleryFooter
     ├── ScrollInputAdapter
     ├── MotionController
     ├── PreviewFrame
     ├── CustomCursor
     ├── Loader
     └── SocialLinks
     ```
     The repeated `.panel` markup becomes `DemoPanel[]`; image modifier classes become thumbnail variants; `data-splitting` becomes a typography/effect contract; scroll smoothing and velocity formulas belong to `ScrollInputAdapter` or `MotionController`; iframe and close behavior belong to `PreviewFrame` and its controller.

12. **Design tokens**
   - Extract color, typography, spacing, border, layer, depth, and motion tokens.
   - Explain each token as a design contract, not just a value list.
   - Start token extraction from `component-contracts.json` component summaries, evidence refs, patterns, and `reference-index.json` selector/evidence lookup. Consult `reference-graph.json` only for raw token evidence, original token nodes, or source locations that are not represented compactly.
   - Include CSS custom properties, keyframe names, transition timings, responsive breakpoints, image/filter variants, blend modes, z-index layers, and motion tokens such as `scrollLerp`, `velocityLerp`, `perspective`, `duration`, `easing`, `zGap`, `loopSize`, and `exitTiming` when relevant.
   - Include a motion token table when motion exists: token/source name, value or formula, owner, trigger, affected CSS/JS properties, and reduced-motion or fallback behavior.

13. **Design system structure**
   - Recommend sections for an interactive design-system page:
     `Original Reference`, `Components`, `Fonts and Styles`, `Motion`, and `Implementation Contract`.
   - Preserve this top-level order in rendered demos: original reference first, each extracted component second, typography/color/style tokens third.
   - Put the reference's primary interaction at the top when it is the main value of the reference.
   - Keep explanatory sections tied to extracted components and tokens.

14. **Demo architecture**
   - Recommend a small, portable file structure:
     ```text
     componentName/
     ├── index.html
     ├── styles.css
     └── script.js
     ```
   - Note framework-specific alternatives only when the target repo requires them.
   - Separate source analysis from implementation tasks; if the user asks to build, proceed with normal implementation after analysis.
   - Keep HTML, CSS, and JS separable enough that each extracted component can be traced back to its markup contract, styling contract, and behavior contract.
   - For interactive references with available JS, prefer a runtime-first demo structure:
     ```text
     design-system/
     ├── index.html                  # overview and token map
     ├── styles.css                  # overview-only styling
     ├── script.js                   # overview-only orchestration
     └── runtime/
         ├── shared-runtime.js       # optional probe/diagnostic helpers only
         ├── original.html           # full authorized archived reference shell
         └── component-name.html     # isolated original DOM fragment + original CSS/JS chain
     ```
   - In `source-mirror-assisted` mode, runtime specimen pages must preserve the original dependency order from archived source. They may add harness CSS or probe JS only after the original runtime has loaded, and those additions must not replace source-owned listeners, timers, observers, library calls, or class/style mutations.
   - If isolating a fragment breaks original selectors because the source JS expects page-level ancestors such as `#wrap`, `.main`, `#contain`, `.content_wrapper`, `.section`, or specific sibling components, include the minimum source-owned wrapper shell required by the original JS instead of rewriting selectors.
   - In `source-mirror-assisted` mode, if a Next.js/App Router mirror hydrates incorrectly when served from a nested path, serve the archived original shell at `/` on a second local origin and embed that origin in the overview. Use [reference/nextjs-original-source-mirror.md](reference/nextjs-original-source-mirror.md).

15. **Rendered HTML design-system demo**
   - Run this step only when the user asks to build, render, preview, or show the design system by URL.
   - Create a portable static demo first unless the target repository already requires a framework. Use the `index.html`, `styles.css`, and `script.js` structure from the demo architecture.
   - Place the primary interaction in the first viewport, not behind a landing page. Surround it with practical design-system sections that expose the extracted components, tokens, motion formulas, and implementation contract.
   - Apply the `frontend-design` plan to the demo: make one reference-specific visual thesis, choose a restrained token system, avoid generic template palettes, and keep explanatory content tied to the analyzed source.
   - In `source-mirror-assisted` mode, do not recreate source-owned mechanics first. Mount component specimens inside an original-runtime harness that loads archived CSS, runtime libraries, and page scripts in source order, then verify that original listeners/controllers/mutations operate on preserved source DOM hooks. In `behavior-only`, use documented clean-room substitutions.
   - Recreate core mechanics with the smallest faithful implementation only for documented substitutions: archive-derived state variables in `source-mirror-assisted` mode, or observed behavior in `behavior-only` mode.
   - In `source-mirror-assisted` mode, render an actual UI specimen for every final reusable component with source-backed markup, mapped CSS, required JS state/event behavior, assets, variants, and representative states. In `behavior-only`, label specimens as clean-room substitutions, not source-backed reusable components.
   - Keep raw `data-component` or graph candidate inventories in a separate reference section. The main component section must show regrouped reusable UI system units, each with markup, CSS, JS, state, asset, and runtime evidence.
   - Non-visual controllers need an executable harness or trace specimen showing the source input, state change, target mutation, and affected visual component.
   - Use local/generated assets when remote assets are blocked or unstable, but preserve the source's rendering contract and document any substitution.
   - Start a local static server when needed and provide the working URL. If a port is occupied, choose another local port.

16. **Analysis-time runtime probe and parity check plan**
   - When the reference can be rendered or opened, run a lightweight runtime probe even if the user only asked for analysis. Prefer browser automation or the in-app browser when available.
   - Probe for console errors, missing assets, active animation names, computed transforms, transition durations, class/style mutations after scroll/pointer/touch/keyboard input, observer-driven state changes, and responsive differences across at least desktop and mobile widths when feasible.
   - If runtime probing is blocked by missing source, network, sandboxing, credentials, or tool limits, state the blocker explicitly and continue from static source analysis.
   - Define what must be compared against the reference:
     scroll feel, easing, velocity response, layer depth, item visibility, responsive framing, asset rendering, console errors, and section transitions.
   - Include HTML/CSS/JS parity checks: DOM shape, selector contracts, computed styles, modifier classes, responsive layout, event listeners, state transitions, generated transforms, animation/keyframe behavior, and external embeds/assets.
   - Include concrete verification methods, for example DOM checks, computed-style snapshots, browser screenshots, event simulation, or frame-by-frame state sampling.
   - Analysis-only output still needs a parity checklist. Rendered demo output needs the checklist plus the actual verification performed.

17. **Rendered demo verification**
   - Run this step when step 15 produced a rendered demo.
   - Verify the local URL loads with successful HTTP status and no missing local assets.
   - Use browser automation or the in-app browser when available to check desktop and mobile viewports, screenshots, console errors, scroll/input behavior, state changes, responsive framing, and text overlap.
   - Verify representative component specimens individually, not only the full page. In `source-mirror-assisted` mode, check source hooks, original SVG `viewBox`, wrappers and `data-*`, archived assets or substitutions, selector application, and JS-driven mutations. In `behavior-only`, verify the stated observation and substitution limits instead.
   - In `source-mirror-assisted` mode, verify original-runtime specimens load the archived CSS and JS dependency chain in source order, create expected library globals, and use original event listeners/controllers. Probe at least one source-owned state mutation per interactive specimen.
   - In `source-mirror-assisted` mode, verify a Next.js/RSC mirror is not `#__next_error__`, preserves route assumptions, loads chunks and styles, retains source hooks, and resolves query-based assets through the local manifest server.
   - For SVG specimens, verify internal selector contracts such as `.text path`, `.line path`, masks, clips, grouped paths, and animation-specific selectors separately. Do not accept a single generic SVG style when the source has group-specific rules.
   - If browser automation is blocked by sandboxing, request the narrow approval needed to launch the server or browser. If it still cannot run, state exactly which verification could not be completed.
   - Inspect screenshots before claiming completion. Patch visible issues such as sticky clipping, hidden controls, blank canvases, overlapping labels, or text that does not fit.
   - Keep the local server running if the user asked for a URL, and include the URL in the final response.

18. **Final rendered design-system handoff**
   - Make this the final workflow step whenever the user asks to build, render, preview, or show the design system.
   - Confirm that the rendered page visibly contains, in order:
     1. Original reference: URL, authorized archive notes and source mirror when available, or behavior-only authority limits and observation evidence, plus the primary interaction.
     2. Components: one section per extracted component with its purpose, markup, CSS, JS behavior, states, variants, evidence refs, and required assets/libraries.
     3. Fonts and styles: typography, color, spacing, border/radius, elevation/layer, image treatment, responsive breakpoints, and motion/style tokens.
   - Keep the page focused on the actual design-system artifact, not a marketing landing page.
   - Serve the design-system page locally after verification and return the working local URL as the main handoff item.

## Output Format

When analysis is complete, provide:

```text
Reference summary
Evidence mode and authority basis
Original source archive
Archive verification status, snapshotId, static dependency closure, runtimeDiscovery coverage, and missing/blocked artifacts
Deterministic reference graph
Source artifact inventory
Source behavior map
CSS motion inventory
JS interaction inventory
Runtime behavior probes performed, or explicit blockers
Interaction mechanics
HTML/CSS/JS component contract map
Reusable components
Unresolved candidates
Substitutions
Static and runtime graph evidence map
GPU render-contract path/status, runtime checkpoint evidence, errors, and blockers
Promotion evidence and unresolved list
Extracted component list
Design token map
State and behavior ownership map
Recommended design-system structure
Recommended demo architecture
Parity check checklist
```

If a rendered demo was built, append:

```text
Rendered demo URL
Files created
Verification performed
Component specimen verification performed
Runtime reference graph
Known limitations or substitutions
```

Keep the answer implementation-ready: use actual variable names, formulas, source references, and component contracts wherever possible.

Before finalizing, run this omission check:
- If `source-mirror-assisted` mode lacks `source/archive-status.json` with `complete: true`, a snapshot ID, empty `missingDiscoveredArtifacts`, `runtimeDiscovery.status: "complete"`, empty `runtimeDiscovery.missing`, and no missing/blocked items, do not call the archive `source-complete` or the result `implementation-ready`.
- If a canvas/WebGL/WebGPU/Three/native GL/shader/render-target signal exists but `source/derived/render-contracts.json` is absent, mark the GPU contract unresolved.
- If WebGL/WebGL2 exists but `source/derived/gpu-runtime-status.json` is absent or is not `runtime-validated`, keep the GPU contract unresolved. If pre-page probe injection is unavailable, or WebGPU is detected, record the producer gate as blocked rather than substituting static inference.
- If a shader sampler/channel is not traced to an output consumer, mark it unresolved; for example, do not accept `bake2.b -> level0 -> bakedTone -> outgoingLight` with a missing link.
- If GPU work lacks a runtime checkpoint covering context, compile/link, FBO completeness, pass bindings/order, errors, and a matched visual state, do not call it `implementation-ready`.
- If HTML/CSS/JS source files exist and `source/derived/reference-graph.json` was not generated, explain why the deterministic extractor could not run and mark graph-backed contracts incomplete.
- If `source-mirror-assisted` mode lacks verified original source in `source/original/`, explain the missing or blocked classes and mark all source-backed contracts incomplete. In `behavior-only`, state the authority blocker and do not call any contract source-backed or complete.
- If `source/derived/component-contracts.json` exists, the final analysis must start from its summary fields, `componentTree`, selected `components`, `evidenceRefs`, centralized `evidence`, and `patterns`, then use `source/derived/reference-index.json` for DOM hierarchy, selector lookup, and compact evidence lookup.
- If compact outputs leave evidence unresolved, or extractor/debugging work is needed, consult `source/derived/reference-graph.json` selectively for raw `nodes`, `edges`, `inventories`, and `coverage` evidence. Do not ignore unresolved raw graph evidence, but do not make raw graph traversal the default reading path.
- If CSS artifacts exist, `CSS motion inventory` must not be absent. If no animations, transitions, keyframes, transforms, filters, or visual effects exist, say that explicitly with the inspected files.
- If JS artifacts exist, `JS interaction inventory` must not be absent. If no event listeners, observers, timers, render loops, DOM mutations, or external APIs exist, say that explicitly with the inspected files.
- If external libraries exist, list each library and either map it to behavior ownership or mark it as unused/unresolved with evidence.
- If any component has markup but related CSS or JS contracts are unknown, mark the component contract incomplete rather than presenting it as implementation-ready.
- If a component lacks parser-backed analysis, require explicit manual source inspection plus runtime checkpoints; do not promote it unless `promotionEvidence` records those refs and `unresolved` is empty.
- If source-owned hooks, `data-*` attributes, CSS state selectors, or animation selectors imply JS behavior, the final analysis must trace the related selector/alias/event/controller/state/mutation edges. If those edges are absent, continue runtime/source dependency tracing or mark the candidate unresolved.
- If the reference can be rendered but neither `source/derived/runtime-reference-graph.json` nor equivalent recorded runtime checkpoints exist, explain why and do not promote components as runtime-verified.
- If source JS exists and rendered specimens were built without loading the original JS runtime dependency chain, do not call them extracted reusable components. Mark them as substitutions or rebuild them as original-runtime specimens before final handoff.
- If original-runtime specimens are built, verify that source JS, source libraries, source wrappers, and source selectors are present in each specimen and that source-owned mutations occur after simulated load, scroll, pointer, touch, keyboard, or resize input.
- If original inline SVG, image, icon, video, canvas, or custom element resources are replaced, include a `Substitutions` entry with `original`, `replacement`, `reason`, and `preservedContract`.
- In `source-mirror-assisted` mode, verify rendered specimens for source root hooks, wrapper/inner markup, attributes, SVG `viewBox`, selector application, JS-driven mutations, and archived assets or substitutions. In `behavior-only`, verify observation/substitution claims and never promote a specimen as source-backed.
