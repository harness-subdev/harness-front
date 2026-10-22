#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { linkSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const probePath = join(scriptsDir, "gpu-runtime-probe.js");
const validatorPath = join(scriptsDir, "verify-gpu-runtime-trace.mjs");

class FakeGl {
  constructor(options = {}) {
    this.options = options;
    this.drawingBufferWidth = 1280;
    this.drawingBufferHeight = 720;
    this.canvas = null;
    this.NO_ERROR = 0;
    this.INVALID_OPERATION = 0x0502;
    this.VERTEX_SHADER = 0x8B31;
    this.FRAGMENT_SHADER = 0x8B30;
    this.COMPILE_STATUS = 0x8B81;
    this.LINK_STATUS = 0x8B82;
    this.TEXTURE0 = 0x84C0;
    this.TEXTURE_2D = 0x0DE1;
    this.RGBA = 0x1908;
    this.UNSIGNED_BYTE = 0x1401;
    this.FRAMEBUFFER = 0x8D40;
    this.READ_FRAMEBUFFER = 0x8CA8;
    this.DRAW_FRAMEBUFFER = 0x8CA9;
    this.RENDERBUFFER = 0x8D41;
    this.FRAMEBUFFER_COMPLETE = 0x8CD5;
    this.FRAMEBUFFER_INCOMPLETE_ATTACHMENT = 0x8CD6;
    this.COLOR_ATTACHMENT0 = 0x8CE0;
    this.COLOR_ATTACHMENT1 = 0x8CE1;
    this.BACK = 0x0405;
    this.COLOR_BUFFER_BIT = 0x4000;
    this.NEAREST = 0x2600;
    this.TEXTURE_MIN_FILTER = 0x2801;
    this.TEXTURE_MAG_FILTER = 0x2800;
    this.LINEAR = 0x2601;
    this.TEXTURE_CUBE_MAP_POSITIVE_X = 0x8515;
    this.TRIANGLES = 0x0004;
    this.UNSIGNED_SHORT = 0x1403;
    this.BLEND = 0x0BE2;
    this.DEPTH_TEST = 0x0B71;
    this._errors = [...(options.errors || [])];
    this.readPixelsCalls = 0;
  }

  getContextAttributes() { return { alpha: true, depth: true }; }
  createShader(type) { return { resource: "shader", type, source: "", compiled: false }; }
  shaderSource(shader, source) { shader.source = source; return this.options.shaderSourceReturn; }
  compileShader(shader) { shader.compiled = !shader.source.includes("COMPILE_FAIL"); return this.options.compileReturn; }
  getShaderParameter(shader, pname) {
    if (this.options.throwShaderQuery) throw this.options.throwShaderQuery;
    return pname === this.COMPILE_STATUS ? shader.compiled : null;
  }
  getShaderInfoLog(shader) { return shader.compiled ? "" : "synthetic compile failure"; }
  createProgram() { return { resource: "program", attached: [], linked: false }; }
  attachShader(program, shader) { program.attached.push(shader); }
  linkProgram(program) {
    program.linked = !this.options.linkFailure && program.attached.length > 0 && program.attached.every((shader) => shader.compiled);
    return this.options.linkReturn;
  }
  getProgramParameter(program, pname) { return pname === this.LINK_STATUS ? program.linked : null; }
  getProgramInfoLog(program) { return program.linked ? "" : "synthetic link failure"; }
  useProgram(program) { this.currentProgram = program; return this.options.useProgramReturn; }
  getUniformLocation(program, name) { return { resource: "uniform-location", program, name }; }
  uniform1i(location, value) { location.value = value; return this.options.uniformReturn; }
  uniform1f(location, value) { location.value = value; return this.options.uniformReturn; }
  createTexture() { return { resource: "texture" }; }
  activeTexture(unit) { this.activeUnit = unit; }
  bindTexture(target, texture) { this.boundTexture = { target, texture }; }
  texImage2D(...args) {
    if (this.options.throwTexImage) throw this.options.throwTexImage;
    this.lastTexImage = args;
    return this.options.texImageReturn;
  }
  texStorage2D(...args) { this.lastTexStorage = args; }
  texParameteri(...args) { this.lastTexParameter = args; }
  createFramebuffer() { return { resource: "framebuffer" }; }
  bindFramebuffer(target, framebuffer) { this.boundFramebuffer = { target, framebuffer }; }
  framebufferTexture2D(...args) { this.lastFramebufferTexture = args; }
  framebufferTextureLayer(...args) { this.lastFramebufferTextureLayer = args; }
  drawBuffers(buffers) { this.lastDrawBuffers = buffers; return this.options.drawBuffersReturn; }
  readBuffer(buffer) { this.lastReadBuffer = buffer; return this.options.readBufferReturn; }
  blitFramebuffer(...args) { this.lastBlitFramebuffer = args; return this.options.blitFramebufferReturn; }
  checkFramebufferStatus() {
    return this.options.framebufferStatus ?? this.FRAMEBUFFER_COMPLETE;
  }
  createRenderbuffer() { return { resource: "renderbuffer" }; }
  bindRenderbuffer(target, renderbuffer) { this.boundRenderbuffer = { target, renderbuffer }; }
  renderbufferStorage(...args) { this.lastRenderbufferStorage = args; }
  framebufferRenderbuffer(...args) { this.lastFramebufferRenderbuffer = args; }
  viewport(...args) { this.viewportArgs = args; }
  scissor(...args) { this.scissorArgs = args; }
  enable(capability) { this.enabled = capability; }
  disable(capability) { this.disabled = capability; }
  blendFunc(...args) { this.blendArgs = args; }
  depthFunc(value) { this.depthValue = value; }
  cullFace(value) { this.cullValue = value; }
  clearColor(...args) { this.clearColorArgs = args; return this.options.clearColorReturn; }
  clear(mask) { this.clearMask = mask; }
  drawArrays(...args) { this.lastDrawArrays = args; return this.options.drawReturn; }
  drawElements(...args) { this.lastDrawElements = args; return this.options.drawReturn; }
  drawArraysInstanced(...args) { this.lastDrawArraysInstanced = args; return this.options.drawReturn; }
  drawRangeElements(...args) { this.lastDrawRangeElements = args; return this.options.drawReturn; }
  createSampler() { return { resource: "sampler" }; }
  deleteSampler(sampler) { sampler.deleted = true; return this.options.deleteSamplerReturn; }
  bindSampler(unit, sampler) { this.boundSampler = { unit, sampler }; return this.options.bindSamplerReturn; }
  samplerParameteri(sampler, pname, value) { sampler[pname] = value; return this.options.samplerParameterReturn; }
  samplerParameterf(sampler, pname, value) { sampler[pname] = value; return this.options.samplerParameterReturn; }
  getExtension(name) { return this.options.extensions?.[name] || null; }
  getError() { return this._errors.length ? this._errors.shift() : this.NO_ERROR; }
  readPixels() { this.readPixelsCalls += 1; }
}

function createProbeEnvironment(options = {}) {
  class HTMLCanvasElement {
    constructor(gl = null, id = "scene") {
      this._gl = gl;
      this.id = id;
      this.width = 1280;
      this.height = 720;
      this.clientWidth = 640;
      this.clientHeight = 360;
      if (gl) gl.canvas = this;
    }

    getContext(type) {
      if (type === "webgpu") return options.webgpuContext || { resource: "webgpu-context" };
      return /^(?:experimental-)?webgl2?$/.test(type) ? this._gl : null;
    }
  }
  let animationFrame = 0;
  const context = vm.createContext({
    console,
    Date,
    devicePixelRatio: 2,
    HTMLCanvasElement,
    JSON,
    performance: { now: () => 12.5 },
    requestAnimationFrame: (callback) => {
      animationFrame += 1;
      callback(options.rafTimestamps?.[animationFrame - 1] ?? 12.5 + animationFrame);
      return animationFrame;
    },
  });
  vm.runInContext(readFileSync(probePath, "utf8"), context, { filename: probePath });
  return { context, HTMLCanvasElement };
}

