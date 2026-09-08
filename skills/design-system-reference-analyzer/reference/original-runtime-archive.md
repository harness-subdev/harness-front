# Original Runtime Archive Contract

Use this contract when publicly served runtime artifacts are authorized for capture. It preserves an exact production-runtime archive for repeatable analysis; it does not recover an author's repository or original authoring files.

## Layout and manifest

Keep unmodified response bytes in `source/original/`. Put generated decompilation, normalization, screenshots, and analysis in `source/derived/`; derived output must never replace an original artifact. Store the manifest at `source/source-manifest.json` and verifier result at `source/archive-status.json`.

Schema version 1 has non-empty `requiredArtifactClasses` and `artifacts`, `runtimeDiscovery`, and optional `blocked`. At least one verified `document` artifact is required. Each artifact requires:

- `artifactClass`
- exact absolute `originalUrl`
- safe relative `localPath` below `original/`
- byte count `bytes` and lowercase SHA-256 `sha256`; a verified document must contain non-empty bytes
- successful full HTTP response `status` and `contentType`; `206 Partial Content` is rejected because schema v1 has no range-assembly model
- at least one non-empty, secret-free `discovery` or `referrer`
- bounded identifier `retrievalMethod` describing the capture mechanism, never a URL, header, token, or free-form secret-bearing text
- timestamp `capturedAt`

```json
{
  "schemaVersion": 1,
  "requiredArtifactClasses": ["document", "script"],
  "artifacts": [{
    "artifactClass": "document",
    "originalUrl": "https://reference.example/",
    "localPath": "original/index.html",
    "bytes": 4321,
    "sha256": "<64 lowercase hexadecimal characters>",
    "status": 200,
    "contentType": "text/html",
    "discovery": "entry-url",
    "retrievalMethod": "browser-response",
    "capturedAt": "2026-08-06T00:00:00.000Z"
  }, {
    "artifactClass": "script",
    "originalUrl": "https://reference.example/_next/static/app.js?dpl=abc",
    "localPath": "original/_next/static/app.js",
    "bytes": 1234,
    "sha256": "<64 lowercase hexadecimal characters>",
    "status": 200,
    "contentType": "application/javascript",
    "referrer": "https://reference.example/",
    "retrievalMethod": "browser-response",
    "capturedAt": "2026-08-06T00:00:01.000Z"
  }],
  "runtimeDiscovery": {
    "status": "complete",
    "method": "browser-network-log",
    "capturedAt": "2026-08-06T00:00:02.000Z",
    "observed": [{
      "artifactClass": "script",
      "originalUrl": "https://reference.example/_next/static/app.js?dpl=abc"
    }]
  },
  "blocked": []
}
```

`originalUrl` is an exact HTTP request identity, including its query string and excluding any fragment, which browsers do not send. Do not collapse a Next image URL, RSC request, or deployment-tagged chunk to its pathname. Apply the same credential, bearer/header, segmented-query, and sensitive-key checks to `discovery`, `referrer`, retrieval/runtime methods, runtime observations, and safe blocked metadata. Do not record credentials or values carrying tokens, passwords, authorization, API keys, signatures, or sessions; redact and recapture through a safe authorized mechanism instead.

## Static and runtime discovery

The verifier conservatively scans verified HTML documents in document order for external classic/module `<script src>`; stylesheet, manifest, icon, and preload links (including `imagesrcset` and track/fetch preloads); direct and `srcset` media (`img`, `source`, `video`, `audio`, posters, and tracks); image inputs; object/embed/iframe sources; SVG image `href`/`xlink:href`; meta refresh; and URLs/imports in `<style>` bodies and `style` attributes. Browser URL identity is preserved by decoding supported HTML character references, removing fragments from discovered request URLs, and applying the first valid real `<base href>` only to later document elements. Base-like text inside script/style/template content and dependencies inside scripting-enabled `noscript` content are ignored. A possible named reference the scanner cannot decode confidently makes the archive incomplete instead of treating its literal spelling as a request URL. Canonical classes are `script`, `module`, `document`, `style`, `image`, `font`, `audio`, `video`, and `data` (tracks and preload `as="fetch"`); an unknown object/source type uses `asset`. An extensionless, type-less `<source>` inherits `image`, `video`, or `audio` from its enclosing `picture`, `video`, or `audio` element and is recorded only once.

