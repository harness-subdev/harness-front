#!/usr/bin/env node
/** Validate bounded runtime evidence exported by gpu-runtime-probe.js. */
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_ARRAYS = [
  "contexts",
  "shaders",
  "programs",
  "uniformLocations",
  "uniformWrites",
  "textures",
  "framebuffers",
  "drawBatches",
  "stateChanges",
  "checkpoints",
  "observedGetErrors",
  "probeErrors",
];
const TRACE_FIELDS = [
  "schemaVersion",
  "producer",
  "producerStatus",
  "startedAt",
  "limits",
  "truncated",
  "dropped",
  "webgpuDetected",
  ...REQUIRED_ARRAYS,
];
const REQUIRED_LIMITS = {
  contexts: 8,
  shaders: 256,
  programs: 128,
  textures: 512,
  samplers: 512,
  framebuffers: 128,
  renderbuffers: 128,
  drawBatches: 10000,
  resourceEvents: 1024,
  shaderSourceBytesTotal: 8 * 1024 * 1024,
};
const CHECKPOINT_CONDITIONS = ["viewport", "dpr", "frame", "time", "input", "camera", "colorSettings"];
const FLOW_METHODS = {
  drawBuffers: new Set(["drawBuffers", "drawBuffersWEBGL"]),
  readBuffer: new Set(["readBuffer"]),
  blitFramebuffer: new Set(["blitFramebuffer"]),
  deleteSampler: new Set(["deleteSampler"]),
  bindSampler: new Set(["bindSampler"]),
  samplerParameter: new Set(["samplerParameteri", "samplerParameterf"]),
};
const FRAMEBUFFER_COMPLETE = 0x8CD5;
const FRAMEBUFFER = 0x8D40;
const READ_FRAMEBUFFER = 0x8CA8;
const DRAW_FRAMEBUFFER = 0x8CA9;
const RENDERBUFFER = 0x8D41;
const TEXTURE_CUBE_MAP = 0x8513;
const TEXTURE_CUBE_FACES = new Set([0x8515, 0x8516, 0x8517, 0x8518, 0x8519, 0x851A]);
const LAYERED_TEXTURE_TARGETS = new Set([0x806F, 0x8C1A]);
const TEXTURE_DEFINITION_METHODS = new Set([
  "texImage2D", "texImage3D", "compressedTexImage2D", "compressedTexImage3D", "copyTexImage2D",
  "texStorage2D", "texStorage3D",
]);
const RENDERBUFFER_DEFINITION_METHODS = new Set(["renderbufferStorage", "renderbufferStorageMultisample"]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort(compareStrings).map((key) => [key, canonicalValue(value[key])]));
}

function traceId(trace) {
  return `sha256:${sha256(JSON.stringify(canonicalValue(trace)))}`;
}

function objectRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function uniqueById(records, label, block) {
  const byId = new Map();
  for (const [index, record] of records.entries()) {
    if (!objectRecord(record) || !nonEmptyString(record.id)) {
      block(`${label} record ${index + 1} requires a stable id.`);
      continue;
    }
    if (byId.has(record.id)) {
      block(`${label} id is duplicated: ${record.id}.`);
      continue;
    }
    byId.set(record.id, record);
  }
  return byId;
}

function droppedCount(value) {
  if (finiteNumber(value)) return value > 0 ? value : 0;
  if (!objectRecord(value)) return 0;
  return Object.values(value).reduce((total, item) => total + droppedCount(item), 0);
}

function validDroppedCounters(value) {
  return objectRecord(value) && Object.values(value).every((item) => Number.isSafeInteger(item) && item >= 0);
}

function maskedShaderSource(source) {
  if (typeof source !== "string") return "";
  const masked = source.replace(
    /\/\*[\s\S]*?(?:\*\/|$)|\/\/[^\r\n]*|"(?:\\[\s\S]|[^"\\])*?(?:"|$)|'(?:\\[\s\S]|[^'\\])*?(?:'|$)/g,
    (masked) => masked.replace(/[^\r\n]/g, " "),
  );
  return masked.replace(/^[ \t]*#[^\r\n]*/gm, (directive) => directive.replace(/[^\r\n]/g, " "));
}

function uniformDeclarations(source) {
  const declarations = [];
  if (typeof source !== "string") return declarations;
  const scanSource = maskedShaderSource(source);
  const statementRe = /\buniform\b([^;{}]*);/g;
  let scanIndex = 0;
  let depth = 0;
  let statement;
  while ((statement = statementRe.exec(scanSource))) {
    for (; scanIndex < statement.index; scanIndex += 1) {
      if (scanSource[scanIndex] === "{") depth += 1;
      else if (scanSource[scanIndex] === "}") depth = Math.max(0, depth - 1);
    }
    if (depth !== 0) continue;
    let boundary = statement.index - 1;
    while (boundary >= 0 && /\s/.test(scanSource[boundary])) boundary -= 1;
    if (boundary >= 0 && !/[;}]/.test(scanSource[boundary])) continue;
    const body = statement[1];
    const header = /^\s+(?:(?:lowp|mediump|highp)\s+)?([A-Za-z_]\w*)\s+/.exec(body);
    if (!header) continue;
    const names = new Set();
    const parsed = [];
    let valid = true;
    for (const part of body.slice(header[0].length).split(",")) {
      const declarator = /^\s*([A-Za-z_]\w*)(\s*\[\s*(?:[1-9]\d*|[A-Za-z_]\w*)\s*\])?\s*$/.exec(part);
      if (!declarator || names.has(declarator[1])) {
        valid = false;
        break;
      }
      names.add(declarator[1]);
      parsed.push({
        type: header[1],
        name: declarator[1],
        sampler: /^[iu]?sampler/i.test(header[1]),
        array: Boolean(declarator[2]),
      });
    }
    if (valid) declarations.push(...parsed);
  }
  return declarations;
}

function uniformBlocks(source) {
  const blocks = [];
  const scanSource = maskedShaderSource(source);
  const headerRe = /((?:\blayout\s*\([^(){};]*\)\s*)*)\buniform\s+([A-Za-z_]\w*)\s*\{/g;
  let scanIndex = 0;
  let depth = 0;
  let header;
  while ((header = headerRe.exec(scanSource))) {
    for (; scanIndex < header.index; scanIndex += 1) {
      if (scanSource[scanIndex] === "{") depth += 1;
      else if (scanSource[scanIndex] === "}") depth = Math.max(0, depth - 1);
    }
    if (depth !== 0 || /^(?:lowp|mediump|highp|struct)$/.test(header[2])) continue;
    let boundary = header.index - 1;
    while (boundary >= 0 && /\s/.test(scanSource[boundary])) boundary -= 1;
    if (boundary >= 0 && !/[;}]/.test(scanSource[boundary])) continue;
    if ([...header[1].matchAll(/\blayout\s*\(([^(){};]*)\)/g)].some((layout) => !layout[1].trim())) continue;

    let close = headerRe.lastIndex;
    let blockDepth = 1;
    for (; close < scanSource.length && blockDepth > 0; close += 1) {
      if (scanSource[close] === "{") blockDepth += 1;
      else if (scanSource[close] === "}") blockDepth -= 1;
    }
    if (blockDepth !== 0) break;
    const body = scanSource.slice(headerRe.lastIndex, close - 1);
    const members = body.split(";");
    const suffix = /^\s*(?:([A-Za-z_]\w*)(?:\s*\[\s*([^\[\]{};]+?)\s*\])?)?\s*;/.exec(scanSource.slice(close));
    if (/[{}]/.test(body) || members.pop().trim() || members.length === 0 || members.some((member) => !member.trim()) ||
      !suffix || (suffix[2] !== undefined && !suffix[2].trim())) continue;
    blocks.push({ name: header[2], instanceName: suffix[1] || null });
    headerRe.lastIndex = close + suffix[0].length;
    scanIndex = headerRe.lastIndex;
  }
  return blocks;
}