function testProbeInstallsPublicApi() {
  const { context } = createProbeEnvironment();
  assert.equal(typeof context.__DSRA_GPU_PROBE__, "object");
  assert.equal(typeof context.__DSRA_GPU_PROBE__.checkpoint, "function");
  assert.equal(typeof context.__DSRA_GPU_PROBE__.export, "function");
}

function buildSuccessfulTrace() {
  const clearReturn = { exact: "clear-return" };
  const gl = new FakeGl({ clearColorReturn: clearReturn });
  const { context, HTMLCanvasElement } = createProbeEnvironment();
  const canvas = new HTMLCanvasElement(gl, "hero");
  const returnedContext = canvas.getContext("webgl2", { alpha: false, secretToken: "must-not-leak" });
  assert.equal(returnedContext, gl, "getContext must return the original context");

  const vertex = gl.createShader(gl.VERTEX_SHADER);
  const vertexSource = "attribute vec3 position; void main(){ gl_Position = vec4(position, 1.0); }";
  gl.shaderSource(vertex, vertexSource);
  gl.compileShader(vertex);
  const fragment = gl.createShader(gl.FRAGMENT_SHADER);
  const fragmentSource = "precision highp float; uniform sampler2D bake2; void main(){ gl_FragColor = texture2D(bake2, vec2(.5)).b; }";
  gl.shaderSource(fragment, fragmentSource);
  gl.compileShader(fragment);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.useProgram(program);

  const samplerLocation = gl.getUniformLocation(program, "bake2");
  gl.uniform1i(samplerLocation, 0);
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(16));
  gl.texParameteri(gl.TEXTURE_2D, 0x2801, 0x2601);

  const sampler = gl.createSampler();
  gl.samplerParameteri(sampler, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.samplerParameterf(sampler, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.bindSampler(0, sampler);

  const renderTexture0 = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, renderTexture0);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA, 2, 2);
  const renderbuffer = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA, 2, 2);
  const replacementTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, replacementTexture);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA, 2, 2);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, renderTexture0, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.RENDERBUFFER, renderbuffer);
  gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
  gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  gl.viewport(0, 0, 1280, 720);
  gl.scissor(0, 0, 1280, 720);
  gl.enable(gl.BLEND);
  gl.blendFunc(1, 0);
  assert.equal(gl.clearColor(0.1, 0.2, 0.3, 1), clearReturn, "wrapped calls must preserve exact return identity");
  gl.clear(0x4000);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, replacementTexture, 0);
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, null, 0);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, replacementTexture, 0);

  const blitTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, blitTexture);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA, 2, 2);
  const blitTarget = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, blitTarget);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, blitTexture, 0);
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, framebuffer);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, blitTarget);
  gl.readBuffer(gl.COLOR_ATTACHMENT0);
  gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
  gl.blitFramebuffer(0, 0, 2, 2, 0, 0, 2, 2, gl.COLOR_BUFFER_BIT, gl.NEAREST);
  gl.deleteSampler(sampler);

  context.__DSRA_GPU_PROBE__.checkpoint("hero-ready", {
    externalVisualRef: "visual:screenshot:hero-ready",
    input: { pointer: [320, 180], scrollY: 0 },
    camera: { position: [0, 0, 5], target: [0, 0, 0] },
    colorSettings: { outputColorSpace: "srgb", toneMapping: "none" },
  });
  const trace = context.__DSRA_GPU_PROBE__.export();
  assert.doesNotThrow(() => JSON.stringify(trace));
  assert.equal(gl.readPixelsCalls, 0, "probe must never call readPixels");
  assert(!JSON.stringify(trace).includes("must-not-leak"), "probe must whitelist requested context attributes");
  return { trace, gl, sources: { vertexSource, fragmentSource } };
}

