#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const STAGES = ['oracle', 'architecture', 'signature', 'promotion', 'catalog', 'distribution'];

const SHA256 = /^[a-f0-9]{64}$/;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const PROMOTION_STAGES = new Set(['candidate', 'reconstructed']);
const PARITY_STATUSES = new Set(['unverified', 'parity-verified', 'stale']);
const REUSE_STATUSES = new Set(['unproven', 'reuse-proven', 'stale']);
const DISTRIBUTION_STATUSES = new Set(['private-only', 'distribution-validated', 'stale']);
const DISTRIBUTION_RIGHTS = new Set(['owned', 'cc0', 'dependency-license', 'licensed']);
const SURFACE_KINDS = new Set(['dom', 'svg', 'canvas2d', 'webgl', 'webgl2', 'webgpu']);
const GPU_SURFACE_KINDS = new Set(['webgl', 'webgl2', 'webgpu']);
const FORBIDDEN_COMPENSATION = [
  'css-overlay',
  'dom-overlay',
  'screenshot-overlay',
  'checkpoint-conditional',
];
const HOST_URL = /^[A-Za-z][A-Za-z0-9+.-]*:\/\//;

function fail(message) {
  throw new Error(`reconstruction validation failed: ${message}`);
}

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  return value;
}

function string(value, label) {
  if (typeof value !== 'string' || !value.trim()) fail(`${label} must be a non-empty string`);
  return value;
}

function array(value, label) {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
  return value;
}

function strings(value, label) {
  const values = array(value, label);
  values.forEach((item, index) => string(item, `${label}[${index}]`));
  return values;
}

function nonEmptyStrings(value, label) {
  const values = strings(value, label);
  if (!values.length) fail(`${label} must not be empty`);
  return values;
}

function schema(value, label, allowedVersions = [1]) {
  const record = object(value, label);
  if (!allowedVersions.includes(record.schemaVersion)) {
    fail(`${label}.schemaVersion must be ${allowedVersions.join(' or ')}`);
  }
  return record;
}

function positiveNumber(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    fail(`${label} must be a positive finite number`);
  }
  return value;
}

function nonNegativeNumber(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    fail(`${label} must be a non-negative finite number`);
  }
  return value;
}

function viewport(value, label) {
  const record = object(value, label);
  exactKeys(record, ['width', 'height', 'dpr'], label);
  for (const key of ['width', 'height']) {
    positiveNumber(record[key], `${label}.${key}`);
    if (!Number.isInteger(record[key])) fail(`${label}.${key} must be an integer`);
  }
  positiveNumber(record.dpr, `${label}.dpr`);
  return { width: record.width, height: record.height, dpr: record.dpr };
}

function unique(values, label) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) fail(`${label} contains duplicate ${value}`);
    seen.add(value);
  }
}

function exactKeys(value, allowed, label) {
  const actual = Object.keys(value).sort();
  const expected = [...allowed].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`${label} fields must be exactly ${expected.join(', ')}`);
  }
}

function relativePath(root, value, label) {
  string(value, label);
  if (path.isAbsolute(value)) fail(`${label} must be relative`);
  if (value !== path.normalize(value)) fail(`${label} must be a canonical relative path`);
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, value);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    fail(`${label} escapes its declared root`);
  }
  return resolved;
}

function isWithin(parent, child) {
  return child === parent || child.startsWith(`${parent}${path.sep}`);
}

async function canonicalWithin(root, value, label) {
  const resolvedRoot = await realpath(root);
  const resolved = relativePath(resolvedRoot, value, label);
  let canonical;
  try {
    canonical = await realpath(resolved);
  } catch (error) {
    fail(`${label} is unreadable: ${error.code ?? error.message}`);
  }
  if (!isWithin(resolvedRoot, canonical)) fail(`${label} escapes its canonical root`);
  return canonical;
}

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const digestClaimSet = (claims) => digest(JSON.stringify([...claims].sort()));
const canonicalize = (value) => Array.isArray(value)
  ? value.map(canonicalize)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]))
    : value;
const digestCanonicalJson = (value) => digest(JSON.stringify(canonicalize(value)));

async function fileSetDigest(root, values, label) {
  const files = nonEmptyStrings(values, label);
  unique(files, label);
  const records = [];
  const physicalFiles = new Set();
  for (const relative of [...files].sort()) {
    const { file, bytes } = await bytesAt(root, relative, `${label} file ${relative}`);
    if (physicalFiles.has(file)) fail(`${label} contains duplicate physical file ${relative}`);
    physicalFiles.add(file);
    records.push(`${relative}\0${digest(bytes)}`);
  }
  return { files, digest: digest(records.join('\n')) };
}

async function bytesAt(root, relative, label) {
  const file = await canonicalWithin(root, relative, label);
  try {
    return { file, bytes: await readFile(file) };
  } catch (error) {
    fail(`${label} is unreadable: ${error.code ?? error.message}`);
  }
}

async function jsonAt(root, relative, label) {
  const { file, bytes } = await bytesAt(root, relative, label);
  try {
    return { file, bytes, value: JSON.parse(bytes.toString('utf8')) };
  } catch {
    fail(`${label} is not valid JSON`);
  }
}

function exactHash(actual, expected, label) {
  if (!SHA256.test(expected ?? '')) fail(`${label} must be a lowercase sha256`);
  if (actual !== expected) fail(`${label} hash mismatch`);
}

async function validateProject(root) {
  const marker = await jsonAt(root, '.reference-reconstruction/project.json', 'project.json');
  const project = schema(marker.value, 'project.json');
  string(project.projectId, 'project.json.projectId');
  string(project.oracleRoot, 'project.json.oracleRoot');
  let oracleRoot;
  try {
    oracleRoot = await realpath(path.resolve(root, project.oracleRoot));
  } catch (error) {
    fail(`project.json.oracleRoot is unreadable: ${error.code ?? error.message}`);
  }
  const targetRoot = await realpath(root);
  if (isWithin(targetRoot, oracleRoot) || isWithin(oracleRoot, targetRoot)) {
    fail('canonical oracle and target roots must be physically separate');
  }
  const distributionRoots = strings(project.distributionRoots ?? [], 'project.json.distributionRoots');
  if (!distributionRoots.length) fail('project.json.distributionRoots must not be empty');
  distributionRoots.forEach((entry, index) => relativePath(root, entry, `project.json.distributionRoots[${index}]`));
  unique(distributionRoots, 'project.json.distributionRoots');
  const forbiddenDistributionText = strings(
    project.forbiddenDistributionText ?? [],
    'project.json.forbiddenDistributionText',
  );
  unique(forbiddenDistributionText, 'project.json.forbiddenDistributionText');
  return { project, oracleRoot, distributionRoots, forbiddenDistributionText };
}

