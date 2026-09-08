# Next.js Original Source Mirror Process

Use this reference in authorized `source-mirror-assisted` mode when a design reference is a Next.js, App Router, RSC, Turbopack, Vercel, or similarly bundled runtime site. Archive the exact served runtime and dependency chain before analysis. The goal is an executable production-runtime mirror, not author source, a screenshot, or a hand-built approximation.

## Contents

- [When This Applies](#when-this-applies)
- [Required Output Shape](#required-output-shape)
- [Source Fetch Process](#source-fetch-process)
- [Graph and Analysis Process](#graph-and-analysis-process)
- [Optional Derived JS Decompilation with webcrack](#optional-derived-js-decompilation-with-webcrack)
- [Manifest-Aware Mirror Server](#manifest-aware-mirror-server)
- [Verification](#verification)
- [Component Extraction Rules for Next.js Mirrors](#component-extraction-rules-for-nextjs-mirrors)
- [Podium Case Study Stack](#podium-case-study-stack)

## When This Applies

Use this process when any of these appear in fetched HTML or runtime traffic:

- `/_next/static/chunks/...` scripts or styles, especially with deployment query strings such as `?dpl=...`
- `self.__next_f.push(...)`, RSC payloads, `?_rsc=...`, or App Router prefetch requests
- `/_next/image?url=...&w=...&q=...` optimized media URLs
- Hydration rewrites, `#__next_error__`, or route-sensitive runtime behavior
- Runtime-owned canvas, WebGL, video, model, texture, worker, or WASM assets
- Source behavior owned by bundled controllers such as scroll, pointer, animation, or page-transition providers

## Required Output Shape

Keep two things separate:

```text
source/
  source-manifest.json               # exact URL -> original/* mapping
  archive-status.json                # verifier result and snapshot ID
  original/
    index.html                       # raw fetched HTML, unmodified
    _next/                           # raw chunks/styles/assets
    projects/                        # raw RSC payloads when captured
  derived/
    reference-graph.json
    reference-index.json
    component-contracts.json
    runtime-reference-graph.json
    gpu-runtime-trace.json            # pre-page WebGL/WebGL2 evidence
    gpu-runtime-status.json           # bounded trace verifier result
    render-contracts.json            # when GPU signals exist
    webcrack/                        # optional analysis copies, never runtime source

outputs/<design-system>/
  index.html                         # design-system overview
  runtime/original.html              # copied raw source shell for mirror serving
```

If the source site expects to run at `/`, serve the original mirror on a separate local origin:

```text
http://127.0.0.1:<overview-port>/     # design-system overview
http://127.0.0.1:<mirror-port>/       # original source mirror at route /
```

Do not put route-sensitive Next.js mirrors at `/runtime/original.html` as the only execution path. Many App Router builds interpret that path as an application route and hydrate into `#__next_error__`.

## Source Fetch Process

1. Fetch the reference HTML into `source/original/index.html` without beautifying or rewriting it. This happens before screenshots, component extraction, or local recreation.
2. Discover linked CSS, JS, icons, images, fonts, preload assets, and source-map-adjacent chunks from the HTML.
3. Fetch every authorized retrievable artifact into `source/original/` and record its exact `originalUrl`, `localPath` beginning with `original/`, content metadata, byte count, SHA-256, discovery/referrer, retrieval method, and capture time in `source/source-manifest.json`.
4. Preserve query strings in the manifest lookup. For Next.js, path-only mapping is insufficient because `/_next/image` and deployment-tagged chunks depend on the full request URL.
5. Capture runtime-discovered assets from browser probing, not just static HTML, and update manifest `runtimeDiscovery` coverage. Common misses:
   - `/_next/image?url=...&w=...&q=...` widths not chosen during static source fetch
   - `?_rsc=...` project or route payloads
   - `/models/*.glb`, `/textures/*.ktx2`, `/draco/*.js`, `/draco/*.wasm`
   - `/images/*.svg`, arrow/icon PNGs, Mux thumbnails or poster assets
6. Run `node <SKILL_DIR>/scripts/verify-source-archive.mjs <TASK_WORK_DIR>/source`. Do not call the mirror source-complete unless `source/archive-status.json` has `complete: true`, empty `missingDiscoveredArtifacts`, complete runtime discovery with an empty `missing` list, no missing/blocked items, and a snapshot ID.
7. Copy the raw HTML shell to `outputs/<design-system>/runtime/original.html`. The copy is for serving; the source of truth remains `source/original/index.html`.

## Graph and Analysis Process

Run the deterministic extractor after the original source fetch:

```bash
node <SKILL_DIR>/scripts/extract-reference-graph.mjs \
  <TASK_WORK_DIR>/source/original \
  <TASK_WORK_DIR>/source/derived/reference-graph.json

node <SKILL_DIR>/scripts/extract-reference-index.mjs \
  <TASK_WORK_DIR>/source/derived/reference-graph.json \
  <TASK_WORK_DIR>/source/derived/reference-index.json

node <SKILL_DIR>/scripts/extract-component-contracts.mjs \
  <TASK_WORK_DIR>/source/derived/reference-graph.json \
  <TASK_WORK_DIR>/source/derived/component-contracts.json \
  <TASK_WORK_DIR>/source/derived/reference-index.json
```

Normalize or rename fetched chunk files only in a derived folder such as `source/derived/normalized/`. Do not replace files under `source/original/`.

## Optional Derived JS Decompilation with webcrack

When the fetched runtime includes minified or packed Next.js/Turbopack chunks, add a derived decompilation pass after archive verification and deterministic graph extraction. This pass is for analysis only. It must not replace `source/original/index.html`, `source/original/_next/static/chunks/*`, the mirror runtime, or any archived original.

Run `webcrack` into a derived folder:

```bash
mkdir -p <TASK_WORK_DIR>/source/derived/webcrack

npx webcrack@latest \
  <TASK_WORK_DIR>/source/original/_next/static/chunks/<chunk>.js \
  -o <TASK_WORK_DIR>/source/derived/webcrack/<chunk> \
  --force
```

Record the derived files in a separate manifest such as `source/derived/webcrack/webcrack-manifest.json` with `sourceChunk`, `outputPath`, `tool`, `toolVersion`, `status`, and `generatedAt`. Keep this manifest out of `source/source-manifest.json`, which is reserved for fetched original artifacts.

Use `webcrack` output as JavaScript evidence for component extraction:

- exported symbols from Turbopack export calls such as `t.s([...])`
- JSX-bearing functions and their props
- imports or module references used by those functions
- animation constants, motion variants, state hooks, provider hooks, and asset helper calls
- links between component functions and rendered DOM class names or asset paths

Turbopack output may remain wrapped in `globalThis.TURBOPACK.push(...)` rather than becoming a clean source tree. In that case, parse the deobfuscated wrapper for module IDs, export declarations, JSX functions, and dependency calls. Do not present this as recovered original source; label it as derived decompiled evidence.

## Manifest-Aware Mirror Server

The mirror server must resolve requests in this order:

1. If running mirror mode and request path is `/`, return `outputs/<design-system>/runtime/original.html`.
2. Exact `pathname + search` match from `source/source-manifest.json`, resolved to its `original/*` local path.
3. For a request with no query string, allow a path-only match only when that path has one queryless manifest entry and no query-bearing variants. Never use a path match for a request that carries search parameters.
4. For `/_next/image`, require the exact decoded `url`, `w`, `q`, and any other query parameters. If that exact response was not captured, return `404`, record the missed URL for the next source-fetch pass, and mark the checkpoint partial. Never substitute another width or quality as a verified mirror response.
5. Apply the same exact-identity rule to static chunks, source-owned public assets, and RSC payloads. A missing deployment tag, media variant, or `?_rsc=...` value is a missing capture, not a fallback candidate.
6. Otherwise return `404`, record the exact missed URL for the next source-fetch pass, and mark the affected checkpoint partial.

Use a second local port for the mirror when the original framework expects root routing:

```text
overview server: 127.0.0.1:4173
mirror server:   127.0.0.1:4174 with MIRROR_ROOT=1
```

The overview page may embed the mirror in an iframe, but it should also include an "open full mirror" link.

## Verification

Verify the overview and the original mirror separately.

For the overview:

- HTTP `200` for `/`, CSS, JS, local assets
- desktop and mobile screenshots
- no horizontal overflow
- source-backed specimens and documented substitutions exist
- component interactions mutate expected state

For the original mirror:

- page title matches the source title
- document is not hydrated into `#__next_error__`
- source-owned roots exist, such as `#global-canvas`, `#mobile-menu`, `header`, `canvas`, or project list hooks
- stylesheet count and Next chunk count are nonzero and match runtime expectations
- source-owned canvas/video/model/texture assets load or any misses are documented
- console warnings from upstream libraries are separated from true mirror failures
- route prefetch and RSC requests either return fetched payloads or are explicitly listed as partial mirror gaps

When verifying cross-port iframes, use browser automation frame APIs instead of `iframe.contentDocument`; same-origin access will fail across ports even on `127.0.0.1`.

## Component Extraction Rules for Next.js Mirrors

- Treat React component names found in RSC payloads, such as `GlobalCanvas`, `MobileMenu`, `Header`, `SmoothScroll`, `PointerTracker`, or `PreloaderProvider`, as evidence, not final design-system components by themselves.
- Treat `webcrack` names and inferred function boundaries as derived evidence. They can explain props and behavior, but they do not override raw source or runtime verification.
- Confirm reusable components only after linking rendered DOM hooks, CSS selectors, JS/runtime ownership, required assets, and verified browser behavior.
- If the original runtime owns a behavior and the design-system specimen uses local harness code instead, mark it as a structured `substitution`.
- A screenshot can be evidence, a stable preview, or a fallback. It must not be the source of analysis when the original runtime can be fetched and mirrored.

## Podium Case Study Stack

The Podium reference used this stack and process:

- Next.js App Router/RSC HTML with `self.__next_f.push(...)`
- Turbopack/Next chunk chain under `/_next/static/chunks`
- Next image optimizer requests under `/_next/image`
- Futura and Univers font assets
- Three.js `GlobalCanvas` with GLB, KTX2, and Draco runtime assets
- Smooth scrolling and input controllers exposed through `SmoothScroll`, `PointerTracker`, and menu state components
- Mux/DatoCMS media URLs and route-level project RSC payloads
- Two local servers: `4173` for the design-system overview and `4174` for the original root-path mirror

The critical correction was that serving the source shell only at `/runtime/original.html` caused Next.js to hydrate as an app route and produce `#__next_error__`. Serving the fetched source at mirror root `/` on a second local origin preserved the original runtime path assumptions.