function testProbeCapturesSuccessfulRuntimeTrace() {
  const { trace, gl, sources } = buildSuccessfulTrace();
  assert.deepEqual(Object.keys(trace), [
    "schemaVersion", "producer", "producerStatus", "startedAt", "limits", "truncated", "dropped", "webgpuDetected",
    "contexts", "shaders", "programs", "uniformLocations", "uniformWrites", "textures", "framebuffers", "drawBatches",
    "stateChanges", "checkpoints", "observedGetErrors", "probeErrors",
  ]);
  assert.equal(trace.schemaVersion, 1);
  assert.equal(trace.producerStatus, "ready");
  assert.equal(trace.truncated, false);
  assert.equal(trace.webgpuDetected, false);
  assert.equal(trace.contexts.length, 1);
  assert.equal(trace.contexts[0].api, "webgl2");
  assert.equal(trace.contexts[0].canvasSelector, "canvas#hero");
  assert.deepEqual(trace.contexts[0].backingSize, { width: 1280, height: 720 });
  assert.deepEqual(trace.contexts[0].clientSize, { width: 640, height: 360 });
  assert.equal(trace.contexts[0].dpr, 2);
  assert.equal(trace.contexts[0].requestedAttributes.alpha, false);
  assert.equal(trace.shaders.length, 2);
  assert.deepEqual(trace.shaders.map((shader) => shader.source), [sources.vertexSource, sources.fragmentSource]);
  assert(trace.shaders.every((shader) => shader.compile?.status === true));
  assert.equal(trace.programs.length, 1);
  assert.equal(trace.programs[0].link?.status, true);
  assert.equal(trace.programs[0].attachedShaderRefs.length, 2);
  assert.equal(trace.uniformLocations[0].name, "bake2");
  assert.equal(trace.uniformWrites[0].method, "uniform1i");
  assert.equal(trace.textures.length, 4);
  assert.equal(trace.textures[0].uploads[0].method, "texImage2D");
  assert.equal(trace.textures[0].parameters[0].method, "texParameteri");
  assert.equal(trace.framebuffers.length, 2);
  assert.equal(trace.framebuffers[0].attachments[0].resourceType, "texture");
  assert.equal(trace.contexts[0].renderbuffers.length, 1);
  assert.equal(trace.contexts[0].renderbuffers[0].storage[0].method, "renderbufferStorage");
  assert.equal(trace.contexts[0].flowCalls.framebufferAttachment, 6);
  assert(trace.framebuffers[0].statusChecks.some((check) => check.complete === true));
  assert.equal(trace.drawBatches.length, 2, "attachment mutation must start a new draw batch");
  assert.equal(trace.drawBatches[0].drawCount, 1);
  assert.equal(trace.drawBatches[1].drawCount, 2);
  assert.deepEqual(trace.drawBatches.map((batch) => batch.framebufferStatuses.length), [1, 2]);
  assert(trace.drawBatches.every((batch) => batch.framebufferStatuses.length === batch.draws.length));
  assert.equal(trace.drawBatches[0].programRef, trace.programs[0].id);
  assert.equal(trace.drawBatches[0].framebufferRef, trace.framebuffers[0].id);
  assert.equal(trace.drawBatches[0].textureUnits[0].bindings[0].textureRef, trace.textures[0].id);
  assert.deepEqual(trace.drawBatches[0].drawBuffers.values, [gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
  assert.equal(trace.drawBatches[0].framebufferAttachments.attachments[0].resourceRef, trace.textures[1].id);
  assert.equal(trace.drawBatches[1].framebufferAttachments.attachments[0].resourceRef, trace.textures[2].id);
  assert(trace.drawBatches[0].framebufferAttachments.latestMutationSequence < trace.drawBatches[1].framebufferAttachments.latestMutationSequence);
  assert(trace.drawBatches.every((batch) => batch.framebufferStatus.sequence < batch.sequence));
  assert(trace.drawBatches.every((batch) => batch.framebufferStatus.framebufferRef === batch.framebufferRef));
  assert.equal(trace.drawBatches[0].samplerUnits[0].samplerRef, trace.contexts[0].samplers[0].id);
  assert.equal(trace.contexts[0].samplers[0].deleteSequence > trace.drawBatches[0].sequence, true);
  assert.equal(trace.contexts[0].flowCalls.blitFramebuffer, 1);
  const blit = trace.stateChanges.find((change) => change.method === "blitFramebuffer");
  assert(blit);
  assert.equal(blit.sourceFramebufferAttachments.attachments[0].resourceRef, trace.textures[2].id);
  assert.equal(blit.destinationFramebufferAttachments.attachments[0].resourceRef, trace.textures[3].id);
  assert(blit.sourceFramebufferStatus.sequence < blit.sequence);
  assert(blit.destinationFramebufferStatus.sequence < blit.sequence);
  const attachmentEvents = trace.framebuffers[0].attachments;
  assert(attachmentEvents.every((event) => Number.isSafeInteger(event.sequence) && event.sequence > 0));
  assert(attachmentEvents.every((event, index) => index === 0 || event.sequence > attachmentEvents[index - 1].sequence));
  assert(attachmentEvents.some((event) => event.resourceRef === null && event.detached === true));
  assert(trace.stateChanges.some((change) => change.method === "viewport"));
  assert(trace.stateChanges.some((change) => change.method === "clearColor"));
  assert.equal(trace.checkpoints.length, 1);
  assert.equal(trace.checkpoints[0].externalVisualRef, "visual:screenshot:hero-ready");
  for (const required of ["viewport", "dpr", "frame", "time", "input", "camera", "colorSettings"]) {
    assert.notEqual(trace.checkpoints[0].conditions[required], undefined, `checkpoint must include ${required}`);
  }
  assert.equal(trace.observedGetErrors.length, 1);
  assert.equal(trace.observedGetErrors[0].source, "checkpoint");
  assert.equal(trace.observedGetErrors[0].ok, true);
  assert.deepEqual(trace.probeErrors, []);
}

function testProbeCapturesCompileAndLinkFailures() {
  const compileGl = new FakeGl();
  const compileEnvironment = createProbeEnvironment();
  const compileCanvas = new compileEnvironment.HTMLCanvasElement(compileGl, "compile-failure");
  compileCanvas.getContext("webgl");
  const badShader = compileGl.createShader(compileGl.FRAGMENT_SHADER);
  compileGl.shaderSource(badShader, "COMPILE_FAIL");
  const compileReturn = compileGl.compileShader(badShader);
  assert.equal(compileReturn, undefined);
  const compileTrace = compileEnvironment.context.__DSRA_GPU_PROBE__.export();
  assert.equal(compileTrace.shaders[0].compile.status, false);
  assert.equal(compileTrace.shaders[0].compile.log, "synthetic compile failure");

  const linkGl = new FakeGl({ linkFailure: true });
  const linkEnvironment = createProbeEnvironment();
  const linkCanvas = new linkEnvironment.HTMLCanvasElement(linkGl, "link-failure");
  linkCanvas.getContext("webgl2");
  const shader = linkGl.createShader(linkGl.VERTEX_SHADER);
  linkGl.shaderSource(shader, "void main(){gl_Position=vec4(0.);}");
  linkGl.compileShader(shader);
  const program = linkGl.createProgram();
  linkGl.attachShader(program, shader);
  linkGl.linkProgram(program);
  const linkTrace = linkEnvironment.context.__DSRA_GPU_PROBE__.export();
  assert.equal(linkTrace.programs[0].link.status, false);
  assert.equal(linkTrace.programs[0].link.log, "synthetic link failure");
}

function testProbeChecksNonDefaultFramebufferAtDraw() {
  const gl = new FakeGl({ framebufferStatus: 0x8CD6 });
  const { context, HTMLCanvasElement } = createProbeEnvironment();
  new HTMLCanvasElement(gl, "incomplete").getContext("webgl2");
  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  const trace = context.__DSRA_GPU_PROBE__.export();
  assert.equal(trace.framebuffers[0].statusChecks.length, 1);
  assert.equal(trace.framebuffers[0].statusChecks[0].source, "probe-draw");
  assert.equal(trace.framebuffers[0].statusChecks[0].complete, false);
  assert.equal(trace.drawBatches[0].framebufferStatus.complete, false);
}

function testProbeCapturesLayeredFramebufferAttachments() {
  const gl = new FakeGl();
  const { context, HTMLCanvasElement } = createProbeEnvironment();
  new HTMLCanvasElement(gl, "layered").getContext("webgl2");
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA, 2, 2);
  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, texture, 2, 3);
  const renderbuffer = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA, 2, 2);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.RENDERBUFFER, renderbuffer);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.RENDERBUFFER, null);
  const trace = context.__DSRA_GPU_PROBE__.export();
  assert.equal(trace.framebuffers[0].attachments[0].resourceRef, trace.textures[0].id);
  assert.equal(trace.framebuffers[0].attachments[0].level, 2);
  assert.equal(trace.framebuffers[0].attachments[0].layer, 3);
  assert(trace.framebuffers[0].attachments.every((event) => Number.isSafeInteger(event.sequence) && event.sequence > 0));
  assert.equal(trace.framebuffers[0].attachments[1].resourceType, "renderbuffer");
  assert.equal(trace.framebuffers[0].attachments[2].resourceRef, null);
  assert.equal(trace.framebuffers[0].attachments[2].detached, true);
}

function testProbeCapturesWebGl2FlowAndSamplerState() {
  const returns = {
    drawBuffersReturn: { exact: "draw-buffers" },
    readBufferReturn: { exact: "read-buffer" },
    blitFramebufferReturn: { exact: "blit" },
    bindSamplerReturn: { exact: "bind-sampler" },
    samplerParameterReturn: { exact: "sampler-parameter" },
    deleteSamplerReturn: { exact: "delete-sampler" },
  };
  const gl = new FakeGl(returns);
  const { context, HTMLCanvasElement } = createProbeEnvironment();
  new HTMLCanvasElement(gl, "webgl2-flow").getContext("webgl2");

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA, 4, 4);
  const source = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, source);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X, texture, 0);
  assert.equal(gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]), returns.drawBuffersReturn);

  const sampler = gl.createSampler();
  assert.equal(gl.samplerParameteri(sampler, gl.TEXTURE_MIN_FILTER, gl.LINEAR), returns.samplerParameterReturn);
  assert.equal(gl.bindSampler(0, sampler), returns.bindSamplerReturn);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  const destination = gl.createFramebuffer();
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, source);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, destination);
  assert.equal(gl.readBuffer(gl.COLOR_ATTACHMENT0), returns.readBufferReturn);
  assert.equal(gl.drawBuffers([gl.COLOR_ATTACHMENT0]), returns.drawBuffersReturn);
  assert.equal(gl.blitFramebuffer(0, 0, 4, 4, 1, 1, 3, 3, gl.COLOR_BUFFER_BIT, gl.NEAREST), returns.blitFramebufferReturn);
  assert.equal(gl.deleteSampler(sampler), returns.deleteSamplerReturn);

  const trace = context.__DSRA_GPU_PROBE__.export();
  assert.equal(trace.framebuffers[0].attachments[0].textarget, gl.TEXTURE_CUBE_MAP_POSITIVE_X);
  assert.equal(trace.contexts[0].flowCalls.drawBuffers, 2);
  assert.equal(trace.contexts[0].flowCalls.readBuffer, 1);
  assert.equal(trace.contexts[0].flowCalls.blitFramebuffer, 1);
  assert.equal(trace.contexts[0].samplers.length, 1);
  assert.equal(trace.contexts[0].samplers[0].deleted, true);
  assert.equal(trace.contexts[0].samplers[0].parameters[0].value, gl.LINEAR);
  assert.equal(trace.drawBatches[0].drawBuffers.values.length, 2);
  assert.equal(trace.drawBatches[0].samplerUnits[0].samplerRef, trace.contexts[0].samplers[0].id);
  assert.equal(trace.drawBatches[0].samplerUnits[0].parameters[String(gl.TEXTURE_MIN_FILTER)], gl.LINEAR);
  const blit = trace.stateChanges.find((change) => change.method === "blitFramebuffer");
  assert.deepEqual(blit.sourceRect, [0, 0, 4, 4]);
  assert.deepEqual(blit.destinationRect, [1, 1, 3, 3]);
  assert.equal(blit.sourceFramebufferRef, trace.framebuffers[0].id);
  assert.equal(blit.destinationFramebufferRef, trace.framebuffers[1].id);
  assert.equal(blit.mask, gl.COLOR_BUFFER_BIT);
  assert.equal(blit.filter, gl.NEAREST);
  assert.equal(blit.sourceFramebufferStatus.complete, true);
  assert.equal(blit.destinationFramebufferStatus.complete, true);
}