async function validateOracle(root, oracleRoot) {
  const lockFile = await jsonAt(root, '.reference-reconstruction/oracle-lock.json', 'oracle-lock.json');
  const lock = schema(lockFile.value, 'oracle-lock.json');
  string(lock.oracleId, 'oracle-lock.json.oracleId');
  const artifacts = array(lock.artifacts, 'oracle-lock.json.artifacts');
  if (!artifacts.length) fail('oracle-lock.json.artifacts must not be empty');
  unique(artifacts.map((artifact, index) => string(object(artifact, `oracle artifact ${index}`).path, `oracle artifact ${index}.path`)), 'oracle artifact paths');
  const artifactHashes = new Set();
  for (const [index, artifactValue] of artifacts.entries()) {
    const artifact = object(artifactValue, `oracle artifact ${index}`);
    const source = await bytesAt(oracleRoot, artifact.path, `oracle artifact ${index}.path`);
    exactHash(digest(source.bytes), artifact.sha256, `oracle artifact ${artifact.path}`);
    artifactHashes.add(artifact.sha256);
  }
  const unresolvedIds = [];
  for (const [index, value] of array(lock.unresolved, 'oracle-lock.json.unresolved').entries()) {
    const unresolved = object(value, `oracle unresolved ${index}`);
    const id = string(unresolved.id, `oracle unresolved ${index}.id`);
    unresolvedIds.push(id);
    if (typeof unresolved.blocking !== 'boolean') fail(`oracle unresolved ${id}.blocking must be boolean`);
    if (typeof unresolved.requiredForScope !== 'boolean') fail(`oracle unresolved ${id}.requiredForScope must be boolean`);
    if (unresolved.blocking || unresolved.requiredForScope) {
      fail(`oracle unresolved ${id} blocks the declared scope`);
    }
  }
  unique(unresolvedIds, 'oracle unresolved ids');
  return { lock, lockSha256: digest(lockFile.bytes), artifactHashes };
}

function validateComponentMap(value) {
  const map = schema(value, 'component-map.json', [2]);
  const components = array(map.components, 'component-map.json.components').map((entry, index) => {
    const component = object(entry, `component-map component ${index}`);
    const id = string(component.id, `component-map component ${index}.id`);
    if (!id.includes('/')) fail(`component-map component ${id} must use a namespaced id`);
    if (typeof component.publicCandidate !== 'boolean') fail(`component-map component ${id}.publicCandidate must be boolean`);
    const evidenceClaims = strings(component.evidenceClaims, `component-map component ${id}.evidenceClaims`);
    if (!evidenceClaims.length) fail(`component-map component ${id}.evidenceClaims must not be empty`);
    unique(evidenceClaims, `component-map component ${id}.evidenceClaims`);
    const unresolved = array(component.unresolved, `component-map component ${id}.unresolved`);
    return { ...component, id, evidenceClaims, unresolved };
  });
  unique(components.map(({ id }) => id), 'component-map component ids');
  return components;
}

async function validateArchitecture(root, value) {
  const map = schema(value, 'component-map.json', [2]);
  const architecture = object(map.architecture, 'component-map.json.architecture');
  const architecturePath = string(architecture.path, 'component-map.json.architecture.path');
  if (architecturePath !== '.reference-reconstruction/react-architecture.md') {
    fail('component-map.json.architecture.path must be .reference-reconstruction/react-architecture.md');
  }
  if (architecture.status !== 'approved') {
    fail('component-map.json.architecture.status must be approved');
  }
  const architectureFile = await bytesAt(root, architecturePath, 'component-map.json architecture');
  exactHash(digest(architectureFile.bytes), architecture.sha256, 'component-map.json architecture');
  return { path: architecturePath, sha256: digest(architectureFile.bytes) };
}

function nonNegativeInteger(value, label) {
  nonNegativeNumber(value, label);
  if (!Number.isInteger(value)) fail(`${label} must be an integer`);
  return value;
}

function positiveInteger(value, label) {
  positiveNumber(value, label);
  if (!Number.isInteger(value)) fail(`${label} must be an integer`);
  return value;
}

function validateCapture(value, label) {
  const capture = object(value, label);
  exactKeys(
    capture,
    ['inputMode', 'state', 'readiness', 'reducedMotion', 'timeControl', 'randomnessControl'],
    label,
  );
  for (const key of ['inputMode', 'state', 'readiness', 'timeControl', 'randomnessControl']) {
    string(capture[key], `${label}.${key}`);
  }
  if (typeof capture.reducedMotion !== 'boolean') fail(`${label}.reducedMotion must be boolean`);
  return capture;
}

function validateGpuContract(value, kind, label) {
  const contract = object(value, label);
  const context = object(contract.context, `${label}.context`);
  exactKeys(context, ['api', 'version'], `${label}.context`);
  if (context.api !== kind) fail(`${label}.context.api must be ${kind}`);
  string(context.version, `${label}.context.version`);
  const commonKeys = ['context', 'shaderCount', 'passOrder', 'textureCount'];
  if (kind === 'webgpu') {
    exactKeys(contract, [...commonKeys, 'pipelineCount', 'attachmentCount'], label);
    positiveInteger(contract.pipelineCount, `${label}.pipelineCount`);
    nonNegativeInteger(contract.attachmentCount, `${label}.attachmentCount`);
  } else {
    exactKeys(contract, [...commonKeys, 'programCount', 'framebufferCount'], label);
    positiveInteger(contract.programCount, `${label}.programCount`);
    nonNegativeInteger(contract.framebufferCount, `${label}.framebufferCount`);
  }
  positiveInteger(contract.shaderCount, `${label}.shaderCount`);
  nonNegativeInteger(contract.textureCount, `${label}.textureCount`);
  nonEmptyStrings(contract.passOrder, `${label}.passOrder`);
  return contract;
}

