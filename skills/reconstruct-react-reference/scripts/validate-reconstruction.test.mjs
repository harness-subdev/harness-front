import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, readdir, symlink, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { validateReconstruction } from './validate-reconstruction.mjs';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

async function fileSetDigest(root, files) {
  const records = [];
  for (const relative of [...files].sort()) {
    records.push(`${relative}\0${sha256(await readFile(path.join(root, relative)))}`);
  }
  return sha256(records.join('\n'));
}

const claimSetDigest = (claims) => sha256(JSON.stringify([...claims].sort()));

async function distributionDigest(root, roots) {
  const files = [];
  async function visit(relative) {
    for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
      const child = path.join(relative, entry.name);
      if (entry.isDirectory()) await visit(child);
      else if (entry.isFile()) files.push(child);
    }
  }
  for (const relative of roots) await visit(relative);
  return fileSetDigest(root, files);
}

async function writeJson(root, relativePath, value) {
  const target = path.join(root, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`);
  return target;
}

async function readJson(root, relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
}

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'reconstruct-react-reference-'));
  const oracle = path.join(root, 'oracle');
  const target = path.join(root, 'target');
  await mkdir(oracle, { recursive: true });
  const checkpoint = Buffer.from('reference checkpoint');
  await writeFile(path.join(oracle, 'checkpoint.png'), checkpoint);

  await writeJson(target, '.reference-reconstruction/project.json', {
    schemaVersion: 1,
    projectId: 'fixture-target',
    oracleRoot: oracle,
    distributionRoots: ['src'],
    forbiddenDistributionText: ['original.example'],
  });
  await writeJson(target, '.reference-reconstruction/oracle-lock.json', {
    schemaVersion: 1,
    oracleId: 'fixture-oracle',
    artifacts: [{ path: 'checkpoint.png', sha256: sha256(checkpoint) }],
    unresolved: [],
  });

  return { root, oracle, target };
}

async function addPromotedComponent(target, overrides = {}) {
  const componentId = 'fixture/year-narrative';
  const evidenceClaims = ['desktop-top', 'mobile-top'];
  const interfaceFiles = ['src/year-narrative.types.ts'];
  const implementationFiles = ['src/year-narrative.ts'];
  const assetMappingFiles = ['.reference-reconstruction/implementation-packet/year-narrative.assets.json'];
  await mkdir(path.join(target, 'src'), { recursive: true });
  await writeFile(path.join(target, interfaceFiles[0]), 'export interface Props { year: number }\n');
  await writeFile(path.join(target, implementationFiles[0]), 'export const YearNarrative = () => null;\n');
  await writeJson(target, assetMappingFiles[0], { hero: 'owned-frame' });
  const interfaceFingerprint = await fileSetDigest(target, interfaceFiles);
  const implementationDigest = await fileSetDigest(target, implementationFiles);
  const assetMappingDigest = await fileSetDigest(target, assetMappingFiles);
  await mkdir(path.join(target, 'evidence'), { recursive: true });
  await writeFile(path.join(target, 'evidence/year-narrative.png'), 'render');
  const receipt = {
    schemaVersion: 1,
    componentId,
    profile: 'research-parity',
    bindings: {
      oracleLockSha256: '',
      interfaceFingerprint,
      implementationDigest,
      assetMappingDigest,
      claimSetDigest: claimSetDigest(evidenceClaims),
    },
    claims: {
      passed: ['desktop-top', 'mobile-top'],
      failed: [],
      blocked: [],
      notApplicable: [],
    },
    outputs: [{ path: 'evidence/year-narrative.png', sha256: sha256('render') }],
    ...overrides.receipt,
  };

  const oracleLockBytes = await readFile(path.join(target, '.reference-reconstruction/oracle-lock.json'));
  receipt.bindings.oracleLockSha256 = sha256(oracleLockBytes);
  const receiptPath = `.reference-reconstruction/receipts/parity/${componentId.replace('/', '--')}.json`;
  const absoluteReceipt = await writeJson(target, receiptPath, receipt);
  const receiptBytes = await readFile(absoluteReceipt);

  await writeJson(target, '.reference-reconstruction/component-map.json', {
    schemaVersion: 1,
    components: [{ id: componentId, publicCandidate: true, evidenceClaims, unresolved: [] }],
  });
  await writeJson(target, '.reference-reconstruction/promotion.json', {
    schemaVersion: 1,
    components: [{
      id: componentId,
      implementationStage: overrides.implementationStage ?? 'reconstructed',
      parityStatus: overrides.parityStatus ?? 'parity-verified',
      reuseStatus: overrides.reuseStatus ?? 'unproven',
      distributionStatus: overrides.distributionStatus ?? 'private-only',
      interfaceFiles,
      implementationFiles,
      assetMappingFiles,
      interfaceFingerprint,
      implementationDigest,
      assetMappingDigest,
      claimSetDigest: claimSetDigest(evidenceClaims),
      parityReceipt: receiptPath,
      ...(overrides.reuseReceipt ? { reuseReceipt: overrides.reuseReceipt } : {}),
    }],
  });
  await writeJson(target, 'component-catalog/fixture--year-narrative.json', {
    schemaVersion: 1,
    id: componentId,
    componentVersion: '0.1.0',
    package: '@fixture/story',
    exportPath: './year-narrative',
    framework: 'nextjs-react',
    clientBoundary: true,
    interfaceFiles,
    implementationFiles,
    assetMappingFiles,
    interfaceFingerprint,
    implementationDigest,
    assetMappingDigest,
    propsType: 'Props',
    slots: [],
    events: ['onNext'],
    lifecycle: ['mount', 'unmount'],
    peerDependencies: { next: '^15.0.0', react: '^19.0.0' },
    styleTokens: ['color.background'],
    contentSchema: { type: 'object' },
    assetRequirements: ['owned-frame'],
    states: ['top', 'end'],
    viewports: ['1280x720', '390x844'],
    inputs: ['pointer', 'touch'],
    accessibility: ['keyboard navigation'],
    fallbacks: ['static image'],
    axisStatuses: {
      implementationStage: overrides.implementationStage ?? 'reconstructed',
      parityStatus: overrides.parityStatus ?? 'parity-verified',
      reuseStatus: overrides.reuseStatus ?? 'unproven',
      distributionStatus: overrides.distributionStatus ?? 'private-only',
    },
    parityReceipt: receiptPath,
    parityReceiptSha256: sha256(receiptBytes),
    compatibilityTags: ['immersive-story'],
  });
  await writeJson(target, 'component-catalog/catalog.json', {
    schemaVersion: 1,
    projectId: 'fixture-target',
    entries: ['fixture--year-narrative.json'],
  });

  return { componentId, receiptPath, interfaceFingerprint, implementationDigest, assetMappingDigest };
}

async function addReuseProof(root, target, overrides = {}) {
  const consumer = path.join(root, 'consumer');
  await writeJson(consumer, '.reference-reconstruction/project.json', {
    schemaVersion: 1,
    projectId: overrides.markerProjectId ?? 'fixture-consumer',
    oracleRoot: path.join(root, 'consumer-oracle'),
    distributionRoots: ['src'],
  });
  await mkdir(path.join(root, 'consumer-oracle'), { recursive: true });
  await mkdir(path.join(consumer, 'src'), { recursive: true });
  await writeFile(path.join(consumer, 'src/use.ts'), 'import { YearNarrative } from "@fixture/story";\n');
  const consumerFiles = ['src/use.ts'];
  const consumerDigest = await fileSetDigest(consumer, consumerFiles);
  const promotionDocument = await readJson(target, '.reference-reconstruction/promotion.json');
  const promotion = promotionDocument.components[0];
  const reuseReceipt = '.reference-reconstruction/receipts/reuse/fixture--year-narrative.json';
  const reuseReceiptPath = await writeJson(target, reuseReceipt, {
    schemaVersion: 1,
    componentId: promotion.id,
    sourceProjectId: 'fixture-target',
    consumerProjectId: 'fixture-consumer',
    consumerProjectRoot: consumer,
    consumerFiles,
    interfaceFingerprint: promotion.interfaceFingerprint,
    implementationDigest: promotion.implementationDigest,
    consumerDigest,
    ...overrides.receipt,
  });
  promotion.reuseStatus = 'reuse-proven';
  promotion.reuseReceipt = reuseReceipt;
  await writeJson(target, '.reference-reconstruction/promotion.json', promotionDocument);
  const entryPath = 'component-catalog/fixture--year-narrative.json';
  const entry = await readJson(target, entryPath);
  entry.axisStatuses.reuseStatus = 'reuse-proven';
  entry.reuseReceipt = reuseReceipt;
  entry.reuseReceiptSha256 = sha256(await readFile(reuseReceiptPath));
  await writeJson(target, entryPath, entry);
  return { consumer, consumerFiles, reuseReceipt };
}

async function addDistributionProof(target, overrides = {}) {
  await mkdir(path.join(target, 'src/assets'), { recursive: true });
  await writeFile(path.join(target, 'src/assets/frame.webp'), 'owned frame bytes');
  const assets = overrides.assets ?? [{
    id: 'owned-frame',
    provenance: 'owned',
    rights: 'owned',
    replacementRequired: false,
    source: 'src/assets/frame.webp',
    sha256: sha256('owned frame bytes'),
    license: 'Copyright fixture project',
  }];
  const ledgerPath = await writeJson(target, '.reference-reconstruction/rights-ledger.json', {
    schemaVersion: 1,
    assets,
  });
  await writeFile(path.join(target, 'src/index.ts'), overrides.source ?? 'export const value = 1;\n');
  const ledgerBytes = await readFile(ledgerPath);
  const receipt = {
    schemaVersion: 1,
    projectId: 'fixture-target',
    packageDigest: await distributionDigest(target, ['src']),
    rightsLedgerSha256: sha256(ledgerBytes),
    scannedRoots: ['src'],
    ...overrides.receipt,
  };
  await writeJson(target, '.reference-reconstruction/receipts/distribution.json', receipt);
  return receipt;
}

test('rejects a target without a project marker', async () => {
  const { root } = await fixture();
  await assert.rejects(validateReconstruction(root, 'oracle'), /project\.json/);
});

test('validates an oracle lock and its exact artifact hashes', async () => {
  const { target } = await fixture();
  assert.deepEqual(await validateReconstruction(target, 'oracle'), {
    stage: 'oracle',
    componentCount: 0,
  });
});

test('accepts a structured nonblocking oracle unresolved entry outside scope', async () => {
  const { target } = await fixture();
  const lock = await readJson(target, '.reference-reconstruction/oracle-lock.json');
  lock.unresolved = [{ id: 'future-audio-check', blocking: false, requiredForScope: false }];
  await writeJson(target, '.reference-reconstruction/oracle-lock.json', lock);

  assert.equal((await validateReconstruction(target, 'oracle')).componentCount, 0);
});

test('rejects blocking or scope-required oracle unresolved entries', async (context) => {
  for (const field of ['blocking', 'requiredForScope']) {
    await context.test(field, async () => {
      const { target } = await fixture();
      const lock = await readJson(target, '.reference-reconstruction/oracle-lock.json');
      lock.unresolved = [{
        id: `unresolved-${field}`,
        blocking: field === 'blocking',
        requiredForScope: field === 'requiredForScope',
      }];
      await writeJson(target, '.reference-reconstruction/oracle-lock.json', lock);

      await assert.rejects(validateReconstruction(target, 'oracle'), /unresolved .* blocks the declared scope/);
    });
  }
});

test('rejects an oracle artifact symlink that escapes the canonical oracle root', async () => {
  const { root, oracle, target } = await fixture();
  await writeFile(path.join(root, 'outside.png'), 'reference checkpoint');
  await symlink(path.join(root, 'outside.png'), path.join(oracle, 'escape.png'));
  await writeJson(target, '.reference-reconstruction/oracle-lock.json', {
    schemaVersion: 1,
    oracleId: 'fixture-oracle',
    artifacts: [{ path: 'escape.png', sha256: sha256('reference checkpoint') }],
    unresolved: [],
  });

  await assert.rejects(validateReconstruction(target, 'oracle'), /escapes its canonical root/);
});

test('rejects canonical oracle and target roots that are nested', async () => {
  const { target } = await fixture();
  await mkdir(path.join(target, 'oracle'), { recursive: true });
  await writeJson(target, '.reference-reconstruction/project.json', {
    schemaVersion: 1,
    projectId: 'fixture-target',
    oracleRoot: 'oracle',
    distributionRoots: ['src'],
  });

  await assert.rejects(validateReconstruction(target, 'oracle'), /physically separate/);
});

test('rejects a canonical target root nested inside the oracle root', async () => {
  const { root, target } = await fixture();
  await writeJson(target, '.reference-reconstruction/project.json', {
    schemaVersion: 1,
    projectId: 'fixture-target',
    oracleRoot: root,
    distributionRoots: ['src'],
    forbiddenDistributionText: ['original.example'],
  });

  await assert.rejects(validateReconstruction(target, 'oracle'), /physically separate/);
});

test('rejects a non-promoted component from the public catalog', async () => {
  const { target } = await fixture();
  await addPromotedComponent(target, { implementationStage: 'candidate' });
  await assert.rejects(validateReconstruction(target, 'catalog'), /not promoted/);
});

test('rejects a parity receipt whose bindings are stale', async () => {
  const { target } = await fixture();
  await addPromotedComponent(target, {
    receipt: {
      bindings: {
        oracleLockSha256: 'will-be-replaced-by-fixture',
        interfaceFingerprint: sha256('different-interface'),
        implementationDigest: sha256('unused-implementation'),
        assetMappingDigest: sha256('unused-assets'),
      },
    },
  });
  await assert.rejects(validateReconstruction(target, 'catalog'), /stale parity receipt/);
});

test('rejects arbitrary component digests instead of recomputing explicit file lists', async () => {
  const { target } = await fixture();
  await addPromotedComponent(target);
  const promotion = await readJson(target, '.reference-reconstruction/promotion.json');
  promotion.components[0].implementationDigest = sha256('invented');
  await writeJson(target, '.reference-reconstruction/promotion.json', promotion);
  const receipt = await readJson(target, promotion.components[0].parityReceipt);
  receipt.bindings.implementationDigest = promotion.components[0].implementationDigest;
  await writeJson(target, promotion.components[0].parityReceipt, receipt);

  await assert.rejects(validateReconstruction(target, 'promotion'), /implementationDigest hash mismatch/);
});

test('rejects uppercase component sha256 values', async () => {
  const { target } = await fixture();
  await addPromotedComponent(target);
  const promotion = await readJson(target, '.reference-reconstruction/promotion.json');
  promotion.components[0].interfaceFingerprint = promotion.components[0].interfaceFingerprint.toUpperCase();
  await writeJson(target, '.reference-reconstruction/promotion.json', promotion);

  await assert.rejects(validateReconstruction(target, 'promotion'), /lowercase sha256/);
});

test('rejects changed component files as stale', async () => {
  const { target } = await fixture();
  await addPromotedComponent(target);
  await writeFile(path.join(target, 'src/year-narrative.ts'), 'export const YearNarrative = () => "changed";\n');

  await assert.rejects(validateReconstruction(target, 'promotion'), /implementationDigest hash mismatch/);
});

test('rejects a changed asset mapping file as stale', async () => {
  const { target } = await fixture();
  await addPromotedComponent(target);
  await writeJson(target, '.reference-reconstruction/implementation-packet/year-narrative.assets.json', {
    hero: 'different-frame',
  });

  await assert.rejects(validateReconstruction(target, 'promotion'), /assetMappingDigest hash mismatch/);
});

test('rejects duplicate physical files hidden behind relative path aliases', async () => {
  const { target } = await fixture();
  await addPromotedComponent(target);
  const promotionDocument = await readJson(target, '.reference-reconstruction/promotion.json');
  const promotion = promotionDocument.components[0];
  promotion.implementationFiles = ['src/year-narrative.ts', 'src/../src/year-narrative.ts'];
  promotion.implementationDigest = await fileSetDigest(target, promotion.implementationFiles);
  await writeJson(target, '.reference-reconstruction/promotion.json', promotionDocument);
  const receipt = await readJson(target, promotion.parityReceipt);
  receipt.bindings.implementationDigest = promotion.implementationDigest;
  await writeJson(target, promotion.parityReceipt, receipt);

  await assert.rejects(validateReconstruction(target, 'promotion'), /canonical relative path|duplicate physical file/);
});

test('rejects empty component evidence claims', async () => {
  const { target } = await fixture();
  await addPromotedComponent(target);
  const map = await readJson(target, '.reference-reconstruction/component-map.json');
  map.components[0].evidenceClaims = [];
  await writeJson(target, '.reference-reconstruction/component-map.json', map);

  await assert.rejects(validateReconstruction(target, 'promotion'), /evidenceClaims must not be empty/);
});

test('does not close a component evidence claim with notApplicable', async () => {
  const { target } = await fixture();
  await addPromotedComponent(target, {
    receipt: {
      claims: { passed: ['desktop-top'], failed: [], blocked: [], notApplicable: ['mobile-top'] },
    },
  });

  await assert.rejects(validateReconstruction(target, 'promotion'), /claim mobile-top must pass/);
});

test('rejects a component-map claim removed after promotion and receipt binding', async () => {
  const { target } = await fixture();
  await addPromotedComponent(target);
  const map = await readJson(target, '.reference-reconstruction/component-map.json');
  map.components[0].evidenceClaims = ['desktop-top'];
  await writeJson(target, '.reference-reconstruction/component-map.json', map);

  await assert.rejects(validateReconstruction(target, 'promotion'), /claimSetDigest hash mismatch/);
});

test('uses an unambiguous deterministic encoding for the exact planned claim set', async () => {
  const { target } = await fixture();
  await addPromotedComponent(target);
  const claims = ['a\nb', 'c'];
  const collidingClaims = ['a', 'b\nc'];
  const map = await readJson(target, '.reference-reconstruction/component-map.json');
  map.components[0].evidenceClaims = claims;
  await writeJson(target, '.reference-reconstruction/component-map.json', map);
  const promotionDocument = await readJson(target, '.reference-reconstruction/promotion.json');
  const promotion = promotionDocument.components[0];
  promotion.claimSetDigest = sha256([...collidingClaims].sort().join('\n'));
  await writeJson(target, '.reference-reconstruction/promotion.json', promotionDocument);
  const receipt = await readJson(target, promotion.parityReceipt);
  receipt.bindings.claimSetDigest = promotion.claimSetDigest;
  receipt.claims = { passed: claims, failed: [], blocked: [], notApplicable: [] };
  await writeJson(target, promotion.parityReceipt, receipt);

  await assert.rejects(validateReconstruction(target, 'promotion'), /claimSetDigest hash mismatch/);
});

test('rejects receipt-only claims outside the exact planned claim set', async () => {
  const { target } = await fixture();
  await addPromotedComponent(target, {
    receipt: {
      claims: {
        passed: ['desktop-top', 'mobile-top', 'receipt-only'],
        failed: [],
        blocked: [],
        notApplicable: [],
      },
    },
  });

  await assert.rejects(validateReconstruction(target, 'promotion'), /exact planned claim set/);
});

test('rejects a parity receipt with no passed claims', async () => {
  const { target } = await fixture();
  await addPromotedComponent(target, {
    receipt: {
      claims: { passed: [], failed: [], blocked: [], notApplicable: ['desktop-top', 'mobile-top'] },
    },
  });

  await assert.rejects(validateReconstruction(target, 'promotion'), /at least one passed claim/);
});

test('rejects terminal symlink escapes for parity outputs', async () => {
  const { root, target } = await fixture();
  await addPromotedComponent(target);
  const output = path.join(target, 'evidence/year-narrative.png');
  const outside = path.join(root, 'outside-output.png');
  await writeFile(outside, 'render');
  await unlink(output);
  await symlink(outside, output);

  await assert.rejects(validateReconstruction(target, 'promotion'), /escapes its canonical root/);
});

test('rejects terminal symlink escapes for receipt and catalog files', async () => {
  const { root, target } = await fixture();
  const { receiptPath } = await addPromotedComponent(target);
  const receipt = path.join(target, receiptPath);
  const outsideReceipt = path.join(root, 'outside-receipt.json');
  await writeFile(outsideReceipt, await readFile(receipt));
  await unlink(receipt);
  await symlink(outsideReceipt, receipt);
  await assert.rejects(validateReconstruction(target, 'promotion'), /escapes its canonical root/);

  await unlink(receipt);
  await writeFile(receipt, await readFile(outsideReceipt));
  const entry = path.join(target, 'component-catalog/fixture--year-narrative.json');
  const outsideEntry = path.join(root, 'outside-entry.json');
  await writeFile(outsideEntry, await readFile(entry));
  await unlink(entry);
  await symlink(outsideEntry, entry);
  await assert.rejects(validateReconstruction(target, 'catalog'), /escapes its canonical root/);
});

test('accepts a promoted component in the public catalog', async () => {
  const { target } = await fixture();
  await addPromotedComponent(target);
  assert.deepEqual(await validateReconstruction(target, 'catalog'), {
    stage: 'catalog',
    componentCount: 1,
  });
});

test('accepts SemVer 2 build metadata and rejects leading-zero prerelease numbers', async () => {
  const { target } = await fixture();
  await addPromotedComponent(target);
  const entryPath = 'component-catalog/fixture--year-narrative.json';
  const entry = await readJson(target, entryPath);
  entry.componentVersion = '1.2.3-alpha.1+build.5';
  await writeJson(target, entryPath, entry);
  assert.equal((await validateReconstruction(target, 'catalog')).componentCount, 1);

  entry.componentVersion = '1.2.3-01';
  await writeJson(target, entryPath, entry);
  await assert.rejects(validateReconstruction(target, 'catalog'), /must be semver/);
});

test('rejects a catalog entry missing required interchange fields', async () => {
  const { target } = await fixture();
  await addPromotedComponent(target);
  const entryPath = 'component-catalog/fixture--year-narrative.json';
  const entry = await readJson(target, entryPath);
  delete entry.propsType;
  await writeJson(target, entryPath, entry);

  await assert.rejects(validateReconstruction(target, 'catalog'), /propsType/);
});

test('rejects catalog axis statuses that differ from promotion', async () => {
  const { target } = await fixture();
  await addPromotedComponent(target);
  const entryPath = 'component-catalog/fixture--year-narrative.json';
  const entry = await readJson(target, entryPath);
  entry.axisStatuses.reuseStatus = 'reuse-proven';
  await writeJson(target, entryPath, entry);

  await assert.rejects(validateReconstruction(target, 'catalog'), /axis status mismatch/);
});

test('catalog stage refuses to endorse distribution-validated without distribution proof', async () => {
  const { target } = await fixture();
  await addPromotedComponent(target, { distributionStatus: 'distribution-validated' });

  await assert.rejects(validateReconstruction(target, 'catalog'), /distribution-validated requires the distribution stage/);
});

test('rejects reuse proof that names the source project as its consumer', async () => {
  const { target } = await fixture();
  const reuseReceipt = '.reference-reconstruction/receipts/reuse/fixture--year-narrative.json';
  await writeJson(target, reuseReceipt, {
    schemaVersion: 1,
    componentId: 'fixture/year-narrative',
    sourceProjectId: 'fixture-target',
    consumerProjectId: 'fixture-target',
    interfaceFingerprint: 'interface-v1',
    implementationDigest: 'implementation-v1',
    consumerDigest: 'consumer-v1',
  });
  await addPromotedComponent(target, {
    reuseStatus: 'reuse-proven',
    reuseReceipt,
  });
  await assert.rejects(validateReconstruction(target, 'promotion'), /second real project/);
});

test('rejects a self-only reuse claim without an external consumer project root', async () => {
  const { target } = await fixture();
  const { implementationDigest, interfaceFingerprint } = await addPromotedComponent(target);
  const reuseReceipt = '.reference-reconstruction/receipts/reuse/fixture--year-narrative.json';
  await writeJson(target, reuseReceipt, {
    schemaVersion: 1,
    componentId: 'fixture/year-narrative',
    sourceProjectId: 'fixture-target',
    consumerProjectId: 'different-string-only',
    interfaceFingerprint,
    implementationDigest,
    consumerDigest: sha256('invented'),
  });
  const promotion = await readJson(target, '.reference-reconstruction/promotion.json');
  promotion.components[0].reuseStatus = 'reuse-proven';
  promotion.components[0].reuseReceipt = reuseReceipt;
  await writeJson(target, '.reference-reconstruction/promotion.json', promotion);

  await assert.rejects(validateReconstruction(target, 'promotion'), /consumerProjectRoot/);
});

test('rejects a reuse receipt with a stale consumer file digest', async () => {
  const { root, target } = await fixture();
  await addPromotedComponent(target);
  const { consumer } = await addReuseProof(root, target);
  await writeFile(path.join(consumer, 'src/use.ts'), 'changed consumer integration\n');

  await assert.rejects(validateReconstruction(target, 'promotion'), /consumerDigest hash mismatch/);
});

test('rejects a consumer marker whose project identity differs from the reuse receipt', async () => {
  const { root, target } = await fixture();
  await addPromotedComponent(target);
  await addReuseProof(root, target, { markerProjectId: 'different-consumer' });

  await assert.rejects(validateReconstruction(target, 'promotion'), /consumer project mismatch/);
});

test('accepts reuse proven by a separate marked consumer project and exact files', async () => {
  const { root, target } = await fixture();
  await addPromotedComponent(target);
  await addReuseProof(root, target);

  assert.deepEqual(await validateReconstruction(target, 'promotion'), {
    stage: 'promotion',
    componentCount: 1,
  });
});

test('rejects a catalog with a stale reuse receipt binding', async () => {
  const { root, target } = await fixture();
  await addPromotedComponent(target);
  await addReuseProof(root, target);
  const entryPath = 'component-catalog/fixture--year-narrative.json';
  const entry = await readJson(target, entryPath);
  entry.reuseReceiptSha256 = sha256('stale');
  await writeJson(target, entryPath, entry);

  await assert.rejects(validateReconstruction(target, 'catalog'), /reuse receipt hash mismatch/);
});

test('accepts a catalog bound to a current external reuse receipt', async () => {
  const { root, target } = await fixture();
  await addPromotedComponent(target);
  await addReuseProof(root, target);

  assert.equal((await validateReconstruction(target, 'catalog')).componentCount, 1);
});

test('rejects research-only assets from the distribution profile', async () => {
  const { target } = await fixture();
  await addPromotedComponent(target, { distributionStatus: 'distribution-validated' });
  await writeJson(target, '.reference-reconstruction/rights-ledger.json', {
    schemaVersion: 1,
    assets: [{
      id: 'reference-frame',
      provenance: 'public-artifact',
      rights: 'research-only',
      replacementRequired: true,
      source: 'src/assets/frame.webp',
      sha256: sha256('owned frame bytes'),
    }],
  });
  await writeJson(target, '.reference-reconstruction/receipts/distribution.json', {
    schemaVersion: 1,
    projectId: 'fixture-target',
    packageDigest: await distributionDigest(target, ['src']),
    rightsLedgerSha256: 'unused-for-rejected-ledger',
    scannedRoots: ['src'],
  });
  await mkdir(path.join(target, 'src'), { recursive: true });
  await writeFile(path.join(target, 'src', 'index.ts'), 'export const value = 1;\n');

  await assert.rejects(validateReconstruction(target, 'distribution'), /research-only/);
});

test('rejects a required distribution asset still marked for replacement', async () => {
  const { target } = await fixture();
  await addPromotedComponent(target, { distributionStatus: 'distribution-validated' });
  await addDistributionProof(target, {
    assets: [{
      id: 'owned-frame',
      provenance: 'owned',
      rights: 'owned',
      replacementRequired: true,
      source: 'src/assets/frame.webp',
      sha256: sha256('owned frame bytes'),
      license: 'Copyright fixture project',
    }],
  });

  await assert.rejects(validateReconstruction(target, 'distribution'), /replacementRequired/);
});

test('accepts a distribution profile with owned assets and current bindings', async () => {
  const { target } = await fixture();
  await addPromotedComponent(target, { distributionStatus: 'distribution-validated' });
  await addDistributionProof(target);

  assert.deepEqual(await validateReconstruction(target, 'distribution'), {
    stage: 'distribution',
    componentCount: 1,
  });
});

test('rejects an empty distribution root declaration', async () => {
  const { target } = await fixture();
  await addPromotedComponent(target, { distributionStatus: 'distribution-validated' });
  await addDistributionProof(target);
  const project = await readJson(target, '.reference-reconstruction/project.json');
  project.distributionRoots = [];
  await writeJson(target, '.reference-reconstruction/project.json', project);
  const receipt = await readJson(target, '.reference-reconstruction/receipts/distribution.json');
  receipt.scannedRoots = [];
  await writeJson(target, '.reference-reconstruction/receipts/distribution.json', receipt);

  await assert.rejects(validateReconstruction(target, 'distribution'), /distributionRoots must not be empty/);
});

test('rejects distribution without project-specific forbidden text', async () => {
  const { target } = await fixture();
  await addPromotedComponent(target, { distributionStatus: 'distribution-validated' });
  await addDistributionProof(target);
  const project = await readJson(target, '.reference-reconstruction/project.json');
  project.forbiddenDistributionText = [];
  await writeJson(target, '.reference-reconstruction/project.json', project);

  await assert.rejects(validateReconstruction(target, 'distribution'), /forbiddenDistributionText must not be empty/);
});

test('retains literal forbidden-text scanning for distribution files', async () => {
  const { target } = await fixture();
  await addPromotedComponent(target, { distributionStatus: 'distribution-validated' });
  await addDistributionProof(target, { source: 'export const url = "https://original.example/file";\n' });

  await assert.rejects(validateReconstruction(target, 'distribution'), /contains forbidden text original\.example/);
});

test('rejects forbidden text in normalized distribution filenames even when bytes are clean', async () => {
  const { target } = await fixture();
  await addPromotedComponent(target, { distributionStatus: 'distribution-validated' });
  await addDistributionProof(target);
  await mkdir(path.join(target, 'src/original.example'), { recursive: true });
  await writeFile(path.join(target, 'src/original.example/clean.ts'), 'export const clean = true;\n');
  const receipt = await readJson(target, '.reference-reconstruction/receipts/distribution.json');
  receipt.packageDigest = await distributionDigest(target, ['src']);
  await writeJson(target, '.reference-reconstruction/receipts/distribution.json', receipt);

  await assert.rejects(validateReconstruction(target, 'distribution'), /filename contains forbidden text original\.example/);
});

test('rejects a root-level __mirror__ distribution directory with clean bytes', async () => {
  const { target } = await fixture();
  await addPromotedComponent(target, { distributionStatus: 'distribution-validated' });
  await addDistributionProof(target);
  await mkdir(path.join(target, '__mirror__/assets'), { recursive: true });
  await writeFile(path.join(target, '__mirror__/assets/frame.webp'), 'mirror frame bytes');
  await writeFile(path.join(target, '__mirror__/index.js'), 'export const clean = true;\n');
  const project = await readJson(target, '.reference-reconstruction/project.json');
  project.distributionRoots = ['__mirror__'];
  await writeJson(target, '.reference-reconstruction/project.json', project);
  const ledgerPath = await writeJson(target, '.reference-reconstruction/rights-ledger.json', {
    schemaVersion: 1,
    assets: [{
      id: 'owned-frame',
      provenance: 'owned',
      rights: 'owned',
      replacementRequired: false,
      source: '__mirror__/assets/frame.webp',
      sha256: sha256('mirror frame bytes'),
      license: 'Copyright fixture project',
    }],
  });
  const receipt = await readJson(target, '.reference-reconstruction/receipts/distribution.json');
  receipt.scannedRoots = ['__mirror__'];
  receipt.packageDigest = await distributionDigest(target, ['__mirror__']);
  receipt.rightsLedgerSha256 = sha256(await readFile(ledgerPath));
  await writeJson(target, '.reference-reconstruction/receipts/distribution.json', receipt);

  await assert.rejects(validateReconstruction(target, 'distribution'), /filename contains forbidden text \/__mirror__\//);
});

test('rejects a stale distribution package digest after a scanned file changes', async () => {
  const { target } = await fixture();
  await addPromotedComponent(target, { distributionStatus: 'distribution-validated' });
  await addDistributionProof(target);
  await writeFile(path.join(target, 'src/index.ts'), 'changed after scan\n');

  await assert.rejects(validateReconstruction(target, 'distribution'), /packageDigest hash mismatch/);
});

test('rejects exact archived oracle bytes in distribution even when package digest is current', async () => {
  const { target } = await fixture();
  await addPromotedComponent(target, { distributionStatus: 'distribution-validated' });
  await addDistributionProof(target);
  await writeFile(path.join(target, 'src/copied.bin'), 'reference checkpoint');
  const receipt = await readJson(target, '.reference-reconstruction/receipts/distribution.json');
  receipt.packageDigest = await distributionDigest(target, ['src']);
  await writeJson(target, '.reference-reconstruction/receipts/distribution.json', receipt);

  await assert.rejects(validateReconstruction(target, 'distribution'), /matches archived oracle artifact bytes/);
});

test('rejects a distribution root symlink that escapes the target', async () => {
  const { root, target } = await fixture();
  await addPromotedComponent(target, { distributionStatus: 'distribution-validated' });
  await addDistributionProof(target);
  const outside = path.join(root, 'outside-distribution');
  await mkdir(outside);
  await writeFile(path.join(outside, 'index.js'), 'safe bytes\n');
  await symlink(outside, path.join(target, 'dist'));
  const project = await readJson(target, '.reference-reconstruction/project.json');
  project.distributionRoots = ['dist'];
  await writeJson(target, '.reference-reconstruction/project.json', project);
  const receipt = await readJson(target, '.reference-reconstruction/receipts/distribution.json');
  receipt.scannedRoots = ['dist'];
  await writeJson(target, '.reference-reconstruction/receipts/distribution.json', receipt);

  await assert.rejects(validateReconstruction(target, 'distribution'), /contains symlink|escapes its canonical root/);
});

test('rejects an empty distribution root reached through an escaping intermediate symlink', async () => {
  const { root, target } = await fixture();
  await addPromotedComponent(target, { distributionStatus: 'distribution-validated' });
  await addDistributionProof(target);
  const outside = path.join(root, 'outside-empty');
  await mkdir(path.join(outside, 'empty'), { recursive: true });
  await symlink(outside, path.join(target, 'escape'));
  const project = await readJson(target, '.reference-reconstruction/project.json');
  project.distributionRoots = ['src', 'escape/empty'];
  await writeJson(target, '.reference-reconstruction/project.json', project);
  const receipt = await readJson(target, '.reference-reconstruction/receipts/distribution.json');
  receipt.scannedRoots = ['src', 'escape/empty'];
  await writeJson(target, '.reference-reconstruction/receipts/distribution.json', receipt);

  await assert.rejects(validateReconstruction(target, 'distribution'), /distribution root 1 escapes its canonical root/);
});

test('rejects rights ledger asset IDs that do not exactly match catalog requirements', async () => {
  const { target } = await fixture();
  await addPromotedComponent(target, { distributionStatus: 'distribution-validated' });
  await addDistributionProof(target, {
    assets: [{
      id: 'extra-frame',
      provenance: 'owned',
      rights: 'owned',
      replacementRequired: false,
      source: 'src/assets/frame.webp',
      sha256: sha256('owned frame bytes'),
      license: 'Copyright fixture project',
    }],
  });

  await assert.rejects(validateReconstruction(target, 'distribution'), /asset IDs must exactly match catalog requirements/);
});

test('rejects a rights record whose local distribution asset is missing', async () => {
  const { target } = await fixture();
  await addPromotedComponent(target, { distributionStatus: 'distribution-validated' });
  await addDistributionProof(target, {
    assets: [{
      id: 'owned-frame',
      provenance: 'owned',
      rights: 'owned',
      replacementRequired: false,
      source: 'src/assets/missing.webp',
      sha256: sha256('missing bytes'),
      license: 'Copyright fixture project',
    }],
  });

  await assert.rejects(validateReconstruction(target, 'distribution'), /rights asset owned-frame\.source is unreadable/);
});

test('rejects a rights record whose local asset is outside scanned distribution roots', async () => {
  const { target } = await fixture();
  await addPromotedComponent(target, { distributionStatus: 'distribution-validated' });
  await mkdir(path.join(target, 'private'), { recursive: true });
  await writeFile(path.join(target, 'private/frame.webp'), 'private frame bytes');
  await addDistributionProof(target, {
    assets: [{
      id: 'owned-frame',
      provenance: 'owned',
      rights: 'owned',
      replacementRequired: false,
      source: 'private/frame.webp',
      sha256: sha256('private frame bytes'),
      license: 'Copyright fixture project',
    }],
  });

  await assert.rejects(validateReconstruction(target, 'distribution'), /must be within a scanned distribution root/);
});

test('rejects a stale rights record asset hash', async () => {
  const { target } = await fixture();
  await addPromotedComponent(target, { distributionStatus: 'distribution-validated' });
  await addDistributionProof(target, {
    assets: [{
      id: 'owned-frame',
      provenance: 'owned',
      rights: 'owned',
      replacementRequired: false,
      source: 'src/assets/frame.webp',
      sha256: sha256('stale bytes'),
      license: 'Copyright fixture project',
    }],
  });

  await assert.rejects(validateReconstruction(target, 'distribution'), /rights asset owned-frame hash mismatch/);
});

test('rejects original host URLs as rights record sources', async () => {
  const { target } = await fixture();
  await addPromotedComponent(target, { distributionStatus: 'distribution-validated' });
  await addDistributionProof(target, {
    assets: [{
      id: 'owned-frame',
      provenance: 'licensed',
      rights: 'licensed',
      replacementRequired: false,
      source: 'https://original.example/frame.webp',
      sha256: sha256('remote bytes'),
      license: 'Fixture license',
    }],
  });

  await assert.rejects(validateReconstruction(target, 'distribution'), /source must be target-relative, not a host URL/);
});
