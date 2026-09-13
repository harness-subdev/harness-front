#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
version=$(cat VERSION)
[[ "$version" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]] || { echo 'VERSION must be stable MAJOR.MINOR.PATCH' >&2; exit 1; }
sha=$(git rev-parse HEAD)
if [[ "${GITHUB_REF_TYPE:-}" == tag ]]; then
  [[ "$GITHUB_REF_NAME" == "v$version" ]]
  [[ "$(git rev-parse "refs/tags/$GITHUB_REF_NAME^{commit}")" == "$sha" ]]
fi
# ponytail: release versions are edited in a reviewed PR; no custom bump engine.
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || { echo 'Commit tracked changes before packaging' >&2; exit 1; }
name="herness-front-$version-${sha:0:12}"
mkdir -p dist
stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT
git archive HEAD | tar -xf - -C "$stage"
node --test "$stage"/skills/design-system-reference-analyzer/scripts/*.test.mjs "$stage"/skills/reconstruct-react-reference/scripts/*.test.mjs "$stage"/skills/interactive-webgl-analysis-poc/evals/*.test.mjs
node "$stage/skills/design-system-reference-analyzer/scripts/extract-reference-graph.regression-test.mjs"
node "$stage/skills/interactive-webgl-analysis-poc/scripts/test-tools.mjs"
BUILD_VERSION="$version" BUILD_SHA="$sha" BUILD_STAGE="$stage" node --input-type=module <<'JS'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const e = process.env;
assert.equal(readFileSync(`${e.BUILD_STAGE}/VERSION`, 'utf8').trim(), e.BUILD_VERSION);
for (const skill of readdirSync(`${e.BUILD_STAGE}/skills`)) {
  assert.match(readFileSync(`${e.BUILD_STAGE}/skills/${skill}/SKILL.md`, 'utf8'), /^---\r?\nname:/);
}
writeFileSync(`${e.BUILD_STAGE}/build-info.json`, JSON.stringify({
  version: e.BUILD_VERSION, sha: e.BUILD_SHA,
  repository: e.GITHUB_REPOSITORY ?? 'local', workflow: e.GITHUB_WORKFLOW ?? 'local',
  runId: e.GITHUB_RUN_ID ?? null, runNumber: e.GITHUB_RUN_NUMBER ?? null,
  runAttempt: e.GITHUB_RUN_ATTEMPT ?? null, event: e.GITHUB_EVENT_NAME ?? 'local',
}, null, 2) + '\n');
JS
tar -czf "dist/$name.tar.gz" -C "$stage" .
(cd dist && shasum -a 256 "$name.tar.gz" > "$name.sha256")
# Check the actual deliverable, including hidden configuration and skill resources.
mkdir "$stage/unpacked"
tar -xzf "dist/$name.tar.gz" -C "$stage/unpacked"
diff -r "$stage/skills" "$stage/unpacked/skills"
cmp "$stage/build-info.json" "$stage/unpacked/build-info.json"
(cd dist && shasum -a 256 -c "$name.sha256")
if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  printf 'name=%s\nversion=%s\nsha=%s\n' "$name" "$version" "$sha" >> "$GITHUB_OUTPUT"
fi