function validateDesktopSignaturePolicy(root, value, components) {
  const policy = object(value, 'component-map.json.desktopSignature.policy');
  exactKeys(
    policy,
    ['route', 'viewport', 'exactFidelity', 'forbiddenCompensation', 'checkpoints'],
    'component-map.json.desktopSignature.policy',
  );
  const route = string(policy.route, 'component-map.json.desktopSignature.policy.route');
  if (!route.startsWith('/')) fail('component-map.json.desktopSignature.policy.route must begin with /');
  viewport(policy.viewport, 'component-map.json.desktopSignature.policy.viewport');
  if (policy.exactFidelity !== true) {
    fail('component-map.json.desktopSignature.policy.exactFidelity must be true');
  }
  const forbidden = nonEmptyStrings(
    policy.forbiddenCompensation,
    'component-map.json.desktopSignature.policy.forbiddenCompensation',
  );
  if (JSON.stringify([...forbidden].sort()) !== JSON.stringify([...FORBIDDEN_COMPENSATION].sort())) {
    fail(`component-map.json.desktopSignature.policy.forbiddenCompensation must contain exactly ${FORBIDDEN_COMPENSATION.join(', ')}`);
  }
  const componentById = new Map(components.map((component) => [component.id, component]));
  const checkpoints = array(policy.checkpoints, 'component-map.json.desktopSignature.policy.checkpoints');
  if (!checkpoints.length) fail('component-map.json.desktopSignature.policy.checkpoints must not be empty');
  const checkpointIds = [];
  const surfaceDefinitions = new Map();
  for (const [checkpointIndex, checkpointValue] of checkpoints.entries()) {
    const label = `component-map.json.desktopSignature.policy.checkpoints[${checkpointIndex}]`;
    const checkpoint = object(checkpointValue, label);
    exactKeys(checkpoint, ['id', 'componentId', 'claimId', 'capture', 'surfaces', 'comparison'], label);
    const checkpointId = string(checkpoint.id, `${label}.id`);
    checkpointIds.push(checkpointId);
    const componentId = string(checkpoint.componentId, `${label}.componentId`);
    const component = componentById.get(componentId);
    if (!component) fail(`${label}.componentId does not name a component-map component`);
    if (component.unresolved.length) {
      fail(`desktop signature component ${component.id} has unresolved items and cannot close unresolved component claims`);
    }
    const claimId = string(checkpoint.claimId, `${label}.claimId`);
    if (!component.evidenceClaims.includes(claimId)) {
      fail(`${label}.claimId is not a current evidence claim for ${componentId}`);
    }
    validateCapture(checkpoint.capture, `${label}.capture`);

    const surfaces = array(checkpoint.surfaces, `${label}.surfaces`);
    if (!surfaces.length) fail(`${label}.surfaces must not be empty`);
    const surfaceIds = [];
    for (const [surfaceIndex, surfaceValue] of surfaces.entries()) {
      const surfaceLabel = `${label}.surfaces[${surfaceIndex}]`;
      const surface = object(surfaceValue, surfaceLabel);
      const id = string(surface.id, `${surfaceLabel}.id`);
      surfaceIds.push(id);
      const kind = string(surface.kind, `${surfaceLabel}.kind`);
      if (!SURFACE_KINDS.has(kind)) fail(`${surfaceLabel}.kind has invalid surface kind ${kind}`);
      const rootOwner = string(surface.rootOwner, `${surfaceLabel}.rootOwner`);
      const implementationFiles = nonEmptyStrings(surface.implementationFiles, `${surfaceLabel}.implementationFiles`);
      unique(implementationFiles, `${surfaceLabel}.implementationFiles`);
      implementationFiles.forEach((file, fileIndex) => relativePath(root, file, `${surfaceLabel}.implementationFiles[${fileIndex}]`));
      if (!implementationFiles.includes(rootOwner)) fail(`${surfaceLabel}.rootOwner must be included in implementationFiles`);
      relativePath(root, rootOwner, `${surfaceLabel}.rootOwner`);
      if (GPU_SURFACE_KINDS.has(kind)) {
        exactKeys(surface, ['id', 'kind', 'rootOwner', 'implementationFiles', 'gpuContract'], surfaceLabel);
        validateGpuContract(surface.gpuContract, kind, `${surfaceLabel}.gpuContract`);
      } else {
        exactKeys(surface, ['id', 'kind', 'rootOwner', 'implementationFiles'], surfaceLabel);
      }
      const definition = canonicalize({
        componentId,
        kind,
        rootOwner,
        implementationFiles,
        gpuContract: surface.gpuContract,
      });
      const previous = surfaceDefinitions.get(id);
      if (previous && JSON.stringify(previous) !== JSON.stringify(definition)) {
        fail(`desktop signature surface ${id} changes definition across checkpoints`);
      }
      surfaceDefinitions.set(id, definition);
    }
    unique(surfaceIds, `${label}.surface ids`);

    const comparison = object(checkpoint.comparison, `${label}.comparison`);
    exactKeys(comparison, ['method', 'tolerance', 'metrics'], `${label}.comparison`);
    string(comparison.method, `${label}.comparison.method`);
    string(comparison.tolerance, `${label}.comparison.tolerance`);
    const metrics = array(comparison.metrics, `${label}.comparison.metrics`);
    if (!metrics.length) fail(`${label}.comparison.metrics must not be empty`);
    const metricNames = [];
    for (const [metricIndex, metricValue] of metrics.entries()) {
      const metricLabel = `${label}.comparison.metrics[${metricIndex}]`;
      const metric = object(metricValue, metricLabel);
      exactKeys(metric, ['name', 'maximum', 'unit'], metricLabel);
      metricNames.push(string(metric.name, `${metricLabel}.name`));
      nonNegativeNumber(metric.maximum, `${metricLabel}.maximum`);
      string(metric.unit, `${metricLabel}.unit`);
    }
    unique(metricNames, `${label}.comparison metric names`);
  }
  unique(checkpointIds, 'component-map.json.desktopSignature.policy checkpoint ids');
  return policy;
}

async function validateArchitectureStage(root) {
  const mapFile = await jsonAt(root, '.reference-reconstruction/component-map.json', 'component-map.json');
  const rawMap = object(mapFile.value, 'component-map.json');
  if (rawMap.schemaVersion === 1) {
    fail('component-map.json schemaVersion 1 is legacy; oracle validation remains available, but migrate component-map.json to schemaVersion 2 before architecture and later gates');
  }
  schema(rawMap, 'component-map.json', [2]);
  const architecture = await validateArchitecture(root, rawMap);
  const components = validateComponentMap(rawMap);
  const signatureApproval = object(rawMap.desktopSignature, 'component-map.json.desktopSignature');
  exactKeys(signatureApproval, ['status', 'sha256', 'policy'], 'component-map.json.desktopSignature');
  if (signatureApproval.status !== 'approved') {
    fail('component-map.json.desktopSignature.status must be approved');
  }
  const signaturePolicy = validateDesktopSignaturePolicy(root, signatureApproval.policy, components);
  const signaturePolicyDigest = digestCanonicalJson(signaturePolicy);
  exactHash(signaturePolicyDigest, signatureApproval.sha256, 'component-map.json approved desktop signature policy');
  return {
    mapFile,
    architecture,
    components,
    signaturePolicy,
    signaturePolicyDigest,
  };
}

async function validateHashedOutputs(root, value, label) {
  const outputs = array(value, label);
  if (!outputs.length) fail(`${label} must not be empty`);
  const paths = [];
  const physicalFiles = [];
  const records = [];
  for (const [index, outputValue] of outputs.entries()) {
    const outputLabel = `${label}[${index}]`;
    const output = object(outputValue, outputLabel);
    exactKeys(output, ['path', 'sha256'], outputLabel);
    const outputPath = string(output.path, `${outputLabel}.path`);
    paths.push(outputPath);
    const source = await bytesAt(root, outputPath, `${outputLabel}.path`);
    exactHash(digest(source.bytes), output.sha256, outputLabel);
    physicalFiles.push(source.file);
    records.push({ path: outputPath, file: source.file, sha256: output.sha256 });
  }
  unique(paths, `${label} paths`);
  unique(physicalFiles, `${label} physical files`);
  return records;
}

