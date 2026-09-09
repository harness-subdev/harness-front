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

test('routes an existing mismatched reconstruction through correction intake before architecture and implementation', async () => {
  const [skill, lifecycle, workflow, boundary] = await Promise.all([
    load('../SKILL.md'),
    load('../references/milestone-lifecycle.md'),
    load('../references/workflow.md'),
    load('../references/implementation-boundary.md'),
  ]);

  const oracleGate = workflow.indexOf('## Gate 1: Oracle closure');
  const correctionGate = workflow.indexOf('## Gate 1.5: Existing-target correction intake');
  const architectureGate = workflow.indexOf('## Gate 2: Component map and React architecture approval');
  const planGate = workflow.indexOf('## Gate 3: Written implementation plan');
  const implementationGate = workflow.indexOf('## Gate 4: Clean implementation');
  const signatureGate = workflow.indexOf('## Gate 4.5: Desktop signature proof');
  const parityGate = workflow.indexOf('## Gate 5: Research parity and correction loop');
  const promotionGate = workflow.indexOf('## Gate 6: Promotion and catalog');

  assert.ok(oracleGate >= 0, 'Oracle gate must exist');
  assert.ok(correctionGate > oracleGate, 'correction intake must follow Oracle closure');
  assert.ok(architectureGate > correctionGate, 'architecture must consume correction intake');
  assert.ok(planGate > architectureGate, 'planning must follow approved architecture');
  assert.ok(
    workflow.indexOf('Run `--stage architecture`') > architectureGate
      && workflow.indexOf('Run `--stage architecture`') < planGate,
    'architecture validation must pass before planning',
  );
  assert.ok(implementationGate > planGate, 'implementation must follow approved planning');
  assert.ok(signatureGate > implementationGate, 'desktop signature proof must follow its implementation');
  assert.ok(parityGate > signatureGate, 'broader parity must follow the desktop signature gate');
  assert.ok(promotionGate > parityGate, 'promotion must follow the correction loop');
  assert.match(workflow, /existing target.*mismatch evidence/is);
  assert.match(workflow, /evidenceClaims/);
  assert.match(workflow, /unresolved/);
  assert.match(workflow, /user feedback/i);
  assert.match(skill, /existing target.*reference implementation/is);
  assert.match(lifecycle, /baseline mismatch/i);
  assert.match(boundary, /scrubbed correction claims/i);
});

test('reopens stale gates when feedback changes a required fidelity claim', async () => {
  const [skill, workflow, lifecycle, contracts] = await Promise.all([
    load('../SKILL.md'),
    load('../references/workflow.md'),
    load('../references/milestone-lifecycle.md'),
    load('../references/contracts.md'),
  ]);

  for (const text of [skill, workflow, lifecycle, contracts]) {
    assert.match(text, /user feedback/i);
    assert.match(text, /parityStatus.*stale/is);
  }
  assert.match(workflow, /architecture.*plan.*stale/is);
  assert.match(workflow, /root owner/i);
  assert.match(workflow, /recapture/i);
});

test('does not claim exact fidelity from library presence or partial GPU evidence', async () => {
  const [skill, workflow] = await Promise.all([
    load('../SKILL.md'),
    load('../references/workflow.md'),
  ]);

  for (const text of [skill, workflow]) {
    assert.match(text, /library presence (?:does not|cannot|never).*effect ownership/is);
    assert.match(text, /partial GPU.*(?:does not|cannot|never).*exact(?:-fidelity)? claim/is);
  }
  assert.match(workflow, /shader compile.*program link.*framebuffer.*pass order.*texture binding.*GL error/is);
  assert.match(workflow, /same route state.*viewport.*input.*readiness/is);
  assert.match(workflow, /Plain Canvas2D.*not GPU evidence.*not-applicable/is);
});

test('blocks broader implementation until an owner-bound desktop signature passes', async () => {
  const [skill, workflow, boundary, contracts] = await Promise.all([
    load('../SKILL.md'),
    load('../references/workflow.md'),
    load('../references/implementation-boundary.md'),
    load('../references/contracts.md'),
  ]);

  assert.match(skill, /desktop-primary signature.*before broader implementation/is);
  assert.match(skill, /--stage signature/);
  assert.match(workflow, /## Gate 4\.5: Desktop signature proof/);
  assert.match(workflow, /Do not start another Section.*until every signature checkpoint passes/is);
  assert.match(workflow, /forbids renderer substitution.*WebGL.*Canvas2D/is);
  assert.match(workflow, /empty list.*CSS overlay.*DOM overlay.*screenshot overlay.*checkpoint-conditional/is);
  assert.match(boundary, /signature is the first and only allowed implementation slice/is);
  assert.match(contracts, /desktop-signature\.json/);
  assert.match(contracts, /signaturePolicyDigest/);
  assert.match(contracts, /three Oracle WebGL2 contexts.*three named.*surfaces/is);
  assert.match(contracts, /structured GPU status/i);
  assert.match(contracts, /schema-v1 component maps.*legacy.*--stage oracle/is);
});

test('requires approved tolerances and temporal evidence for exact animated parity', async () => {
  const [skill, workflow, contracts] = await Promise.all([
    load('../SKILL.md'),
    load('../references/workflow.md'),
    load('../references/contracts.md'),
  ]);

  assert.match(skill, /exact-fidelity.*user-approved.*tolerance/is);
  assert.match(workflow, /temporal evidence.*GSAP.*scrub.*easing.*shader.*frame/is);
  assert.match(workflow, /still screenshot.*cannot.*close/is);
  assert.match(workflow, /GPU.*applicable.*WebGL.*WebGPU.*canvas/is);
  assert.match(workflow, /validator.*bindings.*not.*visual parity/is);
  assert.match(contracts, /promotion.*mutable.*receipt.*immutable/is);
});
