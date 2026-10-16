# 프로젝트별 촬영 기록

샷을 계획하거나 결과의 출처를 남길 때 읽는다. 기존 manifest가 있으면 그 형식을 유지하며 아래 정보를 대응시킨다. 새 프레임워크나 설정 계층은 필요하지 않다.

## 실행별로 정할 값

| 범위 | 값 |
| --- | --- |
| 대상 | 프로젝트 경로, 실제 URL/route, 소스 revision, 입력 ID 전체 목록 |
| 실행 | 독립 화면/소유 페이지/소비자 증거, props/provider/children 조건 |
| 샷 | 시작 상태와 초기화, 입력 순서, 기대 반응, 필수 반응형 상태 |
| 녹화 | 도구, 정확한 탭/창 식별과 선택된 탭, 시각, raw 크기, 확인한 viewport/DPR, 웹 경계, 입력 방식과 도구 표시 검수 |
| 변환 | 원본 파일, 원본 기준 구간, source-pixel 크롭, padding, 출력 규격, poster 시점 |
| 검수 | 기술 검사, 실제 동작·콘텐츠 전용 시각 검수, 요청된 카드 연결 확인 |

revision을 얻을 수 없는 원격 사이트는 실제 URL과 관찰 시각 등 확보한 근거를 기록한다. 알 수 없는 commit을 채우지 않는다. 녹화 capability와 승인 여부는 현재 실행 기록에 남기고 미래 실행의 권한으로 사용하지 않는다.

별도 체크아웃의 기존 서버를 재사용하면 실제 실행 루트, revision, 작업 트리 상태와 촬영 대상·호스트·스타일의 소스 대응을 확인한다. 같은 이름이나 URL만으로 대상 프로젝트의 실행이라고 주장하지 않는다.

권한 진단에는 실행 문맥별 명령·결과를 남긴다. OS 권한 미확인과 샌드박스 제한을 구분하고, 실패한 촬영은 제외 이유와 함께 보존한다. 포인터 오염을 피한 입력 방식, 실제 상태 변화와 대표 장면의 시점도 기록한다. 녹화의 `RECORDING` 시각과 입력 시각을 함께 남기면 raw 구간을 고르는 데 도움이 된다.

## 예시 구조

아래 수치·ID·경로는 형식 설명용이다. 카드 규격과 실제 측정으로 바꾸고, 확인하지 않은 항목은 통과 상태로 기록하지 않는다. `items`는 일부 파일만이 아니라 입력 전체 목록을 나타낸다.

```json
{
  "source": {
    "url": "http://127.0.0.1:57000/gallery",
    "revision": null
  },
  "output": {
    "width": 720,
    "height": 720,
    "fps": 30,
    "audio": "none",
    "codec": "h264",
    "pixelFormat": "yuv420p",
    "faststart": true,
    "crf": 26,
    "preset": "slow"
  },
  "items": [
    {
      "itemId": "consent-panel",
      "status": "planned",
      "renderMode": "owning-page",
      "route": "/gallery",
      "setup": "Clear consent using the app reset; scroll to top; panel closed",
      "viewportCss": [1024, 768],
      "actions": ["Open preferences", "Toggle optional consent", "Close panel"],
      "expected": "Dialog opens, switch changes, then closes",
      "capture": {
        "recordedAt": null,
        "rawFile": "var/motion/consent-raw.mp4",
        "rawSizePx": [2048, 1800],
        "observedDpr": 2,
        "contentRectPx": [0, 264, 2048, 1536],
        "rangesSeconds": [[2, 7], [10, 14]],
        "cropPx": [0, 264, 2048, 1536]
      },
      "video": "public/previews/consent-panel.mp4",
      "poster": "public/previews/consent-panel.jpg",
      "posterSeconds": 3,
      "verification": {"technical": "pending", "visual": "pending", "card": "pending"}
    }
  ]
}
```

`renderMode`는 `isolated`·`owning-page`·`consumer-evidence`를 구분한다. `status`는 `planned`에서 실제 검수를 마친 `verified` 또는 이유를 명시한 `blocked`로 갱신한다. 이 키 이름 자체를 기존 프로젝트에 강제하지 않는다.

## 좌표와 시간의 계약

- `contentRectPx`와 `cropPx`는 raw 영상의 source pixel 기준 `[x, y, width, height]`다. CSS 좌표와 혼동하지 않는다. 크롭이 웹 영역과 raw 경계 안에 있으며 필요한 UI 상태를 포함하는지 샘플로 확인한다.
- 브라우저 스크린샷·창 프레임·raw 크기는 단위와 배율이 다를 수 있다. 확인하지 못한 DPR은 `null`과 측정 설명으로 남기고 raw 프레임에서 경계를 직접 정한다. 창 크기의 배수만으로 CSS-to-raw DPR을 확정하지 않는다. 탭/창 이동·브라우저 재시작 후에는 식별자와 측정을 갱신하고, 사라진 임시 파일을 성공 근거로 사용하지 않는다.
- `rangesSeconds`는 각 raw 파일 시작을 0으로 하는 원본 시각이다. `0 ≤ start < end ≤ rawDuration`, 순서와 중복을 확인한다. ffmpeg 입력 `-ss`로 seek한 후 trim한다면 기준 시각을 보정한다.
- 실제 입력·애니메이션은 등속으로 남긴다. 긴 대기를 생략할 때는 조작의 인과관계가 보이는 구간을 선택한다. 로딩 표시가 대상이면 해당 로딩 시간도 필요한 내용에 포함한다.
- `posterSeconds`는 편집 후 최종 영상을 기준으로 길이 안에서 선택한다. 필요하면 기존 ffmpeg의 `-ss`·`-frames:v 1`로 JPEG를 출력한다.
- 한 항목이 여러 raw/viewport에 걸치면 세그먼트별로 raw·구간·크롭·측정 조건을 구분한다. 다른 측정의 좌표를 공유하지 않는다.

## 판정과 반영

기술값은 실제 출력의 ffprobe 결과로 보완한다. 전체 ID의 유일성과 MP4/JPEG 대응을 입력 목록과 대조한다. 프레임 해시 변화는 움직임의 보조 증거이며, 올바른 항목·입력 반응·브라우저 UI 부재는 시각적으로 확인한다.

구간 편집 후 FPS 변환으로 생긴 길이 차이는 프레임 단위로 평가한다. ffprobe의 소수점 반올림 오차를 분리하고, 경계값에 대한 미세한 수치 허용치를 두되 실제 프레임 누락이나 동작 잘림을 통과시키지 않는다. 검수 페이지에서 재생 시간이 증가하고 정지 후 유지되는지도 확인하며, 임시 페이지 검증을 실제 제품 카드 연결 검증으로 표시하지 않는다.

원본과 공개 에셋의 위치를 구분하고 새 임시 출력을 검사한 뒤 교체한다. 기존 카드에 이미지/영상이 모두 필요한 계약이 있으면 지키고, 누락을 다른 항목의 미디어로 채우지 않는다. 기록에는 최종 경로, 실측 크기·길이·바이트, 수행한 검수와 수행하지 못한 검수를 남긴다.