function validateGpuEntries(value, count, stateKey, passingValue, label, failureNoun) {
  const entries = array(value, label);
  if (entries.length !== count) fail(`${label} count mismatch: expected ${count}, received ${entries.length}`);
  const ids = [];
  for (const [index, entryValue] of entries.entries()) {
    const entryLabel = `${label}[${index}]`;
    const entry = object(entryValue, entryLabel);
    exactKeys(entry, ['id', stateKey], entryLabel);
    const id = string(entry.id, `${entryLabel}.id`);
    ids.push(id);
    if (entry[stateKey] !== passingValue) {
      const failure = stateKey === 'compiled'
        ? 'did not compile'
        : stateKey === 'linked'
          ? 'did not link'
          : stateKey === 'ready'
            ? 'is not ready'
            : 'is not complete';
      fail(`${failureNoun} ${id} ${failure}`);
    }
  }
  unique(ids, `${label} ids`);
}

async function validateGpuStatus(root, checkpointId, policySurface, receiptSurface, label) {
  const binding = object(receiptSurface.gpuStatus, `${label}.gpuStatus`);
  exactKeys(binding, ['path', 'sha256'], `${label}.gpuStatus`);
  if (!string(binding.path, `${label}.gpuStatus.path`).endsWith('.json')) {
    fail(`${label}.gpuStatus.path must name a JSON file`);
  }
  const statusFile = await jsonAt(root, binding.path, `${label} GPU status`);
  exactHash(digest(statusFile.bytes), binding.sha256, `${label}.gpuStatus`);
  const status = schema(statusFile.value, `${label} GPU status`, [2]);
  if (status.checkpointId !== checkpointId) fail(`${label} GPU status checkpointId must be ${checkpointId}`);
  if (status.surfaceId !== policySurface.id) fail(`${label} GPU status surfaceId must be ${policySurface.id}`);
  const contract = policySurface.gpuContract;
  const context = object(status.context, `${label} GPU status.context`);
  exactKeys(context, ['api', 'version'], `${label} GPU status.context`);
  if (context.api !== contract.context.api) fail(`${label} GPU status context api mismatch`);
  if (context.version !== contract.context.version) fail(`${label} GPU status context version mismatch`);
  if (policySurface.kind === 'webgpu') {
    exactKeys(
      status,
      ['schemaVersion', 'checkpointId', 'surfaceId', 'context', 'shaders', 'pipelines', 'attachments', 'passOrder', 'textures', 'draws', 'errors'],
      `${label} GPU status`,
    );
    validateGpuEntries(status.shaders, contract.shaderCount, 'compiled', true, `${label} GPU status.shaders`, 'shader');
    validateGpuEntries(status.pipelines, contract.pipelineCount, 'ready', true, `${label} GPU status.pipelines`, 'pipeline');
    validateGpuEntries(status.attachments, contract.attachmentCount, 'complete', true, `${label} GPU status.attachments`, 'attachment');
  } else {
    exactKeys(
      status,
      ['schemaVersion', 'checkpointId', 'surfaceId', 'context', 'shaders', 'programs', 'framebuffers', 'passOrder', 'textures', 'draws', 'errors'],
      `${label} GPU status`,
    );
    validateGpuEntries(status.shaders, contract.shaderCount, 'compiled', true, `${label} GPU status.shaders`, 'shader');
    validateGpuEntries(status.programs, contract.programCount, 'linked', true, `${label} GPU status.programs`, 'program');
    validateGpuEntries(
      status.framebuffers,
      contract.framebufferCount,
      'status',
      'FRAMEBUFFER_COMPLETE',
      `${label} GPU status.framebuffers`,
      'framebuffer',
    );
  }
  if (JSON.stringify(status.passOrder) !== JSON.stringify(contract.passOrder)) {
    fail(`${label} GPU status passOrder mismatch`);
  }
  validateGpuEntries(status.textures, contract.textureCount, 'ready', true, `${label} GPU status.textures`, 'texture');
  if (!Number.isInteger(status.draws) || status.draws <= 0) fail(`${label} GPU status draws must be greater than zero`);
  const errors = array(status.errors, `${label} GPU status.errors`);
  if (errors.length) fail(`${label} GPU status errors must be empty`);
  return statusFile.file;
}