function testProbeCapturesCoreAndExtensionDraws() {
  const angleReturn = { exact: "angle-draw-return" };
  const multiReturn = { exact: "multi-draw-return" };
  const angle = {
    drawArraysInstancedANGLE() { return angleReturn; },
    vertexAttribDivisorANGLE() {},
  };
  const multi = {
    multiDrawArraysWEBGL() { return multiReturn; },
  };
  const gl = new FakeGl({ extensions: { ANGLE_instanced_arrays: angle, WEBGL_multi_draw: multi } });
  const { context, HTMLCanvasElement } = createProbeEnvironment();
  new HTMLCanvasElement(gl, "extension-draws").getContext("webgl2");
  gl.drawRangeElements(gl.TRIANGLES, 0, 9, 6, gl.UNSIGNED_SHORT, 0);
  assert.equal(gl.getExtension("ANGLE_instanced_arrays"), angle);
  assert.equal(angle.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 3, 2), angleReturn);
  assert.equal(gl.getExtension("WEBGL_multi_draw"), multi);
  assert.equal(multi.multiDrawArraysWEBGL(gl.TRIANGLES, new Int32Array([0, 3]), 0, new Int32Array([3, 3]), 0, 2), multiReturn);
  const trace = context.__DSRA_GPU_PROBE__.export();
  assert.equal(trace.drawBatches.length, 1);
  assert.equal(trace.drawBatches[0].drawCount, 4);
  assert.deepEqual(trace.drawBatches[0].framebufferAttachments, {
    framebufferRef: null,
    latestMutationSequence: 0,
    attachments: [],
  });
  assert.deepEqual(trace.drawBatches[0].draws.map((draw) => draw.method), [
    "drawRangeElements", "drawArraysInstancedANGLE", "multiDrawArraysWEBGL",
  ]);
  assert.deepEqual(
    Object.fromEntries(["start", "end", "count", "type", "offset"].map((key) => [key, trace.drawBatches[0].draws[0][key]])),
    { start: 0, end: 9, count: 6, type: gl.UNSIGNED_SHORT, offset: 0 },
  );
  assert.equal(trace.drawBatches[0].draws[2].subdrawCount, 2);
}

function testProbeGroupsAnimationCallbacksByBrowserFrame() {
  const gl = new FakeGl();
  const { context, HTMLCanvasElement } = createProbeEnvironment({ rafTimestamps: [16, 16] });
  new HTMLCanvasElement(gl, "frame-grouping").getContext("webgl2");
  context.requestAnimationFrame(() => gl.drawArrays(gl.TRIANGLES, 0, 3));
  context.requestAnimationFrame(() => gl.drawArrays(gl.TRIANGLES, 3, 3));
  const trace = context.__DSRA_GPU_PROBE__.export();
  assert.equal(trace.drawBatches.length, 1);
  assert.equal(trace.drawBatches[0].frame, 1);
  assert.equal(trace.drawBatches[0].drawCount, 2);
}

function testProbeBoundsResourcesAndMarksDrops() {
  const gl = new FakeGl();
  const { context, HTMLCanvasElement } = createProbeEnvironment();
  new HTMLCanvasElement(gl, "overflow").getContext("webgl");
  for (let index = 0; index < 257; index += 1) gl.createShader(gl.VERTEX_SHADER);
  const trace = context.__DSRA_GPU_PROBE__.export();
  assert.equal(trace.shaders.length, 256);
  assert.equal(trace.truncated, true);
  assert.equal(trace.dropped.shaders, 1);

  const samplerGl = new FakeGl();
  const samplerEnvironment = createProbeEnvironment();
  new samplerEnvironment.HTMLCanvasElement(samplerGl, "sampler-overflow").getContext("webgl2");
  for (let index = 0; index < 513; index += 1) samplerGl.createSampler();
  const samplerTrace = samplerEnvironment.context.__DSRA_GPU_PROBE__.export();
  assert.equal(samplerTrace.contexts[0].samplers.length, 512);
  assert.equal(samplerTrace.truncated, true);
  assert.equal(samplerTrace.dropped.samplers, 1);
}

function testProbeErrorsDoNotChangeApplicationReturnOrThrowSemantics() {
  const queryError = new Error("query failed inside probe");
  const compileReturn = { exact: "compile-return" };
  const gl = new FakeGl({ throwShaderQuery: queryError, compileReturn });
  const { context, HTMLCanvasElement } = createProbeEnvironment();
  const canvas = new HTMLCanvasElement(gl, "semantics");
  assert.equal(canvas.getContext("webgl"), gl);
  assert.equal(canvas.getContext("webgl"), gl);
  const shader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(shader, "void main(){}");
  assert.equal(gl.compileShader(shader), compileReturn, "probe query errors must not alter successful call return identity");
  const trace = context.__DSRA_GPU_PROBE__.export();
  assert.equal(trace.contexts.length, 1, "same context must keep one stable WeakMap identity");
  assert.equal(trace.probeErrors.length, 1);
  assert.match(trace.probeErrors[0].stage, /compileShader/);

  const applicationError = new Error("application texImage failure");
  const throwingGl = new FakeGl({ throwTexImage: applicationError });
  const throwingEnvironment = createProbeEnvironment();
  new throwingEnvironment.HTMLCanvasElement(throwingGl, "throwing").getContext("webgl");
  const texture = throwingGl.createTexture();
  throwingGl.bindTexture(throwingGl.TEXTURE_2D, texture);
  assert.throws(
    () => throwingGl.texImage2D(throwingGl.TEXTURE_2D, 0, throwingGl.RGBA, 1, 1, 0, throwingGl.RGBA, throwingGl.UNSIGNED_BYTE, null),
    (error) => error === applicationError,
    "wrapper must rethrow the exact application error",
  );
  const throwingTrace = throwingEnvironment.context.__DSRA_GPU_PROBE__.export();
  assert.equal(throwingTrace.textures[0].uploads.length, 0, "failed application calls must not be recorded as successful uploads");
  assert.deepEqual(throwingTrace.probeErrors, [], "application failures are not probe failures");
}

