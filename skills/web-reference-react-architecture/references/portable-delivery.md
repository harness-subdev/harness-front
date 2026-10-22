# InitPage와 다중 TGZ 전달 계약

신규 복원 프로젝트와 Next.js 포팅 목표는 지정 템플릿을 clone하고 구조 검사를 통과해야 한다.
사이트별 TGZ는 다른 사이트의 UI와 같은 문서에서 조립할 수 있어야 한다.
이 문서는 architecture의 설계 입력이며 structure의 구현·검증 기준이다.
Next.js가 아닌 기존 앱은 승인한 변경 범위에만 이 계약을 적용한다.
기존 Next.js 앱은 [포팅 절차](portable-structure.md#nextjs-to-vite-port)를 함께 따른다.

## 1. 신규 프로젝트와 Next.js 포팅 시작

[portable-structure.md](portable-structure.md)의 clone·충돌 확인·추적 파일 복사 절차를 반드시 따른다.
설계 단계는 템플릿 출처와 구조를 기록한다. 승인된 구현 단계에서 실제 clone을 실행한다.
수동 Vite 생성이나 이전 프로젝트 복사로 clone을 대체하지 않는다.
접근 실패, 파일 충돌, 구조 검사 실패가 있으면 해당 단계에서 멈춘다.

구현 기록에는 다음 항목을 남긴다.

- 템플릿 URL, `main`, 실제 clone한 commit.
- 목적지 충돌 확인 결과와 복사한 추적 파일 범위.
- `npm ci`, 초기 `npm run check`, 구현 후 `npm run check`의 명령·종료 코드·로그 경로.
- 필수 경로 `src/pages/init/InitPage.tsx`, `src/exports/init.ts`, `styles/portable.css`.
- 연결 Chrome의 실제 동작 검사와 아직 실행하지 않은 검사.

`check:architecture`는 역할·공개 entry·의존 방향과 필수 경로를 검사한다.
`check-init.mjs`는 초기화 수명 주기, 생성 CSS, 반복 UI 앵커를 검사한다.
검사 실패를 피하려고 검사 명령을 지우거나 검사 범위를 줄이지 않는다.
구조 검사 성공은 두 TGZ의 혼합 실행 성공을 뜻하지 않는다.

## 2. InitPage

사이트 진입 초기화는 `src/pages/init/InitPage.tsx`의 Page로 구현한다.
`src/exports/init.ts`는 `InitPage`, `InitPageProps`, `InitReadiness`를 named re-export한다.
패키지의 `/init`은 공개 하위 경로다. 브라우저의 `/init` URL을 만들라는 뜻이 아니다.
Loader·Spinner는 필요한 경우 InitPage의 비공개 하위 구현으로 둔다.
HomePage가 InitPage를 import하지 않는다. 호스트가 초기화와 목적 Page를 조립한다.

템플릿의 최소 계약은 다음과 같다.

```ts
type InitReadiness =
  | { status: 'pending' }
  | { status: 'ready' }
  | { status: 'failed'; message: string };

type InitPageProps = {
  readiness: InitReadiness;
  onComplete(result: 'completed' | 'skipped'): void;
  onRetry(): void;
  onError(error: Error): void;
  allowSkip?: boolean;
};
```

호스트는 폰트·필수 자산·데이터 준비, 제한 시간, 재시도와 건너뛰기 허용을 결정한다.
InitPage는 진입 화면·종료 모션·오류 표시를 소유한다.
가짜 진행률이나 고정 대기 시간으로 실제 준비 완료를 대신하지 않는다.
호스트는 재시도마다 새 key를 주며, 시도마다 완료 콜백은 최대 한 번 호출한다.
오류를 완료로 바꾸지 않는다. 해제 후 준비 결과와 모션 콜백을 무시한다.
StrictMode, 준비 실패, 늦은 ready, 모션 오류, 재시도, 명시한 skip을 검사한다.
모션 축소 설정에서는 불필요한 종료 애니메이션을 생략한다.

초기 요청 URL과 query를 유지한다. 일반 경로 변경마다 초기화를 재실행하지 않는다.
목적 화면의 DOM이 준비에 필요하면 먼저 mount하고 초기화 동안 입력과 접근성 노출을 막는다.
완료 후 목적 화면의 포커스 복귀 정책을 호스트가 기록한다.
사이트별 추가 입력은 관찰 근거가 있을 때만 추가한다.

## 3. 스타일 경계

`styles/portable.css`는 전달 가능한 스타일의 유일한 제작 입력이다.
`app/globals.css`는 이를 한 번 import하고 문서의 reset·body·root 설정을 소유한다.
TGZ의 `/styles.css`는 portable 입력의 컴파일 결과다.
portable 입력이 없으면 제작을 실패시킨다. 전체 globals.css로 대체하지 않는다.
소비자는 컴파일 CSS를 import한다. 원본 Tailwind·Vite·router 설정을 복사하지 않는다.
소스를 수정할 때는 portable 입력과 필요한 제작 설정·의존성을 함께 전달한다.

| 대상 | 기준 |
| --- | --- |
| 클래스·선택자 | 사이트별 접두사 또는 CSS Modules를 사용한다. 템플릿의 `ref`는 새 사이트 고유 접두사로 바꾼다. |
| 토큰 | 소유한 UI root에 사이트 고유 CSS 변수로 둔다. 중첩한 다른 사이트 UI까지 선택하는 광역 규칙을 쓰지 않는다. |
| 문서 설정 | portable 출력에 무범위 `html`, `body`, `:root`, `*`, `button`, `p` 초기화를 넣지 않는다. |
| 폰트·keyframes | 사이트 고유 이름을 사용한다. 폰트 파일은 archive에 포함하고 상대 URL로 연결한다. |
| Tailwind 내부 변수 | prefix가 `--tw-*`와 `@property`까지 격리한다고 가정하지 않는다. 생성 CSS를 검사하고 충돌을 제거한다. |
| CSS layer | 우선순위를 조절한다. 이름·토큰 격리를 대신하지 않는다. |
| 크기 | `rem`은 문서 html 크기를 따른다. 고정 기준 변환 또는 호스트 기준 의존을 명시하고 16px·20px에서 검사한다. |
| 배치 | viewport 단위·fixed·portal의 기준과 bounds를 공개한다. 전체 폭 지원만 검증했다면 좁은 컨테이너 지원을 약속하지 않는다. |

스타일 import 순서를 맞춰야만 작동하는 상태를 혼합 성공으로 판정하지 않는다.
소유 root의 값도 다른 패키지 안에 중첩했을 때 상속 영향을 검사한다.
템플릿의 정적 CSS 검사는 첫 방어선이다. 실제 계산 스타일·폰트·레이아웃 검사가 따로 필요하다.

## 4. 자산과 소스 전달

구현 필수 자산은 컴포넌트가 의도한 모양과 기능을 내는 데 필요한 파일이다.
콘텐츠 자산은 소비자가 바꿀 사진·영상·문구다.
파일별 소유권·입력·실패 정책·포함 여부를 기록한다. 자산 종류만 보고 일괄 분류하지 않는다.

Studio375의 구체적인 구분은 다음과 같다.

- Hatton·Hatton Italic·Neue 폰트는 해당 구현의 필수 자산이다. 폰트 bytes와 상대 참조를 TGZ에 포함한다.
- 프로젝트 제목·링크·이미지는 콘텐츠 입력이다. `FeaturedProjectsSection`의 projects 입력으로 교체한다.
- `HomeBackground`의 `videoSrc`는 소비자가 제공하는 영상 URL이다. 영상 파일이 TGZ에 자동 포함된다고 안내하지 않는다.
- GPU 배경은 영상 외에도 필요한 scope·스크롤 입력·이미지 준비·해제 계약을 함께 공개한다.
- 미리보기는 카탈로그 샘플 자산과 입력을 별도로 준비한다. 샘플 성공을 독립 소비 성공으로 판정하지 않는다.

TGZ에는 JS·타입·컴파일 CSS·필수 자산과 호스트 조건이 필요하다.
수정용 소스에는 선택한 공개 모듈의 전체 의존 파일·스타일·필수 자산·실행 예제가 필요하다.
선택한 Section 소스가 부모 Page나 원본 app 없이 실제로 빌드되는지 압축 해제본에서 검사한다.
라이선스·외부 준비가 필요한 파일은 실제 확인 상태와 준비 방법을 적는다.

## 5. 모션·마우스·variation

패키지 import나 Section mount가 전역 커서·smooth scroll·문서 잠금·사이트 전환을 자동 시작하면 안 된다.
호스트는 문서 스크롤 구동기를 하나만 선택한다. native scroll을 기본 혼합 사례로 둔다.
포인터 효과는 받은 root/ref 안에서 좌표를 계산하며, 프레임 입력은 ref·CSS 변수에 기록한다.
전역 cursor와 route transition은 호스트가 명시해 켜는 별도 소유자다.
coarse pointer·touch·키보드·모션 축소의 대체 동작을 기록한다.

효과는 자기 listener·RAF·observer·GSAP context·GPU·미디어만 해제한다.
전역 kill, document 선택자, 고정 DOM ID로 이웃 패키지를 제어하지 않는다.
반복 인스턴스의 ID와 ARIA·SVG 참조는 `useId` 또는 명시한 인스턴스 ID로 연결한다.
React·React DOM은 호스트의 호환 가능한 한 인스턴스를 사용한다.
같은 패키지의 entry는 공유 context 정체성을 유지하며, 다른 사이트 context를 합치지 않는다.

variation은 콘텐츠, 외형, 상태, 동작으로 나눠 실제 구현한 입력을 기록한다.
콘텐츠는 props, 외형은 근거가 있는 `variant`·`size`나 로컬 토큰으로 제공한다.
상태는 해당 소유자가 관리한다. 모션 옵션은 실제 효과 계약에만 둔다.
서로 모순되는 boolean 묶음보다 유효한 상태를 표현하는 union을 사용한다.
실제로 없는 범용 variant·size·disabled API를 만들지 않는다.
같은 HeroSection 이름을 가진 두 사이트 구현을 하나의 범용 컴포넌트로 합치지 않는다.

## 6. 후속 전달 검증 작업

architecture는 아래 작업의 입력·소유자·성공 조건을 설계서에 남긴다.
structure는 승인한 전달 범위에서 실제 제작기와 검증 소비자를 재사용해 실행한다.
Rapper 제작은 별도 `wrapper-packages` checkout의 `pnpm project:release`와 기존 예제 호스트·패키징·독립 소비 검증을 재사용한다.
실제 `package.json`과 제작 스킬에서 명령·인자를 확인한다. 앱에서 제거한 `sites:package`를 안내하지 않는다.
템플릿에 별도 패키지 제작기나 레지스트리를 만들지 않는다.

| 작업 | 완료 근거 |
| --- | --- |
| 실행·예제 연결 | [공통 연결 계약](portable-structure.md#실행콘텐츠예제-연결-계약)의 실제 호출·콘텐츠·호스트 파일을 추적하고 분석 입력 포함을 확인한다. |
| 대상·case 대조 | 대상별 생성 case와 TGZ `./preview/<case>` entry를 대조한다. 누락 원인·소스 위치를 기록하며 실행 대상 누락은 준비 완료를 막는다. |
| 개별 실행 | 실제 콘텐츠·입력·해제를 Chrome에서 확인한다. 부모 DOM·형제 미디어가 필요하면 기록한 최소 구성을 사용한다. 미확정 서버 입력은 준비 방법과 미검증 상태를 남긴다. |
| 두 실제 archive 선택 | Studio375·Realevate TGZ 각각의 source revision·version·SHA-256·공개 API·호스트 조건 |
| 독립 소비 | 새 소비자에 두 TGZ를 설치하고 공개 API·타입·컴파일 CSS·포함 폰트로 빌드한다. 원본 서버를 끈다. |
| 같은 문서 혼합 | Studio375 Hero·필요한 배경과 Realevate ContactForm을 같은 문서에 조립한다. 사용한 API만 검사한다. |
| CSS 순서 | A→B와 B→A에서 호스트 sentinel·계산 스타일·폰트·레이아웃을 대조한다. |
| 크기·접근성 | desktop·mobile, html 16px·20px, 실제 모션 축소·touch·키보드·수정키 링크를 검사한다. |
| 반복·부분 해제 | 같은 폼 두 개의 ID·입력 상태를 검사한다. A만 해제, B만 해제, 전체 해제에서 이웃 상태와 잔존 자원을 확인한다. |
| 초기화 | 두 InitPage의 pending·ready·실패·Retry·skip·모션 오류·실행 중 해제·중복 완료 방지를 검사한다. |
| 소스 수정 | ZIP을 새 경로에 해제해 빌드하고 제목·링크·토큰을 바꿔 렌더링한다. TGZ 검증과 따로 기록한다. |

로그·캡처는 검사한 정확한 archive hash에 연결한다.
새 archive를 만들면 변경으로 영향받는 검사를 다시 실행한다.
미실행·실패 항목이 있으면 그 전달 상태를 미검증으로 남긴다.
선택한 두 모듈의 성공을 전체 사이트나 모든 공개 모듈의 성공으로 확대하지 않는다.
현재 작업이 구조 구현까지만 포함하면 이 표를 후속 작업으로 인계하고 혼합 실행 성공을 주장하지 않는다.
