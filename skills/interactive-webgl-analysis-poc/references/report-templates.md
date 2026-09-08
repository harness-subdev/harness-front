# Report templates

Use only the templates required by the selected mode. Analysis-only defaults to
a read-only inspection and an in-response report. Create these files/directories
only when the user explicitly requests workspace artifacts. When writes are
authorized, adjust paths to the workspace and keep raw research artifacts
outside the deliverable.

## Recommended analysis layout

```text
work/target-research/                 # not shipped
├── captures/
├── public-html-and-chunks/
├── public-assets/
├── bundle-contexts.json
└── glb-metadata.json

docs/reconstruction/                  # evidence-backed handoff
├── brief.md
├── evidence-ledger.md
├── asset-map.json
├── interaction-model.md
├── design.md                         # specification mode or later
├── implementation-plan.md            # build mode only
└── validation-report.md
```

Analysis-only work does not create directories, save captures/bundles/assets,
write report files, install dependencies, start servers, or change code unless
the user explicitly authorized the corresponding artifact or action.

## Reconstruction brief

```markdown
# [Target sequence] reconstruction brief

## Request
[Analysis / specification / POC / audit]

## Evidence track
[Behavior-only strict clean-room / public-artifact-assisted]
[If assisted evidence later feeds a strict implementation, record analyst and
fresh-implementer separation plus the scrubbed handoff boundary.]

## Target
- Public URL or supplied capture:
- Capture date/build clue:
- Viewports:
- Input modes:

## In scope
- [Exact opening state or sequence]
- [Exact end boundary]

## Non-goals
- [Downstream pages/features]
- [Original source recovery]
- [Asset redistribution]

## Success criteria
1. [Observable state/timing relationship]
2. [Desktop/mobile behavior]
3. [Failure/reduced-motion behavior]
4. [Required verification]

## Asset policy
[Independent placeholders / user-provided assets / licensed assets / temporary
public hotlinks only with separate rights confirmation and approval]

## Open decisions
- [Decision that materially changes scope]
```

## Evidence ledger

```markdown
# Evidence ledger

| ID | Claim | Class | Evidence | Source/checkpoint | Confidence | Status/next test |
| --- | --- | --- | --- | --- | --- | --- |
| E-01 |  | observed |  |  | high | confirmed |
| E-02 |  | extracted |  |  | high | confirmed |
| E-03 |  | inferred |  |  | medium | test at midpoint |
| E-04 |  | chosen |  | POC | explicit | document approximation |

## Conflicts
- [Claim]: [source A] versus [source B]; resolution and reason.

## Unknowns
- [Unknown]: minimal safe experiment or handoff note.
```

## Asset map

The sample values below illustrate one possible mask-based experience. Replace
them with evidence from the selected target; do not treat them as defaults.

```json
{
  "captured_at": "YYYY-MM-DDTHH:mm:ssZ",
  "target": "https://public.example/",
  "temporary_hotlinks": false,
  "assets": [
    {
      "id": "hero-mask",
      "url": "https://public.example/mask.ktx2",
      "kind": "ktx2-data-texture",
      "width": null,
      "height": null,
      "role": "inverse hero mask",
      "loaded": true,
      "observed_visible": true,
      "decoder": "basis path or null",
      "failure": "fatal DOM fallback",
      "evidence": "network + bundle context",
      "confidence": "high",
      "replacement_required": true
    }
  ]
}
```

Keep `loaded` separate from `observed_visible`. A preloaded full model may not be
the model actually mounted in the selected scene.

## Interaction model

The FBO layer tree below is an optional example. Use a renderer-neutral layer
tree unless the evidence supports this exact composition.

````markdown
# Interaction model

## Layer tree
```text
semantic DOM
fixed canvas
  portal plane (order 0)
    FBO scene
  inverse mask plane (order 1)
layout-only scroll triggers
```

