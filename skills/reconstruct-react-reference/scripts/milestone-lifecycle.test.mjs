import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const load = (relativePath) => readFile(new URL(relativePath, import.meta.url), 'utf8');

test('routes full reference work through the approved lifecycle', async () => {
  const [skill, lifecycle, workflow, boundary, metadata] = await Promise.all([
    load('../SKILL.md'),
    load('../references/milestone-lifecycle.md'),
    load('../references/workflow.md'),
    load('../references/implementation-boundary.md'),
    load('../agents/openai.yaml'),
  ]);

  assert.match(skill, /references\/milestone-lifecycle\.md/);
  assert.match(skill, /Clean application files begin only after Oracle validation passes/);
  assert.match(skill, /metadata-only validation envelope/);
  assert.match(skill, /site-reference-audit/);
  assert.match(skill, /react-reference-architecture/);
  assert.ok(
    skill.indexOf('site-reference-audit') < skill.indexOf('react-reference-architecture'),
    'scoped audit must precede React architecture',
  );
  assert.equal((lifecycle.match(/^## Milestone [1-3] - /gm) ?? []).length, 3);
  assert.match(lifecycle, /## Milestone 1 - Original runtime oracle/);
  assert.match(lifecycle, /## Milestone 2 - Clean React\/Next\.js reconstruction/);
  assert.match(lifecycle, /## Milestone 3 - Proven cross-project design system/);
  assert.match(lifecycle, /Page -> Section -> proven UI/);
  assert.match(lifecycle, /Standalone/);
  assert.match(lifecycle, /Immersive Runtime/);
  assert.match(lifecycle, /preflight-only/);
  assert.match(lifecycle, /Create it only after the Oracle stage passes/);
  assert.match(lifecycle, /GSD is the management rail only/);
  assert.match(lifecycle, /brainstorming -> writing-plans ->/);
  assert.match(lifecycle, /Do not use `gsd-discuss-phase`, `gsd-plan-phase`, or `gsd-execute-phase`/);
  assert.match(workflow, /## Preflight: Scoped reference audit/);
  assert.match(workflow, /## Gate 2: Component map and React architecture approval/);
  assert.match(workflow, /architecture hash differs across/);
  assert.match(boundary, /approved `.reference-reconstruction\/react-architecture\.md`/);
  assert.match(boundary, /must verify that the packet hash matches/);
  assert.match(metadata, /\$reconstruct-react-reference/);
});