function firstSamplerUnit(write) {
  if (!write || !Array.isArray(write.values)) return null;
  const value = write.values[0];
  if (Number.isInteger(value) && value >= 0) return value;
  if (objectRecord(value) && Number.isInteger(value.values?.[0]) && value.values[0] >= 0) return value.values[0];
  return null;
}

function samplerParametersAt(sampler, sequence) {
  const parameters = new Map();
  for (const event of Array.isArray(sampler?.parameters) ? sampler.parameters : []) {
    if (Number.isSafeInteger(event?.sequence) && event.sequence <= sequence && finiteNumber(event.pname) && finiteNumber(event.value)) {
      parameters.set(event.pname, event.value);
    }
  }
  return Object.fromEntries([...parameters.entries()].sort(([left], [right]) => left - right));
}

function sameCanonicalValue(left, right) {
  return JSON.stringify(canonicalValue(left)) === JSON.stringify(canonicalValue(right));
}

function latestBefore(records, sequence) {
  return records
    .filter((record) => Number.isSafeInteger(record?.sequence) && record.sequence <= sequence)
    .sort((left, right) => left.sequence - right.sequence)
    .at(-1);
}

function attachmentSnapshotEntry(event) {
  return {
    method: event.method,
    attachment: event.attachment,
    resourceType: event.resourceType,
    resourceRef: event.resourceRef,
    textarget: event.textarget,
    level: event.level,
    layer: event.layer,
    sequence: event.sequence,
  };
}

function effectiveAttachmentsAt(framebuffer, sequence) {
  const effective = new Map();
  let latestMutationSequence = 0;
  const events = (Array.isArray(framebuffer?.attachments) ? framebuffer.attachments : [])
    .filter((event) => Number.isSafeInteger(event?.sequence) && event.sequence > 0 && event.sequence < sequence)
    .sort((left, right) => left.sequence - right.sequence);
  for (const event of events) {
    latestMutationSequence = event.sequence;
    if (event.resourceRef) effective.set(event.attachment, event);
    else effective.delete(event.attachment);
  }
  return {
    latestMutationSequence,
    events: [...effective.values()].sort((left, right) => left.attachment - right.attachment),
  };
}

function normalizedTextureTarget(target) {
  return TEXTURE_CUBE_FACES.has(target) ? TEXTURE_CUBE_MAP : target;
}

function textureDefinitionCovers(event, attachment, sequence) {
  if (!objectRecord(event) || !TEXTURE_DEFINITION_METHODS.has(event.method) ||
      !Number.isSafeInteger(event.sequence) || event.sequence <= 0 || event.sequence >= sequence) return false;
  if (attachment.method === "framebufferTexture2D") {
    if (event.method === "texStorage2D") {
      if (event.target !== normalizedTextureTarget(attachment.textarget)) return false;
    } else if (!["texImage2D", "compressedTexImage2D", "copyTexImage2D"].includes(event.method) ||
        event.target !== attachment.textarget) return false;
  } else if (attachment.method === "framebufferTextureLayer") {
    if (!["texImage3D", "compressedTexImage3D", "texStorage3D"].includes(event.method) ||
        !LAYERED_TEXTURE_TARGETS.has(event.target)) return false;
  }
  const level = attachment.level;
  if (!Number.isSafeInteger(level) || level < 0) return false;
  if (event.method === "texStorage2D" || event.method === "texStorage3D") {
    if (!Number.isSafeInteger(event.levels) || event.levels <= level) return false;
  } else if (event.level !== level) return false;
  if (attachment.method !== "framebufferTextureLayer") return true;
  if (!Number.isSafeInteger(attachment.layer) || attachment.layer < 0 || !Number.isSafeInteger(event.depth) || event.depth <= 0) return false;
  const depth = event.target === 0x806F ? Math.max(1, event.depth >> level) : event.depth;
  return attachment.layer < depth;
}

function validRenderbufferStorage(event) {
  if (!objectRecord(event) || !RENDERBUFFER_DEFINITION_METHODS.has(event.method) || !Array.isArray(event.arguments)) return false;
  const args = event.arguments.map((argument, index) =>
    objectRecord(argument) && argument.index === index ? argument.value : null
  );
  if (event.method === "renderbufferStorage") {
    return args.length === 4 && args[0] === RENDERBUFFER && finiteNumber(args[1]) &&
      Number.isSafeInteger(args[2]) && args[2] > 0 && Number.isSafeInteger(args[3]) && args[3] > 0;
  }
  return args.length === 5 && args[0] === RENDERBUFFER && Number.isSafeInteger(args[1]) && args[1] >= 0 &&
    finiteNumber(args[2]) && Number.isSafeInteger(args[3]) && args[3] > 0 &&
    Number.isSafeInteger(args[4]) && args[4] > 0;
}

function renderbufferHasStorageAt(renderbuffer, sequence) {
  const latest = (Array.isArray(renderbuffer?.storage) ? renderbuffer.storage : [])
    .filter((event) => Number.isSafeInteger(event?.sequence) && event.sequence > 0 && event.sequence < sequence)
    .sort((left, right) => left.sequence - right.sequence)
    .at(-1);
  return validRenderbufferStorage(latest);
}

function expectedFramebufferTarget(api, source) {
  if (source === "probe-blit-read") return READ_FRAMEBUFFER;
  if (source === "probe-blit-draw") return DRAW_FRAMEBUFFER;
  if (source === "probe-draw") return api === "webgl2" ? DRAW_FRAMEBUFFER : FRAMEBUFFER;
  return null;
}

function validFramebufferStatusTarget(api, source, target) {
  const expected = expectedFramebufferTarget(api, source);
  if (expected !== null) return target === expected;
  if (source !== "app") return false;
  return api === "webgl2"
    ? target === FRAMEBUFFER || target === READ_FRAMEBUFFER || target === DRAW_FRAMEBUFFER
    : target === FRAMEBUFFER;
}

function completeCheckpointConditions(conditions, checkpointRef, block) {
  if (!objectRecord(conditions)) {
    block(`Checkpoint ${checkpointRef} has no conditions.`);
    return;
  }
  for (const name of CHECKPOINT_CONDITIONS) {
    const value = conditions[name];
    const structuredCondition = ["input", "camera", "colorSettings"].includes(name);
    const meaningfulStructure = objectRecord(value) && (
      Object.keys(value).some((key) => !["notApplicable", "reason"].includes(key)) ||
      (value.notApplicable === true && nonEmptyString(value.reason))
    );
    const missing = value === undefined || value === null ||
      (name === "viewport" && (!Array.isArray(value) || value.length !== 4 || value.some((item) => !finiteNumber(item)))) ||
      (name === "dpr" && (!finiteNumber(value) || value <= 0)) ||
      ((name === "frame" || name === "time") && !finiteNumber(value)) ||
      (structuredCondition && !meaningfulStructure);
    if (missing) block(`Checkpoint ${checkpointRef} is missing required ${name} conditions.`);
  }
}

