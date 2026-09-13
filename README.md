# herness-front

프론트엔드 레퍼런스를 증거 기반으로 분석하고, 독립적인 React/Next.js
구현과 재사용 가능한 디자인 시스템으로 발전시키기 위한 Codex 스킬
하네스입니다.

초기 버전은 공개 사이트의 구조와 동작을 관찰하는 단계부터 원본 런타임
Oracle, clean-room 구현, 패리티 검증, 실제 두 번째 프로젝트 재사용,
배포 경계 검증까지 하나의 추적 가능한 워크플로로 묶습니다.

## Included skills

| Skill | Responsibility |
| --- | --- |
| `reconstruct-react-reference` | 상위 마일스톤 및 게이트 오케스트레이션 |
| `site-reference-audit` | 경로별 구조, 반응형, 효과, 기술 신호의 제한된 사전 조사 |
| `design-system-reference-analyzer` | 승인된 런타임 아카이브와 HTML/CSS/JS 컴포넌트 계약 분석 |
| `interactive-webgl-analysis-poc` | WebGL, Canvas, shader, scroll/time 인터랙션 분석 및 POC |
| `react-reference-architecture` | scrubbed 증거를 React/TypeScript 구조 계약으로 변환 |
| `reference-design-document` | 검증된 구현에서 루트 `DESIGN.md` 생성·검증 |
| `reference-project-readme` | `DESIGN.md`와 실제 프로젝트를 기준으로 루트 README 작성·검증 |

각 디렉터리에는 해당 스킬의 `SKILL.md`와 기존 `agents/`, `scripts/`,
`reference(s)/`, `evals/` 리소스가 함께 들어 있습니다.

## Install

필요한 스킬을 Codex 사용자 스킬 디렉터리에 복사하거나 심볼릭 링크로
연결합니다.

```bash
git clone https://github.com/herness-subdev/herness-front.git
cd herness-front
cp -R skills/* "${CODEX_HOME:-$HOME/.codex}/skills/"
```

다른 런타임 요구사항과 연계 스킬은
[DEPENDENCIES.md](DEPENDENCIES.md)를 확인하세요.

## 전체 오케스트레이션

```text
reconstruct-react-reference
│
├─ Milestone 1: Original Runtime Oracle
│  ├─ site-reference-audit
│  │  └─ route·viewport·구조·반응형·이펙트·기술 신호 preflight
│  ├─ evidence track 선택
│  │  ├─ behavior-only strict clean-room
│  │  └─ source-mirror-assisted
│  ├─ design-system-reference-analyzer
│  │  ├─ 원본 응답 바이트와 manifest-aware replay
│  │  ├─ 정적·런타임 reference graph
│  │  └─ HTML/CSS/JS/asset/component contract
│  ├─ 조건부 interactive-webgl-analysis-poc
│  │  ├─ renderer-neutral 시각·행동 증거
│  │  └─ GPU companion trace와 render contract
│  └─ Oracle lock 및 검증
│
├─ Milestone 2: Clean React/Next.js Reconstruction
│  ├─ 기존 target·사용자 feedback correction intake
│  ├─ scrubbed schema-v2 component-map
│  ├─ react-reference-architecture + desktop signature policy
│  ├─ 사용자 승인, SHA-256 결합, architecture stage
│  ├─ hash-bound implementation plan
│  ├─ fresh clean implementer의 desktop signature 우선 구현
│  ├─ signature stage 통과 후 나머지 TDD vertical slices
│  ├─ matched-checkpoint parity + feedback correction loop
│  └─ promotion 및 component catalog
│
└─ Milestone 3: Proven Cross-project Design System
   ├─ public package와 executable specimens
   ├─ 실제 두 번째 프로젝트 reuse proof
   ├─ owned/licensed distribution asset profile
   ├─ distribution validation
   └─ Final project documentation
      ├─ reference-design-document → DESIGN.md
      └─ reference-project-readme → README.md
```

## Milestone 1 — Original Runtime Oracle

목표는 대체 구현을 작성하기 전에 공개 런타임을 재생 가능하고 변경되지
않는 증거로 잠그는 것입니다.

### 1. Scoped reference audit

`site-reference-audit`는 다음을 `observed`, `extracted`, `inferred`,
`unresolved`로 구분합니다.

