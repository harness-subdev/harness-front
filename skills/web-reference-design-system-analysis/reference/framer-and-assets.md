# Framer와 자산 조사

Framer 페이지와 이미지·폰트·SVG를 조사할 때 사용한다.
기존 스킬의 권한 범위와 증거 기준을 따른다.
이 문서는 앱 구조나 구현 스택을 선택하지 않는다.

<a id="observation"></a>

## 관찰

`behavior-only`에서는 브라우저에 노출된 DOM, 스타일, 자산 메타데이터와 동작만 조사한다.
다운로드, 원본 아카이브, 파일 수정은 포함하지 않는다.

- Framer가 데스크톱·모바일 DOM을 함께 렌더링하면 각 화면 크기에서 실제로 보이는 변형을 구분한다.
  `data-framer-name`은 탐색 단서로 사용한다. 생성한 클래스나 중복 DOM을 컴포넌트 구조로 확정하지 않는다.
- 초기 애니메이션이 끝난 상태와 스크롤로 나타난 상태를 구분한다.
  전체 페이지 캡처에서 비어 보이는 구간은 실제 입력으로 진입한 뒤 다시 관찰한다.
- 스크롤, 시간, 클릭, 호버 중 무엇이 상태를 바꾸는지 기록한다.
  고정 구간의 시작·이동 거리·해제 시점과 역방향 동작을 확인한다.
  휠·터치·키보드 입력을 사용하고, 프로그램으로 스크롤한 결과만으로 입력 동작을 판단하지 않는다.
- 모바일부터 설계 너비보다 넓은 화면까지 구조가 바뀌는 지점을 확인한다.
  화면 높이가 바뀔 때 고정 구간과 미디어 크기가 달라지는지도 기록한다.
- `lenis` 클래스나 라이브러리 이름은 탐색 단서다.
  실제 컨트롤러·설정·입력 반응과 연결하기 전에는 해당 라이브러리가 동작을 소유한다고 확정하지 않는다.
- 이미지는 `src`와 `currentSrc`, `srcset`, 표시 크기, 원본 크기, `object-fit`, 잘라내기 위치를 구분한다.
  폰트는 실제 적용한 family·weight·style을 기록한다. 확인할 수 없는 파일 속성은 `unresolved`로 남긴다.
- SVG는 inline과 `<img>` 사용 방식을 구분한다.
  애니메이션은 한 주기를 관찰하고, 외부 스타일·조상 선택자·공유 정의에 의존하는지 기록한다.
  허용한 관찰만으로 의존 관계를 확인할 수 없으면 추론과 미확인을 구분한다.

## 승인한 자산 수집과 분석

이 절은 `source-mirror-assisted`에서만 적용한다.
기존 manifest에 정확한 원본 URL과 query, 원본 바이트, 응답 형식, hash를 기록한다.
원본은 `source/original/`에 보존하고 변환 결과는 `source/derived/`에 둔다.

- 파일명과 응답 형식이 다르면 응답 헤더와 파일 바이트를 함께 검사한다.
  `.png` URL이 AVIF를 반환하면 원본 응답을 보존하고 실제 형식을 자산 대응 기록에 적는다.
  HTTP 성공만으로 이미지 수집을 완료했다고 판단하지 않는다.
- 화면 크기별 `currentSrc`를 원본 URL과 연결한다.
  같은 파일명을 가진 URL은 별도로 식별하고, 필요한 해상도와 잘라내기를 확인한다.
  승인한 재생 환경에서 해당 자산이 표시되는지도 검사한다.
- 폰트 파일의 실제 weight·style과 가변 축을 확인한다.
  정적 medium 파일에 가변 weight 범위를 선언하지 않는다.
  선언한 폰트와 실제 렌더링 결과가 다르면 원인과 미확인 항목을 기록한다.
- SVG 파일을 분리하면 namespace, `viewBox`, gradient·mask·clip·symbol 참조와 CSS 의존 관계를 확인한다.
  inline에서 동작해도 `<img>`에서는 외부 스타일이나 스크립트가 동일하게 적용되지 않을 수 있다.
  분리본은 원본을 덮어쓰지 않고 파생 파일로 만든다. 실제 사용 방식에서 렌더링과 한 주기의 동작을 검사한다.
- 증거를 기존 자산 대응 기록과 컴포넌트 계약에 연결한다.
  자산 검사만으로 Oracle 완료나 컴포넌트 패리티를 주장하지 않는다.

## 출처와 라이선스

[AI Website Cloner Template의 조사 지침](https://github.com/JCodesMore/ai-website-cloner-template/tree/ee3f5a2f31fd549b9593fa4f7cf6d2955ee593bb/.agents/skills/clone-website/references)을 참고해 적용 범위에 맞게 정리했다.
원본의 MIT 고지를 아래에 보존한다.

```text
MIT License

Copyright (c) 2025 JCodesMore

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
