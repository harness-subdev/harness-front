# Evidence and capture protocol

Use this reference for URL, recording, screenshot, network, bundle, and public
asset analysis. The goal is a repeatable observation record, not a pile of
unattributed screenshots.

## Preflight

Confirm or record the best available answer:

| Question | Why it matters |
| --- | --- |
| Is the target publicly accessible without login or circumvention? | Defines the safe research boundary. |
| Analysis, specification, POC, or audit? | Prevents unrequested implementation. |
| Exact sequence boundary? | Avoids recreating an entire site when only one transition matters. |
| Required viewports and input types? | Responsive and touch behavior can use different constants. |
| Are rights confirmed and separate approval given for temporary production-asset hotlinks? | Changes fidelity, licensing risk, and failure behavior. |
| Where do raw captures and the deliverable live? | Keeps research artifacts out of shipped code. |

If access is denied, rate-limited, policy-blocked, or protected, stop that
inspection path. Do not substitute another browser, protocol, account, or raw
request to obtain the same blocked result.

## Capture matrix

Use exact viewport pixels, not broad labels such as “desktop.” Start with the
user's targets; otherwise a practical baseline is:

- desktop: `1280 x 720`;
- mobile portrait: `390 x 844`;
- reduced motion at one representative viewport.

For each viewport capture these states when applicable:

| State | What to record |
| --- | --- |
| Initial loading | overlay color, DOM availability, network failures |
| Top settled | typography, fixed layers, visual-surface bounds, initial state |
| Reveal midpoint | normalized time/progress, visible bounds and scale |
| Reveal complete | duration and easing clues |
| Scroll segment start | trigger geometry and visual ownership |
| Segment midpoint(s) | direction, depth, fog, opacity, parallax |
| Segment end | fade boundary and downstream handoff |
| Pointer/touch | coordinate mapping, radius, lag, device differences |
| Resize/orientation | breakpoint and camera/plane response |
| Reduced motion | smooth-scroll/video/frame-loop suppression, static state |
| Failure | optional-asset fallback versus fatal visual-runtime behavior |

Record the page's own scroll coordinates and a normalized progress estimate.
For a segment from `start` to `end`:

```text
progress = clamp((scrollY - start) / (end - start), 0, 1)
```

Do not assume the production code uses that exact expression; it is a stable
measurement coordinate for comparisons.

## Browser evidence pass: clean, uninstrumented run

Prefer a real browser automation surface for JavaScript and WebGL pages.

1. Navigate to the public target and wait for DOM content.
2. Allow a bounded settling interval for fonts, initial media, and reveal.
3. Capture a DOM/accessibility snapshot and screenshot.
4. Record console errors and failed public requests.
5. Move to each scroll checkpoint and capture again.
6. Exercise pointer and touch paths without changing the DOM layout.
7. Repeat at the mobile viewport and with reduced motion.

Treat this existing browser evidence pass as the clean, uninstrumented run. If
the GPU evidence companion gate applies, record distinct run IDs: a clean run
ID and a distinct instrumented run ID. Each instrumented checkpoint must include an
`externalVisualRef` to the clean capture and match viewport, DPR, state/progress,
input, reduced motion, asset state, frame/time, camera, and color settings.
Keep nondeterminism unresolved with a stated tolerance rather than treating a
nearest-looking frame as a match.

Do not infer scene structure from screenshots alone when DOM/network evidence is
available. Conversely, do not trust a preload or bundle reference as proof that
an asset is visible.

## Layer ownership checklist

Identify which layer owns each visible element:

- semantic DOM text and controls;
- fixed DOM overlays and loading/fatal fallbacks;
- layout-only trigger sections and scroll runway;
- primary canvas, video, image, or CSS visual surface;
- clipping/mask layer when evidence supports one;
- optional offscreen producer or secondary scene;
- optional sampled/composite layer;
- post-processing or CSS compositing when present.

Useful observations include canvas position and size, DOM z-index, whether text
remains selectable, whether pointer events reach the document, and whether a
visual object changes while DOM geometry remains fixed.

## Evidence ledger

Use one row per claim:

| ID | Claim | Class | Evidence | Location/checkpoint | Confidence | Open test |
| --- | --- | --- | --- | --- | --- | --- |
| E-01 | Canvas is fixed beneath DOM copy | observed | DOM snapshot + scroll capture | desktop top/mid | high | — |
| E-02 | Media plane uses a 16:9 source ratio | extracted | public CMS response metadata | asset URL | high | compare decoded dimensions |
| E-03 | Inner visual offset responds to progress delta | inferred | direction reverses on reverse scroll | mid-scene | medium | repeat at slow/fast input |
| E-04 | Optional motion media falls back to a still poster | chosen | local failure requirement | POC | explicit | inject failure |

Classes:

- `observed`: directly repeated in the live output or browser state;
- `extracted`: present as data/configuration in a publicly delivered resource;
- `inferred`: best explanation supported by multiple observations;
- `chosen`: a clean implementation decision for an unobservable gap.

Confidence is about evidence strength, not how plausible a claim sounds.

## Network and asset manifest

Record only requests relevant to the selected interaction:

```json
{
  "id": "video-0",
  "url": "https://public.example/media.mp4",
  "kind": "video",
  "width": 1280,
  "height": 720,
  "role": "moving visual layer",
  "compression": null,
  "cors": "public response allows browser use",
  "failure_fallback": "project-owned still poster",
  "evidence_class": "extracted",
  "replacement_required": true
}
```

For videos record decoded or response metadata rather than assuming all video
is 16:9. For KTX2 and GLB record dimensions/extensions/decoder dependencies.
For fonts record family/weight roles without copying unnecessary files.

## Public bundle inspection — assisted track only

Enter this section only when the user explicitly selected or approved the
public-artifact-assisted track. Bundle inspection is supporting evidence, not a
license to recover source.

1. If saved research artifacts and downloads were explicitly authorized, retain
   only browser-delivered public chunks needed for the selected sequence.
   Otherwise inspect only user-supplied or transient tool evidence without
   creating workspace files.
2. Search with distinctive known needles first: asset filenames, visible labels,
   trigger IDs, uniform names, or rare numeric constants.
3. Use bounded context excerpts. Minified one-line bundles can overwhelm both
   tools and model context.
4. Extract configuration facts and module relationships, not component bodies.
5. Record file, byte/character index, needle, excerpt, and evidence class.
6. Correlate every important extracted value with observable behavior.

Recommended command:

```bash
node scripts/scan-bundle.mjs \
  --needle "model.glb" \
  --needle "barrelMultiplier" \
  --context 500 \
  public-chunk.js
```

Do not brute-force guessed routes, unpack private source maps, defeat
obfuscation, or copy minified implementation code into the POC.

## Public GLB inspection

Use metadata to understand topology and dependencies before loading a model:

```bash
node scripts/inspect-glb.mjs public-model.glb
```

Look for:

- required and used extensions, especially Draco and WebP;
- scene, node, mesh, and primitive relationships;
- material names and texture slots;
- POSITION accessor min/max bounds;
- embedded versus external images;
- whether multiple model variants are merely preloaded or visibly mounted.

Metadata does not prove runtime scale, placement, lighting, or visibility. Those
come from browser observation or readable public configuration.

## Capture completion gate

The evidence pass is ready for specification when:

- every in-scope checkpoint has at least one capture;
- desktop/mobile differences are explicit;
- DOM and visual-surface ownership are separated;
- important assets have roles and source ratios;
- equations list confidence and endpoint behavior;
- unknowns have a minimal experiment or a documented chosen approximation;
- raw research artifacts are outside the deliverable.