- 정확한 URL과 허용된 경로 범위
- 데스크톱·모바일 viewport와 상호작용 checkpoint
- semantic DOM, section, fixed/sticky layer, media/canvas surface
- CSS transition, keyframe, transform, filter, mask와 SVG 효과
- JavaScript scroll, pointer, touch, keyboard, observer, timer와 RAF 동작
- 데스크톱과 모바일 사이의 실제 구조 교체
- reduced-motion, 콘솔 오류와 실패한 리소스

결과는 `preflight-only`입니다. 조사 범위를 좁힐 뿐 Oracle closure를 대신하지
않으며 clean implementer에게 내부 구현 증거로 전달되지 않습니다.

### 2. Evidence authority

- `behavior-only`: 기본값. 반복된 브라우저 관찰과 공개 런타임 메타데이터를
  사용하며 bundle 구현 표현은 조사하지 않습니다.
- `source-mirror-assisted`: 사용자가 공개 제공 artifact 캡처를 명시적으로
  허용한 경우에만 사용합니다. production bundle은 author source가 아니라
  runtime evidence입니다.

### 3. Source and component contracts

`design-system-reference-analyzer`는 승인된 아카이브가 있을 때 다음 관계를
추적합니다.

```text
DOM hook
→ CSS selector/token/keyframe
→ JS selector/alias/event/controller
→ state
→ class/style/DOM mutation
→ rendered output
```

컴포넌트는 HTML 조각만으로 승격되지 않습니다. DOM root, wrapper/inner
markup, CSS, JS, 상태, 이벤트, mutation, asset, library와 runtime checkpoint가
모두 연결되어야 합니다. 그렇지 않으면 `Unresolved candidate`로 남습니다.

### 4. Conditional GPU gate

Canvas, WebGL/WebGPU, Three.js, shader, framebuffer 또는 render target 신호가
있으면 `interactive-webgl-analysis-poc`가 시각·행동을 renderer-neutral하게
분석합니다. 저수준 WebGL 증명은 DSRA의 pre-navigation runtime probe가
담당합니다.

GPU 작업은 다음 조건을 모두 만족해야 implementation-ready가 됩니다.

- `gpu-runtime-status.json.status === "runtime-validated"`
- `render-contracts.json.status === "runtime-validated"`
- `render-contracts.json.unresolved`가 비어 있음
- context, compile/link, FBO completeness, pass order, binding, error와 시각
  checkpoint가 연결됨

WebGPU 탐지 또는 페이지 이동 전 probe 설치 실패는 `blocked`로 남습니다.

### 5. Oracle hard stop

Oracle 검증 전에는 metadata-only envelope만 허용됩니다.

```text
.reference-reconstruction/
├── project.json
└── oracle-lock.json
```

이 단계에서는 clean application source, package metadata, target dependency를
만들 수 없습니다. Oracle과 향후 React target은 서로 중첩되지 않은 별도
디렉터리와 dependency graph를 가져야 합니다.

## Milestone 2 — Clean React/Next.js reconstruction

Oracle 통과 후 검증된 증거와 기존 target의 mismatch·사용자 feedback를
claim ID와 checkpoint로 정리한 scrubbed schema-v2 `component-map.json`으로 바꾸고
`react-reference-architecture`를 실행합니다.

### Architecture contract

기본 구조는 `Page → Section → proven UI`입니다.

- Page: route metadata, SEO, locale data, Section 순서
- Section: content contract, responsive composition, local interaction,
  readiness, fallback, accessibility와 cleanup
- UI: 두 Section 소비자 또는 명확한 독립 소비 가치가 증명된 경우만 공개
- Controller/render pass/frame state: 실제 두 번째 host가 필요로 하기 전까지
  private

`.reference-reconstruction/react-architecture.md`는 `draft`로 시작하며 에이전트가
스스로 승인할 수 없습니다. 사용자가 정확한 revision을 승인한 뒤 SHA-256을
`component-map.json`과 실행 계획에 결합합니다. 폴더, public interface, state
ownership, renderer, dependency budget 또는 parity checkpoint가 실질적으로
바뀌면 다시 draft와 승인 단계로 돌아갑니다.

schema-v2 `desktopSignature.policy`는 경로, viewport, DPR, input/state,
readiness, reduced-motion, time/randomness, surface 순서와 root owner,
비교 방법·tolerance·metric 상한, GPU 계약을 아키텍처 승인과 함께
hash로 잠깁니다. `--stage architecture` 통과 전에는 계획과 구현을
시작할 수 없습니다.

### Clean implementation boundary