## Producers and consumers
| Producer | Value | Consumer | Update cadence |
| --- | --- | --- | --- |
| pointer/touch | UV + NDC | trail + portal | event/ref |
| scroll trigger | progress + velocity | frame loop | scroll/ref |
| reveal clock | reveal value | hero + portal | frame |

## Checkpoint state table
| Viewport | State | Scroll/time | Expected DOM | Expected canvas |
| --- | --- | ---: | --- | --- |
| 1280x720 | top settled | t=0.9s |  |  |

## Equations
- Name:
- Domain/clamp:
- Formula:
- Endpoints:
- Evidence class/confidence:
- Chosen approximation, if any:

## Frame order
1. [Writer]
2. [Offscreen consumer/render]
3. [Main composite]

## Responsive and reduced motion
- Desktop:
- Touch/mobile:
- Reduced motion:

## Signature-owner hypothesis matrix
| ID | Question/observation | Candidate mechanism | Predicted signature | Clean evidence refs | Falsifying experiment | Static/instrumented refs | State | Confidence/remaining unknown |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
````

## GPU gate

```markdown
## GPU evidence companion
- Applicability: [required / not-applicable]
- Clean/instrumented run refs: [run IDs and external visual references]
- Producer status: [ready / blocked]
- Validator status: [blocked / partial / runtime-validated]
- Render-contract status: [blocked / partial / runtime-validated]
- Unresolved items: [list / none]
- Claim ceiling: [bounded GL execution / matched runtime evidence / no GPU proof]
```

## Design/specification

```markdown
# [Target sequence] [strict clean-room / public-artifact-assisted] design

## Context and provenance
[What was observed publicly and what was not recovered]
[Selected evidence track and any analyst/implementer separation]

## Goal

## Non-goals

## Delivery location

## Architecture
### Page shell
### Scroll runtime
### Visual surface and renderer choice
### Primary scene/layer
### Optional offscreen or composite pass

## Exact observed/extracted behavior
[Tables and equations with evidence labels]

## Chosen clean implementation details
[Clearly separate from production facts]

## Asset configuration and replacement

## Data flow

## Loading and failure behavior

## Accessibility and reduced motion

## Automated verification

## Browser verification matrix

## Known constraints and licensing
```

## Implementation plan task

```markdown
### Task N: [Observable vertical slice]

**Files:**
- Create/modify:

**Interfaces:**
- [Producer/consumer or public function contract]

- [ ] Add focused RED test for [pure behavior or wiring seam]
- [ ] Implement the smallest production change
- [ ] Run focused GREEN test
- [ ] Run full tests/type check/build as proportional
- [ ] Inspect matching browser checkpoints if permitted
- [ ] If commit authorization was explicit, commit only scoped files

**Acceptance:**
- [Observable outcome]
- [Failure/reduced-motion outcome]
- [Evidence or test proving it]
```

Prefer tasks that end in a visible/testable vertical slice. Do not create one
large “implement WebGL” task.

## Validation report

```markdown
# Validation report

## Outcome
[What is complete and what is not]

## Automated checks
| Check | Result | What it proves |
| --- | --- | --- |
| Pure math/state tests | pass/fail | endpoint and race behavior |
| Source contracts | pass/fail | wiring only, not browser execution |
| Type check | pass/fail | module/type compatibility |
| Production build | pass/fail | compile/static route output |
| Server Ready | pass/fail | startup only |

## Browser comparison
| Viewport | Checkpoint | Reference | Result | Difference |
| --- | --- | --- | --- | --- |

## Failure and accessibility checks
- Individual media failure:
- Essential-resource/renderer fatal path:
- Reduced motion:
- Native scrolling:
- Console/network:

## Evidence gaps
- [Policy-blocked or unavailable check]

## Asset/licensing handoff
- [Every temporary production asset to replace or license]
```

## Final response structure

Lead with the outcome. Then summarize:

- generated reports/code and their paths;
- strongest evidence and high-confidence interaction model;
- tests/build/browser checkpoints actually completed;
- exact remaining manual checks;
- production asset replacement/licensing requirement.

Do not make the user reconstruct the result from progress updates.