function testProbeRecordsAppErrorsAndBlocksOnWebGpuEncounter() {
  const gl = new FakeGl({ errors: [0x0502, 0] });
  const { context, HTMLCanvasElement } = createProbeEnvironment();
  new HTMLCanvasElement(gl, "errors").getContext("webgl2");
  assert.equal(gl.getError(), gl.INVALID_OPERATION);
  context.__DSRA_GPU_PROBE__.checkpoint("error-check", {
    externalVisualRef: "visual:error-check",
    input: {}, camera: {}, colorSettings: {},
  });
  const trace = context.__DSRA_GPU_PROBE__.export();
  assert.deepEqual(trace.observedGetErrors.map((entry) => [entry.source, entry.error]), [["app", gl.INVALID_OPERATION], ["checkpoint", gl.NO_ERROR]]);

  const webgpuEnvironment = createProbeEnvironment();
  new webgpuEnvironment.HTMLCanvasElement(null, "webgpu").getContext("webgpu");
  const webgpuTrace = webgpuEnvironment.context.__DSRA_GPU_PROBE__.export();
  assert.equal(webgpuTrace.webgpuDetected, true);
  assert.equal(webgpuTrace.producerStatus, "blocked");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function withTempDir(prefix, fn) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function runValidator(trace, options = {}) {
  return withTempDir("dsra-gpu-validator-", (dir) => {
    const tracePath = join(dir, "runtime-trace.json");
    const statusPath = join(dir, "runtime-status.json");
    writeFileSync(tracePath, `${JSON.stringify(trace, null, 2)}\n`, "utf8");
    const args = [validatorPath, tracePath, ...(options.withOutput === false ? [] : [statusPath])];
    const result = spawnSync(process.execPath, args, { encoding: "utf8", timeout: 5000 });
    return {
      result,
      status: result.stdout.trim() ? JSON.parse(result.stdout) : null,
      writtenStatus: options.withOutput === false || !result.stdout.trim() ? null : JSON.parse(readFileSync(statusPath, "utf8")),
    };
  });
}

function testValidatorAcceptsCompleteRuntimeTraceDeterministically() {
  const { trace, sources } = buildSuccessfulTrace();
  const first = runValidator(trace);
  assert.equal(first.result.status, 0, first.result.stderr || first.result.stdout);
  assert.equal(first.status.status, "runtime-validated");
  assert.deepEqual(Object.keys(first.status), ["status", "traceId", "shaderHashes", "unresolved"]);
  assert.match(first.status.traceId, /^sha256:[a-f0-9]{64}$/);
  assert.deepEqual(first.status.unresolved, []);
  assert.deepEqual(first.writtenStatus, first.status);
  assert.equal(first.status.shaderHashes.length, 2);
  const expectedHashes = Object.values(sources).map((source) => `sha256:${createHash("sha256").update(source).digest("hex")}`).sort();
  assert.deepEqual(first.status.shaderHashes.map((entry) => entry.sha256).sort(), expectedHashes);

  const second = runValidator(trace);
  assert.equal(second.result.status, 0, second.result.stderr);
  assert.equal(second.result.stdout, first.result.stdout, "same trace must produce byte-identical deterministic status JSON");

  const arrayTrace = clone(trace);
  const arrayFragment = arrayTrace.shaders.find((shader) => shader.type === "fragment");
  arrayFragment.source = [
    "precision highp float;",
    "uniform sampler2D bake2[2];",
    "void main(){ gl_FragColor = texture2D(bake2[0], vec2(.5)); }",
  ].join(" ");
  arrayFragment.sourceBytes = Buffer.byteLength(arrayFragment.source);
  arrayTrace.uniformLocations[0].name = "bake2[0]";
  const arrayValidation = runValidator(arrayTrace, { withOutput: false });
  assert.equal(arrayValidation.result.status, 0, arrayValidation.result.stderr || arrayValidation.result.stdout);
}

function testValidatorRejectsUnsupportedUniformBlocks() {
  const baseline = buildSuccessfulTrace().trace;
  const validBaseline = runValidator(baseline, { withOutput: false });
  assert.equal(validBaseline.result.status, 0, validBaseline.result.stderr || validBaseline.result.stdout);

  const blockSources = [
    [
      "precision highp float;",
      "uniform sampler2D bake2;",
      "layout(std140) uniform Params { highp float exposure; };",
      "void main(){ gl_FragColor = texture2D(bake2, vec2(.5)) * exposure; }",
    ].join(" "),
    [
      "precision highp float;",
      "uniform sampler2D bake2;",
      "uniform Lighting { mediump vec4 ambient; } lights[2];",
      "void main(){ gl_FragColor = texture2D(bake2, vec2(.5)) + lights[0].ambient; }",
    ].join(" "),
    [
      "precision highp float;",
      "uniform sampler2D bake2;",
      "uniform Globals { uniform highp mat4 view; };",
      "void main(){ gl_FragColor = texture2D(bake2, vec2(.5)); }",
    ].join(" "),
  ];
  for (const source of blockSources) {
    const trace = clone(baseline);
    const fragment = trace.shaders.find((shader) => shader.type === "fragment");
    fragment.source = source;
    fragment.sourceBytes = Buffer.byteLength(source);
    const validation = runValidator(trace, { withOutput: false });
    assert.equal(validation.result.status, 1, validation.result.stderr || validation.result.stdout);
    assert.equal(validation.status?.status, "partial");
    assert(validation.status.unresolved.some((entry) => /unsupported uniform block/i.test(entry)),
      `expected an unsupported uniform block reason, got ${JSON.stringify(validation.status.unresolved)}`);
    assert.equal(validation.status.unresolved.some((entry) => /uniform view.*location/i.test(entry)), false,
      `block members must not be treated as default uniforms: ${JSON.stringify(validation.status.unresolved)}`);
  }

  const decoyTrace = clone(baseline);
  const decoyFragment = decoyTrace.shaders.find((shader) => shader.type === "fragment");
  decoyFragment.source = [
    "precision highp float;",
    "uniform sampler2D bake2;",
    "/* layout(std140) uniform Commented { float value; }; */",
    "// uniform LineCommented { float value; };",
    "\"uniform DoubleQuoted { float value; };\";",
    "'uniform SingleQuoted { float value; };';",
    "highp\nuniform HeaderPrecision { float value; };",
    "uniform highp { float value; };",
    "layout() uniform EmptyLayout { float value; };",
    "uniform EmptyBody { ; };",
    "uniform IncompleteMember { float first; float second };",
    "uniform BlankArray { float value; } blank[ ];",
    "uniform NestedStruct { struct Inner { float value; } nested; };",
    "void main(){ gl_FragColor = texture2D(bake2, vec2(.5)); }",
  ].join("\n");
  decoyFragment.sourceBytes = Buffer.byteLength(decoyFragment.source);
  const decoyValidation = runValidator(decoyTrace, { withOutput: false });
  assert.equal(decoyValidation.result.status, 0, decoyValidation.result.stderr || decoyValidation.result.stdout);
  assert.equal(decoyValidation.status?.status, "runtime-validated");
}

function testValidatorFailsClosedAcrossBlockedAndPartialGates() {
  const success = buildSuccessfulTrace().trace;
  const cases = [];

  const unexpectedTopField = clone(success);
  unexpectedTopField.unexpected = true;
  cases.push(["blocked", unexpectedTopField, /unexpected top-level/i]);

  const missingTruncatedFlag = clone(success);
  delete missingTruncatedFlag.truncated;
  cases.push(["blocked", missingTruncatedFlag, /missing top-level.*truncated/i]);

  const invalidDroppedCounter = clone(success);
  invalidDroppedCounter.dropped.shaders = -1;
  cases.push(["blocked", invalidDroppedCounter, /dropped counters/i]);

  const unsafeLimit = clone(success);
  unsafeLimit.limits.contexts = 9;
  cases.push(["blocked", unsafeLimit, /capture limit.*contexts/i]);

  const exceededContextLimit = clone(success);
  for (let index = 2; index <= 9; index += 1) {
    exceededContextLimit.contexts.push({ ...clone(success.contexts[0]), id: `context-${index}` });
  }
  cases.push(["blocked", exceededContextLimit, /contexts.*capture limit/i]);

  const exceededRenderbufferLimit = clone(success);
  exceededRenderbufferLimit.limits.renderbuffers = 129;
  for (let index = 1; index <= 128; index += 1) {
    exceededRenderbufferLimit.contexts[0].renderbuffers.push({
      id: `renderbuffer-extra-${index}`,
      contextRef: success.contexts[0].id,
      storage: [],
    });
  }
  cases.push(["blocked", exceededRenderbufferLimit, /capture limit.*renderbuffers|renderbuffers.*capture limit/i]);

  const exceededResourceEventLimit = clone(success);
  exceededResourceEventLimit.contexts[0].renderbuffers[0].storage = Array.from({ length: 1025 }, (_, index) => ({
    ...clone(success.contexts[0].renderbuffers[0].storage[0]),
    sequence: 1_000_000 + index,
  }));
  cases.push(["blocked", exceededResourceEventLimit, /renderbuffer.*storage.*resource event.*limit/i]);

  const unconfirmedShaderSource = clone(success);
  delete unconfirmedShaderSource.shaders[0].sourceComplete;
  cases.push(["partial", unconfirmedShaderSource, /full source/i]);

  const mismatchedShaderBytes = clone(success);
  mismatchedShaderBytes.shaders[0].sourceBytes += 1;
  cases.push(["blocked", mismatchedShaderBytes, /source byte length/i]);

  const compileFailure = clone(success);
  compileFailure.shaders[0].compile.status = false;
  compileFailure.shaders[0].compile.log = "compile failed";
  cases.push(["blocked", compileFailure, /compile/i]);

  const linkFailure = clone(success);
  linkFailure.programs[0].link.status = false;
  linkFailure.programs[0].link.log = "link failed";
  cases.push(["blocked", linkFailure, /link/i]);

  const incompleteFbo = clone(success);
  incompleteFbo.framebuffers[0].statusChecks.at(-1).complete = false;
  incompleteFbo.drawBatches[0].framebufferStatus.complete = false;
  cases.push(["blocked", incompleteFbo, /framebuffer.*incomplete/i]);

  const uncheckedFbo = clone(success);
  uncheckedFbo.framebuffers[0].statusChecks = [];
  uncheckedFbo.drawBatches[0].framebufferStatus = { checked: false, complete: null, status: null };
  cases.push(["partial", uncheckedFbo, /framebuffer.*unchecked/i]);

  const missingFboAttachment = clone(success);
  missingFboAttachment.framebuffers[0].attachments = [];
  cases.push(["partial", missingFboAttachment, /framebuffer.*attachment/i]);

  const missingTextureTarget = clone(success);
  delete missingTextureTarget.framebuffers[0].attachments[0].textarget;
  cases.push(["partial", missingTextureTarget, /textarget/i]);

  const missingDrawBufferRouting = clone(success);
  delete missingDrawBufferRouting.drawBatches[0].drawBuffers;
  cases.push(["partial", missingDrawBufferRouting, /draw buffer routing/i]);

  const unknownMrtAttachment = clone(success);
  unknownMrtAttachment.drawBatches[0].drawBuffers.values[1] = 0x8CEF;
  cases.push(["partial", unknownMrtAttachment, /draw buffer.*attachment/i]);

  const mismatchedMrtState = clone(success);
  mismatchedMrtState.drawBatches[0].drawBuffers.values = [success.drawBatches[0].drawBuffers.values[0]];
  cases.push(["partial", mismatchedMrtState, /draw buffer.*effective state/i]);

  const omittedDrawBuffersCall = clone(success);
  omittedDrawBuffersCall.stateChanges.splice(omittedDrawBuffersCall.stateChanges.findIndex((change) => change.method === "drawBuffers"), 1);
  cases.push(["partial", omittedDrawBuffersCall, /drawBuffers call accounting/i]);

  const omittedReadBufferCall = clone(success);
  omittedReadBufferCall.stateChanges = omittedReadBufferCall.stateChanges.filter((change) => change.method !== "readBuffer");
  cases.push(["partial", omittedReadBufferCall, /readBuffer call accounting/i]);

  const omittedBlitCall = clone(success);
  omittedBlitCall.stateChanges = omittedBlitCall.stateChanges.filter((change) => change.method !== "blitFramebuffer");
  cases.push(["partial", omittedBlitCall, /blitFramebuffer call accounting/i]);

  const unknownBlitFramebuffer = clone(success);
  unknownBlitFramebuffer.stateChanges.find((change) => change.method === "blitFramebuffer").sourceFramebufferRef = "framebuffer-missing";
  cases.push(["partial", unknownBlitFramebuffer, /blitFramebuffer.*source framebuffer/i]);

  const mismatchedBlitReadState = clone(success);
  mismatchedBlitReadState.stateChanges.find((change) => change.method === "blitFramebuffer").sourceReadBuffer.value = 0x8CE1;
  cases.push(["partial", mismatchedBlitReadState, /read-buffer effective state/i]);

  const mismatchedBlitDrawState = clone(success);
  mismatchedBlitDrawState.stateChanges.find((change) => change.method === "blitFramebuffer").destinationDrawBuffers.values = [0];
  cases.push(["partial", mismatchedBlitDrawState, /destination draw-buffer effective state/i]);

  const missingEffectiveSamplerState = clone(success);
  missingEffectiveSamplerState.drawBatches[0].samplerUnits = [];
  cases.push(["partial", missingEffectiveSamplerState, /sampler.*effective state/i]);

  const unknownSamplerObject = clone(success);
  unknownSamplerObject.drawBatches[0].samplerUnits[0].samplerRef = "sampler-missing";
  cases.push(["partial", unknownSamplerObject, /unknown sampler/i]);

  const mismatchedSamplerBind = clone(success);
  mismatchedSamplerBind.drawBatches[0].samplerUnits[0].bindSequence = 1;
  cases.push(["partial", mismatchedSamplerBind, /sampler.*binding.*effective/i]);

  const omittedSamplerParameters = clone(success);
  omittedSamplerParameters.contexts[0].samplers[0].parameters = [];
  cases.push(["partial", omittedSamplerParameters, /sampler.*parameter/i]);

  const samplerDeletedBeforeDraw = clone(success);
  samplerDeletedBeforeDraw.contexts[0].samplers[0].deleteSequence = samplerDeletedBeforeDraw.drawBatches[0].sequence;
  cases.push(["partial", samplerDeletedBeforeDraw, /sampler.*deleted/i]);

  const truncated = clone(success);
  truncated.truncated = true;
  truncated.dropped.shaders = 1;
  cases.push(["blocked", truncated, /truncated|dropped/i]);

  const probeError = clone(success);
  probeError.probeErrors.push({ stage: "context-1.compileShader", name: "Error", message: "query failed", frame: 0, time: 1 });
  cases.push(["blocked", probeError, /probe error/i]);

  const missingDraw = clone(success);
  missingDraw.drawBatches = [];
  cases.push(["partial", missingDraw, /draw/i]);

  const missingCheckpoint = clone(success);
  missingCheckpoint.checkpoints = [];
  missingCheckpoint.observedGetErrors = [];
  cases.push(["partial", missingCheckpoint, /checkpoint/i]);

  const missingVisualRef = clone(success);
  missingVisualRef.checkpoints[0].externalVisualRef = null;
  cases.push(["blocked", missingVisualRef, /external visual/i]);

  const missingVisualConditions = clone(success);
  missingVisualConditions.checkpoints[0].conditions.camera = null;
  cases.push(["blocked", missingVisualConditions, /camera/i]);

  const emptyVisualConditions = clone(success);
  emptyVisualConditions.checkpoints[0].conditions.colorSettings = {};
  cases.push(["blocked", emptyVisualConditions, /colorSettings/i]);

  const webgpu = clone(success);
  webgpu.webgpuDetected = true;
  webgpu.producerStatus = "blocked";
  cases.push(["blocked", webgpu, /webgpu/i]);

  const glError = clone(success);
  glError.observedGetErrors[0].error = 0x0502;
  glError.observedGetErrors[0].ok = false;
  cases.push(["blocked", glError, /geterror/i]);

  const missingUniformWrite = clone(success);
  missingUniformWrite.uniformWrites = [];
  cases.push(["partial", missingUniformWrite, /uniform.*write/i]);

  const missingListedSampler = clone(success);
  const listedFragment = missingListedSampler.shaders.find((shader) => shader.type === "fragment");
  listedFragment.source = [
    "precision highp float;",
    "uniform sampler2D bake2, untraced[2];",
    "void main(){ gl_FragColor = texture2D(bake2, vec2(.5)) + texture2D(untraced[0], vec2(.5)); }",
  ].join(" ");
  listedFragment.sourceBytes = Buffer.byteLength(listedFragment.source);
  cases.push(["partial", missingListedSampler, /uniform untraced.*location/i]);

  const missingPrecisionListedSampler = clone(success);
  const precisionFragment = missingPrecisionListedSampler.shaders.find((shader) => shader.type === "fragment");
  precisionFragment.source = [
    "precision highp float;",
    "uniform highp sampler2D bake2, untraced[2];",
    "void main(){ gl_FragColor = texture2D(bake2, vec2(.5)) + texture2D(untraced[0], vec2(.5)); }",
  ].join(" ");
  precisionFragment.sourceBytes = Buffer.byteLength(precisionFragment.source);
  cases.push(["partial", missingPrecisionListedSampler, /uniform untraced.*location/i]);

  const missingIntegerSamplerBinding = clone(success);
  const integerSamplerFragment = missingIntegerSamplerBinding.shaders.find((shader) => shader.type === "fragment");
  integerSamplerFragment.source = [
    "precision highp float; precision highp int;",
    "uniform highp isampler2D bake2;",
    "void main(){ ivec4 sampled = texture(bake2, vec2(.5)); gl_FragColor = vec4(sampled); }",
  ].join(" ");
  integerSamplerFragment.sourceBytes = Buffer.byteLength(integerSamplerFragment.source);
  for (const batch of missingIntegerSamplerBinding.drawBatches) batch.samplerUnits = [];
  cases.push(["partial", missingIntegerSamplerBinding, /sampler bake2.*effective state/i]);

  const missingTextureUpload = clone(success);
  missingTextureUpload.textures[0].uploads = [];
  cases.push(["partial", missingTextureUpload, /texture.*storage|texture.*upload/i]);

  const staleSamplerBinding = clone(success);
  staleSamplerBinding.uniformWrites[0].sequence = 1;
  staleSamplerBinding.drawBatches[0].sequence = 2;
  staleSamplerBinding.drawBatches[0].textureUnits = [];
  staleSamplerBinding.uniformWrites.push({ ...clone(staleSamplerBinding.uniformWrites[0]), sequence: 3, values: [1] });
  staleSamplerBinding.drawBatches.push({
    ...clone(staleSamplerBinding.drawBatches[0]),
    id: "draw-batch-2",
    sequence: 4,
    textureUnits: [{
      unit: 1,
      bindings: [{ target: success.drawBatches[0].textureUnits[0].bindings[0].target, textureRef: success.textures[0].id }],
    }],
  });
  cases.push(["partial", staleSamplerBinding, /sampler.*draw batch/i]);

  const unknownProgramBinding = clone(success);
  unknownProgramBinding.drawBatches[0].programRef = null;
  cases.push(["partial", unknownProgramBinding, /program.*binding/i]);

  for (const [expectedStatus, trace, unresolvedPattern] of cases) {
    const validation = runValidator(trace, { withOutput: false });
    assert.equal(validation.result.status, 1, `expected ${expectedStatus} validator exit\nstderr:\n${validation.result.stderr}`);
    assert.equal(validation.status?.status, expectedStatus);
    assert(validation.status.unresolved.some((entry) => unresolvedPattern.test(entry)),
      `expected unresolved reason ${unresolvedPattern}, got ${JSON.stringify(validation.status.unresolved)}`);
  }
}

function testValidatorRejectsNonTemporalFramebufferSnapshots() {
  const baseline = buildSuccessfulTrace().trace;
  const validBaseline = runValidator(baseline, { withOutput: false });
  assert.equal(validBaseline.result.status, 0, validBaseline.result.stderr || validBaseline.result.stdout);

  const cases = [];

  const missingDrawSnapshot = clone(baseline);
  delete missingDrawSnapshot.drawBatches[0].framebufferAttachments;
  cases.push([missingDrawSnapshot, /draw batch.*attachment snapshot/i]);

  const staleDrawSnapshot = clone(baseline);
  staleDrawSnapshot.drawBatches[1].framebufferAttachments = clone(staleDrawSnapshot.drawBatches[0].framebufferAttachments);
  cases.push([staleDrawSnapshot, /draw batch.*attachment snapshot.*effective state/i]);

  const missingSnapshotEntry = clone(baseline);
  missingSnapshotEntry.drawBatches[0].framebufferAttachments.attachments.pop();
  cases.push([missingSnapshotEntry, /draw batch.*attachment snapshot.*effective state/i]);

  const reorderedSnapshot = clone(baseline);
  reorderedSnapshot.drawBatches[0].framebufferAttachments.attachments.reverse();
  cases.push([reorderedSnapshot, /draw batch.*attachment snapshot.*effective state/i]);

  const unknownSnapshotResource = clone(baseline);
  unknownSnapshotResource.drawBatches[0].framebufferAttachments.attachments[0].resourceRef = "texture-missing";
  cases.push([unknownSnapshotResource, /draw batch.*attachment snapshot.*effective state|unknown texture/i]);

  const missingMutationSequence = clone(baseline);
  delete missingMutationSequence.framebuffers[0].attachments[0].sequence;
  cases.push([missingMutationSequence, /framebuffer.*attachment mutation.*sequence/i]);

  const omittedReplacement = clone(baseline);
  const replacementRef = omittedReplacement.textures[2].id;
  const replacementIndex = omittedReplacement.framebuffers[0].attachments.findIndex((event) =>
    event.resourceRef === replacementRef && event.sequence < omittedReplacement.drawBatches[1].sequence
  );
  assert.notEqual(replacementIndex, -1);
  omittedReplacement.framebuffers[0].attachments.splice(replacementIndex, 1);
  cases.push([omittedReplacement, /draw batch.*attachment snapshot.*effective state/i]);

  const futureAttachmentStorage = clone(baseline);
  futureAttachmentStorage.textures[2].storage[0].sequence = Number.MAX_SAFE_INTEGER;
  cases.push([futureAttachmentStorage, /texture attachment.*storage evidence before/i]);

  const omittedDetach = clone(baseline);
  omittedDetach.framebuffers[0].attachments = omittedDetach.framebuffers[0].attachments.filter((event) => event.resourceRef !== null);
  cases.push([omittedDetach, /framebufferAttachment call accounting/i]);

  const nonDefiningTextureStorage = clone(baseline);
  nonDefiningTextureStorage.textures[2].storage[0].method = "texSubImage2D";
  cases.push([nonDefiningTextureStorage, /texture attachment.*defining storage/i]);

  const uncoveredTextureLevel = clone(baseline);
  const firstTextureRef = uncoveredTextureLevel.textures[1].id;
  const firstTextureAttachment = uncoveredTextureLevel.framebuffers[0].attachments.find((event) => event.resourceRef === firstTextureRef);
  firstTextureAttachment.level = 99;
  for (const batch of uncoveredTextureLevel.drawBatches) {
    const snapshot = batch.framebufferAttachments.attachments.find((event) => event.sequence === firstTextureAttachment.sequence);
    if (snapshot) snapshot.level = 99;
  }
  cases.push([uncoveredTextureLevel, /texture attachment.*defining storage.*level/i]);

  const globalSequenceCollision = clone(baseline);
  const firstAttachment = globalSequenceCollision.framebuffers[0].attachments[0];
  const originalAttachmentSequence = firstAttachment.sequence;
  firstAttachment.sequence = globalSequenceCollision.stateChanges.find((change) => change.method === "bindFramebuffer").sequence;
  for (const batch of globalSequenceCollision.drawBatches) {
    const snapshot = batch.framebufferAttachments.attachments.find((event) => event.sequence === originalAttachmentSequence);
    if (snapshot) snapshot.sequence = firstAttachment.sequence;
  }
  cases.push([globalSequenceCollision, /global sequence.*collision/i]);

  const crossContextTexture = clone(baseline);
  crossContextTexture.textures[1].contextRef = "context-missing";
  cases.push([crossContextTexture, /texture attachment.*context/i]);

  const unknownRenderbuffer = clone(baseline);
  const renderbufferAttachment = unknownRenderbuffer.framebuffers[0].attachments.find((event) => event.resourceType === "renderbuffer");
  const originalRenderbufferRef = renderbufferAttachment.resourceRef;
  renderbufferAttachment.resourceRef = "renderbuffer-missing";
  const attachmentSnapshots = [
    ...unknownRenderbuffer.drawBatches.map((batch) => batch.framebufferAttachments),
    unknownRenderbuffer.stateChanges.find((change) => change.method === "blitFramebuffer").sourceFramebufferAttachments,
  ];
  for (const snapshot of attachmentSnapshots) {
    const entry = snapshot.attachments.find((event) => event.resourceRef === originalRenderbufferRef);
    if (entry) entry.resourceRef = "renderbuffer-missing";
  }
  cases.push([unknownRenderbuffer, /unknown renderbuffer/i]);

  const nonDefiningRenderbufferStorage = clone(baseline);
  nonDefiningRenderbufferStorage.contexts[0].renderbuffers[0].storage[0].method = "renderbufferSubStorage";
  nonDefiningRenderbufferStorage.framebuffers[0].attachments.find((event) => event.resourceType === "renderbuffer").storage[0].method = "renderbufferSubStorage";
  cases.push([nonDefiningRenderbufferStorage, /renderbuffer attachment.*defining storage/i]);

  const unknownDrawCompleteness = clone(baseline);
  unknownDrawCompleteness.drawBatches[0].framebufferStatus.status = null;
  cases.push([unknownDrawCompleteness, /draw batch.*framebuffer status.*raw status/i]);

  const unknownBlitCompleteness = clone(baseline);
  unknownBlitCompleteness.stateChanges.find((change) => change.method === "blitFramebuffer").sourceFramebufferStatus.status = null;
  cases.push([unknownBlitCompleteness, /blitFramebuffer.*source framebuffer status.*raw status/i]);

  const omittedSecondDrawStatus = clone(baseline);
  const secondDrawStatusSequence = omittedSecondDrawStatus.drawBatches[1].framebufferStatuses[1].sequence;
  omittedSecondDrawStatus.framebuffers[0].statusChecks = omittedSecondDrawStatus.framebuffers[0].statusChecks
    .filter((status) => status.sequence !== secondDrawStatusSequence);
  cases.push([omittedSecondDrawStatus, /draw batch.*per-draw framebuffer status/i]);

  const invalidDrawStatusTarget = clone(baseline);
  const invalidDrawStatus = invalidDrawStatusTarget.drawBatches[0].framebufferStatuses[0];
  invalidDrawStatus.target = 0xDEAD;
  invalidDrawStatusTarget.drawBatches[0].framebufferStatus.target = 0xDEAD;
  invalidDrawStatusTarget.framebuffers[0].statusChecks
    .find((status) => status.sequence === invalidDrawStatus.sequence).target = 0xDEAD;
  cases.push([invalidDrawStatusTarget, /draw batch.*framebuffer status.*target/i]);

  const invalidBlitStatusTarget = clone(baseline);
  const invalidBlit = invalidBlitStatusTarget.stateChanges.find((change) => change.method === "blitFramebuffer");
  invalidBlit.sourceFramebufferStatus.target = 0xDEAD;
  invalidBlitStatusTarget.framebuffers[0].statusChecks
    .find((status) => status.sequence === invalidBlit.sourceFramebufferStatus.sequence).target = 0xDEAD;
  cases.push([invalidBlitStatusTarget, /blitFramebuffer.*source framebuffer status.*target/i]);

  const mismatchedCubeFace = clone(baseline);
  const cubeTexture = mismatchedCubeFace.textures[1];
  cubeTexture.storage[0].method = "texImage2D";
  cubeTexture.storage[0].target = 0x8515;
  cubeTexture.storage[0].level = 0;
  delete cubeTexture.storage[0].levels;
  const cubeAttachment = mismatchedCubeFace.framebuffers[0].attachments.find((event) => event.resourceRef === cubeTexture.id);
  cubeAttachment.textarget = 0x8516;
  for (const batch of mismatchedCubeFace.drawBatches) {
    const snapshot = batch.framebufferAttachments.attachments.find((event) => event.sequence === cubeAttachment.sequence);
    if (snapshot) snapshot.textarget = 0x8516;
  }
  cases.push([mismatchedCubeFace, /texture attachment.*defining storage/i]);

  const missingRenderbufferStorageShape = clone(baseline);
  delete missingRenderbufferStorageShape.contexts[0].renderbuffers[0].storage[0].arguments;
  cases.push([missingRenderbufferStorageShape, /renderbuffer.*storage.*arguments/i]);

  const missingBlitSnapshot = clone(baseline);
  delete missingBlitSnapshot.stateChanges.find((change) => change.method === "blitFramebuffer").sourceFramebufferAttachments;
  cases.push([missingBlitSnapshot, /blitFramebuffer.*source attachment snapshot/i]);

  for (const [trace, unresolvedPattern] of cases) {
    const validation = runValidator(trace, { withOutput: false });
    assert.equal(validation.result.status, 1, `expected temporal attachment validator failure\nstderr:\n${validation.result.stderr}`);
    assert.equal(validation.status?.status, "partial");
    assert(validation.status.unresolved.some((entry) => unresolvedPattern.test(entry)),
      `expected unresolved reason ${unresolvedPattern}, got ${JSON.stringify(validation.status.unresolved)}`);
  }
}

function testValidatorRejectsUnsafeStatusOutputsWithoutOverwritingTrace() {
  const trace = buildSuccessfulTrace().trace;
  withTempDir("dsra-gpu-output-", (dir) => {
    const tracePath = join(dir, "trace.json");
    const original = `${JSON.stringify(trace, null, 2)}\n`;
    writeFileSync(tracePath, original, "utf8");
    const collision = spawnSync(process.execPath, [validatorPath, tracePath, tracePath], { encoding: "utf8", timeout: 5000 });
    assert.equal(collision.status, 1);
    assert.match(collision.stderr, /unsafe status output/i);
    assert.equal(readFileSync(tracePath, "utf8"), original);

    const symlinkPath = join(dir, "status-link.json");
    symlinkSync(tracePath, symlinkPath);
    const symlink = spawnSync(process.execPath, [validatorPath, tracePath, symlinkPath], { encoding: "utf8", timeout: 5000 });
    assert.equal(symlink.status, 1);
    assert.match(symlink.stderr, /unsafe status output/i);
    assert.equal(readFileSync(tracePath, "utf8"), original);

    const hardlinkPath = join(dir, "status-hardlink.json");
    linkSync(tracePath, hardlinkPath);
    const hardlink = spawnSync(process.execPath, [validatorPath, tracePath, hardlinkPath], { encoding: "utf8", timeout: 5000 });
    assert.equal(hardlink.status, 1);
    assert.match(hardlink.stderr, /unsafe status output/i);
    assert.equal(readFileSync(tracePath, "utf8"), original);
  });
}

const tests = [
  ["probe installs public API", testProbeInstallsPublicApi],
  ["probe captures successful runtime trace", testProbeCapturesSuccessfulRuntimeTrace],
  ["probe captures compile and link failures", testProbeCapturesCompileAndLinkFailures],
  ["probe checks non-default framebuffer at draw", testProbeChecksNonDefaultFramebufferAtDraw],
  ["probe captures layered framebuffer attachments", testProbeCapturesLayeredFramebufferAttachments],
  ["probe captures WebGL2 flow and sampler state", testProbeCapturesWebGl2FlowAndSamplerState],
  ["probe captures core and extension draws", testProbeCapturesCoreAndExtensionDraws],
  ["probe groups RAF callbacks by browser frame", testProbeGroupsAnimationCallbacksByBrowserFrame],
  ["probe bounds resources and marks drops", testProbeBoundsResourcesAndMarksDrops],
  ["probe errors preserve application semantics", testProbeErrorsDoNotChangeApplicationReturnOrThrowSemantics],
  ["probe records app errors and blocks on WebGPU", testProbeRecordsAppErrorsAndBlocksOnWebGpuEncounter],
  ["validator accepts complete trace deterministically", testValidatorAcceptsCompleteRuntimeTraceDeterministically],
  ["validator rejects unsupported uniform blocks", testValidatorRejectsUnsupportedUniformBlocks],
  ["validator fails closed across blocked and partial gates", testValidatorFailsClosedAcrossBlockedAndPartialGates],
  ["validator rejects non-temporal framebuffer snapshots", testValidatorRejectsNonTemporalFramebufferSnapshots],
  ["validator rejects unsafe status outputs", testValidatorRejectsUnsafeStatusOutputsWithoutOverwritingTrace],
];

let failures = 0;
for (const [name, test] of tests) {
  try {
    test();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${name}`);
    console.error(error?.stack || String(error));
  }
}
if (failures) process.exitCode = 1;