분석자가 배포된 구현 코드를 조사했다면 clean implementation은 해당 대화
기록을 갖지 않은 fresh implementer가 수행합니다. 전달 가능한 정보는
scrubbed 계약, 공개 screenshot, observable checkpoint, semantic content,
입출력·접근성·fallback 요구사항입니다.

다음은 전달하지 않습니다.

- archived JavaScript/CSS bundle 본문 또는 발췌
- minified identifier와 복구된 내부 call graph
- analyzer transcript
- 명시적인 private resolver 밖의 research-only asset

구현은 TDD vertical slice로 진행하고 React/Next.js 판단에는
`vercel-react-best-practices`, 관찰 가능한 패리티에는 `webapp-testing`을
사용합니다.

첫 구현은 desktop-primary signature로 제한합니다. 원본이 WebGL,
WebGL2, WebGPU인 exact-fidelity surface는 같은 renderer class와 증명된
root owner를 유지해야 하며 DOM, CSS, SVG, Canvas2D fallback은 패리티
증거를 대체하지 못합니다. matched comparison과 구조화된 GPU status가
`--stage signature`를 통과해야 더 넓은 slice를 구현할 수 있습니다.

### Standalone and Immersive Runtime

공개 후보는 Provider, global CSS, source DOM ancestor, Oracle 또는 원본 host
없이 동작하는 `Standalone` 프로필을 기본으로 가집니다. 공유 scroll,
navigation, pointer, preload, audio, transition 또는 canvas service가 필요한
경우에만 선택적인 `Immersive Runtime` Provider를 추가합니다. Provider가
없으면 Standalone으로 fallback해야 합니다.

### Research parity and promotion

Oracle과 동일한 route state, viewport, input mode, readiness boundary에서
컴포넌트별 parity receipt를 작성합니다. 모든 계획된 claim은 `passed`,
`failed`, `blocked`, `notApplicable` 중 하나로 기록되며, promotion에는 모든
필수 claim의 통과와 최신 hash binding이 필요합니다.

새 mismatch나 사용자 feedback이 발견되면 안정적인 observable condition을
`evidenceClaims`에 추가하고 영향받은 promotion을 `stale` 또는
`unverified`로 돌립니다. 증명된 owner를 수정한 뒤 같은 checkpoint를
다시 캡처해 claim set의 `unresolved`가 비어야 승격할 수 있습니다.

`reconstructed + parity-verified`인 public candidate만 `component-catalog/`에
들어갑니다. promotion은 재사용이나 배포 가능성을 자동으로 의미하지
않습니다.

## Milestone 3 — Proven cross-project design system

`reuse-proven`은 서로 다른 `projectId`를 가진 실제 두 번째 프로젝트가 같은
public interface fingerprint와 implementation digest를 fork 없이 사용할 때만
기록됩니다. 다른 route, locale, variant, fixture, story 또는 demo는 두 번째
프로젝트가 아닙니다.

배포 프로필은 owned, CC0, dependency-license 또는 별도로 licensed된 asset만
사용합니다. research asset의 output hash를 상속하지 않고 대체 후 다시
검증합니다. 배포 root에는 Oracle byte, archive/mirror 경로, 원본 host,
research-only asset 또는 금지 문자열이 없어야 합니다.

기술적 distribution validation은 법률 검토나 법적 승인과 동일하지 않습니다.

## Final project documentation

모든 요청된 복원 게이트가 검증된 뒤 문서화를 순서대로 실행합니다.

1. `reference-design-document`
   - 루트 `DESIGN.md`가 없으면 현재 구현과 검증 증거로 생성합니다.
   - 이미 있으면 현재성과 상대 링크를 검증하고, 근거가 있는 노후 계약만 갱신합니다.
2. `reference-project-readme`
   - 검증된 `DESIGN.md`를 링크합니다.
   - UI preview, runtime, 폴더 구조, 추출 컴포넌트, 재사용 가이드를 README에 정리합니다.

두 문서는 검증 결과의 후속 설명자료이며 parity receipt를 대체하지
않습니다. 이 단계는 별도 사용자 승인 없이 커밋, 푸시, 배포를 수행하지
않습니다.

## Eight workflow gates

