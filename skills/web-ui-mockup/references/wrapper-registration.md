# UI 전달 후 wrapper-packages 등록

검수한 UI를 전달한 다음 응답에서 `wrapper-packages` 등록을 제안한다. 사람이 후보와 등록 범위를 승인한 뒤 실제 소스를 등록한다. 등록 결과의 전체 `itemId`를 다른 곳에서 재사용할 식별자로 전달한다.

이 절차는 `web-ui-mockup`과 `prototype`의 UI 분기에 적용한다. 로직 프로토타입에는 적용하지 않는다.

## 시각 결과를 전달하기 전

검수가 끝나고 최종 이미지·경로·URL을 정했으면 전달 기록을 남긴다. 스킬을 조사하거나 문서만 수정할 때는 기록하지 않는다. 완료한 시각 자료가 없거나 사용자가 이번 전달의 등록을 거절했어도 기록하지 않는다.

1. 전달마다 `delivery_id`를 정한다. 같은 전달을 재시도할 때는 같은 값을 쓴다. 결과를 실질적으로 바꿔 새로 전달하면 새 값을 쓴다.
2. 검수한 후보의 변형 이름, 종류, 요약과 실제 자료를 기록한다. `delivery_id`와 변형 이름은 영구 Item ID가 아니다.
3. 설치된 `web-ui-mockup/scripts/wrapper_followup.py`의 절대 경로를 확인하고 `record`를 호출한다. 검수 후, 최종 시각 결과를 전달하기 전에 호출한다.
4. 최종 응답에 기록한 후보마다 이미지와 경로 또는 정확한 URL을 넣는다. 로컬 이미지와 파일은 절대 경로를 쓴다.

아래 값은 호출 형식 예시다. 실제 검수한 자료로 바꾼 뒤 사용한다. `prototype`의 UI 분기에서는 `skill`을 `prototype-ui`로 바꾼다.

```sh
python3 /Users/igyeongseob/.codex/skills/web-ui-mockup/scripts/wrapper_followup.py record <<'JSON'
{
  "delivery_id": "settings-cards-v1",
  "skill": "web-ui-mockup",
  "candidates": [
    {
      "variant": "B",
      "kind": "component",
      "summary": "설정 카드 배치",
      "artifacts": ["/absolute/reviewed-B.png"]
    }
  ]
}
JSON
```

`artifacts`에는 실제 파일의 절대 경로나 검수한 정확한 `http(s)` 미리보기 URL을 쓴다. URL의 변형 선택값도 보존한다. 지원 종류는 `site`, `page`, `section`, `component`, `element`, `interaction`, `state`다. 선택 필드 `ui_role`에는 확인한 역할만 쓴다.

Stop hook은 응답에서 자료 전달을 확인하고 전달마다 한 번만 다음 응답을 이어 준다. hook은 등록을 제안하도록 알릴 뿐이다. hook이 사람을 대신해 승인하거나 등록하지 않는다.

hook 설치나 신뢰 설정 때문에 후속 응답을 만들 수 없으면 최종 전달에 같은 등록 제안을 직접 넣는다. 제품 적용 승인 질문이 있으면 등록 제안은 안내문으로 쓴다. 이 제약 때문에 UI 작업을 멈추지 않는다.

## 다음 응답에서 제안할 내용

실제 전달한 후보 중 재사용할 대상을 이름으로 지정한다. 등록할 종류, 사용할 소스와 남은 구현 조건을 짧게 밝힌다. 사람이 선택한 후보와 범위를 승인할 수 있도록 등록 질문 하나를 한다.

예: “B안 설정 카드를 `component`로 등록해 다른 프로젝트에서도 Item ID로 재사용할 수 있게 할까요?”

제품 적용 승인과 패키지 등록 승인을 구분한다. “B안을 원래 앱에 적용해”는 패키지 등록 승인이 아니다. 자동 hook의 문구도 사람의 승인이 아니다. 사람이 이번 전달의 등록을 거절하면 같은 전달에서 다시 제안하지 않는다.

## 사람이 등록을 승인한 뒤

작업 저장소는 `/Users/igyeongseob/Develop/08_side/front/wrapper/wrapper-packages`다. 먼저 상위 `wrapper/AGENTS.md`와 저장소 `AGENTS.md`를 읽는다. **필수:** 그 저장소의 `skills/project-site-integration/SKILL.md`를 적용한다. source 추가나 공개 export 변경에는 `skills/project-api-readme/SKILL.md`도 적용한다.

1. 승인한 후보·변형·등록 범위를 확인한다. 실제 구현의 소유 파일, 호출부, 공개 export, CSS·에셋과 호스트 조건을 추적한다.
2. PNG만 있으면 승인한 범위에서 실제 구현을 먼저 준비한다. 새 UI의 원천 프로젝트가 없으면 승인한 저장소에 소스를 둔다. 쓰기 권한이나 구현 범위가 빠졌으면 그 조건을 확인한다. 프로토타입 코드를 그대로 배포하지 않는다.
3. `projects/<projectId>/source`는 읽기 전용 gitlink로 취급한다. 그 안에서 UI를 새로 만들거나 수정하지 않는다. 원천 변경은 승인한 원천 저장소에서 준비한다.
4. 실제 소유 경계로 종류와 역할을 정한다. `page-transition`이라는 종류를 추가하지 않는다. 기존 전환 사례는 `interaction`과 `uiRole: RouteTransition`을 사용하지만, 이름만 보고 같은 분류를 적용하지 않는다.
5. 기존 `identity-baseline.json`과 `item-identities.json`의 계약을 따른다. 기존 ID를 보존하고 전체 ID는 생성한 카탈로그에서 읽는다. 변형마다 `case`, `revision`, `sourceUsage`를 확인한다. 모든 변형을 임의로 한 ID에 합치지 않는다.
6. 실제 스크립트와 설정을 읽고 기존 제작 흐름을 사용한다. 새 등록 CLI나 별도 registry를 만들지 않는다. 아직 없는 버전으로 다음 명령을 실행한다.

```sh
pnpm project:release --project <projectId> --version <new-version>
```

소비자 갤러리는 `dependency` 항목을 제외한다. 노출하려고 `dependency`를 `portable`로 바꾸지 않는다. 앱 반영까지 승인받았으면 프로젝트 지침에 따라 소비용 gitlink와 선택 버전을 갱신한다. 커밋·push·외부 서비스 게시를 자동으로 시작하지 않는다.

## 등록 결과 전달

완료 보고에는 다음 정보를 넣는다.

- 생성한 카탈로그의 전체 `itemId`, 프로젝트와 릴리스 버전, 실제 TGZ 경로.
- 확인한 export와 import 예제, CSS·에셋 경로, 필수 Provider·라우터·입력·해제 조건.
- `readItem(itemId)`로 항목을 읽는 방법. `resolvePreview(itemId, selection)`과 `readDownloads(itemId, selection)`으로 변형을 선택하는 방법.
- 실행한 제작·패키지 소비·브라우저 검사와 결과. 실행하지 못한 검사와 남은 조건.

제작 성공, 앱 표시, 독립 소비와 원천 일치는 각각 확인한 근거로 보고한다. 자료가 부족하면 임시 Item ID를 만들어 완료로 보고하지 않는다.