export function validateGpuRuntimeTrace(trace) {
  const unresolvedReasons = new Set();
  let blocked = false;
  const unresolved = (message) => unresolvedReasons.add(message);
  const block = (message) => {
    blocked = true;
    unresolvedReasons.add(message);
  };

  if (!objectRecord(trace)) {
    return {
      status: "blocked",
      traceId: null,
      shaderHashes: [],
      unresolved: ["Runtime trace must be a JSON object."],
    };
  }

  const fields = Object.keys(trace);
  const missingFields = TRACE_FIELDS.filter((name) => !Object.hasOwn(trace, name));
  const unexpectedFields = fields.filter((name) => !TRACE_FIELDS.includes(name));
  if (missingFields.length) block(`Runtime trace is missing top-level fields: ${missingFields.join(", ")}.`);
  if (unexpectedFields.length) block(`Runtime trace has unexpected top-level fields: ${unexpectedFields.join(", ")}.`);
  if (trace.schemaVersion !== 1) block("Runtime trace schemaVersion must be 1.");
  if (!nonEmptyString(trace.producer)) block("Runtime trace producer is missing.");
  if (trace.producerStatus !== "ready") block(`Runtime trace producer is not ready: ${String(trace.producerStatus)}.`);
  if (!nonEmptyString(trace.startedAt) || Number.isNaN(Date.parse(trace.startedAt))) block("Runtime trace startedAt must be a valid timestamp.");
  if (!objectRecord(trace.limits)) block("Runtime trace limits must be an object.");
  else {
    if (Object.values(trace.limits).some((value) => !Number.isSafeInteger(value) || value <= 0)) {
      block("Runtime trace capture limits must be positive safe integers.");
    }
    for (const [name, expected] of Object.entries(REQUIRED_LIMITS)) {
      if (trace.limits[name] !== expected) block(`Runtime trace capture limit ${name} must be ${expected}.`);
    }
  }
  if (typeof trace.webgpuDetected !== "boolean") block("Runtime trace webgpuDetected must be a boolean.");
  else if (trace.webgpuDetected) block("WebGPU was encountered and remains blocked/unresolved.");
  if (typeof trace.truncated !== "boolean") block("Runtime trace truncated must be a boolean.");
  else if (trace.truncated) block("Runtime trace is truncated.");
  if (!objectRecord(trace.dropped)) block("Runtime trace dropped counters must be an object.");
  else if (!validDroppedCounters(trace.dropped)) block("Runtime trace dropped counters must be non-negative safe integers.");
  else if (droppedCount(trace.dropped) > 0) block("Runtime trace dropped captured evidence.");

  const arrays = {};
  for (const name of REQUIRED_ARRAYS) {
    if (!Array.isArray(trace[name])) {
      block(`Runtime trace ${name} must be an array.`);
      arrays[name] = [];
    } else arrays[name] = trace[name];
  }
  for (const name of REQUIRED_ARRAYS) {
    const limit = trace.limits?.[name];
    if (Number.isSafeInteger(limit) && arrays[name].length > limit) {
      block(`Runtime trace ${name} exceeds its capture limit of ${limit}.`);
    }
  }
  if (arrays.probeErrors.length > 0) block("Runtime trace contains probe errors.");

  const contextById = uniqueById(arrays.contexts, "Context", block);
  const shaderById = uniqueById(arrays.shaders, "Shader", block);
  const programById = uniqueById(arrays.programs, "Program", block);
  const uniformLocationById = uniqueById(arrays.uniformLocations, "Uniform location", block);
  const textureById = uniqueById(arrays.textures, "Texture", block);
  const framebufferById = uniqueById(arrays.framebuffers, "Framebuffer", block);
  function enforceResourceEventLimit(record, bucket, label) {
    if (Array.isArray(record?.[bucket]) && record[bucket].length > REQUIRED_LIMITS.resourceEvents) {
      block(`${label} ${bucket} exceeds its resource event capture limit of ${REQUIRED_LIMITS.resourceEvents}.`);
    }
  }
  const renderbufferRecords = [];
  for (const context of contextById.values()) {
    if (!Array.isArray(context.renderbuffers)) unresolved(`Context ${context.id} has no renderbuffer inventory.`);
    else {
      renderbufferRecords.push(...context.renderbuffers);
      for (const renderbuffer of context.renderbuffers) {
        enforceResourceEventLimit(renderbuffer, "storage", `Renderbuffer ${String(renderbuffer?.id)}`);
      }
    }
  }
  const renderbufferById = uniqueById(renderbufferRecords, "Renderbuffer", block);
  if (renderbufferRecords.length > REQUIRED_LIMITS.renderbuffers) {
    block(`Runtime trace renderbuffers exceeds its capture limit of ${REQUIRED_LIMITS.renderbuffers}.`);
  }

  const globalSequences = new Map();
  function claimGlobalSequence(sequence, label) {
    if (!Number.isSafeInteger(sequence) || sequence <= 0) {
      unresolved(`${label} has no valid global sequence.`);
      return;
    }
    const prior = globalSequences.get(sequence);
    if (prior) unresolved(`Global sequence collision between ${prior} and ${label}.`);
    else globalSequences.set(sequence, label);
  }
  for (const [index, change] of arrays.stateChanges.entries()) claimGlobalSequence(change?.sequence, `state change ${index + 1}`);
  for (const [index, write] of arrays.uniformWrites.entries()) claimGlobalSequence(write?.sequence, `uniform write ${index + 1}`);
  for (const [index, batch] of arrays.drawBatches.entries()) claimGlobalSequence(batch?.sequence, `draw batch ${index + 1}`);
  for (const texture of textureById.values()) {
    if (!contextById.has(texture.contextRef)) unresolved(`Texture ${texture.id} references an unknown context.`);
    for (const bucket of ["uploads", "storage", "parameters"]) {
      enforceResourceEventLimit(texture, bucket, `Texture ${texture.id}`);
      for (const [index, event] of (Array.isArray(texture[bucket]) ? texture[bucket] : []).entries()) {
        claimGlobalSequence(event?.sequence, `texture ${texture.id} ${bucket} event ${index + 1}`);
      }
    }
  }
  for (const renderbuffer of renderbufferById.values()) {
    if (!contextById.has(renderbuffer.contextRef)) unresolved(`Renderbuffer ${renderbuffer.id} references an unknown context.`);
    if (!Array.isArray(renderbuffer.storage)) unresolved(`Renderbuffer ${renderbuffer.id} has no storage inventory.`);
    else {
      let previousSequence = 0;
      for (const [index, event] of renderbuffer.storage.entries()) {
        const label = `Renderbuffer ${renderbuffer.id} storage event ${index + 1}`;
        claimGlobalSequence(event?.sequence, label);
        if (Number.isSafeInteger(event?.sequence)) {
          if (event.sequence <= previousSequence) unresolved(`${label} is not in global sequence order.`);
          previousSequence = event.sequence;
        }
        if (!validRenderbufferStorage(event)) {
          unresolved(`${label} has invalid defining storage arguments.`);
        }
      }
    }
  }

  for (const framebuffer of framebufferById.values()) {
    if (!contextById.has(framebuffer.contextRef)) unresolved(`Framebuffer ${framebuffer.id} references an unknown context.`);
    enforceResourceEventLimit(framebuffer, "attachments", `Framebuffer ${framebuffer.id}`);
    enforceResourceEventLimit(framebuffer, "statusChecks", `Framebuffer ${framebuffer.id}`);
    if (!Array.isArray(framebuffer.attachments)) {
      unresolved(`Framebuffer ${framebuffer.id} has no attachment mutation history.`);
      continue;
    }
    let previousSequence = 0;
    for (const [index, attachment] of framebuffer.attachments.entries()) {
      const label = `Framebuffer ${framebuffer.id} attachment mutation ${index + 1}`;
      if (!objectRecord(attachment)) {
        unresolved(`${label} is not an object.`);
        continue;
      }
      if (!Number.isSafeInteger(attachment.sequence) || attachment.sequence <= 0) {
        unresolved(`${label} has no valid sequence.`);
      } else {
        if (attachment.sequence <= previousSequence) unresolved(`${label} is not in global sequence order.`);
        previousSequence = attachment.sequence;
        claimGlobalSequence(attachment.sequence, label);
      }
      if (!finiteNumber(attachment.attachment)) unresolved(`${label} has an unknown attachment point.`);
      const textureMethod = attachment.method === "framebufferTexture2D" || attachment.method === "framebufferTextureLayer";
      const renderbufferMethod = attachment.method === "framebufferRenderbuffer";
      if (!textureMethod && !renderbufferMethod) unresolved(`${label} has an unknown mutation method.`);
      if ((textureMethod && attachment.resourceType !== "texture") ||
          (renderbufferMethod && attachment.resourceType !== "renderbuffer")) {
        unresolved(`${label} has an inconsistent resource type.`);
      }
      if (attachment.resourceRef !== null && !nonEmptyString(attachment.resourceRef)) {
        unresolved(`${label} has an unknown resource reference.`);
      }
      if (attachment.detached !== (attachment.resourceRef === null)) unresolved(`${label} has inconsistent detach evidence.`);
      if (attachment.method === "framebufferTexture2D" && !finiteNumber(attachment.textarget)) {
        unresolved(`${label} has an unknown framebufferTexture2D textarget.`);
      }
      if (textureMethod && !finiteNumber(attachment.level)) unresolved(`${label} has an unknown texture level.`);
      if (attachment.method === "framebufferTextureLayer" && !finiteNumber(attachment.layer)) {
        unresolved(`${label} has an unknown texture layer.`);
      }
    }
    let previousStatusSequence = 0;
    if (!Array.isArray(framebuffer.statusChecks)) unresolved(`Framebuffer ${framebuffer.id} has no status-check history.`);
    else for (const [index, status] of framebuffer.statusChecks.entries()) {
      const label = `Framebuffer ${framebuffer.id} status check ${index + 1}`;
      claimGlobalSequence(status?.sequence, label);
      if (!objectRecord(status) || status.contextRef !== framebuffer.contextRef || status.framebufferRef !== framebuffer.id ||
          !finiteNumber(status.target) || status.checked !== true || !finiteNumber(status.status) ||
          status.complete !== (status.status === FRAMEBUFFER_COMPLETE) || !nonEmptyString(status.source)) {
        unresolved(`${label} is incomplete or inconsistent.`);
      }
      const api = contextById.get(framebuffer.contextRef)?.api;
      if (!validFramebufferStatusTarget(api, status?.source, status?.target)) unresolved(`${label} has an invalid target.`);
      if (Number.isSafeInteger(status?.sequence)) {
        if (status.sequence <= previousStatusSequence) unresolved(`${label} is not in global sequence order.`);
        previousStatusSequence = status.sequence;
      }
      if (status?.complete === false) block(`Framebuffer ${framebuffer.id} has an observed incomplete status.`);
    }
  }

  function validateAttachmentSnapshot(contextRef, framebufferRef, snapshot, sequence, label, routedValues = []) {
    if (!objectRecord(snapshot) || !Array.isArray(snapshot.attachments)) {
      unresolved(`${label} attachment snapshot is missing or unknown.`);
      return;
    }
    if (!Number.isSafeInteger(sequence) || sequence <= 0) {
      unresolved(`${label} has no event sequence for its attachment snapshot.`);
      return;
    }
    if (snapshot.framebufferRef !== framebufferRef || !Number.isSafeInteger(snapshot.latestMutationSequence) ||
        snapshot.latestMutationSequence < 0) {
      unresolved(`${label} attachment snapshot is incomplete.`);
      return;
    }
    if (!framebufferRef) {
      const expected = { framebufferRef: null, latestMutationSequence: 0, attachments: [] };
      if (!sameCanonicalValue(snapshot, expected)) unresolved(`${label} attachment snapshot does not match temporal effective state.`);
      return;
    }
    const framebuffer = framebufferById.get(framebufferRef);
    if (!framebuffer) {
      unresolved(`${label} attachment snapshot references unknown framebuffer ${String(framebufferRef)}.`);
      return;
    }
    if (framebuffer.contextRef !== contextRef) unresolved(`${label} framebuffer belongs to a different context.`);
    const effective = effectiveAttachmentsAt(framebuffer, sequence);
    const expected = {
      framebufferRef,
      latestMutationSequence: effective.latestMutationSequence,
      attachments: effective.events.map(attachmentSnapshotEntry),
    };
    if (!sameCanonicalValue(snapshot, expected)) {
      unresolved(`${label} attachment snapshot does not match temporal effective state.`);
    }
    if (effective.events.length === 0) unresolved(`${label} framebuffer has no effective attachment evidence.`);
    const attachmentPoints = new Set(effective.events.map((attachment) => attachment.attachment));
    for (const value of Array.isArray(routedValues) ? routedValues : []) {
      if (finiteNumber(value) && value !== 0 && !attachmentPoints.has(value)) {
        unresolved(`Draw buffer ${value} has no effective framebuffer attachment for ${label}.`);
      }
    }
    for (const attachment of effective.events) {
      if (attachment.resourceType === "texture") {
        const texture = textureById.get(attachment.resourceRef);
        if (!texture) unresolved(`${label} has an unknown texture attachment.`);
        else if (texture.contextRef !== contextRef) unresolved(`${label} texture attachment ${texture.id} belongs to a different context.`);
        else if (![...(Array.isArray(texture.uploads) ? texture.uploads : []), ...(Array.isArray(texture.storage) ? texture.storage : [])]
          .some((event) => textureDefinitionCovers(event, attachment, sequence))) {
          unresolved(`${label} texture attachment ${texture.id} has no defining storage evidence before the event for level ${String(attachment.level)}.`);
        }
      } else if (attachment.resourceType === "renderbuffer") {
        const renderbuffer = renderbufferById.get(attachment.resourceRef);
        if (!renderbuffer) unresolved(`${label} has an unknown renderbuffer attachment.`);
        else if (renderbuffer.contextRef !== contextRef) unresolved(`${label} renderbuffer attachment ${renderbuffer.id} belongs to a different context.`);
        else if (!renderbufferHasStorageAt(renderbuffer, sequence)) unresolved(`${label} renderbuffer attachment ${renderbuffer.id} has no defining storage evidence before the event.`);
      } else unresolved(`${label} has an unknown effective attachment type.`);
    }
  }

  function validateFramebufferStatus(contextRef, framebufferRef, status, sequence, label, expectedSource) {
    if (!objectRecord(status)) {
      unresolved(`${label} framebuffer status is missing.`);
      return;
    }
    const expectedTarget = expectedFramebufferTarget(contextById.get(contextRef)?.api, expectedSource);
    if (status.target !== expectedTarget) unresolved(`${label} framebuffer status target is invalid.`);
    if (!framebufferRef) {
      const expected = {
        contextRef,
        framebufferRef: null,
        target: expectedTarget,
        checked: true,
        status: "default",
        complete: true,
        source: expectedSource,
        sequence: 0,
      };
      if (!sameCanonicalValue(status, expected)) {
        unresolved(`${label} default framebuffer status is incomplete.`);
      }
      return;
    }
    const framebuffer = framebufferById.get(framebufferRef);
    if (!framebuffer) {
      unresolved(`${label} framebuffer status references an unknown framebuffer.`);
      return;
    }
    if (status.checked !== true) unresolved(`${label} framebuffer is unchecked.`);
    if (!finiteNumber(status.status)) unresolved(`${label} framebuffer status has unknown raw status.`);
    if (status.contextRef !== contextRef || status.framebufferRef !== framebufferRef || status.target !== expectedTarget ||
        status.checked !== true || status.source !== expectedSource || !Number.isSafeInteger(status.sequence) ||
        status.sequence <= 0 || status.sequence >= sequence || status.complete !== (status.status === FRAMEBUFFER_COMPLETE)) {
      unresolved(`${label} framebuffer status is incomplete or inconsistent.`);
    }
    const latest = (Array.isArray(framebuffer.statusChecks) ? framebuffer.statusChecks : [])
      .filter((check) => check?.source === expectedSource && Number.isSafeInteger(check.sequence) && check.sequence < sequence)
      .sort((left, right) => left.sequence - right.sequence)
      .at(-1);
    if (!latest || !sameCanonicalValue(status, latest)) unresolved(`${label} framebuffer status does not match the latest temporal status check.`);
    if (status.complete === false) block(`${label} framebuffer is incomplete.`);
  }

  function validatePerDrawFramebufferStatuses(batch, label) {
    if (!Array.isArray(batch.draws) || !Array.isArray(batch.framebufferStatuses) ||
        batch.framebufferStatuses.length !== batch.draws.length || batch.framebufferStatuses.length === 0) {
      unresolved(`${label} has incomplete per-draw framebuffer status evidence.`);
      return;
    }
    if (!sameCanonicalValue(batch.framebufferStatuses[0], batch.framebufferStatus)) {
      unresolved(`${label} first per-draw framebuffer status does not match its batch status.`);
    }
    const expectedSource = "probe-draw";
    const expectedTarget = expectedFramebufferTarget(contextById.get(batch.contextRef)?.api, expectedSource);
    let previousSequence = 0;
    for (const [index, status] of batch.framebufferStatuses.entries()) {
      const statusLabel = `${label} per-draw framebuffer status ${index + 1}`;
      if (!objectRecord(status) || status.contextRef !== batch.contextRef || status.framebufferRef !== batch.framebufferRef ||
          status.target !== expectedTarget || status.checked !== true || status.source !== expectedSource) {
        unresolved(`${statusLabel} is incomplete or has an invalid target.`);
        continue;
      }
      if (!batch.framebufferRef) {
        const expected = {
          contextRef: batch.contextRef,
          framebufferRef: null,
          target: expectedTarget,
          checked: true,
          status: "default",
          complete: true,
          source: expectedSource,
          sequence: 0,
        };
        if (!sameCanonicalValue(status, expected)) unresolved(`${statusLabel} is incomplete.`);
        continue;
      }
      if (!finiteNumber(status.status) || status.complete !== (status.status === FRAMEBUFFER_COMPLETE) ||
          !Number.isSafeInteger(status.sequence) || status.sequence <= previousSequence || status.frame !== batch.frame) {
        unresolved(`${statusLabel} is incomplete or not in temporal order.`);
      }
      previousSequence = status.sequence;
      const framebuffer = framebufferById.get(batch.framebufferRef);
      if (!framebuffer || !(Array.isArray(framebuffer.statusChecks) &&
          framebuffer.statusChecks.some((check) => sameCanonicalValue(check, status)))) {
        unresolved(`${statusLabel} does not match recorded status-check history.`);
      }
      if (status.complete === false) block(`${statusLabel} is incomplete.`);
    }
  }
  const samplerRecords = [];
  for (const context of contextById.values()) {
    if (!Array.isArray(context.samplers)) unresolved(`Context ${context.id} has no sampler-object inventory.`);
    else samplerRecords.push(...context.samplers);
  }
  const samplerById = uniqueById(samplerRecords, "Sampler", block);
  if (samplerById.size > trace.limits?.samplers) block(`Runtime trace samplers exceeds its capture limit of ${trace.limits.samplers}.`);
  for (const sampler of samplerById.values()) {
    enforceResourceEventLimit(sampler, "parameters", `Sampler ${sampler.id}`);
    claimGlobalSequence(sampler.createdSequence, `sampler ${sampler.id} creation`);
  }

  if (contextById.size === 0) unresolved("No WebGL contexts were captured.");
  for (const context of contextById.values()) {
    if (!new Set(["webgl", "webgl2"]).has(context.api)) unresolved(`Context ${context.id} has unknown API ${String(context.api)}.`);
    if (!objectRecord(context.backingSize) || !finiteNumber(context.backingSize.width) || !finiteNumber(context.backingSize.height)) {
      unresolved(`Context ${context.id} backing-buffer size is unknown.`);
    }
    if (!finiteNumber(context.dpr) || context.dpr <= 0) unresolved(`Context ${context.id} DPR is unknown.`);
    const flowCalls = context.flowCalls;
    if (!objectRecord(flowCalls)) {
      unresolved(`Context ${context.id} has no WebGL2 flow-call accounting.`);
      continue;
    }
    const contextChanges = arrays.stateChanges.filter((change) => change?.contextRef === context.id);
    for (const name of ["framebufferAttachment", "drawBuffers", "readBuffer", "blitFramebuffer", "createSampler", "deleteSampler", "bindSampler", "samplerParameter"]) {
      if (!Number.isSafeInteger(flowCalls[name]) || flowCalls[name] < 0) {
        block(`Context ${context.id} ${name} call count must be a non-negative safe integer.`);
        continue;
      }
      const actual = name === "framebufferAttachment"
        ? [...framebufferById.values()]
          .filter((framebuffer) => framebuffer.contextRef === context.id)
          .reduce((total, framebuffer) => total + (Array.isArray(framebuffer.attachments) ? framebuffer.attachments.length : 0), 0)
        : name === "createSampler"
          ? samplerRecords.filter((sampler) => sampler?.contextRef === context.id).length
          : contextChanges.filter((change) => FLOW_METHODS[name]?.has(change?.method)).length;
      if (actual !== flowCalls[name]) unresolved(`${name} call accounting mismatch for context ${context.id}.`);
    }
    const contextSamplers = samplerRecords.filter((sampler) => sampler?.contextRef === context.id);
    const parameterRecords = contextSamplers.reduce((total, sampler) => total + (Array.isArray(sampler?.parameters) ? sampler.parameters.length : 0), 0);
    if (parameterRecords !== flowCalls.samplerParameter) unresolved(`Sampler parameter record accounting mismatch for context ${context.id}.`);
    const deletedRecords = contextSamplers.filter((sampler) => sampler?.deleted === true).length;
    if (deletedRecords !== flowCalls.deleteSampler) unresolved(`Sampler delete record accounting mismatch for context ${context.id}.`);
  }

  for (const sampler of samplerById.values()) {
    if (!contextById.has(sampler.contextRef)) unresolved(`Sampler ${sampler.id} references an unknown context.`);
    if (!Number.isSafeInteger(sampler.createdSequence) || sampler.createdSequence <= 0) unresolved(`Sampler ${sampler.id} has no creation sequence.`);
    if (!Array.isArray(sampler.parameters)) unresolved(`Sampler ${sampler.id} has no parameter evidence.`);
    else for (const [index, parameter] of sampler.parameters.entries()) {
      if (!objectRecord(parameter) || !Number.isSafeInteger(parameter.sequence) || parameter.sequence <= 0 ||
          !finiteNumber(parameter.pname) || !finiteNumber(parameter.value)) {
        unresolved(`Sampler ${sampler.id} parameter ${index + 1} is incomplete.`);
      }
    }
    if (sampler.deleted === true && (!Number.isSafeInteger(sampler.deleteSequence) || sampler.deleteSequence <= 0)) {
      unresolved(`Sampler ${sampler.id} has no deletion sequence.`);
    }
  }

  const shaderHashes = [];
  let shaderSourceBytes = 0;
  if (shaderById.size === 0) unresolved("No compiled shaders were captured.");
  for (const shader of shaderById.values()) {
    if (shader.compile?.status === false) block(`Shader ${shader.id} compile failed${shader.compile.log ? `: ${shader.compile.log}` : "."}`);
    else if (shader.compile?.called !== true || shader.compile?.status !== true) unresolved(`Shader ${shader.id} compile status is unknown.`);
    if (typeof shader.source === "string" && shader.sourceComplete === true) {
      const bytes = Buffer.byteLength(shader.source);
      shaderSourceBytes += bytes;
      if (shader.sourceBytes !== bytes) block(`Shader ${shader.id} source byte length does not match its full source.`);
      if (bytes > trace.limits?.shaderSourceBytesPerShader) block(`Shader ${shader.id} exceeds its per-shader source capture limit.`);
      shaderHashes.push({
        shaderRef: shader.id,
        sha256: `sha256:${sha256(shader.source)}`,
        bytes,
      });
      for (const blockDeclaration of uniformBlocks(shader.source)) {
        unresolved(`Shader ${shader.id} declares unsupported uniform block ${blockDeclaration.name}; uniform-buffer binding evidence is unavailable.`);
      }
    } else unresolved(`Shader ${shader.id} full source is unavailable.`);
  }
  if (shaderSourceBytes > trace.limits?.shaderSourceBytesTotal) block("Full shader sources exceed the total capture limit.");
  shaderHashes.sort((left, right) => compareStrings(left.shaderRef, right.shaderRef));

  if (programById.size === 0) unresolved("No linked programs were captured.");
  for (const program of programById.values()) {
    if (program.link?.status === false) block(`Program ${program.id} link failed${program.link.log ? `: ${program.link.log}` : "."}`);
    else if (program.link?.called !== true || program.link?.status !== true) unresolved(`Program ${program.id} link status is unknown.`);
    if (!Array.isArray(program.attachedShaderRefs) || program.attachedShaderRefs.length === 0) {
      unresolved(`Program ${program.id} has no attached shader evidence.`);
    } else {
      for (const shaderRef of program.attachedShaderRefs) {
        if (!shaderById.has(shaderRef)) unresolved(`Program ${program.id} references unknown shader ${String(shaderRef)}.`);
      }
    }
  }

  const writesByLocation = new Map();
  for (const [index, write] of arrays.uniformWrites.entries()) {
    if (!objectRecord(write)) {
      block(`Uniform write ${index + 1} must be an object.`);
      continue;
    }
    if (!Number.isSafeInteger(write.sequence) || write.sequence <= 0) {
      unresolved(`Uniform write ${index + 1} has no valid event sequence.`);
    }
    if (!uniformLocationById.has(write.locationRef)) unresolved(`Uniform write ${index + 1} references an unknown location.`);
    if (!writesByLocation.has(write.locationRef)) writesByLocation.set(write.locationRef, []);
    writesByLocation.get(write.locationRef).push(write);
  }
  for (const program of programById.values()) {
    const declarations = new Map();
    for (const shaderRef of Array.isArray(program.attachedShaderRefs) ? program.attachedShaderRefs : []) {
      for (const declaration of uniformDeclarations(shaderById.get(shaderRef)?.source)) {
        declarations.set(`${declaration.type}\u0000${declaration.name}`, declaration);
      }
    }
    for (const declaration of declarations.values()) {
      const locations = [...uniformLocationById.values()].filter((location) =>
        location.programRef === program.id && (location.name === declaration.name ||
          (declaration.array && location.name === `${declaration.name}[0]`))
      );
      if (locations.length === 0) {
        unresolved(`Program ${program.id} uniform ${declaration.name} has no location evidence.`);
        continue;
      }
      const writes = locations.flatMap((location) => writesByLocation.get(location.id) || []);
      if (writes.length === 0) unresolved(`Program ${program.id} uniform ${declaration.name} has no uniform write evidence.`);
      const batches = arrays.drawBatches.filter((batch) => batch?.programRef === program.id);
      for (const [batchIndex, batch] of batches.entries()) {
        const batchLabel = nonEmptyString(batch?.id) ? batch.id : `draw batch ${batchIndex + 1}`;
        if (!Number.isSafeInteger(batch?.sequence) || batch.sequence <= 0) {
          unresolved(`Draw batch ${batchLabel} has no valid event sequence.`);
          continue;
        }
        const precedingWrites = writes
          .filter((write) => Number.isSafeInteger(write.sequence) && write.sequence <= batch.sequence)
          .sort((left, right) => left.sequence - right.sequence);
        const write = precedingWrites.at(-1);
        if (!write) {
          unresolved(`Program ${program.id} uniform ${declaration.name} has no write before draw batch ${batchLabel}.`);
          continue;
        }
        if (!declaration.sampler) continue;
        const unit = firstSamplerUnit(write);
        if (unit === null) {
          unresolved(`Sampler ${declaration.name} has an unknown texture unit before draw batch ${batchLabel}.`);
          continue;
        }
        const effectiveSampler = (Array.isArray(batch.samplerUnits) ? batch.samplerUnits : []).find((entry) => entry?.unit === unit);
        if (!objectRecord(effectiveSampler)) {
          unresolved(`Sampler ${declaration.name} draw batch ${batchLabel} has no effective state for unit ${unit}.`);
        } else if (effectiveSampler.samplerRef) {
          const sampler = samplerById.get(effectiveSampler.samplerRef);
          if (!sampler) unresolved(`Sampler ${declaration.name} draw batch ${batchLabel} references an unknown sampler object.`);
          else {
            if (sampler.contextRef !== batch.contextRef) unresolved(`Sampler ${sampler.id} belongs to a different context than draw batch ${batchLabel}.`);
            if (!Number.isSafeInteger(effectiveSampler.bindSequence) || effectiveSampler.bindSequence > batch.sequence) {
              unresolved(`Sampler ${sampler.id} bind sequence is unknown for draw batch ${batchLabel}.`);
            }
            const latestBinding = latestBefore(arrays.stateChanges.filter((change) =>
              change?.contextRef === batch.contextRef && change.method === "bindSampler" && change.unit === unit
            ), batch.sequence);
            if (!latestBinding || latestBinding.samplerRef !== sampler.id || latestBinding.sequence !== effectiveSampler.bindSequence) {
              unresolved(`Sampler ${sampler.id} binding does not match effective state for draw batch ${batchLabel}.`);
            }
            if (sampler.deleted === true && sampler.deleteSequence <= batch.sequence) {
              unresolved(`Sampler ${sampler.id} was deleted before draw batch ${batchLabel}.`);
            }
            const expectedParameters = samplerParametersAt(sampler, batch.sequence);
            if (!objectRecord(effectiveSampler.parameters) || !sameCanonicalValue(effectiveSampler.parameters, expectedParameters)) {
              unresolved(`Sampler ${sampler.id} parameter state is unknown for draw batch ${batchLabel}.`);
            }
          }
        } else if (effectiveSampler.source !== "texture" || !Array.isArray(effectiveSampler.textureParameters)) {
          unresolved(`Sampler ${declaration.name} draw batch ${batchLabel} has unknown texture-effective sampler state.`);
        }
        const textureUnit = (Array.isArray(batch.textureUnits) ? batch.textureUnits : []).find((entry) => entry?.unit === unit);
        const bindings = Array.isArray(textureUnit?.bindings) ? textureUnit.bindings : [];
        if (bindings.length === 0) {
          unresolved(`Sampler ${declaration.name} draw batch ${batchLabel} has no texture binding for unit ${unit}.`);
          continue;
        }
        for (const binding of bindings) {
          const texture = textureById.get(binding.textureRef);
          if (!texture) {
            unresolved(`Sampler ${declaration.name} draw batch ${batchLabel} references unknown texture ${String(binding.textureRef)}.`);
            continue;
          }
          const hasStorage = (Array.isArray(texture.uploads) && texture.uploads.length > 0) ||
            (Array.isArray(texture.storage) && texture.storage.length > 0);
          if (!hasStorage) unresolved(`Sampler ${declaration.name} texture ${texture.id} has no upload or storage evidence.`);
          if (effectiveSampler?.source === "texture" &&
              !effectiveSampler.textureParameters.some((entry) => entry?.target === binding.target && entry?.textureRef === binding.textureRef && objectRecord(entry.parameters))) {
            unresolved(`Sampler ${declaration.name} texture-effective parameter state is missing for draw batch ${batchLabel}.`);
          }
        }
      }
    }
  }

  if (arrays.drawBatches.length === 0) unresolved("No draw batches were captured.");
  const drawnContextRefs = new Set();
  for (const [index, batch] of arrays.drawBatches.entries()) {
    const label = nonEmptyString(batch?.id) ? batch.id : `draw batch ${index + 1}`;
    if (!objectRecord(batch)) {
      block(`Draw batch ${index + 1} must be an object.`);
      continue;
    }
    if (!contextById.has(batch.contextRef)) unresolved(`Draw batch ${label} references an unknown context.`);
    else drawnContextRefs.add(batch.contextRef);
    if (!nonEmptyString(batch.programRef) || !programById.has(batch.programRef)) unresolved(`Draw batch ${label} program binding is unknown.`);
    if (!finiteNumber(batch.drawCount) || batch.drawCount <= 0) unresolved(`Draw batch ${label} has no draw count evidence.`);
    if (!objectRecord(batch.drawBuffers) || !Array.isArray(batch.drawBuffers.values) || batch.drawBuffers.values.length === 0 ||
        batch.drawBuffers.values.some((value) => !finiteNumber(value)) || batch.drawBuffers.framebufferRef !== batch.framebufferRef) {
      unresolved(`Draw batch ${label} has unknown draw buffer routing.`);
    } else {
      const latestRouting = latestBefore(arrays.stateChanges.filter((change) =>
        change?.contextRef === batch.contextRef && FLOW_METHODS.drawBuffers.has(change.method) && change.framebufferRef === batch.framebufferRef
      ), batch.sequence);
      const explicit = batch.drawBuffers.source === "explicit";
      if ((explicit && (!latestRouting || latestRouting.sequence !== batch.drawBuffers.sequence ||
          !sameCanonicalValue(latestRouting.drawBuffers, batch.drawBuffers.values))) || (!explicit && latestRouting)) {
        unresolved(`Draw buffer routing does not match effective state for draw batch ${label}.`);
      }
    }
    validateAttachmentSnapshot(
      batch.contextRef,
      batch.framebufferRef,
      batch.framebufferAttachments,
      batch.sequence,
      `Draw batch ${label}`,
      batch.drawBuffers?.values,
    );
    validateFramebufferStatus(batch.contextRef, batch.framebufferRef, batch.framebufferStatus, batch.sequence, `Draw batch ${label}`, "probe-draw");
    validatePerDrawFramebufferStatuses(batch, `Draw batch ${label}`);
    for (const unit of Array.isArray(batch.textureUnits) ? batch.textureUnits : []) {
      for (const binding of Array.isArray(unit?.bindings) ? unit.bindings : []) {
        if (!nonEmptyString(binding?.textureRef) || !textureById.has(binding.textureRef)) {
          unresolved(`Draw batch ${label} has an unknown texture binding.`);
        }
      }
    }
  }

  for (const [index, change] of arrays.stateChanges.entries()) {
    if (!objectRecord(change)) {
      block(`State change ${index + 1} must be an object.`);
      continue;
    }
    if (FLOW_METHODS.drawBuffers.has(change.method)) {
      if (!Array.isArray(change.drawBuffers) || change.drawBuffers.length === 0 || change.drawBuffers.some((value) => !finiteNumber(value))) {
        unresolved(`drawBuffers call ${index + 1} has unknown routing.`);
      }
      if (change.framebufferRef && !framebufferById.has(change.framebufferRef)) unresolved(`drawBuffers call ${index + 1} references an unknown framebuffer.`);
    }
    if (change.method === "readBuffer") {
      if (!finiteNumber(change.readBuffer)) unresolved(`readBuffer call ${index + 1} has an unknown source buffer.`);
      if (change.framebufferRef && !framebufferById.has(change.framebufferRef)) unresolved(`readBuffer call ${index + 1} references an unknown framebuffer.`);
    }
    if (["deleteSampler", "bindSampler", "samplerParameteri", "samplerParameterf"].includes(change.method) &&
        change.samplerRef && !samplerById.has(change.samplerRef)) {
      unresolved(`${change.method} call ${index + 1} references an unknown sampler object.`);
    }
  }

  const blitEvents = arrays.stateChanges.filter((change) => change?.method === "blitFramebuffer");
  for (const [index, blit] of blitEvents.entries()) {
    const label = `blitFramebuffer ${index + 1}`;
    if (!Number.isSafeInteger(blit.sequence) || blit.sequence <= 0) unresolved(`${label} has no event sequence.`);
    if (!contextById.has(blit.contextRef)) unresolved(`${label} references an unknown context.`);
    if (blit.sourceFramebufferRef && !framebufferById.has(blit.sourceFramebufferRef)) {
      unresolved(`${label} references an unknown source framebuffer.`);
    }
    if (blit.destinationFramebufferRef && !framebufferById.has(blit.destinationFramebufferRef)) {
      unresolved(`${label} references an unknown destination framebuffer.`);
    }
    for (const [name, rect] of [["source", blit.sourceRect], ["destination", blit.destinationRect]]) {
      if (!Array.isArray(rect) || rect.length !== 4 || rect.some((value) => !finiteNumber(value))) unresolved(`${label} has an unknown ${name} rectangle.`);
    }
    if (!finiteNumber(blit.mask) || !finiteNumber(blit.filter)) unresolved(`${label} has an unknown mask or filter.`);
    validateFramebufferStatus(blit.contextRef, blit.sourceFramebufferRef, blit.sourceFramebufferStatus, blit.sequence, `${label} source`, "probe-blit-read");
    validateFramebufferStatus(blit.contextRef, blit.destinationFramebufferRef, blit.destinationFramebufferStatus, blit.sequence, `${label} destination`, "probe-blit-draw");
    if (!objectRecord(blit.sourceReadBuffer) || blit.sourceReadBuffer.framebufferRef !== blit.sourceFramebufferRef ||
        !finiteNumber(blit.sourceReadBuffer.value)) {
      unresolved(`${label} has unknown source read-buffer routing.`);
    } else {
      const latestRead = latestBefore(arrays.stateChanges.filter((change) =>
        change?.contextRef === blit.contextRef && change.method === "readBuffer" && change.framebufferRef === blit.sourceFramebufferRef
      ), blit.sequence);
      const explicit = blit.sourceReadBuffer.source === "explicit";
      if ((explicit && (!latestRead || latestRead.sequence !== blit.sourceReadBuffer.sequence || latestRead.readBuffer !== blit.sourceReadBuffer.value)) ||
          (!explicit && latestRead)) {
        unresolved(`${label} read-buffer effective state does not match its source routing.`);
      }
    }
    if (!objectRecord(blit.destinationDrawBuffers) || blit.destinationDrawBuffers.framebufferRef !== blit.destinationFramebufferRef ||
        !Array.isArray(blit.destinationDrawBuffers.values) || blit.destinationDrawBuffers.values.length === 0 ||
        blit.destinationDrawBuffers.values.some((value) => !finiteNumber(value))) {
      unresolved(`${label} has unknown destination draw-buffer routing.`);
    } else {
      const latestDraw = latestBefore(arrays.stateChanges.filter((change) =>
        change?.contextRef === blit.contextRef && FLOW_METHODS.drawBuffers.has(change.method) &&
        change.framebufferRef === blit.destinationFramebufferRef
      ), blit.sequence);
      const explicit = blit.destinationDrawBuffers.source === "explicit";
      if ((explicit && (!latestDraw || latestDraw.sequence !== blit.destinationDrawBuffers.sequence ||
          !sameCanonicalValue(latestDraw.drawBuffers, blit.destinationDrawBuffers.values))) || (!explicit && latestDraw)) {
        unresolved(`${label} destination draw-buffer effective state does not match its routing.`);
      }
    }
    validateAttachmentSnapshot(
      blit.contextRef,
      blit.sourceFramebufferRef,
      blit.sourceFramebufferAttachments,
      blit.sequence,
      `${label} source`,
      [blit.sourceReadBuffer?.value],
    );
    validateAttachmentSnapshot(
      blit.contextRef,
      blit.destinationFramebufferRef,
      blit.destinationFramebufferAttachments,
      blit.sequence,
      `${label} destination`,
      blit.destinationDrawBuffers?.values,
    );
  }

  if (arrays.checkpoints.length === 0) unresolved("No visual checkpoints were captured.");
  const checkpointById = uniqueById(arrays.checkpoints, "Checkpoint", block);
  for (const checkpoint of checkpointById.values()) {
    if (!nonEmptyString(checkpoint.label)) unresolved(`Checkpoint ${checkpoint.id} has no label.`);
    if (!nonEmptyString(checkpoint.externalVisualRef)) block(`Checkpoint ${checkpoint.id} has no external visual reference.`);
    completeCheckpointConditions(checkpoint.conditions, checkpoint.id, block);
  }

  for (const [index, observation] of arrays.observedGetErrors.entries()) {
    if (!objectRecord(observation)) {
      block(`getError observation ${index + 1} must be an object.`);
      continue;
    }
    if (observation.ok === false || (finiteNumber(observation.error) && observation.error !== 0)) {
      block(`getError recorded WebGL error ${String(observation.error)} for ${String(observation.contextRef)}.`);
    } else if (observation.ok !== true || observation.error !== 0) {
      unresolved(`getError result is unknown for ${String(observation.contextRef)}.`);
    }
    if (observation.source === "checkpoint" && !checkpointById.has(observation.checkpointRef)) {
      unresolved(`Labeled getError observation references unknown checkpoint ${String(observation.checkpointRef)}.`);
    }
  }
  for (const contextRef of drawnContextRefs) {
    const hasCheckpointErrorRead = arrays.observedGetErrors.some((entry) =>
      entry?.contextRef === contextRef && entry.source === "checkpoint" && entry.ok === true && entry.error === 0
    );
    if (!hasCheckpointErrorRead) unresolved(`Context ${contextRef} has no labeled checkpoint getError observation.`);
  }

  return {
    status: blocked ? "blocked" : unresolvedReasons.size ? "partial" : "runtime-validated",
    traceId: traceId(trace),
    shaderHashes,
    unresolved: [...unresolvedReasons].sort(compareStrings),
  };
}

