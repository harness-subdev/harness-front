# Reconstruction Contracts

## Contents

1. [Identity rules](#identity-rules)
2. [Project and oracle](#project-and-oracle)
3. [React architecture](#react-architecture)
4. [Component map and promotion](#component-map-and-promotion)
5. [Desktop signature receipt](#desktop-signature-receipt)
6. [Receipts](#receipts)
7. [Rights and catalog](#rights-and-catalog)
8. [Staleness](#staleness)

Project, Oracle, promotion, parity, reuse, distribution, rights, and catalog records remain `schemaVersion: 1`. The component map, desktop signature receipt, and structured GPU status use `schemaVersion: 2`. Paths are target-relative unless a field explicitly names the external oracle root. IDs are unique within their declared scope. SHA-256 values are lowercase hexadecimal over exact file bytes.

Schema-v1 component maps are legacy read-only inputs. They may continue through `--stage oracle`, which does not read the component map. `--stage architecture` and every later stage stop with an explicit migration error. Migrate deliberately by rebuilding the approved `desktopSignature` policy from current evidence, changing only the component map to schema v2, reapproving its architecture binding, and then producing new schema-v2 signature/GPU receipts. Never infer v2 fields or preserve an old promotion claim silently.

## Identity rules

- Use a stable `projectId` that differs across real consuming projects.
- Use a namespaced component ID such as `ten-years-away/year-narrative`.
- Use semantic versioning for `componentVersion`.
- Define `interfaceFingerprint` from the normalized public TypeScript API.
- Define `implementationDigest` from the exact reusable package/source manifest.
- Define `assetMappingDigest` from the ordered research asset-ID mapping.
- List the exact files behind each digest as `interfaceFiles`, `implementationFiles`, and `assetMappingFiles`; the validator recomputes each file-set digest.
- Recompute receipt file hashes over exact JSON bytes, including the final newline.

## Project and oracle

`.reference-reconstruction/project.json`:

```json
{
  "schemaVersion": 1,
  "projectId": "ten-years-away-react",
  "oracleRoot": "../ten-years-away-reconstruction",
  "distributionRoots": ["src", "public/distribution"],
  "forbiddenDistributionText": ["ten.375.studio", "admin10.375.studio"]
}
```

`oracleRoot` may be absolute or target-relative. Each `distributionRoots` entry must remain inside the target. `forbiddenDistributionText` augments the validator defaults.
The canonical oracle and target roots must be physically separate and non-nested. `distributionRoots` must contain at least one entry; distribution validation additionally requires at least one scanned file and non-empty `forbiddenDistributionText`.

`.reference-reconstruction/oracle-lock.json`:

```json
{
  "schemaVersion": 1,
  "oracleId": "ten-years-away-m1-2026-08-10",
  "artifacts": [
    { "path": "evidence/route-matrix.json", "sha256": "<64 lowercase hex>" }
  ],
  "unresolved": [
    { "id": "unrelated-telemetry", "blocking": false, "requiredForScope": false }
  ]
}
```

Artifact paths are relative to `oracleRoot`. Every unresolved entry requires a unique ID and explicit booleans. Validation stops when either `blocking` or `requiredForScope` is true. List only artifacts needed by the approved reconstruction scope; record unrelated oracle gaps without silently claiming them resolved.

## React architecture

`.reference-reconstruction/react-architecture.md` is created only after the
Oracle stage passes. It follows the contract owned by
`react-reference-architecture` and begins in `draft` state. Explicit approval
changes the exact revision to `approved` and records its SHA-256. The file must
remain scrubbed of bundle bodies, minified identifiers, deployed implementation
structure, research-only assets, and Oracle imports.

The architecture defines the target stack, exact folder tree, Page/Section/proven
UI interfaces, content models, design tokens, responsive substitutions, state and
lifecycle ownership, motion/renderer seams, dependency budget, implementation
slices, parity checkpoints, and blocking uncertainty.

Every execution plan must cite the exact approved architecture path and hash. A
material change to folder structure, a public interface, state ownership,
renderer choice, dependency budget, or parity checkpoints returns the
architecture to `draft` and invalidates affected downstream approval.

## Component map and promotion

`.reference-reconstruction/component-map.json`:

```json
{
  "schemaVersion": 2,
  "architecture": {
    "path": ".reference-reconstruction/react-architecture.md",
    "sha256": "<64 lowercase hex>",
    "status": "approved"
  },
  "desktopSignature": {
    "status": "approved",
    "sha256": "<canonical-policy-digest>",
    "policy": {
      "route": "/",
      "viewport": { "width": 1280, "height": 720, "dpr": 1 },
      "exactFidelity": true,
      "forbiddenCompensation": [
      "css-overlay",
      "dom-overlay",
      "screenshot-overlay",
      "checkpoint-conditional"
      ],
      "checkpoints": [
      {
        "id": "desktop-top",
        "componentId": "ten-years-away/year-narrative",
        "claimId": "desktop-top",
        "capture": {
          "inputMode": "mouse",
          "state": "top-idle",
          "readiness": "fonts-assets-and-renderers-ready",
          "reducedMotion": false,
          "timeControl": "fixed-or-not-applicable",
          "randomnessControl": "seeded-or-not-applicable"
        },
        "surfaces": [
          {
            "id": "hero-fluid",
            "kind": "webgl2",
            "rootOwner": "src/effects/hero-fluid/HeroFluidCanvas.tsx",
            "implementationFiles": [
              "src/effects/hero-fluid/HeroFluidCanvas.tsx",
              "src/effects/hero-fluid/hero-fluid-runtime.ts"
            ],
            "gpuContract": {
              "context": { "api": "webgl2", "version": "WebGL 2.0" },
              "shaderCount": 4,
              "programCount": 3,
              "framebufferCount": 2,
              "passOrder": ["splat", "advection", "mask"],
              "textureCount": 2
            }
          }
        ],
        "comparison": {
          "method": "approved matched-frame method",
          "tolerance": "approved desktop-top tolerance",
          "metrics": [
            { "name": "pixel-difference", "maximum": 0.02, "unit": "ratio" }
          ]
        }
      }
      ]
    }
  },
  "components": [
    {
      "id": "ten-years-away/year-narrative",
      "publicCandidate": true,
      "evidenceClaims": ["desktop-top", "mobile-top", "next-year"],
      "unresolved": []
    }
  ]
}
```

The architecture binding is a workflow gate. Its hash is computed over exact
file bytes, including the final newline. The component map, approved execution
plan, and clean implementer packet must carry the same value. The plan and packet
also carry the approved `desktopSignature.sha256`; architecture validation checks
both approval bindings before planning begins.

`desktopSignature.status` is `approved`, and `sha256` is the recursively key-sorted JSON digest of `policy`. The policy is the mandatory first implementation gate and part of the approved architecture boundary. Its route begins with `/`; viewport width and height are positive integers and DPR is positive. Each checkpoint binds a current component claim and all six capture controls. Its ordered `surfaces` preserve identity, multiplicity, kind, root owner, and implementation file closure; the same surface ID cannot change definition across checkpoints. Three Oracle WebGL2 contexts therefore require three named `webgl2` surfaces. Allowed kinds are `dom`, `svg`, `canvas2d`, `webgl`, `webgl2`, and `webgpu`; exact fidelity always sets `exactFidelity: true`.

Comparison policy owns the method, human-readable tolerance, and non-negative metric maxima. A receipt may report only the corresponding observations. GPU contracts lock context API/version, exact resource counts, and exact pass order. WebGL/WebGL2 use `shaderCount`, `programCount`, `framebufferCount`, `textureCount`; WebGPU replaces program/framebuffer counts with `pipelineCount` and `attachmentCount`. Shader and program/pipeline counts are positive; attachment, framebuffer, and texture counts may be zero. `forbiddenCompensation` contains exactly the four values shown.

`.reference-reconstruction/promotion.json` contains every component-map ID exactly once:

```json
{
  "schemaVersion": 1,
  "components": [
    {
      "id": "ten-years-away/year-narrative",
      "implementationStage": "reconstructed",
      "parityStatus": "parity-verified",
      "reuseStatus": "unproven",
      "distributionStatus": "private-only",
      "claimSetDigest": "<digest>",
      "interfaceFiles": ["src/year-narrative/index.ts"],
      "interfaceFingerprint": "<digest>",
      "implementationFiles": ["src/year-narrative/year-narrative.tsx"],
      "implementationDigest": "<digest>",
      "assetMappingFiles": ["src/assets/research-assets.ts"],
      "assetMappingDigest": "<digest>",
      "parityReceipt": ".reference-reconstruction/receipts/parity/ten-years-away--year-narrative.json"
    }
  ]
}
```

Allowed axes:

- `implementationStage`: `candidate | reconstructed`
- `parityStatus`: `unverified | parity-verified | stale`
- `reuseStatus`: `unproven | reuse-proven | stale`
- `distributionStatus`: `private-only | distribution-validated | stale`

Promotion means `reconstructed` plus `parity-verified`. It does not imply reuse or distribution validation.
`claimSetDigest` is SHA-256 over the JSON encoding of the lexically sorted `evidenceClaims` array. Changing the planned claim set invalidates parity.

## Desktop signature receipt

Write `.reference-reconstruction/receipts/desktop-signature.json` before any broader implementation:

```json
{
  "schemaVersion": 2,
  "profile": "desktop-signature",
  "bindings": {
    "oracleLockSha256": "<digest>",
    "architectureSha256": "<digest>",
    "signaturePolicyDigest": "<digest>"
  },
  "route": "/",
  "viewport": { "width": 1280, "height": 720, "dpr": 1 },
  "checkpoints": [
    {
      "id": "desktop-top",
      "capture": {
        "inputMode": "mouse",
        "state": "top-idle",
        "readiness": "fonts-assets-and-renderers-ready",
        "reducedMotion": false,
        "timeControl": "fixed-or-not-applicable",
        "randomnessControl": "seeded-or-not-applicable"
      },
      "surfaces": [
        {
          "id": "hero-fluid",
          "kind": "webgl2",
          "rootOwner": "src/effects/hero-fluid/HeroFluidCanvas.tsx",
          "implementationFiles": [
            "src/effects/hero-fluid/HeroFluidCanvas.tsx",
            "src/effects/hero-fluid/hero-fluid-runtime.ts"
          ],
          "implementationDigest": "<digest>",
          "gpuStatus": {
            "path": "evidence/signature/hero-fluid-gpu-status.json",
            "sha256": "<digest>"
          }
        }
      ],
      "comparison": {
        "method": "approved matched-frame method",
        "metrics": [{ "name": "pixel-difference", "observed": 0.01, "unit": "ratio" }],
        "referenceOutputs": [{ "path": "evidence/signature/reference.png", "sha256": "<digest>" }],
        "targetOutputs": [{ "path": "evidence/signature/target.png", "sha256": "<digest>" }],
        "evidenceOutputs": [{ "path": "evidence/signature/comparison.json", "sha256": "<digest>" }]
      },
      "compensationObserved": []
    }
  ]
}
```

`signaturePolicyDigest` equals the approved `desktopSignature.sha256`: SHA-256 over recursively key-sorted JSON for the entire validated `desktopSignature.policy` object. It therefore becomes stale if any approved checkpoint capture control, surface identity/count/order/kind/owner/file closure, GPU contract, comparison method/tolerance, or metric maximum changes. The receipt checkpoint IDs and ordered surface IDs must exactly match the policy. It repeats only locked identity fields and adds observations: implementation digest, metric values, output hashes, structured GPU status binding, and `compensationObserved`.

Reference, target, and comparison outputs are target-relative and hash-bound. The validator canonicalizes them with `realpath`, rejects duplicate physical files within a list, and rejects a reference/target pair that resolves to the same physical file or symlink alias. Every receipt metric must match the policy ID/order/unit; its non-negative observed value must not exceed the policy maximum. The receipt cannot add or replace a tolerance.

GPU surfaces require a `gpuStatus` binding; DOM, SVG, and Canvas2D must omit it. A WebGL/WebGL2 status file has this schema:

```json
{
  "schemaVersion": 2,
  "checkpointId": "desktop-top",
  "surfaceId": "hero-fluid",
  "context": { "api": "webgl2", "version": "WebGL 2.0" },
  "shaders": [
    { "id": "hero-vertex", "compiled": true },
    { "id": "hero-fragment", "compiled": true }
  ],
  "programs": [{ "id": "hero-program", "linked": true }],
  "framebuffers": [
    { "id": "fluid-a", "status": "FRAMEBUFFER_COMPLETE" },
    { "id": "fluid-b", "status": "FRAMEBUFFER_COMPLETE" }
  ],
  "passOrder": ["splat", "advection", "mask"],
  "textures": [
    { "id": "fluid-a-texture", "ready": true },
    { "id": "fluid-b-texture", "ready": true }
  ],
  "draws": 5802,
  "errors": []
}
```

The validator parses this JSON and matches checkpoint/surface ID, context API/version, exact counts, every compile/link/completeness/readiness result, exact pass order, positive draw count, and zero errors. WebGPU status replaces `programs`/`framebuffers` with `{id, ready}` `pipelines` and `{id, complete}` `attachments`. Evidence-kind strings, screenshots, or a generic “GPU complete” flag are insufficient.

The validator rejects GPU-to-Canvas2D/DOM/SVG substitution, any unresolved item on a signature component, and any non-empty `compensationObserved`. This is a binding and structured-status check, not proof that an undisclosed overlay is absent or that captured metric values are truthful; matched review must inspect the running result and comparison evidence.

## Receipts

Parity receipt at `.reference-reconstruction/receipts/parity/<component>.json`:

```json
{
  "schemaVersion": 1,
  "componentId": "ten-years-away/year-narrative",
  "profile": "research-parity",
  "bindings": {
    "oracleLockSha256": "<digest>",
    "interfaceFingerprint": "<digest>",
    "implementationDigest": "<digest>",
    "assetMappingDigest": "<digest>",
    "claimSetDigest": "<digest>"
  },
  "claims": {
    "passed": ["desktop-top", "mobile-top", "next-year"],
    "failed": [],
    "blocked": [],
    "notApplicable": []
  },
  "outputs": [
    { "path": "evidence/parity/year-narrative-desktop-top.png", "sha256": "<digest>" }
  ]
}
```

Every planned component evidence claim must appear in `passed`. The union of all four receipt arrays must equal the exact planned claim set, `passed` must be non-empty, and a verified receipt has no failed, blocked, or component-unresolved claims. Exclude non-applicable checks from the component's planned `evidenceClaims` rather than using `notApplicable` to bypass them.

When `reuseStatus` is `reuse-proven`, add `reuseReceipt` to the promotion entry and write:

```json
{
  "schemaVersion": 1,
  "componentId": "ten-years-away/year-narrative",
  "sourceProjectId": "ten-years-away-react",
  "consumerProjectId": "another-real-project",
  "consumerProjectRoot": "../../another-real-project",
  "consumerFiles": ["src/integrations/ten-year-narrative.tsx"],
  "interfaceFingerprint": "<digest>",
  "implementationDigest": "<digest>",
  "consumerDigest": "<digest>"
}
```

The canonical source and consumer roots must be separate and non-nested. The consumer root must contain a matching `.reference-reconstruction/project.json`; its project ID must differ. The validator recomputes `consumerDigest` from `consumerFiles`. A route, year, demo, fixture, or story variant is not a consumer project.

Distribution receipt at `.reference-reconstruction/receipts/distribution.json`:

```json
{
  "schemaVersion": 1,
  "projectId": "ten-years-away-react",
  "packageDigest": "<digest>",
  "rightsLedgerSha256": "<digest>",
  "scannedRoots": ["src", "public/distribution"]
}
```

`scannedRoots` must exactly match `project.json.distributionRoots`.
`packageDigest` is recomputed from every canonical file under those roots. Any scanned-file addition, deletion, or byte change invalidates the receipt.

## Rights and catalog

`.reference-reconstruction/rights-ledger.json`:

```json
{
  "schemaVersion": 1,
  "assets": [
    {
      "id": "demo-frame-01",
      "provenance": "owned",
      "rights": "owned",
      "replacementRequired": false,
      "source": "public/distribution/demo-frame-01.webp",
      "sha256": "<digest>",
      "license": "Copyright Example Studio"
    }
  ]
}
```

Distribution accepts only `owned`, `cc0`, `dependency-license`, or `licensed`. Every `source` must be a canonical target-relative local file inside a scanned distribution root and must match `sha256`; host URLs, missing files, research-only rights, replacement-required records, and missing license/provenance data are rejected.

`component-catalog/catalog.json` contains only promoted public candidates:

```json
{
  "schemaVersion": 1,
  "projectId": "ten-years-away-react",
  "entries": ["ten-years-away--year-narrative.json"]
}
```

Each catalog entry contains:

```json
{
  "schemaVersion": 1,
  "id": "ten-years-away/year-narrative",
  "componentVersion": "0.1.0",
  "package": "@references/ten-years-away",
  "exportPath": "./year-narrative",
  "framework": "nextjs-react",
  "clientBoundary": true,
  "interfaceFiles": ["src/year-narrative/index.ts"],
  "interfaceFingerprint": "<digest>",
  "implementationFiles": ["src/year-narrative/year-narrative.tsx"],
  "implementationDigest": "<digest>",
  "assetMappingFiles": ["src/assets/research-assets.ts"],
  "assetMappingDigest": "<digest>",
  "propsType": "YearNarrativeProps",
  "slots": [],
  "events": ["onNavigate"],
  "lifecycle": ["mount", "route-ready", "dispose"],
  "peerDependencies": {
    "next": "^16.2.10",
    "react": "^19.2.7"
  },
  "styleTokens": ["--story-background", "--story-foreground"],
  "contentSchema": {
    "type": "StoryYear"
  },
  "assetRequirements": ["demo-frame-01"],
  "states": ["top", "middle-a", "middle-b", "end", "next"],
  "viewports": ["1280x720", "390x844"],
  "inputs": ["wheel", "touch", "keyboard"],
  "accessibility": ["semantic-navigation", "route-announcement"],
  "fallbacks": ["dom-only"],
  "axisStatuses": {
    "implementationStage": "reconstructed",
    "parityStatus": "parity-verified",
    "reuseStatus": "unproven",
    "distributionStatus": "private-only"
  },
  "parityReceipt": ".reference-reconstruction/receipts/parity/ten-years-away--year-narrative.json",
  "parityReceiptSha256": "<digest>",
  "compatibilityTags": ["immersive-story", "scroll-narrative"]
}
```

When `reuseStatus` is `reuse-proven`, also include `reuseReceipt` and its exact `reuseReceiptSha256`. `assetRequirements` across all catalog entries must match the rights-ledger asset IDs exactly. Project-specific metadata may add fields, but never omit the validator-required interface, behavior, axis, asset, and evidence records.

## Staleness

- Any desktop-signature policy byte change requires a new canonical policy digest, explicit approval, and architecture-stage validation. It invalidates the old signature receipt and every plan or implementer packet bound to the previous `desktopSignature.sha256`.
- Any signature implementation file, comparison/GPU output, or structured GPU status change invalidates the signature receipt and requires matched recapture before broader work resumes.
- Oracle lock, interface fingerprint, implementation digest, research asset mapping, planned claims, or parity output change: set `parityStatus` to `stale` and recapture.
- New user feedback or a validation discrepancy: add or reuse its stable observable condition in `evidenceClaims`, retain incomplete correction work in `unresolved`, and do not create a separate feedback ledger. Set a previously verified affected promotion to `parityStatus: stale`; otherwise keep it `unverified`. Recompute `claimSetDigest`, invalidate the prior receipt hash and authority, then recapture and regenerate the receipt against the current bindings.
- When feedback materially changes the architecture, return its status to `draft` and invalidate the affected plan approval before implementation resumes.
- Approved React architecture byte change: return its status to `draft`, replace
  the component-map architecture hash, and reapprove every downstream plan whose
  files, interfaces, state ownership, renderer, dependencies, or checkpoints are
  affected.
- Shared interface, implementation package, consumer package, or either project identity change: set `reuseStatus` to `stale` and re-integrate the consumer.
- Distribution roots, any scanned file, output package, rights ledger, asset substitution, or forbidden-text policy change: set `distributionStatus` to `stale` and rebuild/re-scan.
- Do not edit a receipt in place and retain a prior receipt hash. Regenerate the owning catalog or promotion binding.
- Treat promotion state as mutable and receipts as immutable. Preserve a superseded receipt for audit when appropriate, but remove its authority by changing the promotion status or binding; write the replacement to a new revision or path and bind only its fresh hash in the regenerated catalog.
- A catalog-only validation cannot endorse `distribution-validated`; run the distribution stage so the status and its ledger/package receipt are checked together.