async function validateDesktopSignature(root, architectureState, oracleLockSha256) {
  const receiptFile = await jsonAt(
    root,
    '.reference-reconstruction/receipts/desktop-signature.json',
    'desktop signature receipt',
  );
  const receipt = schema(receiptFile.value, 'desktop signature receipt', [2]);
  exactKeys(receipt, ['schemaVersion', 'profile', 'bindings', 'route', 'viewport', 'checkpoints'], 'desktop signature receipt');
  if (receipt.profile !== 'desktop-signature') {
    fail('desktop signature receipt.profile must be desktop-signature');
  }
  const bindings = object(receipt.bindings, 'desktop signature receipt.bindings');
  exactKeys(bindings, ['oracleLockSha256', 'architectureSha256', 'signaturePolicyDigest'], 'desktop signature receipt.bindings');
  const expectedBindings = {
    oracleLockSha256,
    architectureSha256: architectureState.architecture.sha256,
    signaturePolicyDigest: architectureState.signaturePolicyDigest,
  };
  for (const [key, expected] of Object.entries(expectedBindings)) {
    if (!SHA256.test(bindings[key] ?? '')) {
      fail(`desktop signature receipt.bindings.${key} must be a lowercase sha256`);
    }
    if (bindings[key] !== expected) fail(`stale desktop signature receipt: ${key} mismatch`);
  }
  if (receipt.route !== architectureState.signaturePolicy.route) {
    fail('desktop signature receipt.route does not match the approved policy');
  }
  const receiptViewport = viewport(receipt.viewport, 'desktop signature receipt.viewport');
  if (JSON.stringify(receiptViewport) !== JSON.stringify(architectureState.signaturePolicy.viewport)) {
    fail('desktop signature receipt.viewport does not match the approved policy');
  }

  const policyCheckpoints = architectureState.signaturePolicy.checkpoints;
  const receiptCheckpoints = array(receipt.checkpoints, 'desktop signature receipt.checkpoints');
  const policyIds = policyCheckpoints.map(({ id }) => id);
  const receiptIds = receiptCheckpoints.map((value, index) => string(object(value, `desktop signature receipt.checkpoints[${index}]`).id, `desktop signature receipt.checkpoints[${index}].id`));
  if (JSON.stringify(receiptIds) !== JSON.stringify(policyIds)) {
    fail(`desktop signature checkpoint IDs and order must exactly match ${policyIds.join(', ')}`);
  }
  for (const [checkpointIndex, policyCheckpoint] of policyCheckpoints.entries()) {
    const label = `desktop signature receipt.checkpoints[${checkpointIndex}]`;
    const receiptCheckpoint = object(receiptCheckpoints[checkpointIndex], label);
    exactKeys(receiptCheckpoint, ['id', 'capture', 'surfaces', 'comparison', 'compensationObserved'], label);
    const receiptCapture = validateCapture(receiptCheckpoint.capture, `${label}.capture`);
    if (JSON.stringify(canonicalize(receiptCapture)) !== JSON.stringify(canonicalize(policyCheckpoint.capture))) {
      fail(`${label}.capture does not match the approved policy`);
    }

    const policySurfaces = policyCheckpoint.surfaces;
    const receiptSurfaces = array(receiptCheckpoint.surfaces, `${label}.surfaces`);
    const policySurfaceIds = policySurfaces.map(({ id }) => id);
    const receiptSurfaceIds = receiptSurfaces.map((value, index) => string(object(value, `${label}.surfaces[${index}]`).id, `${label}.surfaces[${index}].id`));
    if (JSON.stringify(receiptSurfaceIds) !== JSON.stringify(policySurfaceIds)) {
      fail(`${label} surface IDs and order must exactly match ${policySurfaceIds.join(', ')}`);
    }
    for (const [surfaceIndex, policySurface] of policySurfaces.entries()) {
      const surfaceLabel = `${label}.surfaces[${surfaceIndex}]`;
      const receiptSurface = object(receiptSurfaces[surfaceIndex], surfaceLabel);
      const expectedKeys = GPU_SURFACE_KINDS.has(policySurface.kind)
        ? ['id', 'kind', 'rootOwner', 'implementationFiles', 'implementationDigest', 'gpuStatus']
        : ['id', 'kind', 'rootOwner', 'implementationFiles', 'implementationDigest'];
      exactKeys(receiptSurface, expectedKeys, surfaceLabel);
      if (receiptSurface.kind !== policySurface.kind) {
        fail(`${surfaceLabel} surface ${policySurface.id} kind must remain ${policySurface.kind}`);
      }
      if (receiptSurface.rootOwner !== policySurface.rootOwner) {
        fail(`${surfaceLabel} surface ${policySurface.id} rootOwner must match the approved policy`);
      }
      if (JSON.stringify(receiptSurface.implementationFiles) !== JSON.stringify(policySurface.implementationFiles)) {
        fail(`${surfaceLabel} surface ${policySurface.id} implementationFiles must match the approved policy`);
      }
      const implementationState = await fileSetDigest(root, receiptSurface.implementationFiles, `${surfaceLabel}.implementationFiles`);
      exactHash(implementationState.digest, receiptSurface.implementationDigest, `${surfaceLabel}.implementationDigest`);
      if (GPU_SURFACE_KINDS.has(policySurface.kind)) {
        await validateGpuStatus(root, policyCheckpoint.id, policySurface, receiptSurface, surfaceLabel);
      }
    }

    const policyComparison = policyCheckpoint.comparison;
    const receiptComparison = object(receiptCheckpoint.comparison, `${label}.comparison`);
    exactKeys(
      receiptComparison,
      ['method', 'metrics', 'referenceOutputs', 'targetOutputs', 'evidenceOutputs'],
      `${label}.comparison`,
    );
    if (receiptComparison.method !== policyComparison.method) {
      fail(`${label}.comparison.method does not match the approved policy`);
    }
    const receiptMetrics = array(receiptComparison.metrics, `${label}.comparison.metrics`);
    const policyMetricNames = policyComparison.metrics.map(({ name }) => name);
    const receiptMetricNames = receiptMetrics.map((value, index) => string(object(value, `${label}.comparison.metrics[${index}]`).name, `${label}.comparison.metrics[${index}].name`));
    if (JSON.stringify(receiptMetricNames) !== JSON.stringify(policyMetricNames)) {
      fail(`${label}.comparison metric IDs and order must match the approved policy`);
    }
    for (const [metricIndex, policyMetric] of policyComparison.metrics.entries()) {
      const metricLabel = `${label}.comparison.metrics[${metricIndex}]`;
      const receiptMetric = object(receiptMetrics[metricIndex], metricLabel);
      exactKeys(receiptMetric, ['name', 'observed', 'unit'], metricLabel);
      nonNegativeNumber(receiptMetric.observed, `${metricLabel}.observed`);
      if (receiptMetric.unit !== policyMetric.unit) fail(`${metricLabel}.unit does not match the approved policy`);
      if (receiptMetric.observed > policyMetric.maximum) {
        fail(`${label} metric ${policyMetric.name} exceeds its approved maximum`);
      }
    }
    const referenceOutputs = await validateHashedOutputs(root, receiptComparison.referenceOutputs, `${label}.comparison.referenceOutputs`);
    const targetOutputs = await validateHashedOutputs(root, receiptComparison.targetOutputs, `${label}.comparison.targetOutputs`);
    await validateHashedOutputs(root, receiptComparison.evidenceOutputs, `${label}.comparison.evidenceOutputs`);
    const referenceFiles = new Set(referenceOutputs.map(({ file }) => file));
    if (targetOutputs.some(({ file }) => referenceFiles.has(file))) {
      fail(`${label}.comparison reference and target outputs must be distinct physical files`);
    }
    const compensationObserved = strings(receiptCheckpoint.compensationObserved, `${label}.compensationObserved`);
    unique(compensationObserved, `${label}.compensationObserved`);
    if (compensationObserved.length) {
      fail(`${label} observed forbidden compensation ${compensationObserved[0]}`);
    }
  }
  return { path: '.reference-reconstruction/receipts/desktop-signature.json', sha256: digest(receiptFile.bytes) };
}

function validateClaimSets(receipt, component) {
  const claims = object(receipt.claims, `parity receipt ${component.id}.claims`);
  const sets = ['passed', 'failed', 'blocked', 'notApplicable'].map((key) => [
    key,
    strings(claims[key], `parity receipt ${component.id}.claims.${key}`),
  ]);
  const all = sets.flatMap(([, values]) => values);
  unique(all, `parity receipt ${component.id} claims`);
  if (claims.failed.length || claims.blocked.length) fail(`parity receipt ${component.id} has failed or blocked claims`);
  if (!claims.passed.length) fail(`parity receipt ${component.id} must have at least one passed claim`);
  const passed = new Set(claims.passed);
  for (const claim of component.evidenceClaims) {
    if (!passed.has(claim)) fail(`parity receipt ${component.id} claim ${claim} must pass`);
  }
  if (JSON.stringify([...all].sort()) !== JSON.stringify([...component.evidenceClaims].sort())) {
    fail(`parity receipt ${component.id} claims must equal the exact planned claim set`);
  }
}

