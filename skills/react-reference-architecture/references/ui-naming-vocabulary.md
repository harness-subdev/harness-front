# UI 범용 명칭 사전

버전: 1. 이 파일은 react-reference-architecture가 여러 사이트에 적용하는 명칭 기준의 원본이다. 공식 레퍼런스 조사 기준일: 2026-10-15. 프로젝트 안의 명칭 사전은 이 기준을 문맥에 맞춰 참조하는 파생 사본이며 별도의 명칭 정책을 만들지 않는다.

필수 적용 순서: 먼저 실제 의미·책임을 확인한 뒤 일치하는 대표 이름을 선택한다. 이름을 맞추기 위한 빈 폴더·래퍼·공개 export는 만들지 않는다. 폴더·공개 진입점은 [이식 가능한 소스 구조](portable-structure.md), 소유·의존성·재사용 계약은 [아키텍처 계약](architecture-contract.md)을 함께 따른다.

## 조사 결과와 근거 구분

**Carousel은 범용 명칭이다.** W3C APG, Bootstrap, shadcn이 모두 독립된 패턴·컴포넌트 이름으로 사용한다. 일련의 슬라이드 중 일부를 순서대로 보여 주는 구성이고, 이미지에만 한정되지 않는다. 자동 재생, 가로 방향, 한 번에 한 장 표시도 이름만으로 필수가 되지 않는다. [W3C Carousel](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/), [Bootstrap Carousel](https://getbootstrap.com/docs/5.3/components/carousel/), [shadcn Carousel](https://ui.shadcn.com/docs/components/base/carousel)

Header·Footer·Hero 같은 구조 이름과 Carousel·Accordion 같은 동작 이름 모두 범용 어휘다. 구조와 기능의 차이는 범용성의 차이가 아니다. 각 단어가 가리키는 책임과 포함 관계를 구분한다.

| 근거 표시 | 의미 |
| --- | --- |
| 공식 패턴 | HTML 의미·기능 또는 WAI APG에 정의된 이름. APG는 공식 참고 가이드이며 규범 표준 자체는 아니다. |
| 라이브러리 관례 | 공식 디자인 시스템·컴포넌트 라이브러리가 사용하는 이름. 라이브러리별 세부 의미 차이가 있을 수 있다. |
| 코드명 규칙 | 통용되는 개념에 PascalCase·Page·Section 등 사이트 공통 명명 규칙을 적용한 이름. |
| 프로젝트 책임명 | 관찰한 구현의 책임을 설명하기 위해 합의한 이름. 범용 UI 규격과 동일하다고 주장하지 않는다. |

아래 표의 설명은 사이트별 아키텍처에 적용할 간결한 정의다. 라이브러리의 실제 export·props·동작 계약을 이 표로 대체하지 않는다. APG의 성격은 [APG Introduction](https://www.w3.org/WAI/ARIA/apg/about/introduction/#apg-is-not-a-normative-standard)을 따른다.

## 공식 레퍼런스

| 자료 | 조사한 범위 |
| --- | --- |
| [WAI APG 패턴 목록](https://www.w3.org/WAI/ARIA/apg/patterns/) | Carousel·Slider·Dialog·Tabs·Accordion·탐색·선택 패턴과 의미 경계 |
| [WAI Landmark Regions](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/) | Header·Footer·Navigation 등 페이지 의미 구역 |
| [Bootstrap 공식 예제](https://getbootstrap.com/docs/5.3/examples/) | Headers·Heroes·Features·Footers·Sidebars·Pricing의 실제 명칭 사용 |
| [USWDS Header](https://designsystem.digital.gov/components/header/), [Footer](https://designsystem.digital.gov/components/footer/), [Landing page](https://designsystem.digital.gov/templates/landing-page/) | 상·하단 구조와 Hero의 사용 목적 |
| [shadcn Components](https://ui.shadcn.com/docs/components) | Card·Carousel·Dialog·Drawer·입력·피드백 구성 명칭 |
| [Radix Primitives](https://www.radix-ui.com/primitives/docs/components) | NavigationMenu·Dialog·Popover·Collapsible 등의 구현 의미 |
| [MUI Components](https://mui.com/material-ui/all-components/), [공식 템플릿](https://mui.com/material-ui/getting-started/templates/) | 다른 라이브러리의 별칭과 마케팅 구역 구성 |
| [Flowbite 공식 마케팅 블록](https://flowbite.com/blocks/marketing/) | FAQ·Testimonials·Contact·Portfolio·Newsletter·Customer logos 등의 구역 명칭 |

## 사이트 구조와 탐색

이 그룹의 이름은 큰 구역이나 탐색의 책임을 나타낸다. 물리 폴더·소유 범위·카탈로그 kind는 실제 소스 관계로 별도 판단한다.

| 대표 이름 | 정의·적용 조건 | 별칭·구분 및 근거 |
| --- | --- | --- |
| Header | 사이트 식별과 주요 탐색 등을 담는 상단 구성 | SiteHeader의 일반 문맥 이름. 카드 내부 헤더는 CardHeader 등으로 구분. [USWDS](https://designsystem.digital.gov/components/header/) |
| Footer | 하단의 보조 탐색·연락처·법적 정보 구성 | SiteFooter의 일반 문맥 이름. 내부 콘텐츠의 footer와 소유 범위 구분. [GOV.UK](https://design-system.service.gov.uk/components/footer/) |
| Navigation | 페이지·사이트 이동 링크를 모은 구성 | 명령 Menu와 구분. [GOV.UK Service navigation](https://design-system.service.gov.uk/components/service-navigation/) |
| Navbar | 막대 형태로 배치한 탐색 UI | Header 전체의 동의어는 아님. [Bootstrap](https://getbootstrap.com/docs/5.3/components/navbar/) |
| Sidebar | 측면에 배치한 탐색·보조 콘텐츠 영역 | 상시 영역인지 펼치는 패널인지 계약에 기록. [Bootstrap](https://getbootstrap.com/docs/5.3/examples/sidebars/) |
| Breadcrumb | 현재 위치와 상위 계층으로 이어지는 경로 탐색 | Breadcrumbs를 검색 별칭으로 사용. 방문 이력과 구분. [WAI](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/) |
| Pagination | 페이지로 나눈 결과 사이의 이동 UI | 무한 스크롤과 구분. [shadcn](https://ui.shadcn.com/docs/components/base/pagination) |
| NavigationMenu | 링크와 하위 탐색을 조합한 내비게이션 | ARIA Menu·Menubar와 구분. [Radix](https://www.radix-ui.com/primitives/docs/components/navigation-menu#differences-to-menubar) |
| Menu | 선택·명령 항목을 탐색하고 실행하는 메뉴 | 일반 사이트 링크 묶음에 자동 적용하지 않음. [WAI](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/) |
| Menubar | 명령 메뉴를 지속적으로 배치한 막대 | Menu의 구성 형태. [WAI](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/) |
| DropdownMenu | 트리거로 펼치는 명령 메뉴 | 옵션 선택 Select와 구분. [shadcn](https://ui.shadcn.com/docs/components/base/dropdown-menu) |
| ContextMenu | 특정 대상의 문맥에서 여는 명령 메뉴 | 우클릭·길게 누르기 등 입력 조건을 기록. [shadcn](https://ui.shadcn.com/docs/components/base/context-menu) |
| Toolbar | 관련 작업 컨트롤을 묶은 도구 모음 | 도구의 기능과 키보드 계약을 함께 확인. [WAI](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/) |

## 페이지 구역 이름

Hero·Features·Pricing·FAQ 등의 통용 개념에 Section 접미사를 적용한다. 아래 PascalCase 이름 전체가 W3C 표준이나 모든 라이브러리의 export라는 뜻은 아니다. 내용 목적이 같은 경우에 사용하는 코드명 규칙이다.

| 대표 이름 | 정의·적용 조건 | 근거·구분 |
| --- | --- | --- |
| HeroSection | 첫 주요 메시지·대표 비주얼·주요 행동을 제시하는 구역 | 단순히 맨 위에 있다는 이유만으로 Hero로 명명하지 않음. [Bootstrap Heroes](https://getbootstrap.com/docs/5.3/examples/heroes/) |
| FeaturesSection | 제품·서비스의 핵심 기능과 특징을 설명하는 구역 | [Bootstrap Features](https://getbootstrap.com/docs/5.3/examples/features/) |
| PricingSection | 가격·요금제·플랜을 비교하고 선택하는 구역 | [Bootstrap Pricing](https://getbootstrap.com/docs/5.3/examples/pricing/) |
| TestimonialsSection | 고객·사용자의 경험담과 추천을 보여 주는 구역 | [MUI 템플릿](https://mui.com/material-ui/getting-started/templates/) |
| FAQSection | 자주 묻는 질문과 답변을 제공하는 구역 | Accordion 사용 여부와 독립. [Flowbite FAQ](https://flowbite.com/blocks/marketing/faq/) |
| CTASection | 문의·가입·구매 등 주요 행동을 유도하는 구역 | CallToActionSection은 검색 별칭. 버튼 하나는 이 구역 전체가 아님. [Flowbite footer CTA](https://flowbite.com/blocks/marketing/footer/) |
| GallerySection | 이미지·영상 등의 집합을 감상·탐색하는 페이지 구역 | Carousel·Grid 등 표현 방식과 독립. [Flowbite Gallery](https://flowbite.com/docs/components/gallery/) |
| PortfolioSection | 작업물·프로젝트·결과 사례를 소개하는 구역 | [Flowbite Portfolio](https://flowbite.com/blocks/marketing/portfolio/) |
| ContactSection | 문의 수단·양식·연락처·주소를 제공하는 구역 | [Flowbite Contact](https://flowbite.com/blocks/marketing/contact/) |
| NewsletterSection | 소식을 받기 위한 구독 안내와 입력 구역 | 실제 구독 목적이 있어야 함. [Flowbite Newsletter](https://flowbite.com/blocks/marketing/newsletter/) |
| CustomerLogosSection | 고객 로고를 모아 고객 관계를 소개하는 구역 | 파트너 목록이면 PartnerLogosSection 등 실제 관계를 표시. [Flowbite](https://flowbite.com/blocks/marketing/customer-logos/) |

다음은 범용 구역 구성 규칙으로 표현하는 도메인 한정 이름이다. 실제 내용이 일치할 때 사용하며 외부의 단일 표준 이름이라고 주장하지 않는다.

| 대표 이름 | 정의·적용 조건 | 근거 |
| --- | --- | --- |
| IntroSection | 뒤따를 내용의 개요와 맥락을 제시하는 구역 | HeroSection과 목적을 구분하는 코드명 규칙 |
| AboutSection | 조직·인물·제품의 배경과 정체성을 소개하는 구역 | 소개 내용에 따른 코드명 규칙 |
| ServicesSection | 제공하는 서비스와 업무 범위를 설명하는 구역 | 서비스 소개 내용에 따른 코드명 규칙 |
| ProjectsSection | 프로젝트 목록과 관련 탐색을 제공하는 구역 | 프로젝트 도메인에 따른 코드명 규칙 |
| FeaturedProjectsSection | 선정한 대표 프로젝트를 보여 주는 구역 | 대표 프로젝트 선별 내용에 따른 코드명 규칙 |
| TeamSection | 팀 구성원과 역할을 소개하는 구역 | 팀 콘텐츠에 따른 코드명 규칙 |
| StatsSection | 주요 수치와 통계를 요약하는 구역 | 수치 콘텐츠에 따른 코드명 규칙 |
| AwardsSection | 수상 내역과 인정 실적을 보여 주는 구역 | 수상 콘텐츠에 따른 코드명 규칙 |
| RelatedContentSection | 현재 콘텐츠와 관련된 다음 콘텐츠를 제공하는 구역 | 관련성 규칙과 콘텐츠 종류를 인터페이스에 기록 |

WorksIntroSection·AgencyIntroSection·DetailIntroSection처럼 실제 도메인·적용 범위를 설명하는 한정어는 유지할 수 있다. 전역 검색에서는 IntroSection 계열로 연결한다.

## 콘텐츠 구성과 복합 UI

| 대표 이름 | 정의·적용 조건 | 별칭·구분 및 근거 |
| --- | --- | --- |
| Carousel | 슬라이드 집합 중 일부를 순차 탐색하는 UI | Slideshow·ImageRotator는 검색 별칭. Slider와 구분. [WAI](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/) |
| Gallery | 미디어 집합을 탐색·감상하는 UI | 정적인 Grid여도 Gallery가 될 수 있음. [Flowbite](https://flowbite.com/docs/components/gallery/) |
| Card | 한 주제의 콘텐츠와 관련 동작을 묶은 단위 | ProjectCard·ProductCard처럼 실제 계약을 설명하는 한정어 허용. [USWDS](https://designsystem.digital.gov/components/card/) |
| Collection | 관련 항목의 간결한 정보와 연결을 모은 목록 | 배열을 렌더한다는 이유만으로 모두 Collection은 아님. [USWDS](https://designsystem.digital.gov/components/collection/) |
| Accordion | 관련 제목과 패널을 나열하고 각각 펼치거나 접는 구성 | 한 개 또는 여러 개 열림을 계약으로 구분. [WAI](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/) |
| Disclosure | 트리거와 연결 콘텐츠를 펼치고 접는 단위 | Collapsible은 라이브러리명·검색 별칭으로 연결. [WAI](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/), [Radix](https://www.radix-ui.com/primitives/docs/components/collapsible) |
| Tabs | 선택한 탭에 대응하는 패널을 활성화하는 구성 | 가로 링크 탐색과 구분. [WAI](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) |
| Table | 데이터를 행과 열의 관계로 표현한 표 | 배치용 Grid와 구분. [shadcn](https://ui.shadcn.com/docs/components/base/table) |
| DataTable | 정렬·필터·선택 등 데이터 탐색 계약이 더해진 표 | 기능 집합은 구현별로 기록. [shadcn](https://ui.shadcn.com/docs/components/base/data-table) |
| TreeView | 계층의 펼침·접힘과 탐색을 제공하는 트리 UI | 단순 중첩 목록과 구분. [WAI](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/) |
| Dialog | 다른 내용 위에서 대화·입력·작업을 수행하는 창 | Modal은 배경 상호작용을 막는 동작 성질. [Radix](https://www.radix-ui.com/primitives/docs/components/dialog) |
| AlertDialog | 중요한 메시지를 전달하고 응답을 요구하는 대화창 | 일반 Alert와 구분. [WAI](https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/) |
| Drawer | 화면 가장자리에서 열고 닫는 패널 | 방향과 스와이프·snap 동작은 구현 계약. [shadcn](https://ui.shadcn.com/docs/components/base/drawer) |
| Sheet | 라이브러리에서 사용하는 보조 패널 명칭 | 새 독자 구현은 실제 목적에 따라 Drawer·BottomSheet로 구체화 가능. 기존 라이브러리 API는 유지. [shadcn](https://ui.shadcn.com/docs/components/base/sheet) |
| Popover | 트리거와 연결되어 다른 콘텐츠 위에 펼쳐지는 표면 | 이름만으로 modal 여부·ARIA 역할이 정해지지 않음. [HTML](https://html.spec.whatwg.org/multipage/popover.html), [Radix](https://www.radix-ui.com/primitives/docs/components/popover) |
| Tooltip | hover·focus 대상의 짧은 보충 설명 | 버튼·입력 등 별도 조작을 담는 창과 구분. [Radix](https://www.radix-ui.com/primitives/docs/components/tooltip) |
| HoverCard | 링크 등의 미리보기를 보여 주는 카드형 표면 | Tooltip의 무조건적인 별칭이 아님. [Radix](https://www.radix-ui.com/primitives/docs/components/hover-card) |
| Calendar | 날짜와 월 등 달력 구조를 표시·탐색하는 UI | 입력값 선택을 결합한 DatePicker와 구분. [shadcn](https://ui.shadcn.com/docs/components/base/calendar) |
| DatePicker | 날짜 입력과 달력 등의 선택 UI를 결합한 컨트롤 | Calendar와 입력 계약의 결합. [shadcn](https://ui.shadcn.com/docs/components/base/date-picker) |
| ScrollArea | 스크롤 콘텐츠 영역과 스크롤바를 구성하는 UI | ViewportScroll 상태 제공과 구분. [Radix](https://www.radix-ui.com/primitives/docs/components/scroll-area) |
| AspectRatio | 콘텐츠의 가로·세로 비율을 유지하는 구성 | 실제 미디어 플레이어와 구분. [shadcn](https://ui.shadcn.com/docs/components/base/aspect-ratio) |
| Container | 콘텐츠의 너비·정렬 범위를 구성하는 레이아웃 단위 | [MUI](https://mui.com/material-ui/react-container/) |
| Grid | 열·간격·반응형 배치를 구성하는 레이아웃 | 데이터 표나 ARIA grid와 구분. [MUI](https://mui.com/material-ui/react-grid/) |
| Stack | 자식들을 한 축으로 나열하고 간격을 구성하는 레이아웃 | [MUI](https://mui.com/material-ui/react-stack/) |
| List | 관련 항목을 순서 있는 또는 없는 목록으로 표현하는 구성 | 옵션 선택 Listbox와 구분. [MUI](https://mui.com/material-ui/react-list/) |
| ListItem | List 안의 개별 항목 | 목록의 실제 자식 책임. [MUI](https://mui.com/material-ui/react-list/) |
| Form | 입력과 제출 계약을 묶는 양식 | [HTML form](https://html.spec.whatwg.org/multipage/forms.html#the-form-element) |
| InputGroup | 입력과 접두·접미·동작 요소를 묶는 구성 | [shadcn](https://ui.shadcn.com/docs/components/base/input-group) |

## 입력·표시 요소

| 대표 이름 | 정의·적용 조건 | 별칭·구분 및 근거 |
| --- | --- | --- |
| Button | 제출·열기·삭제 등 동작을 실행하는 컨트롤 | 이동 Link와 구분. [WAI](https://www.w3.org/WAI/ARIA/apg/patterns/button/) |
| IconButton | 아이콘을 주요 시각 표현으로 사용하는 버튼 | 접근 가능한 동작 이름을 별도로 제공. [MUI](https://mui.com/material-ui/react-button/#icon-button) |
| Link | 다른 위치나 리소스로 이동하는 참조 | 버튼 모양이어도 이동 책임이면 Link. [WAI](https://www.w3.org/WAI/ARIA/apg/patterns/link/) |
| Icon | 의미나 상태를 그림 기호로 표현하는 요소 | IconButton과 구분. [MUI](https://mui.com/material-ui/icons/) |
| Avatar | 사용자·대상을 나타내는 이미지와 대체 표시 | [shadcn](https://ui.shadcn.com/docs/components/base/avatar) |
| Badge | 짧은 상태·분류·수를 표시하는 요소 | 위치·내용은 라이브러리마다 다름. [shadcn](https://ui.shadcn.com/docs/components/base/badge), [MUI](https://mui.com/material-ui/react-badge/) |
| Chip | 속성·선택·입력·동작을 담는 작은 단위 | Badge와 무조건 같은 이름으로 합치지 않음. [MUI](https://mui.com/material-ui/react-chip/) |
| Separator | 콘텐츠의 시각적·의미적 구분선 | Divider를 검색 별칭으로 연결. [shadcn](https://ui.shadcn.com/docs/components/base/separator) |
| Input | 한 줄의 값을 입력하는 컨트롤 | 실제 타입·검증은 인터페이스에서 지정. [shadcn](https://ui.shadcn.com/docs/components/base/input) |
| Textarea | 여러 줄 텍스트 입력 | [shadcn](https://ui.shadcn.com/docs/components/base/textarea) |
| Label | 입력 컨트롤과 연결되는 이름 | 일반 문단 Text와 구분. [Radix](https://www.radix-ui.com/primitives/docs/components/label) |
| Field | 입력과 이름·설명·오류 등을 묶는 구성 | HTML fieldset과 무조건 동일한 의미는 아님. [shadcn](https://ui.shadcn.com/docs/components/base/field) |
| Select | 미리 정한 옵션 중 값을 선택하는 컨트롤 | 펼쳐지는 외형을 뜻하는 Dropdown만으로 정의하지 않음. [Radix](https://www.radix-ui.com/primitives/docs/components/select) |
| Combobox | 값 입력·선택과 연결된 팝업의 결합 | editable·select-only를 구분하며 검색 입력이 필수는 아님. [WAI](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) |
| Listbox | 옵션 목록에서 하나 이상을 선택하는 위젯 | 임의의 버튼·링크가 들어간 카드 목록과 구분. [WAI](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) |
| Checkbox | 체크 여부 또는 부분 선택 상태를 다루는 입력 | [WAI](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/) |
| RadioGroup | 선택지 중 하나를 고르는 관련 라디오 입력 묶음 | 개별 Radio와 그룹을 구분. [WAI](https://www.w3.org/WAI/ARIA/apg/patterns/radio/) |
| Switch | 설정의 켜짐·꺼짐을 전환하는 컨트롤 | 일반 체크 선택과 사용 목적을 구분. [WAI](https://www.w3.org/WAI/ARIA/apg/patterns/switch/) |
| Toggle | 눌림·활성 상태를 전환하는 컨트롤 | Switch·RadioGroup과 목적을 구분. [Radix](https://www.radix-ui.com/primitives/docs/components/toggle) |
| Slider | 정해진 범위에서 값을 고르는 입력 | 볼륨·재생 위치·가격 범위 등. Carousel의 별칭으로 사용하지 않음. [WAI](https://www.w3.org/WAI/ARIA/apg/patterns/slider/) |
| SearchInput | 검색어를 입력하는 컨트롤 | 검색 목적을 Input에 한정한 코드명. 제출·필터 결과 전체와 구분. [HTML search 입력](https://html.spec.whatwg.org/multipage/input.html#text-(type=text)-state-and-search-state-(type=search)) |
| Heading | 콘텐츠 계층의 제목 | HTML heading 의미에 대응하는 코드명 규칙. [HTML headings](https://html.spec.whatwg.org/multipage/sections.html#headings-and-outlines-2) |
| Text | 본문·설명 등 일반 텍스트 표시 | 라이브러리 Typography와 연관된 코드명 선택. 모든 텍스트를 별도 래퍼로 만드는 규칙은 아님. [MUI Typography](https://mui.com/material-ui/react-typography/) |
| Image | 이미지와 대체 텍스트 등을 다루는 미디어 요소 | [HTML img](https://html.spec.whatwg.org/multipage/embedded-content.html#the-img-element) |
| Video | 영상 콘텐츠를 표시·재생하는 미디어 요소 | 가시성 제어 ViewportVideos와 구분. [HTML video](https://html.spec.whatwg.org/multipage/media.html#the-video-element) |
| Audio | 오디오 콘텐츠를 재생하는 미디어 요소 | [HTML audio](https://html.spec.whatwg.org/multipage/media.html#the-audio-element) |
| Logo | 브랜드·조직의 식별 이미지를 표시하는 요소 | Image의 콘텐츠 목적에 따른 코드명 규칙 |

## 피드백과 로딩

| 대표 이름 | 정의·적용 조건 | 별칭·구분 및 근거 |
| --- | --- | --- |
| Alert | 현재 작업을 중단하지 않고 중요한 메시지를 전달하는 표시 | 응답이 필요하면 AlertDialog와 구분. [WAI](https://www.w3.org/WAI/ARIA/apg/patterns/alert/) |
| Toast | 화면에 잠시 표시하는 짧은 알림 | Snackbar를 검색 별칭으로 연결. [MUI Snackbar](https://mui.com/material-ui/react-snackbar/), [shadcn](https://ui.shadcn.com/docs/components/base/toast) |
| Progress | 작업의 진행 상태와 완료 정도를 나타내는 표시 | determinate·indeterminate를 구분. [shadcn](https://ui.shadcn.com/docs/components/base/progress) |
| Spinner | 진행량을 특정하지 않는 대기·로딩 표시 | 전체 로딩 수명 주기를 소유하는 Loader와 구분. [shadcn](https://ui.shadcn.com/docs/components/base/spinner) |
| Skeleton | 로딩 중 최종 콘텐츠의 형태를 대신 보여 주는 표시 | [shadcn](https://ui.shadcn.com/docs/components/base/skeleton) |
| EmptyState | 결과·콘텐츠가 없을 때 설명과 다음 행동을 제공하는 상태 UI | shadcn의 Empty를 개념 근거로 한 대표 코드명 선택. [shadcn Empty](https://ui.shadcn.com/docs/components/base/empty) |

## 동작 용어와 프로젝트 책임명

이 그룹은 일반 UI 패턴과 구분해 기록한다. 널리 쓰는 효과 용어도 정해진 React 컴포넌트·props 규격을 뜻하지는 않는다. Site·Provider·Loader·Background·CardStream·ViewportVideos·ViewportScroll은 관찰 근거가 있는 책임에만 적용하는 이름이며 모든 사이트에 생성해야 할 필수 모듈이 아니다. 같은 책임이 없다면 해당 모듈을 만들지 않는다.

| 대표 이름 | 정의·적용 조건 | 근거 구분 |
| --- | --- | --- |
| SmoothScroll | 스크롤 이동을 부드럽게 처리하는 동작 | 일반 동작 용어. CSS smooth와 wheel easing 구현을 같은 계약으로 간주하지 않음. [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scroll-behavior) |
| Parallax | 스크롤 등에 따라 여러 층이 다른 속도로 움직이는 효과 | 일반 효과 용어. [Chrome 공식 설명](https://developer.chrome.com/docs/css-ui/scroll-driven-animations/) |
| ScrollReveal | 스크롤·화면 진입에 따른 노출 애니메이션 책임 | 설명형 코드명 규칙. 특정 동명 라이브러리를 채택한다는 뜻은 아님 |
| PageTransition | 페이지 이동의 시각 전환과 완료·취소 책임 | 사이트의 경로 전환 계약에 따른 코드명 규칙 |
| Site | 페이지와 기본 콘텐츠·호스트 환경을 조립하는 전체 사이트 진입점 | 프로젝트 책임명. 전체 사이트 조립 책임이 실제로 존재할 때 사용 |
| Provider | 하위 구현에 호스트 조건과 컨텍스트를 제공하는 실행 기반 | 프로젝트 책임명. React 컨텍스트·호스트 제공 책임이 실제로 존재할 때 사용. 독립적인 시각 UI 패턴은 아님 |
| Portal | 자식의 DOM 렌더 위치를 다른 곳으로 연결하는 기반 도구 | 시각 UI 자체가 아닌 구현 의존성. [MUI](https://mui.com/material-ui/react-portal/) |
| Loader | 로딩 화면·전환 단계·종료 시점의 수명 주기를 조립하는 UI | 프로젝트 책임명. 전체 로딩 수명 주기를 조립하는 책임이 있을 때 사용 |
| Background | 배경 미디어를 구성·렌더링하는 UI | 프로젝트 책임명. 배경 렌더링 책임이 독립적으로 존재할 때 사용 |
| CardStream | 카드 목록의 연속·순환 표시와 정지 등을 조합하는 UI | 프로젝트 책임명. 연속·순환 카드 표시 계약이 있을 때 사용. Carousel과 자동 동일시하지 않음 |
| ViewportVideos | 표시 대상으로 등록한 영상의 화면 가시성에 따른 재생 제어 | 프로젝트 책임명. 영상 가시성 제어 책임이 있을 때 사용 |
| ViewportScroll | 스크롤 위치·화면 크기의 공유·구독·해제 | 프로젝트 책임명. 위치·크기 공유와 구독 책임이 있을 때 사용. ScrollArea·SmoothScroll과 구분 |

## 혼동하기 쉬운 이름의 선택 기준

- Carousel은 콘텐츠를 넘겨 보는 패턴, Slider는 값을 선택하는 입력이다. 기존 ImageSlider라는 이름은 실제 동작을 보고 분류하며 slider 문자열만으로 자동 치환하지 않는다.
- HeroSection·TestimonialsSection·FAQSection은 콘텐츠 목적이다. Carousel·Accordion은 표현·동작이다. HeroSection 안에 Carousel이 있거나 FAQSection이 Accordion을 사용할 수 있다.
- Gallery는 미디어 집합이고 Carousel은 순차 노출 방식이다. 정적인 Gallery를 Carousel로 부르지 않는다.
- Dialog는 창의 역할이고 modal은 배경 상호작용을 막는 성질이다. Dialog·Modal을 무조건 동의어로 만들지 않는다. [MUI Modal](https://mui.com/material-ui/react-modal/)
- Navigation과 Menu는 구분한다. 일반 탐색 링크를 메뉴처럼 보인다는 이유로 ARIA menu로 바꾸지 않는다.
- Tooltip·Popover·HoverCard는 보여 주는 내용과 상호작용 계약으로 구분한다. 팝업이라는 외형만으로 같은 이름을 붙이지 않는다.
- Drawer·Sheet는 라이브러리마다 경계가 다르다. 방향·modal 여부·스와이프·snap 계약을 먼저 기록한다. 하나는 반드시 아래쪽, 다른 하나는 반드시 오른쪽이라고 정하지 않는다.
- Badge·Chip도 라이브러리마다 역할 범위가 다르다. 보여 주는 짧은 표시와 선택·삭제 등 동작을 실제 계약으로 구분한다.
- Spinner·Skeleton·Progress는 로딩을 표현하는 서로 다른 단위다. 로딩 시퀀스 전체인 Loader와 합치지 않는다.
- 이름이 같아도 구현·소유자·호스트·재사용 검증 상태는 별개다. 범용 이름을 사용한다고 common 배치나 shared=true가 자동 결정되지 않는다.

## 명칭을 적용하는 순서

1. 소스·렌더링·입력·상태·cleanup을 읽어 실제 책임을 확인한다.
2. 사전 정의에 맞는 대표 이름이 있으면 우선 사용한다. Header·Footer·HeroSection·Carousel 모두 같은 우선 원칙을 적용한다.
3. 의미 차이가 있거나 같은 공개 범위에서 이름이 충돌하면 실제 차이를 설명하는 한정어를 붙인다. 예: ProjectCard, ProductCard, ImageCarousel, VideoCarousel, WorksIntroSection.
4. 파일명·컴포넌트 export·props 타입·사용 예제·카탈로그 표시를 맞춘다. 라이브러리에서 import하는 고유 API를 사전 이름으로 임의 변경하지 않는다.
5. 기존 등록 ID는 유지한다. 이전 이름과 라이브러리별 이름은 tags·설명에 검색 별칭으로 연결하되, 의미가 다른 용어를 같은 역할로 병합하지 않는다.
6. 맞는 용어가 없으면 내용·동작을 설명하는 이름을 제안하고 정의·근거·적용 범위를 사전에 추가한다. 근거가 부족한 이름을 보편 표준으로 표시하지 않는다.

페이지는 Page, 독립된 페이지 구역은 Section 접미사를 사용한다. Header·Footer·Carousel 등은 자체 역할명이 충분하므로 불필요한 Component·Element·Section을 덧붙이지 않는다. 프로젝트명 접두사는 반복하지 않되, 실제 콘텐츠·동작 제약을 설명하는 단어는 제거하지 않는다.

비공개 구성원의 소유 문맥이 중요한 경우 CardHeader·DialogTitle·AccordionItem처럼 부모 이름을 남긴다. 이름을 짧게 한다는 이유로 전역 공개 범위에 여러 Header·Content·Item을 충돌시켜 내보내지 않는다.

사전에 이름이 있다는 이유로 기본 HTML 태그마다 래퍼를 만들거나 해당 이름의 빈 폴더·공개 export를 생성하지 않는다. 기존 구현에서 의미 있게 탐색·수정·이식할 책임에 이름을 적용한다.

## 아키텍처와 검색에 연결하는 계약

react-reference-architecture는 각 모듈에 대표 이름, 실제 이름, 원본·이전 이름, 의미 분류, 소유자, 근거, 공개 경로, 실제 사용처를 기록한다. 코드명 규칙이나 프로젝트 책임명을 공식 패턴명과 구분해서 남긴다. 기존 component-map 스키마가 지원하지 않는 새 필드를 임의 추가하지 않는다.

예를 들어 대표 이름 Carousel의 항목은 `role:carousel`, `alias:ImageCarousel`, `alias:캐러셀` 같은 기존 태그 규칙으로 연결한다. `alias:slider`를 무조건 부여하지 않는다. 검색 결과에서는 같은 역할의 다른 구현과 동일 ID의 실제 사용처를 구분한다.

이 사전은 [이식 가능한 소스 구조](portable-structure.md)와 [아키텍처 계약](architecture-contract.md)의 공통 명칭 근거다. 여러 사이트의 같은 역할을 검색할 수 있도록 대표 이름과 의미가 맞는 별칭을 일관되게 기록한다. 같은 역할이라는 관계와 같은 구현을 실제로 재사용한다는 관계를 분리한다. 명칭 사전만으로 검색 UI·인덱서·카탈로그 스키마가 새로 구현되는 것은 아니며, 기존 스키마에서 표현할 수 없는 관계는 아키텍처 문서에 기록하고 필요한 스키마 변경을 별도로 명시한다.

프로젝트 문서에 사본을 둘 때는 이 파일의 버전과 출처를 표시하고 해당 사이트의 근거·실제 이름·사용처를 추가한다. 공통 정의를 바꿀 때는 이 원본을 먼저 갱신한 뒤 파생 사본을 함께 갱신한다.