`script`, `module`, and `worker` are execution roles for the same JavaScript response family. One verified physical response may cover multiple retained role records for the same exact URL; duplicate URL bodies and non-JavaScript relabels remain invalid. Physical byte compatibility does not prove that a required execution role occurred: every required role still needs exact static or runtime role evidence.

Verified stylesheets are also scanned for `@import` and external `url()` dependencies. Imports use `style`; URLs inside `@font-face` use `font`; other URLs use their conservative type/extension class. An imported URL is not emitted a second time as a generic asset. HTML and CSS references resolve against the exact URL of the containing document or stylesheet. A dependency is covered only by a verified artifact with the same `artifactClass` and exact resolved URL, including query. `app.js?v=1` is not covered by `app.js`. Data URLs, blob URLs, and hash-only references are not external archive dependencies.

Source category is validated from MIME type, local extension, original URL pathname extension, and an unmistakable leading HTML signature before an artifact can become verified evidence. HTML/XHTML must use `document`, CSS must use `style`, JavaScript may use `script`, `module`, or `worker`, and WASM must use `wasm`. Contradictory signals or relabelled source—such as `index.html` captured to `capture.bin` as `asset`, or `payload.css` captured as `script`—make the archive incomplete. Opaque binary content with no source-category signal remains a legitimate `asset`. Error response bodies never satisfy dependency coverage, even when their bytes and hash match the manifest.

`runtimeDiscovery.status` is `complete` or `blocked`. Record a non-empty capture `method`, valid `capturedAt`, and every observed runtime request as an exact `originalUrl` plus `artifactClass`. `blocked`, absent, malformed, or incomplete runtime discovery makes the archive incomplete. Every observed entry must match a verified artifact by exact URL and class, and every external statically discovered dependency—including styles, media, fonts, and fetch preloads—must appear in runtime observation with the same URL and class. Statically unobserved entries are folded into runtime discovery `missing` coverage.

A genuinely static reference with no external dependency or runtime reference may use `status: "complete"`, `method: "not-applicable"`, and an empty `observed` array. Do not use `not-applicable` when HTML refers to any external artifact or when script, module, worker, or WASM artifacts exist.

## Verify and replay

Run the verifier after capture and before deriving analysis:

```bash
node scripts/verify-source-archive.mjs source
```

Optional second and third arguments select the manifest and status locations. The verifier re-reads the saved bytes, checks response/capture metadata, byte counts, and SHA-256, rejects unsafe local paths and duplicate exact URL/path mappings, and writes `archive-status.json` even when a safely processed manifest is incomplete. It never writes status under `source/original/`, when the manifest is unreadable, or when the requested output aliases the manifest or an archived artifact by path, symlink, or hard-link identity. Data preservation takes precedence over the incomplete-status guarantee.

The command exits nonzero unless `complete` is true. A complete status has a `snapshotId` calculated from sorted verified records, so reordering manifest entries does not change the replay identity. Status also exposes `discoveredDependencies`, `missingDiscoveredArtifacts`, runtime discovery `observed`/`missing` coverage, `unobservedStaticDependencies`, and the executable subset `unobservedStaticExecutables`; use those fields as the evidence for a `source-complete` claim.

Missing required classes and every item in `blocked` make the archive incomplete. Each blocked entry requires `artifactClass`, `reason`, and `capturedAt`; retain a URL or discovery/referrer only when it passes the same secret checks as captured artifacts. Unsafe blocker metadata is rejected rather than copied into status. Blocked entries are evidence of a known gap, not permission to call a restoration source-complete.

## Retention and scope

Retain only artifacts that you are authorized to capture, for the agreed purpose and period. Record licensing, access restrictions, attribution, and deletion/retention decisions with the work. Do not redistribute protected assets merely because they were archived for analysis.

A served production bundle is evidence of one deployed runtime. It is not the author's source, build history, private assets, or semantic intent. Minified bundles and later decompilation belong to `source/derived/` and must remain labelled as derived evidence. For Next.js-specific capture, routing, and mirror behavior, use [the Next.js original-source-mirror addendum](nextjs-original-source-mirror.md).