| Gate | Required result |
| --- | --- |
| 1. Oracle closure | 재생 가능한 Oracle과 유효한 hash lock |
| 2. Component map and architecture | 승인된 architecture·desktop signature policy와 정확한 hash binding |
| 3. Written plan | architecture·signature hash, correction claim, root owner를 인용한 승인 계획 |
| 4. Clean implementation | Oracle import·보상 overlay가 없고 signature stage를 통과한 독립 구현 |
| 5. Research parity | 최신 binding과 feedback를 포함한 전체 claim receipt |
| 6. Promotion and catalog | 검증된 public candidate만 포함한 project catalog |
| 7. Reuse proof | 실제 두 번째 프로젝트의 동일 구현 소비 receipt |
| 8. Distribution | 권리·무결성·금지 콘텐츠 검사를 통과한 배포 프로필 |

실행 validator가 제공하는 CLI stage는 여섯 개입니다.

```bash
node skills/reconstruct-react-reference/scripts/validate-reconstruction.mjs <target> --stage oracle
node skills/reconstruct-react-reference/scripts/validate-reconstruction.mjs <target> --stage architecture
node skills/reconstruct-react-reference/scripts/validate-reconstruction.mjs <target> --stage signature
node skills/reconstruct-react-reference/scripts/validate-reconstruction.mjs <target> --stage promotion
node skills/reconstruct-react-reference/scripts/validate-reconstruction.mjs <target> --stage catalog
node skills/reconstruct-react-reference/scripts/validate-reconstruction.mjs <target> --stage distribution
```

계획 승인, clean implementation, reuse proof는 독립적인 workflow gate이며
관련 hash와 receipt는 다음 validator 단계에서 함께 검사됩니다.

## Artifact layout

분석·Oracle 작업 공간:

```text
source/
├── original/
├── derived/
│   ├── reference-graph.json
│   ├── reference-index.json
│   ├── component-contracts.json
│   ├── runtime-reference-graph.json
│   ├── gpu-runtime-trace.json
│   ├── gpu-runtime-status.json
│   └── render-contracts.json
├── source-manifest.json
└── archive-status.json
```

Clean target 상태와 receipt:

```text
.reference-reconstruction/
├── project.json
├── oracle-lock.json
├── component-map.json
├── react-architecture.md
├── promotion.json
├── rights-ledger.json
└── receipts/
    ├── desktop-signature.json
    ├── parity/<component>.json
    ├── reuse/<component>.json
    └── distribution.json

component-catalog/
├── catalog.json
└── <component>.json
```

Oracle lock, architecture, public interface, implementation, asset mapping,
planned claims, parity output, consumer 또는 distribution root가 바뀌면 관련
receipt와 status는 stale이 되며 다시 검증해야 합니다.

## Tests

각 스킬의 독립 테스트는 Node.js 내장 test runner로 실행할 수 있습니다.

```bash
node skills/design-system-reference-analyzer/scripts/extract-reference-graph.regression-test.mjs
node --test skills/design-system-reference-analyzer/scripts/*.test.mjs
node --test skills/reconstruct-react-reference/scripts/*.test.mjs
node --test skills/interactive-webgl-analysis-poc/evals/*.test.mjs
node skills/interactive-webgl-analysis-poc/scripts/test-tools.mjs
```

테스트와 schema 검증은 시각 패리티, 독립 저작, asset 라이선스 또는 법률적
배포 권한을 대신 증명하지 않습니다.

## Expanding the harness

새 스킬은 한 가지 분명한 책임을 가져야 하며, `SKILL.md`에는 공통 결정과
핵심 경계만 둡니다. 조건부 절차와 schema는 `references/`, 반복적이고
결정론적인 작업은 `scripts/`, 생성 결과에 포함할 파일만 `assets/`에 둡니다.

기존 workflow의 authority, Oracle, clean-room, hash binding 또는 rights gate를
약화하는 확장은 받지 않습니다. 별도 라이선스의 코드를 추가할 때는 원본
고지와 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)를 함께 갱신해야 합니다.

## License

[MIT](LICENSE) © 2026 herness-subdev contributors. 외부 프로젝트와 자산에는 각자의
라이선스가 적용됩니다.

## Build and releases

배포 버전은 루트 `VERSION`에서 관리합니다. PR과 main 변경 시 전체 테스트와
소스 패키징이 실행되며, `v버전` 태그 push가 검증된 GitHub Release를 게시합니다.
빌드 산출물에는 커밋·실행 정보를 담은 `build-info.json`과 SHA-256 체크섬이
제공됩니다. 버전 PR 준비, 다운로드 설치, 실패 복구는
[빌드·릴리스 운영 안내](docs/RELEASING.md)를 참고하세요.
