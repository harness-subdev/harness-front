# 빌드와 릴리스

`VERSION`이 유일한 배포 버전입니다. 첫 버전은 `0.1.0`이며 정식 SemVer
`MAJOR.MINOR.PATCH`만 지원합니다. 스킬별 버전이나 npm 패키지는 만들지 않습니다.

## 빌드

Git, Node.js 24, Bash, tar, shasum을 준비하고 변경 사항을 커밋한 뒤 실행합니다.

```bash
bash scripts/build.sh
```

커밋된 전체 소스를 `git archive`로 꺼내 README의 모든 Node 테스트를 실행합니다.
스킬 정의를 확인하고 `build-info.json`을 추가하여 `dist/`에 tar.gz와 SHA-256을
생성합니다. 압축 해제 후 스킬 파일 일치와 체크섬도 검사합니다. Git이 추적하는
숨김 파일과 fixture가 포함되며 미추적 파일과 로컬 비밀 파일은 포함되지 않습니다.

PR, main push, Actions의 Build and Release → Run workflow는 빌드만 수행합니다.
Artifacts는 30일 보관되며 파일명에 버전과 커밋, artifact 이름에 run ID와 attempt가
들어갑니다. build-info.json은 전체 SHA, workflow, event, run ID/number/attempt를
기록합니다. PR 빌드는 GitHub가 생성한 merge commit을 검사합니다.

## 다음 버전 준비와 게시

1. 브랜치에서 `VERSION`을 수정하고 변경 설명과 함께 PR을 만듭니다.
2. Build and Release의 build 성공을 확인한 뒤 PR을 main에 병합합니다.
3. 게시할 main 커밋에서 다음을 실행합니다. 첫 릴리스는 `v0.1.0`입니다.

```bash
git switch main
git pull --ff-only
version=$(cat VERSION)
git tag -a "v$version" -m "Release v$version"
git push origin "v$version"
```

태그 push만 GitHub Release를 게시합니다. 버전·태그·커밋 일치와 전체 빌드가
통과해야 하며, 빌드한 바로 그 artifact를 내려받아 체크섬 검사 후 게시합니다.
릴리스에는 스킬 소스 묶음, 체크섬, 버전·커밋·빌드 링크와 자동 변경 내역이 포함됩니다.
설정 병합과 수동 빌드 실행만으로는 기존 버전을 게시하지 않습니다.

## 다운로드 및 설치

GitHub Releases에서 같은 버전의 `.tar.gz`와 `.sha256` 파일을 내려받습니다.

```bash
shasum -a 256 -c herness-front-*.sha256
mkdir herness-front-release
tar -xzf herness-front-*.tar.gz -C herness-front-release
mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills"
cp -R herness-front-release/skills/* "${CODEX_HOME:-$HOME/.codex}/skills/"
```

동일 이름의 설치 스킬은 갱신됩니다. 사용자 수정본이 있으면 먼저 백업하세요.

## 실패와 재실행

빌드 실패는 해당 로그와 SHA를 확인합니다. 코드 수정 후에는 새 커밋의 빌드를
확인해야 합니다. 재실행은 원래 커밋을 다시 실행합니다.

릴리스는 태그별로 직렬화됩니다. 기존 draft나 게시된 release가 있으면 CLI가
오류로 중단합니다. 자동 복구·덮어쓰기·태그 이동은 하지 않습니다. 업로드가
부분 완료됐거나 응답이 불확실하면 기존 release, asset checksum, commit을
확인한 뒤 복구 여부를 판단합니다. 게시된 바이트 수정은 새 버전을 사용합니다.