async function validateParityReceipt(root, promotion, component, oracleLockSha256) {
  const receiptPath = string(promotion.parityReceipt, `promotion ${component.id}.parityReceipt`);
  const receiptFile = await jsonAt(root, receiptPath, `parity receipt ${component.id}`);
  const receipt = schema(receiptFile.value, `parity receipt ${component.id}`);
  if (receipt.componentId !== component.id) fail(`parity receipt ${component.id} component mismatch`);
  if (receipt.profile !== 'research-parity') fail(`parity receipt ${component.id} must use research-parity profile`);
  const bindings = object(receipt.bindings, `parity receipt ${component.id}.bindings`);
  const expected = {
    oracleLockSha256,
    interfaceFingerprint: promotion.interfaceFingerprint,
    implementationDigest: promotion.implementationDigest,
    assetMappingDigest: promotion.assetMappingDigest,
    claimSetDigest: promotion.claimSetDigest,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (!SHA256.test(value ?? '')) fail(`promotion ${component.id}.${key} must be a lowercase sha256`);
    if (!SHA256.test(bindings[key] ?? '')) fail(`parity receipt ${component.id}.bindings.${key} must be a lowercase sha256`);
    if (bindings[key] !== value) fail(`stale parity receipt for ${component.id}: ${key} mismatch`);
  }
  if (component.unresolved.length) fail(`parity receipt ${component.id} cannot close unresolved component claims`);
  validateClaimSets(receipt, component);
  const outputs = array(receipt.outputs, `parity receipt ${component.id}.outputs`);
  if (!outputs.length) fail(`parity receipt ${component.id}.outputs must not be empty`);
  for (const [index, outputValue] of outputs.entries()) {
    const output = object(outputValue, `parity receipt ${component.id}.outputs[${index}]`);
    const source = await bytesAt(root, output.path, `parity output ${component.id}[${index}].path`);
    exactHash(digest(source.bytes), output.sha256, `parity output ${component.id}[${index}]`);
  }
  return { path: receiptPath, sha256: digest(receiptFile.bytes) };
}

async function validateReuseReceipt(root, projectId, promotion) {
  if (promotion.reuseStatus !== 'reuse-proven') return undefined;
  const receiptPath = string(promotion.reuseReceipt, `promotion ${promotion.id}.reuseReceipt`);
  const receiptFile = await jsonAt(root, receiptPath, `reuse receipt ${promotion.id}`);
  const receipt = schema(receiptFile.value, `reuse receipt ${promotion.id}`);
  if (receipt.componentId !== promotion.id) fail(`reuse receipt ${promotion.id} component mismatch`);
  if (receipt.sourceProjectId !== projectId) fail(`reuse receipt ${promotion.id} source project mismatch`);
  string(receipt.consumerProjectId, `reuse receipt ${promotion.id}.consumerProjectId`);
  if (receipt.consumerProjectId === projectId) fail(`reuse receipt ${promotion.id} must name a second real project`);
  const consumerRootValue = string(receipt.consumerProjectRoot, `reuse receipt ${promotion.id}.consumerProjectRoot`);
  let consumerRoot;
  try {
    consumerRoot = await realpath(path.resolve(root, consumerRootValue));
  } catch (error) {
    fail(`reuse receipt ${promotion.id}.consumerProjectRoot is unreadable: ${error.code ?? error.message}`);
  }
  const targetRoot = await realpath(root);
  if (isWithin(targetRoot, consumerRoot) || isWithin(consumerRoot, targetRoot)) {
    fail(`reuse receipt ${promotion.id} consumer project must be physically separate`);
  }
  const marker = schema(
    (await jsonAt(consumerRoot, '.reference-reconstruction/project.json', `reuse receipt ${promotion.id} consumer project marker`)).value,
    `reuse receipt ${promotion.id} consumer project marker`,
  );
  if (marker.projectId !== receipt.consumerProjectId) fail(`reuse receipt ${promotion.id} consumer project mismatch`);
  if (marker.projectId === projectId) fail(`reuse receipt ${promotion.id} must name a second real project`);
  if (receipt.interfaceFingerprint !== promotion.interfaceFingerprint || receipt.implementationDigest !== promotion.implementationDigest) {
    fail(`reuse receipt ${promotion.id} is stale`);
  }
  if (!SHA256.test(receipt.interfaceFingerprint ?? '') || !SHA256.test(receipt.implementationDigest ?? '')) {
    fail(`reuse receipt ${promotion.id} bindings must be lowercase sha256 values`);
  }
  const consumerState = await fileSetDigest(
    consumerRoot,
    receipt.consumerFiles,
    `reuse receipt ${promotion.id}.consumerFiles`,
  );
  exactHash(consumerState.digest, receipt.consumerDigest, `reuse receipt ${promotion.id}.consumerDigest`);
  return { path: receiptPath, sha256: digest(receiptFile.bytes) };
}

async function validatePromotion(root, projectId, oracleLockSha256, architectureState) {
  const components = architectureState.components;
  const promotionFile = await jsonAt(root, '.reference-reconstruction/promotion.json', 'promotion.json');
  const promotionDocument = schema(promotionFile.value, 'promotion.json');
  const promotions = array(promotionDocument.components, 'promotion.json.components').map((entry, index) => {
    const promotion = object(entry, `promotion component ${index}`);
    promotion.id = string(promotion.id, `promotion component ${index}.id`);
    if (!PROMOTION_STAGES.has(promotion.implementationStage)) fail(`promotion ${promotion.id} has invalid implementationStage`);
    if (!PARITY_STATUSES.has(promotion.parityStatus)) fail(`promotion ${promotion.id} has invalid parityStatus`);
    if (!REUSE_STATUSES.has(promotion.reuseStatus)) fail(`promotion ${promotion.id} has invalid reuseStatus`);
    if (!DISTRIBUTION_STATUSES.has(promotion.distributionStatus)) fail(`promotion ${promotion.id} has invalid distributionStatus`);
    return promotion;
  });
  unique(promotions.map(({ id }) => id), 'promotion component ids');
  const componentIds = components.map(({ id }) => id).sort();
  const promotionIds = promotions.map(({ id }) => id).sort();
  if (JSON.stringify(componentIds) !== JSON.stringify(promotionIds)) fail('promotion.json must cover every component-map id exactly once');

  const byComponent = new Map(components.map((component) => [component.id, component]));
  const receipts = new Map();
  const reuseReceipts = new Map();
  for (const promotion of promotions) {
    const component = byComponent.get(promotion.id);
    exactHash(
      digestClaimSet(component.evidenceClaims),
      promotion.claimSetDigest,
      `promotion ${promotion.id}.claimSetDigest`,
    );
    const digestFields = [
      ['interfaceFiles', 'interfaceFingerprint'],
      ['implementationFiles', 'implementationDigest'],
      ['assetMappingFiles', 'assetMappingDigest'],
    ];
    for (const [filesKey, digestKey] of digestFields) {
      const computed = await fileSetDigest(root, promotion[filesKey], `promotion ${promotion.id}.${filesKey}`);
      exactHash(computed.digest, promotion[digestKey], `promotion ${promotion.id}.${digestKey}`);
    }
    if (promotion.parityStatus === 'parity-verified') {
      if (promotion.implementationStage !== 'reconstructed') fail(`component ${promotion.id} is not promoted`);
      receipts.set(promotion.id, await validateParityReceipt(root, promotion, component, oracleLockSha256));
    }
    const reuseReceipt = await validateReuseReceipt(root, projectId, promotion);
    if (reuseReceipt) reuseReceipts.set(promotion.id, reuseReceipt);
  }
  return { components, promotions, receipts, reuseReceipts };
}