function canonicalPotentialPath(path) {
  let candidate = resolve(path);
  const suffix = [];
  while (!existsSync(candidate)) {
    const parent = dirname(candidate);
    if (parent === candidate) throw new Error("Cannot safely resolve output path.");
    suffix.unshift(basename(candidate));
    candidate = parent;
  }
  return resolve(realpathSync(candidate), ...suffix);
}

function statusOutputError(tracePath, statusPath) {
  if (!statusPath) return null;
  try {
    const resolvedStatus = resolve(statusPath);
    if (existsSync(resolvedStatus) && lstatSync(resolvedStatus).isSymbolicLink()) {
      return "Unsafe status output: symbolic links are not allowed.";
    }
    if (existsSync(resolvedStatus)) {
      const inputStats = statSync(tracePath);
      const outputStats = statSync(resolvedStatus);
      if (inputStats.dev === outputStats.dev && inputStats.ino === outputStats.ino) {
        return "Unsafe status output: it aliases the runtime trace.";
      }
    }
    if (canonicalPotentialPath(tracePath) === canonicalPotentialPath(statusPath)) {
      return "Unsafe status output: it collides with the runtime trace.";
    }
  } catch {
    return "Unsafe status output: it cannot be safely resolved.";
  }
  return null;
}

function serializedStatus(status) {
  return `${JSON.stringify(status, null, 2)}\n`;
}

function writeStatus(path, status) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, serializedStatus(status), "utf8");
}

export function verifyGpuRuntimeTraceFile(tracePath, statusOutput) {
  const input = resolve(tracePath);
  const output = statusOutput ? resolve(statusOutput) : null;
  const unsafeOutput = statusOutputError(input, output);
  if (unsafeOutput) throw new Error(unsafeOutput);
  const trace = JSON.parse(readFileSync(input, "utf8"));
  const status = validateGpuRuntimeTrace(trace);
  if (output) writeStatus(output, status);
  return status;
}

function usage() {
  console.error("Usage: node scripts/verify-gpu-runtime-trace.mjs <trace> [status-output]");
}

function main() {
  const [, , traceInput, statusInput] = process.argv;
  if (!traceInput) {
    usage();
    process.exitCode = 1;
    return;
  }
  try {
    const status = verifyGpuRuntimeTraceFile(traceInput, statusInput);
    process.stdout.write(serializedStatus(status));
    if (status.status !== "runtime-validated") process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