async function validateCatalog(root, projectId, promotionState, allowDistributionValidated = false) {
  if (!allowDistributionValidated && promotionState.promotions.some(({ distributionStatus }) => distributionStatus === 'distribution-validated')) {
    fail('distribution-validated requires the distribution stage');
  }
  const catalogFile = await jsonAt(root, 'component-catalog/catalog.json', 'component catalog');
  const catalog = schema(catalogFile.value, 'component catalog');
  if (catalog.projectId !== projectId) fail('component catalog projectId mismatch');
  const entryPaths = strings(catalog.entries, 'component catalog.entries');
  unique(entryPaths, 'component catalog.entries');
  const promotionById = new Map(promotionState.promotions.map((promotion) => [promotion.id, promotion]));
  const componentById = new Map(promotionState.components.map((component) => [component.id, component]));
  const ids = [];
  const requiredAssetIds = new Set();
  for (const [index, entryPath] of entryPaths.entries()) {
    const entryFile = await jsonAt(path.join(root, 'component-catalog'), entryPath, `catalog entry ${index}`);
    const entry = schema(entryFile.value, `catalog entry ${index}`);
    const id = string(entry.id, `catalog entry ${index}.id`);
    ids.push(id);
    const promotion = promotionById.get(id);
    const component = componentById.get(id);
    if (!promotion || !component?.publicCandidate || promotion.implementationStage !== 'reconstructed' || promotion.parityStatus !== 'parity-verified') {
      fail(`component ${id} is not promoted`);
    }
    if (!SEMVER.test(entry.componentVersion ?? '')) fail(`catalog entry ${id}.componentVersion must be semver`);
    string(entry.package, `catalog entry ${id}.package`);
    string(entry.exportPath, `catalog entry ${id}.exportPath`);
    if (entry.framework !== 'nextjs-react') fail(`catalog entry ${id}.framework must be nextjs-react`);
    if (typeof entry.clientBoundary !== 'boolean') fail(`catalog entry ${id}.clientBoundary must be boolean`);
    for (const [filesKey, digestKey] of [
      ['interfaceFiles', 'interfaceFingerprint'],
      ['implementationFiles', 'implementationDigest'],
      ['assetMappingFiles', 'assetMappingDigest'],
    ]) {
      const entryFiles = strings(entry[filesKey], `catalog entry ${id}.${filesKey}`);
      if (JSON.stringify(entryFiles) !== JSON.stringify(promotion[filesKey])) {
        fail(`catalog entry ${id} ${filesKey} binding mismatch`);
      }
      if (!SHA256.test(entry[digestKey] ?? '') || entry[digestKey] !== promotion[digestKey]) {
        fail(`catalog entry ${id} ${digestKey} binding mismatch`);
      }
    }
    string(entry.propsType, `catalog entry ${id}.propsType`);
    for (const key of ['slots', 'events', 'lifecycle', 'styleTokens', 'assetRequirements', 'states', 'viewports', 'inputs', 'accessibility', 'fallbacks']) {
      const values = strings(entry[key], `catalog entry ${id}.${key}`);
      unique(values, `catalog entry ${id}.${key}`);
      if (key === 'assetRequirements') values.forEach((assetId) => requiredAssetIds.add(assetId));
    }
    const peers = object(entry.peerDependencies, `catalog entry ${id}.peerDependencies`);
    for (const [name, version] of Object.entries(peers)) string(version, `catalog entry ${id}.peerDependencies.${name}`);
    object(entry.contentSchema, `catalog entry ${id}.contentSchema`);
    const axes = object(entry.axisStatuses, `catalog entry ${id}.axisStatuses`);
    for (const key of ['implementationStage', 'parityStatus', 'reuseStatus', 'distributionStatus']) {
      if (axes[key] !== promotion[key]) fail(`catalog entry ${id} axis status mismatch for ${key}`);
    }
    const receipt = promotionState.receipts.get(id);
    if (entry.parityReceipt !== receipt?.path) fail(`catalog entry ${id} parity receipt path mismatch`);
    exactHash(receipt?.sha256, entry.parityReceiptSha256, `catalog entry ${id} parity receipt`);
    if (promotion.reuseStatus === 'reuse-proven') {
      const reuseReceipt = promotionState.reuseReceipts.get(id);
      if (entry.reuseReceipt !== reuseReceipt?.path) fail(`catalog entry ${id} reuse receipt path mismatch`);
      exactHash(reuseReceipt?.sha256, entry.reuseReceiptSha256, `catalog entry ${id} reuse receipt`);
    }
    strings(entry.compatibilityTags, `catalog entry ${id}.compatibilityTags`);
  }
  unique(ids, 'catalog component ids');
  const expected = promotionState.components
    .filter((component) => component.publicCandidate)
    .filter((component) => {
      const promotion = promotionById.get(component.id);
      return promotion.implementationStage === 'reconstructed' && promotion.parityStatus === 'parity-verified';
    })
    .map(({ id }) => id)
    .sort();
  if (JSON.stringify([...ids].sort()) !== JSON.stringify(expected)) fail('component catalog must contain every promoted public component exactly once');
  return { count: ids.length, ids, requiredAssetIds };
}

async function walkFiles(root) {
  const status = await lstat(root);
  if (status.isSymbolicLink()) fail(`distribution root contains symlink ${root}`);
  if (status.isFile()) return [root];
  if (!status.isDirectory()) return [];
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const child = path.join(root, entry.name);
    if (entry.isSymbolicLink()) fail(`distribution root contains symlink ${child}`);
    if (entry.isDirectory()) files.push(...await walkFiles(child));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}

async function validateDistribution(root, projectState, oracleState, promotionState, catalogState) {
  const canonicalDistributionRoots = [];
  for (const [index, relative] of projectState.distributionRoots.entries()) {
    canonicalDistributionRoots.push(await canonicalWithin(root, relative, `distribution root ${index}`));
  }
  const ledgerFile = await jsonAt(root, '.reference-reconstruction/rights-ledger.json', 'rights-ledger.json');
  const ledger = schema(ledgerFile.value, 'rights-ledger.json');
  const assets = array(ledger.assets, 'rights-ledger.json.assets');
  const assetIds = [];
  for (const [index, value] of assets.entries()) {
    const asset = object(value, `rights asset ${index}`);
    assetIds.push(string(asset.id, `rights asset ${index}.id`));
    string(asset.provenance, `rights asset ${index}.provenance`);
    string(asset.rights, `rights asset ${index}.rights`);
    if (typeof asset.replacementRequired !== 'boolean') fail(`rights asset ${asset.id}.replacementRequired must be boolean`);
    string(asset.source, `rights asset ${asset.id}.source`);
    if (!DISTRIBUTION_RIGHTS.has(asset.rights)) {
      fail(`rights asset ${asset.id} rights ${asset.rights} is not one of owned, cc0, dependency-license, licensed`);
    }
    if (asset.replacementRequired) fail(`rights asset ${asset.id} is replacementRequired`);
    string(asset.license, `rights asset ${asset.id}.license`);
    if (HOST_URL.test(asset.source)) {
      fail(`rights asset ${asset.id}.source must be target-relative, not a host URL`);
    }
    const source = await bytesAt(root, asset.source, `rights asset ${asset.id}.source`);
    if (!canonicalDistributionRoots.some((distributionRoot) => isWithin(distributionRoot, source.file))) {
      fail(`rights asset ${asset.id}.source must be within a scanned distribution root`);
    }
    exactHash(digest(source.bytes), asset.sha256, `rights asset ${asset.id}`);
  }
  unique(assetIds, 'rights asset ids');
  const requiredAssetIds = [...catalogState.requiredAssetIds].sort();
  if (JSON.stringify([...assetIds].sort()) !== JSON.stringify(requiredAssetIds)) {
    fail('rights ledger asset IDs must exactly match catalog requirements');
  }

  const receipt = schema(
    (await jsonAt(root, '.reference-reconstruction/receipts/distribution.json', 'distribution receipt')).value,
    'distribution receipt',
  );
  if (receipt.projectId !== projectState.project.projectId) fail('distribution receipt projectId mismatch');
  exactHash(digest(ledgerFile.bytes), receipt.rightsLedgerSha256, 'distribution receipt rights ledger');
  const scannedRoots = strings(receipt.scannedRoots, 'distribution receipt.scannedRoots');
  if (JSON.stringify(scannedRoots) !== JSON.stringify(projectState.distributionRoots)) fail('distribution receipt scannedRoots mismatch');
  if (!projectState.forbiddenDistributionText.length) {
    fail('project.json.forbiddenDistributionText must not be empty for distribution');
  }

  const promotionById = new Map(promotionState.promotions.map((promotion) => [promotion.id, promotion]));
  for (const id of catalogState.ids) {
    if (promotionById.get(id)?.distributionStatus !== 'distribution-validated') {
      fail(`component ${id} distribution status is not validated`);
    }
  }

  const forbidden = [
    '/__mirror__/',
    'source/original',
    'evidence/reference-checkpoints',
    '.reference-reconstruction',
    ...projectState.forbiddenDistributionText,
  ];
  unique(forbidden, 'forbidden distribution text');
  const scannedFiles = new Map();
  for (const [index, distributionRoot] of canonicalDistributionRoots.entries()) {
    const relative = projectState.distributionRoots[index];
    let files;
    try {
      files = await walkFiles(distributionRoot);
    } catch (error) {
      if (error.message?.startsWith('reconstruction validation failed:')) throw error;
      fail(`distribution root ${relative} is unreadable: ${error.code ?? error.message}`);
    }
    for (const file of files) {
      const canonical = await canonicalWithin(root, path.relative(root, file), `distribution file ${path.relative(root, file)}`);
      const relativeFile = path.relative(root, canonical).split(path.sep).join('/');
      scannedFiles.set(relativeFile, await readFile(canonical));
    }
  }
  if (!scannedFiles.size) fail('distribution roots must contain at least one file');
  const packageRecords = [];
  const sortedFiles = [...scannedFiles.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  for (const [relativeFile, bytes] of sortedFiles) {
    const fileHash = digest(bytes);
    packageRecords.push(`${relativeFile}\0${fileHash}`);
    if (oracleState.artifactHashes.has(fileHash)) {
      fail(`distribution file ${relativeFile} matches archived oracle artifact bytes`);
    }
    const normalizedFilename = `/${relativeFile}/`;
    const pathMatch = forbidden.find((needle) => normalizedFilename.includes(needle));
    if (pathMatch) fail(`distribution filename contains forbidden text ${pathMatch}: ${relativeFile}`);
    const content = bytes.toString('utf8');
    const match = forbidden.find((needle) => content.includes(needle));
    if (match) fail(`distribution file ${relativeFile} contains forbidden text ${match}`);
  }
  exactHash(digest(packageRecords.join('\n')), receipt.packageDigest, 'distribution receipt.packageDigest');
}

export async function validateReconstruction(root, stage = 'catalog') {
  if (!STAGES.includes(stage)) fail(`unknown stage ${stage}`);
  let targetRoot;
  try {
    targetRoot = await realpath(path.resolve(string(root, 'target root')));
  } catch (error) {
    fail(`target root is unreadable: ${error.code ?? error.message}`);
  }
  const projectState = await validateProject(targetRoot);
  const oracleState = await validateOracle(targetRoot, projectState.oracleRoot);
  if (stage === 'oracle') return { stage, componentCount: 0 };

  const architectureState = await validateArchitectureStage(targetRoot);
  if (stage === 'architecture') {
    return { stage, componentCount: architectureState.components.length };
  }

  await validateDesktopSignature(targetRoot, architectureState, oracleState.lockSha256);
  if (stage === 'signature') {
    return { stage, componentCount: architectureState.components.length };
  }

  const promotionState = await validatePromotion(
    targetRoot,
    projectState.project.projectId,
    oracleState.lockSha256,
    architectureState,
  );
  if (stage === 'promotion') return { stage, componentCount: promotionState.components.length };

  const catalogState = await validateCatalog(
    targetRoot,
    projectState.project.projectId,
    promotionState,
    stage === 'distribution',
  );
  if (stage === 'distribution') {
    await validateDistribution(targetRoot, projectState, oracleState, promotionState, catalogState);
  }
  return { stage, componentCount: catalogState.count };
}

function parseCli(argv) {
  if (!argv.length) fail('usage: validate-reconstruction.mjs <target-root> [--stage oracle|architecture|signature|promotion|catalog|distribution]');
  const [root, flag, stage, ...extra] = argv;
  if (extra.length || (flag && flag !== '--stage') || (flag && !stage)) {
    fail('usage: validate-reconstruction.mjs <target-root> [--stage oracle|architecture|signature|promotion|catalog|distribution]');
  }
  return { root, stage: stage ?? 'catalog' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { root, stage } = parseCli(process.argv.slice(2));
    console.log(JSON.stringify(await validateReconstruction(root, stage)));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
