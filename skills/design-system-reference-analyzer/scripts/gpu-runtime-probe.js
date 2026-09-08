(function () {
  "use strict";

  if (globalThis.__DSRA_GPU_PROBE__) return;

  const root = globalThis;
  const LIMITS = Object.freeze({
    contexts: 8,
    shaders: 256,
    programs: 128,
    uniformLocations: 4096,
    uniformWrites: 20000,
    textures: 512,
    samplers: 512,
    framebuffers: 128,
    renderbuffers: 128,
    drawBatches: 10000,
    drawsPerBatch: 1024,
    stateChanges: 20000,
    checkpoints: 512,
    observedGetErrors: 2048,
    probeErrors: 256,
    resourceEvents: 1024,
    shaderSourceBytesPerShader: 1024 * 1024,
    shaderSourceBytesTotal: 8 * 1024 * 1024,
    logCharacters: 64 * 1024,
  });
  const dropped = {
    contexts: 0,
    shaders: 0,
    programs: 0,
    uniformLocations: 0,
    uniformWrites: 0,
    textures: 0,
    samplers: 0,
    framebuffers: 0,
    renderbuffers: 0,
    drawBatches: 0,
    draws: 0,
    stateChanges: 0,
    checkpoints: 0,
    observedGetErrors: 0,
    probeErrors: 0,
    resourceEvents: 0,
    shaderSourceBytes: 0,
    logCharacters: 0,
  };
  const trace = {
    schemaVersion: 1,
    producer: "design-system-reference-analyzer/scripts/gpu-runtime-probe.js",
    producerStatus: "ready",
    startedAt: new Date().toISOString(),
    limits: { ...LIMITS },
    truncated: false,
    dropped,
    webgpuDetected: false,
    contexts: [],
    shaders: [],
    programs: [],
    uniformLocations: [],
    uniformWrites: [],
    textures: [],
    framebuffers: [],
    drawBatches: [],
    stateChanges: [],
    checkpoints: [],
    observedGetErrors: [],
    probeErrors: [],
  };

  const counters = Object.create(null);
  const contextRefs = new WeakMap();
  const contextStates = new WeakMap();
  const shaderRefs = new WeakMap();
  const programRefs = new WeakMap();
  const uniformLocationRefs = new WeakMap();
  const textureRefs = new WeakMap();
  const samplerRefs = new WeakMap();
  const framebufferRefs = new WeakMap();
  const renderbufferRefs = new WeakMap();
  const instrumentedExtensions = new WeakSet();
  const shaderByRef = new Map();
  const programByRef = new Map();
  const uniformLocationByRef = new Map();
  const textureByRef = new Map();
  const samplerByRef = new Map();
  const framebufferByRef = new Map();
  const renderbufferByRef = new Map();
  const shaderCapturedBytes = new Map();
  const orderedContextStates = [];
  let capturedShaderBytes = 0;
  let currentFrame = 0;
  let currentTime = clockNow();
  let lastAnimationFrameTime = null;
  let eventSequence = 0;
  let lastDrawBatch = null;

  function clockNow() {
    try {
      const value = root.performance && root.performance.now();
      return Number.isFinite(value) ? value : Date.now();
    } catch {
      return Date.now();
    }
  }

  function nextId(prefix) {
    counters[prefix] = (counters[prefix] || 0) + 1;
    return `${prefix}-${counters[prefix]}`;
  }

  function nextSequence() {
    eventSequence += 1;
    return eventSequence;
  }

  function isWeakKey(value) {
    return (typeof value === "object" && value !== null) || typeof value === "function";
  }

  function markDropped(kind, amount = 1) {
    trace.truncated = true;
    dropped[kind] = (dropped[kind] || 0) + amount;
  }

  function appendBounded(array, value, kind, limit) {
    if (array.length >= limit) {
      markDropped(kind);
      return false;
    }
    array.push(value);
    return true;
  }

  function shortLog(value) {
    if (typeof value !== "string") return null;
    if (value.length <= LIMITS.logCharacters) return value;
    markDropped("logCharacters", value.length - LIMITS.logCharacters);
    return value.slice(0, LIMITS.logCharacters);
  }

  function recordProbeError(stage, error) {
    const entry = {
      stage,
      name: typeof error?.name === "string" ? error.name.slice(0, 128) : "Error",
      message: typeof error?.message === "string" ? error.message.slice(0, 2048) : String(error).slice(0, 2048),
      frame: currentFrame,
      time: clockNow(),
    };
    appendBounded(trace.probeErrors, entry, "probeErrors", LIMITS.probeErrors);
  }

  function safeNumber(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }

  function glArgument(value) {
    if (value === null) return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "boolean" || typeof value === "string") return value;
    if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(value)) {
      return {
        kind: "typed-array",
        type: Object.prototype.toString.call(value).slice(8, -1),
        byteLength: safeNumber(value.byteLength),
        length: safeNumber(value.length),
      };
    }
    if (typeof ArrayBuffer !== "undefined" && value instanceof ArrayBuffer) {
      return { kind: "array-buffer", byteLength: safeNumber(value.byteLength) };
    }
    return { kind: "object-redacted" };
  }

  function glArguments(values) {
    return Array.from(values, (value, index) => ({ index, value: glArgument(value) }));
  }

  function cleanCondition(value, depth = 0) {
    if (value === null || typeof value === "boolean" || typeof value === "string") return value;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (depth >= 4) return null;
    if (Array.isArray(value)) return value.slice(0, 32).map((item) => cleanCondition(item, depth + 1));
    if (!value || Object.prototype.toString.call(value) !== "[object Object]") return null;
    const out = {};
    for (const key of Object.keys(value).sort().slice(0, 32)) {
      const cleaned = cleanCondition(value[key], depth + 1);
      if (cleaned !== undefined) out[key.slice(0, 128)] = cleaned;
    }
    return out;
  }

  function utf8ByteLength(value) {
    let bytes = 0;
    for (let index = 0; index < value.length; index += 1) {
      const code = value.charCodeAt(index);
      if (code < 0x80) bytes += 1;
      else if (code < 0x800) bytes += 2;
      else if (code >= 0xD800 && code <= 0xDBFF && index + 1 < value.length && value.charCodeAt(index + 1) >= 0xDC00 && value.charCodeAt(index + 1) <= 0xDFFF) {
        bytes += 4;
        index += 1;
      } else bytes += 3;
    }
    return bytes;
  }

  function wrapMethod(gl, state, name, afterCall) {
    const original = gl?.[name];
    if (typeof original !== "function") return;
    const wrapped = function (...args) {
      let result;
      try {
        result = original.apply(this, args);
      } catch (error) {
        throw error;
      }
      try {
        afterCall(args, result);
      } catch (error) {
        recordProbeError(`${state.contextRef}.${name}`, error);
      }
      return result;
    };
    try {
      Object.defineProperty(gl, name, { configurable: true, writable: true, value: wrapped });
    } catch (error) {
      recordProbeError(`${state.contextRef}.wrap.${name}`, error);
    }
  }

  function canvasSelector(canvas, fallback) {
    if (canvas && typeof canvas.id === "string" && canvas.id) return `canvas#${canvas.id.slice(0, 256)}`;
    return fallback;
  }

  const CONTEXT_ATTRIBUTE_KEYS = [
    "alpha", "antialias", "depth", "desynchronized", "failIfMajorPerformanceCaveat",
    "powerPreference", "premultipliedAlpha", "preserveDrawingBuffer", "stencil", "xrCompatible",
  ];

  function contextAttributes(value) {
    const out = {};
    if (!value || typeof value !== "object") return out;
    for (const key of CONTEXT_ATTRIBUTE_KEYS) {
      const item = value[key];
      if (typeof item === "boolean" || typeof item === "string" || (typeof item === "number" && Number.isFinite(item))) out[key] = item;
    }
    return out;
  }

  function updateContextDimensions(state) {
    const gl = state.gl;
    const canvas = state.canvas;
    state.record.backingSize = {
      width: safeNumber(gl?.drawingBufferWidth) ?? safeNumber(canvas?.width),
      height: safeNumber(gl?.drawingBufferHeight) ?? safeNumber(canvas?.height),
    };
    state.record.clientSize = {
      width: safeNumber(canvas?.clientWidth),
      height: safeNumber(canvas?.clientHeight),
    };
    state.record.dpr = safeNumber(root.devicePixelRatio) ?? 1;
  }

  function ensureShader(state, shader, type) {
    if (!isWeakKey(shader)) return null;
    if (shaderRefs.has(shader)) return shaderRefs.get(shader);
    const id = nextId("shader");
    shaderRefs.set(shader, id);
    const record = {
      id,
      contextRef: state.contextRef,
      type: type === state.gl.VERTEX_SHADER ? "vertex" : type === state.gl.FRAGMENT_SHADER ? "fragment" : safeNumber(type),
      source: null,
      sourceBytes: null,
      sourceComplete: false,
      compile: { called: false, status: null, log: null },
    };
    if (appendBounded(trace.shaders, record, "shaders", LIMITS.shaders)) shaderByRef.set(id, record);
    return id;
  }

  function setShaderSource(shaderRef, source) {
    const record = shaderByRef.get(shaderRef);
    if (!record) return;
    const previousBytes = shaderCapturedBytes.get(shaderRef) || 0;
    capturedShaderBytes -= previousBytes;
    shaderCapturedBytes.delete(shaderRef);
    if (typeof source !== "string") {
      record.source = null;
      record.sourceBytes = null;
      record.sourceComplete = false;
      markDropped("shaderSourceBytes");
      return;
    }
    const bytes = utf8ByteLength(source);
    record.sourceBytes = bytes;
    if (bytes > LIMITS.shaderSourceBytesPerShader || capturedShaderBytes + bytes > LIMITS.shaderSourceBytesTotal) {
      record.source = null;
      record.sourceComplete = false;
      markDropped("shaderSourceBytes", bytes);
      return;
    }
    record.source = source;
    record.sourceComplete = true;
    capturedShaderBytes += bytes;
    shaderCapturedBytes.set(shaderRef, bytes);
  }

  function ensureProgram(state, program) {
    if (!isWeakKey(program)) return null;
    if (programRefs.has(program)) return programRefs.get(program);
    const id = nextId("program");
    programRefs.set(program, id);
    const record = {
      id,
      contextRef: state.contextRef,
      attachedShaderRefs: [],
      link: { called: false, status: null, log: null },
      used: false,
    };
    if (appendBounded(trace.programs, record, "programs", LIMITS.programs)) programByRef.set(id, record);
    return id;
  }

  function ensureUniformLocation(state, location, program, name) {
    if (!isWeakKey(location)) return null;
    if (uniformLocationRefs.has(location)) return uniformLocationRefs.get(location);
    const id = nextId("uniform-location");
    uniformLocationRefs.set(location, id);
    const record = {
      id,
      contextRef: state.contextRef,
      programRef: ensureProgram(state, program),
      name: typeof name === "string" ? name.slice(0, 512) : null,
    };
    if (appendBounded(trace.uniformLocations, record, "uniformLocations", LIMITS.uniformLocations)) uniformLocationByRef.set(id, record);
    return id;
  }

  function ensureTexture(state, texture) {
    if (!isWeakKey(texture)) return null;
    if (textureRefs.has(texture)) return textureRefs.get(texture);
    const id = nextId("texture");
    textureRefs.set(texture, id);
    const record = { id, contextRef: state.contextRef, uploads: [], storage: [], parameters: [] };
    if (appendBounded(trace.textures, record, "textures", LIMITS.textures)) textureByRef.set(id, record);
    return id;
  }

  function ensureSampler(state, sampler) {
    if (!isWeakKey(sampler)) return null;
    if (samplerRefs.has(sampler)) return samplerRefs.get(sampler);
    const id = nextId("sampler");
    samplerRefs.set(sampler, id);
    const record = {
      id,
      contextRef: state.contextRef,
      createdSequence: nextSequence(),
      deleted: false,
      deleteSequence: null,
      parameters: [],
    };
    if (samplerByRef.size >= LIMITS.samplers) markDropped("samplers");
    else {
      samplerByRef.set(id, { record, effectiveParameters: new Map() });
      state.record.samplers.push(record);
    }
    return id;
  }

  function ensureFramebuffer(state, framebuffer) {
    if (!isWeakKey(framebuffer)) return null;
    if (framebufferRefs.has(framebuffer)) return framebufferRefs.get(framebuffer);
    const id = nextId("framebuffer");
    framebufferRefs.set(framebuffer, id);
    const record = { id, contextRef: state.contextRef, attachments: [], statusChecks: [] };
    if (appendBounded(trace.framebuffers, record, "framebuffers", LIMITS.framebuffers)) framebufferByRef.set(id, record);
    return id;
  }

  function ensureRenderbuffer(state, renderbuffer) {
    if (!isWeakKey(renderbuffer)) return null;
    if (renderbufferRefs.has(renderbuffer)) return renderbufferRefs.get(renderbuffer);
    const id = nextId("renderbuffer");
    renderbufferRefs.set(renderbuffer, id);
    const record = { id, contextRef: state.contextRef, storage: [] };
    if (renderbufferByRef.size >= LIMITS.renderbuffers) markDropped("renderbuffers");
    else {
      renderbufferByRef.set(id, record);
      state.record.renderbuffers.push(record);
    }
    return id;
  }

  function breakDrawBatch() {
    lastDrawBatch = null;
  }

  function recordStateChange(state, method, args, details = {}) {
    breakDrawBatch();
    const record = {
      contextRef: state.contextRef,
      method,
      arguments: glArguments(args),
      ...details,
      sequence: nextSequence(),
      frame: currentFrame,
      time: clockNow(),
    };
    appendBounded(trace.stateChanges, record, "stateChanges", LIMITS.stateChanges);
    return record;
  }

  function incrementFlowCall(state, name) {
    state.record.flowCalls[name] += 1;
  }

  function textureBindingMap(state, unit) {
    if (!state.textureBindings.has(unit)) state.textureBindings.set(unit, new Map());
    return state.textureBindings.get(unit);
  }

  function boundTextureRef(state, target) {
    return textureBindingMap(state, state.activeTextureUnit).get(target) || null;
  }

  function appendResourceEvent(array, event) {
    if (array.length >= LIMITS.resourceEvents) {
      markDropped("resourceEvents");
      return;
    }
    array.push(event);
  }

  function recordTextureEvent(state, method, args, bucket) {
    breakDrawBatch();
    const target = args[0];
    const textureRef = boundTextureRef(state, target);
    const texture = textureByRef.get(textureRef);
    if (!texture) return;
    const event = {
      method,
      target: safeNumber(target),
      unit: state.activeTextureUnit,
      arguments: glArguments(args),
      sequence: nextSequence(),
      frame: currentFrame,
      time: clockNow(),
    };
    if (bucket === "uploads") {
      event.level = safeNumber(args[1]);
      if (["texImage3D", "compressedTexImage3D"].includes(method)) event.depth = safeNumber(args[5]);
    } else if (bucket === "storage") {
      event.levels = safeNumber(args[1]);
      if (method === "texStorage3D") event.depth = safeNumber(args[5]);
    }
    if (bucket === "parameters") {
      event.pname = safeNumber(args[1]);
      event.value = safeNumber(args[2]);
    }
    appendResourceEvent(texture[bucket], event);
  }

  function boundFramebufferRef(state, target) {
    if (target === state.gl.READ_FRAMEBUFFER) return state.readFramebufferRef;
    return state.drawFramebufferRef;
  }

  function appendFramebufferStatus(state, target, status, source) {
    const framebufferRef = boundFramebufferRef(state, target);
    const framebuffer = framebufferByRef.get(framebufferRef);
    const check = {
      contextRef: state.contextRef,
      framebufferRef,
      target: safeNumber(target),
      checked: true,
      status: safeNumber(status),
      complete: typeof status === "number" ? status === state.gl.FRAMEBUFFER_COMPLETE : null,
      source,
      sequence: nextSequence(),
      frame: currentFrame,
      time: clockNow(),
    };
    if (framebuffer) appendResourceEvent(framebuffer.statusChecks, check);
    return check;
  }

  function defaultFramebufferStatus(state, target, source) {
    return {
      contextRef: state.contextRef,
      framebufferRef: null,
      target: safeNumber(target),
      checked: true,
      status: "default",
      complete: true,
      source,
      sequence: 0,
    };
  }

  function checkDrawFramebuffer(state) {
    const target = typeof state.gl.DRAW_FRAMEBUFFER === "number" ? state.gl.DRAW_FRAMEBUFFER : state.gl.FRAMEBUFFER;
    if (!state.drawFramebufferRef) return defaultFramebufferStatus(state, target, "probe-draw");
    if (typeof state.native.checkFramebufferStatus !== "function") return { checked: false, complete: null, status: null };
    try {
      const status = state.native.checkFramebufferStatus.call(state.gl, target);
      return appendFramebufferStatus(state, target, status, "probe-draw");
    } catch (error) {
      recordProbeError(`${state.contextRef}.draw.checkFramebufferStatus`, error);
      return { checked: false, complete: null, status: null };
    }
  }

  function textureUnitsSnapshot(state) {
    return [...state.textureBindings.entries()]
      .sort(([left], [right]) => left - right)
      .map(([unit, bindings]) => ({
        unit,
        bindings: [...bindings.entries()]
          .filter(([, textureRef]) => Boolean(textureRef))
          .sort(([left], [right]) => left - right)
          .map(([target, textureRef]) => ({ target, textureRef })),
      }))
      .filter((entry) => entry.bindings.length > 0);
  }

  function framebufferKey(framebufferRef) {
    return framebufferRef || "default";
  }

  function numericList(value) {
    if (!Array.isArray(value) && !(typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(value))) return null;
    return Array.from(value, safeNumber);
  }

  function effectiveDrawBuffers(state) {
    const explicit = state.drawBuffersByFramebuffer.get(framebufferKey(state.drawFramebufferRef));
    const fallback = state.drawFramebufferRef ? state.gl.COLOR_ATTACHMENT0 : state.gl.BACK;
    return {
      framebufferRef: state.drawFramebufferRef,
      source: explicit ? "explicit" : "implicit",
      values: explicit ? [...explicit.values] : (typeof fallback === "number" ? [fallback] : []),
      sequence: explicit?.sequence || 0,
    };
  }

  function effectiveReadBuffer(state) {
    const explicit = state.readBuffersByFramebuffer.get(framebufferKey(state.readFramebufferRef));
    const fallback = state.readFramebufferRef ? state.gl.COLOR_ATTACHMENT0 : state.gl.BACK;
    return {
      framebufferRef: state.readFramebufferRef,
      source: explicit ? "explicit" : "implicit",
      value: explicit ? explicit.value : safeNumber(fallback),
      sequence: explicit?.sequence || 0,
    };
  }

  function framebufferAttachmentSnapshot(framebufferRef) {
    // ponytail: replay is bounded by resourceEvents; cache per-FBO state only if that ceiling grows.
    const events = framebufferByRef.get(framebufferRef)?.attachments || [];
    const effective = new Map();
    let latestMutationSequence = 0;
    for (const event of events) {
      if (Number.isSafeInteger(event.sequence)) latestMutationSequence = Math.max(latestMutationSequence, event.sequence);
      if (event.resourceRef) effective.set(event.attachment, event);
      else effective.delete(event.attachment);
    }
    return {
      framebufferRef,
      latestMutationSequence,
      attachments: [...effective.values()]
        .sort((left, right) => left.attachment - right.attachment)
        .map((event) => ({
          method: event.method,
          attachment: event.attachment,
          resourceType: event.resourceType,
          resourceRef: event.resourceRef,
          textarget: event.textarget,
          level: event.level,
          layer: event.layer,
          sequence: event.sequence,
        })),
    };
  }

  function effectiveTextureParameters(textureRef) {
    const parameters = new Map();
    for (const event of textureByRef.get(textureRef)?.parameters || []) {
      if (typeof event.pname === "number" && typeof event.value === "number") parameters.set(event.pname, event.value);
    }
    return Object.fromEntries([...parameters.entries()].sort(([left], [right]) => left - right));
  }

  function samplerUnitsSnapshot(state) {
    const units = new Set([...state.textureBindings.keys(), ...state.samplerBindings.keys()]);
    return [...units].sort((left, right) => left - right).map((unit) => {
      const binding = state.samplerBindings.get(unit);
      const sampler = samplerByRef.get(binding?.samplerRef);
      if (sampler) {
        return {
          unit,
          source: "sampler-object",
          samplerRef: sampler.record.id,
          bindSequence: binding.sequence,
          deleted: sampler.record.deleted,
          parameters: Object.fromEntries([...sampler.effectiveParameters.entries()].sort(([left], [right]) => left - right)),
          textureParameters: [],
        };
      }
      const textures = [...(state.textureBindings.get(unit) || new Map()).entries()]
        .filter(([, textureRef]) => Boolean(textureRef))
        .sort(([left], [right]) => left - right)
        .map(([target, textureRef]) => ({ target, textureRef, parameters: effectiveTextureParameters(textureRef) }));
      return {
        unit,
        source: "texture",
        samplerRef: null,
        bindSequence: binding?.sequence || 0,
        deleted: false,
        parameters: {},
        textureParameters: textures,
      };
    });
  }

  function stateSnapshot(state) {
    return {
      viewport: state.renderState.viewport ? [...state.renderState.viewport] : null,
      scissor: state.renderState.scissor ? [...state.renderState.scissor] : null,
      clearColor: state.renderState.clearColor ? [...state.renderState.clearColor] : null,
      blend: state.renderState.blend ? [...state.renderState.blend] : null,
      depthFunc: state.renderState.depthFunc ?? null,
      cullFace: state.renderState.cullFace ?? null,
      capabilities: Object.fromEntries([...state.renderState.capabilities.entries()].sort(([left], [right]) => left - right)),
    };
  }

  function drawDetails(method, args) {
    const details = { method, arguments: glArguments(args) };
    if (method.startsWith("multiDraw")) {
      details.mode = safeNumber(args[0]);
      details.subdrawCount = safeNumber(args.at(-1));
    } else if (method === "drawRangeElements") {
      details.mode = safeNumber(args[0]);
      details.start = safeNumber(args[1]);
      details.end = safeNumber(args[2]);
      details.count = safeNumber(args[3]);
      details.type = safeNumber(args[4]);
      details.offset = safeNumber(args[5]);
    } else if (method.startsWith("drawArrays")) {
      details.mode = safeNumber(args[0]);
      details.first = safeNumber(args[1]);
      details.count = safeNumber(args[2]);
      if (method.includes("Instanced")) details.instanceCount = safeNumber(args[3]);
    } else {
      details.mode = safeNumber(args[0]);
      details.count = safeNumber(args[1]);
      details.type = safeNumber(args[2]);
      details.offset = safeNumber(args[3]);
      if (method.includes("Instanced")) details.instanceCount = safeNumber(args[4]);
    }
    return details;
  }

  function recordDraw(state, method, args) {
    const framebufferStatus = checkDrawFramebuffer(state);
    const key = `${currentFrame}\u0000${state.contextRef}\u0000${state.currentProgramRef || "default"}\u0000${state.drawFramebufferRef || "default"}`;
    let batch = lastDrawBatch && lastDrawBatch.key === key ? lastDrawBatch.record : null;
    if (!batch) {
      batch = {
        id: nextId("draw-batch"),
        contextRef: state.contextRef,
        frame: currentFrame,
        time: clockNow(),
        sequence: nextSequence(),
        programRef: state.currentProgramRef,
        framebufferRef: state.drawFramebufferRef,
        framebufferStatus,
        framebufferStatuses: [],
        framebufferAttachments: framebufferAttachmentSnapshot(state.drawFramebufferRef),
        drawBuffers: effectiveDrawBuffers(state),
        readBuffer: effectiveReadBuffer(state),
        textureUnits: textureUnitsSnapshot(state),
        samplerUnits: samplerUnitsSnapshot(state),
        state: stateSnapshot(state),
        drawCount: 0,
        draws: [],
      };
      if (!appendBounded(trace.drawBatches, batch, "drawBatches", LIMITS.drawBatches)) {
        lastDrawBatch = null;
        return;
      }
      lastDrawBatch = { key, record: batch };
    }
    const details = drawDetails(method, args);
    batch.drawCount += Number.isInteger(details.subdrawCount) && details.subdrawCount > 0 ? details.subdrawCount : 1;
    if (batch.draws.length >= LIMITS.drawsPerBatch) markDropped("draws");
    else {
      batch.draws.push(details);
      batch.framebufferStatuses.push(framebufferStatus);
    }
  }

  function recordDrawBuffers(state, method, args) {
    incrementFlowCall(state, "drawBuffers");
    const values = numericList(args[0]);
    const record = recordStateChange(state, method, args, {
      framebufferRef: state.drawFramebufferRef,
      drawBuffers: values,
    });
    state.drawBuffersByFramebuffer.set(framebufferKey(state.drawFramebufferRef), {
      values: values || [],
      sequence: record.sequence,
    });
  }

  function recordReadBuffer(state, args) {
    incrementFlowCall(state, "readBuffer");
    const value = safeNumber(args[0]);
    const record = recordStateChange(state, "readBuffer", args, {
      framebufferRef: state.readFramebufferRef,
      readBuffer: value,
    });
    state.readBuffersByFramebuffer.set(framebufferKey(state.readFramebufferRef), { value, sequence: record.sequence });
  }

  function checkFramebufferForTarget(state, target, source) {
    const framebufferRef = boundFramebufferRef(state, target);
    if (!framebufferRef) return defaultFramebufferStatus(state, target, source);
    if (typeof state.native.checkFramebufferStatus !== "function") return { checked: false, complete: null, status: null };
    try {
      const status = state.native.checkFramebufferStatus.call(state.gl, target);
      return appendFramebufferStatus(state, target, status, source);
    } catch (error) {
      recordProbeError(`${state.contextRef}.${source}.checkFramebufferStatus`, error);
      return { checked: false, complete: null, status: null };
    }
  }

  function recordBlitFramebuffer(state, args) {
    incrementFlowCall(state, "blitFramebuffer");
    const sourceTarget = typeof state.gl.READ_FRAMEBUFFER === "number" ? state.gl.READ_FRAMEBUFFER : state.gl.FRAMEBUFFER;
    const destinationTarget = typeof state.gl.DRAW_FRAMEBUFFER === "number" ? state.gl.DRAW_FRAMEBUFFER : state.gl.FRAMEBUFFER;
    recordStateChange(state, "blitFramebuffer", args, {
      sourceFramebufferRef: state.readFramebufferRef,
      destinationFramebufferRef: state.drawFramebufferRef,
      sourceRect: args.slice(0, 4).map(safeNumber),
      destinationRect: args.slice(4, 8).map(safeNumber),
      mask: safeNumber(args[8]),
      filter: safeNumber(args[9]),
      sourceReadBuffer: effectiveReadBuffer(state),
      destinationDrawBuffers: effectiveDrawBuffers(state),
      sourceFramebufferAttachments: framebufferAttachmentSnapshot(state.readFramebufferRef),
      destinationFramebufferAttachments: framebufferAttachmentSnapshot(state.drawFramebufferRef),
      sourceFramebufferStatus: checkFramebufferForTarget(state, sourceTarget, "probe-blit-read"),
      destinationFramebufferStatus: checkFramebufferForTarget(state, destinationTarget, "probe-blit-draw"),
    });
  }

  function instrumentExtension(state, name, extension) {
    if (!isWeakKey(extension) || instrumentedExtensions.has(extension)) return;
    instrumentedExtensions.add(extension);
    const normalized = typeof name === "string" ? name.toUpperCase() : "";
    if (normalized === "ANGLE_INSTANCED_ARRAYS") {
      for (const method of ["drawArraysInstancedANGLE", "drawElementsInstancedANGLE"]) {
        wrapMethod(extension, state, method, (args) => recordDraw(state, method, args));
      }
      wrapMethod(extension, state, "vertexAttribDivisorANGLE", (args) => recordStateChange(state, "vertexAttribDivisorANGLE", args));
      return;
    }
    if (normalized === "WEBGL_MULTI_DRAW") {
      for (const method of [
        "multiDrawArraysWEBGL", "multiDrawElementsWEBGL", "multiDrawArraysInstancedWEBGL", "multiDrawElementsInstancedWEBGL",
      ]) wrapMethod(extension, state, method, (args) => recordDraw(state, method, args));
      return;
    }
    if (normalized === "WEBGL_DRAW_BUFFERS") {
      wrapMethod(extension, state, "drawBuffersWEBGL", (args) => recordDrawBuffers(state, "drawBuffersWEBGL", args));
      return;
    }
    if (/(?:DRAW|INSTANCED)/.test(normalized)) {
      trace.producerStatus = "blocked";
      markDropped("draws");
    }
  }

  function recordGetError(state, error, source, checkpointRef = null, label = null) {
    appendBounded(trace.observedGetErrors, {
      contextRef: state.contextRef,
      source,
      checkpointRef,
      label,
      error: safeNumber(error),
      ok: typeof error === "number" ? error === state.gl.NO_ERROR : null,
      frame: currentFrame,
      time: clockNow(),
    }, "observedGetErrors", LIMITS.observedGetErrors);
  }

  function installContextWrappers(state) {
    const { gl } = state;
    state.native = {
      getShaderParameter: gl.getShaderParameter,
      getShaderInfoLog: gl.getShaderInfoLog,
      getProgramParameter: gl.getProgramParameter,
      getProgramInfoLog: gl.getProgramInfoLog,
      checkFramebufferStatus: gl.checkFramebufferStatus,
      getError: gl.getError,
    };

    wrapMethod(gl, state, "getExtension", ([name], extension) => instrumentExtension(state, name, extension));

    wrapMethod(gl, state, "createShader", ([type], shader) => ensureShader(state, shader, type));
    wrapMethod(gl, state, "shaderSource", ([shader, source]) => setShaderSource(ensureShader(state, shader, shader?.type), source));
    wrapMethod(gl, state, "compileShader", ([shader]) => {
      const record = shaderByRef.get(ensureShader(state, shader, shader?.type));
      if (!record) return;
      record.compile.called = true;
      record.compile.status = typeof state.native.getShaderParameter === "function"
        ? Boolean(state.native.getShaderParameter.call(gl, shader, gl.COMPILE_STATUS))
        : null;
      record.compile.log = typeof state.native.getShaderInfoLog === "function" ? shortLog(state.native.getShaderInfoLog.call(gl, shader)) : null;
    });
    wrapMethod(gl, state, "createProgram", (args, program) => ensureProgram(state, program));
    wrapMethod(gl, state, "attachShader", ([program, shader]) => {
      const programRecord = programByRef.get(ensureProgram(state, program));
      const shaderRef = ensureShader(state, shader, shader?.type);
      if (programRecord && shaderRef && !programRecord.attachedShaderRefs.includes(shaderRef)) programRecord.attachedShaderRefs.push(shaderRef);
    });
    wrapMethod(gl, state, "linkProgram", ([program]) => {
      const record = programByRef.get(ensureProgram(state, program));
      if (!record) return;
      record.link.called = true;
      record.link.status = typeof state.native.getProgramParameter === "function"
        ? Boolean(state.native.getProgramParameter.call(gl, program, gl.LINK_STATUS))
        : null;
      record.link.log = typeof state.native.getProgramInfoLog === "function" ? shortLog(state.native.getProgramInfoLog.call(gl, program)) : null;
    });
    wrapMethod(gl, state, "useProgram", ([program]) => {
      state.currentProgramRef = program ? ensureProgram(state, program) : null;
      const record = programByRef.get(state.currentProgramRef);
      if (record) record.used = true;
      recordStateChange(state, "useProgram", [state.currentProgramRef]);
    });
    wrapMethod(gl, state, "getUniformLocation", ([program, name], location) => ensureUniformLocation(state, location, program, name));

    const uniformMethods = [
      "uniform1f", "uniform2f", "uniform3f", "uniform4f", "uniform1i", "uniform2i", "uniform3i", "uniform4i",
      "uniform1ui", "uniform2ui", "uniform3ui", "uniform4ui", "uniform1fv", "uniform2fv", "uniform3fv", "uniform4fv",
      "uniform1iv", "uniform2iv", "uniform3iv", "uniform4iv", "uniform1uiv", "uniform2uiv", "uniform3uiv", "uniform4uiv",
      "uniformMatrix2fv", "uniformMatrix3fv", "uniformMatrix4fv", "uniformMatrix2x3fv", "uniformMatrix2x4fv",
      "uniformMatrix3x2fv", "uniformMatrix3x4fv", "uniformMatrix4x2fv", "uniformMatrix4x3fv",
    ];
    for (const method of uniformMethods) {
      wrapMethod(gl, state, method, ([location, ...values]) => {
        breakDrawBatch();
        const locationRef = isWeakKey(location) ? uniformLocationRefs.get(location) || null : null;
        appendBounded(trace.uniformWrites, {
          contextRef: state.contextRef,
          programRef: state.currentProgramRef,
          locationRef,
          name: uniformLocationByRef.get(locationRef)?.name || null,
          method,
          values: values.map(glArgument),
          sequence: nextSequence(),
          frame: currentFrame,
          time: clockNow(),
        }, "uniformWrites", LIMITS.uniformWrites);
      });
    }

    wrapMethod(gl, state, "createTexture", (args, texture) => ensureTexture(state, texture));
    wrapMethod(gl, state, "activeTexture", ([unit]) => {
      const index = typeof unit === "number" && typeof gl.TEXTURE0 === "number" ? unit - gl.TEXTURE0 : null;
      state.activeTextureUnit = Number.isInteger(index) && index >= 0 ? index : safeNumber(unit);
      recordStateChange(state, "activeTexture", [unit]);
    });
    wrapMethod(gl, state, "bindTexture", ([target, texture]) => {
      textureBindingMap(state, state.activeTextureUnit).set(target, texture ? ensureTexture(state, texture) : null);
      recordStateChange(state, "bindTexture", [target, texture ? textureRefs.get(texture) : null]);
    });
    for (const method of [
      "texImage2D", "texSubImage2D", "texImage3D", "texSubImage3D", "compressedTexImage2D", "compressedTexSubImage2D",
      "compressedTexImage3D", "compressedTexSubImage3D", "copyTexImage2D", "copyTexSubImage2D", "copyTexSubImage3D",
    ]) wrapMethod(gl, state, method, (args) => recordTextureEvent(state, method, args, "uploads"));
    for (const method of ["texStorage2D", "texStorage3D"]) wrapMethod(gl, state, method, (args) => recordTextureEvent(state, method, args, "storage"));
    for (const method of ["texParameteri", "texParameterf"]) wrapMethod(gl, state, method, (args) => recordTextureEvent(state, method, args, "parameters"));

    wrapMethod(gl, state, "createSampler", (args, sampler) => {
      incrementFlowCall(state, "createSampler");
      ensureSampler(state, sampler);
    });
    wrapMethod(gl, state, "deleteSampler", ([sampler]) => {
      incrementFlowCall(state, "deleteSampler");
      const samplerRef = ensureSampler(state, sampler);
      const change = recordStateChange(state, "deleteSampler", [sampler], { samplerRef });
      const samplerState = samplerByRef.get(samplerRef);
      if (samplerState) {
        samplerState.record.deleted = true;
        samplerState.record.deleteSequence = change.sequence;
      }
    });
    wrapMethod(gl, state, "bindSampler", ([unit, sampler]) => {
      incrementFlowCall(state, "bindSampler");
      const samplerRef = sampler ? ensureSampler(state, sampler) : null;
      const change = recordStateChange(state, "bindSampler", [unit, sampler], {
        unit: safeNumber(unit),
        samplerRef,
      });
      if (Number.isInteger(unit) && unit >= 0) state.samplerBindings.set(unit, { samplerRef, sequence: change.sequence });
    });
    for (const method of ["samplerParameteri", "samplerParameterf"]) {
      wrapMethod(gl, state, method, ([sampler, pname, value]) => {
        incrementFlowCall(state, "samplerParameter");
        const samplerRef = ensureSampler(state, sampler);
        const change = recordStateChange(state, method, [sampler, pname, value], {
          samplerRef,
          pname: safeNumber(pname),
          value: safeNumber(value),
        });
        const samplerState = samplerByRef.get(samplerRef);
        if (!samplerState) return;
        samplerState.effectiveParameters.set(pname, value);
        appendResourceEvent(samplerState.record.parameters, {
          method,
          pname: safeNumber(pname),
          value: safeNumber(value),
          sequence: change.sequence,
          frame: currentFrame,
          time: clockNow(),
        });
      });
    }

    wrapMethod(gl, state, "createFramebuffer", (args, framebuffer) => ensureFramebuffer(state, framebuffer));
    wrapMethod(gl, state, "bindFramebuffer", ([target, framebuffer]) => {
      const ref = framebuffer ? ensureFramebuffer(state, framebuffer) : null;
      if (target === gl.READ_FRAMEBUFFER) state.readFramebufferRef = ref;
      else if (target === gl.DRAW_FRAMEBUFFER) state.drawFramebufferRef = ref;
      else {
        state.readFramebufferRef = ref;
        state.drawFramebufferRef = ref;
      }
      recordStateChange(state, "bindFramebuffer", [target, ref]);
    });
    wrapMethod(gl, state, "drawBuffers", (args) => recordDrawBuffers(state, "drawBuffers", args));
    wrapMethod(gl, state, "readBuffer", (args) => recordReadBuffer(state, args));
    wrapMethod(gl, state, "blitFramebuffer", (args) => recordBlitFramebuffer(state, args));
    for (const method of ["framebufferTexture2D", "framebufferTextureLayer"]) {
      wrapMethod(gl, state, method, (args) => {
        incrementFlowCall(state, "framebufferAttachment");
        breakDrawBatch();
        const framebuffer = framebufferByRef.get(boundFramebufferRef(state, args[0]));
        if (!framebuffer) return;
        const textureIndex = method === "framebufferTextureLayer" ? 2 : 3;
        const levelIndex = method === "framebufferTextureLayer" ? 3 : 4;
        const textureRef = args[textureIndex] ? ensureTexture(state, args[textureIndex]) : null;
        appendResourceEvent(framebuffer.attachments, {
          method,
          attachment: safeNumber(args[1]),
          resourceType: "texture",
          resourceRef: textureRef,
          detached: textureRef === null,
          textarget: method === "framebufferTexture2D" ? safeNumber(args[2]) : null,
          level: safeNumber(args[levelIndex]),
          layer: method === "framebufferTextureLayer" ? safeNumber(args[4]) : null,
          sequence: nextSequence(),
          frame: currentFrame,
          time: clockNow(),
        });
      });
    }
    wrapMethod(gl, state, "checkFramebufferStatus", ([target], status) => appendFramebufferStatus(state, target, status, "app"));
    wrapMethod(gl, state, "createRenderbuffer", (args, renderbuffer) => ensureRenderbuffer(state, renderbuffer));
    wrapMethod(gl, state, "bindRenderbuffer", ([target, renderbuffer]) => {
      state.boundRenderbufferRef = renderbuffer ? ensureRenderbuffer(state, renderbuffer) : null;
      recordStateChange(state, "bindRenderbuffer", [target, state.boundRenderbufferRef]);
    });
    wrapMethod(gl, state, "renderbufferStorage", (args) => {
      breakDrawBatch();
      const renderbuffer = renderbufferByRef.get(state.boundRenderbufferRef);
      if (renderbuffer) appendResourceEvent(renderbuffer.storage, {
        method: "renderbufferStorage",
        arguments: glArguments(args),
        sequence: nextSequence(),
        frame: currentFrame,
        time: clockNow(),
      });
    });
    wrapMethod(gl, state, "renderbufferStorageMultisample", (args) => {
      breakDrawBatch();
      const renderbuffer = renderbufferByRef.get(state.boundRenderbufferRef);
      if (renderbuffer) appendResourceEvent(renderbuffer.storage, {
        method: "renderbufferStorageMultisample",
        arguments: glArguments(args),
        sequence: nextSequence(),
        frame: currentFrame,
        time: clockNow(),
      });
    });
    wrapMethod(gl, state, "framebufferRenderbuffer", (args) => {
      incrementFlowCall(state, "framebufferAttachment");
      breakDrawBatch();
      const framebuffer = framebufferByRef.get(boundFramebufferRef(state, args[0]));
      if (!framebuffer) return;
      const renderbufferRef = args[3] ? ensureRenderbuffer(state, args[3]) : null;
      appendResourceEvent(framebuffer.attachments, {
        method: "framebufferRenderbuffer",
        attachment: safeNumber(args[1]),
        resourceType: "renderbuffer",
        resourceRef: renderbufferRef,
        detached: renderbufferRef === null,
        storage: renderbufferByRef.get(renderbufferRef)?.storage || [],
        sequence: nextSequence(),
        frame: currentFrame,
        time: clockNow(),
      });
    });

    const stateMethods = [
      "viewport", "scissor", "enable", "disable", "blendFunc", "blendFuncSeparate", "blendEquation", "blendEquationSeparate",
      "depthFunc", "depthMask", "cullFace", "frontFace", "clearColor", "colorMask", "clearDepth", "clearStencil", "clear",
      "polygonOffset",
    ];
    for (const method of stateMethods) {
      wrapMethod(gl, state, method, (args) => {
        if (method === "viewport" || method === "scissor" || method === "clearColor") state.renderState[method] = args.slice(0, 4).map(safeNumber);
        if (method === "blendFunc" || method === "blendFuncSeparate" || method === "blendEquation" || method === "blendEquationSeparate") state.renderState.blend = args.map(safeNumber);
        if (method === "depthFunc") state.renderState.depthFunc = safeNumber(args[0]);
        if (method === "cullFace") state.renderState.cullFace = safeNumber(args[0]);
        if (method === "enable" || method === "disable") state.renderState.capabilities.set(safeNumber(args[0]), method === "enable");
        recordStateChange(state, method, args);
      });
    }

    for (const method of ["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced", "drawRangeElements"]) {
      wrapMethod(gl, state, method, (args) => recordDraw(state, method, args));
    }
    wrapMethod(gl, state, "getError", (args, error) => recordGetError(state, error, "app"));
  }

  function instrumentContext(gl, canvas, api, requestedAttributes) {
    if (!isWeakKey(gl)) return;
    if (contextRefs.has(gl)) return;
    const contextRef = nextId("context");
    contextRefs.set(gl, contextRef);
    if (trace.contexts.length >= LIMITS.contexts) {
      markDropped("contexts");
      return;
    }
    const record = {
      id: contextRef,
      api,
      canvasSelector: canvasSelector(canvas, `canvas:${contextRef}`),
      requestedAttributes: contextAttributes(requestedAttributes),
      actualAttributes: {},
      backingSize: { width: null, height: null },
      clientSize: { width: null, height: null },
      dpr: 1,
      samplers: [],
      renderbuffers: [],
      flowCalls: {
        framebufferAttachment: 0,
        drawBuffers: 0,
        readBuffer: 0,
        blitFramebuffer: 0,
        createSampler: 0,
        deleteSampler: 0,
        bindSampler: 0,
        samplerParameter: 0,
      },
    };
    const state = {
      gl,
      canvas,
      contextRef,
      record,
      native: {},
      currentProgramRef: null,
      activeTextureUnit: 0,
      textureBindings: new Map(),
      samplerBindings: new Map(),
      drawBuffersByFramebuffer: new Map(),
      readBuffersByFramebuffer: new Map(),
      readFramebufferRef: null,
      drawFramebufferRef: null,
      boundRenderbufferRef: null,
      renderState: { capabilities: new Map() },
    };
    trace.contexts.push(record);
    contextStates.set(gl, state);
    orderedContextStates.push(state);
    updateContextDimensions(state);
    try {
      if (typeof gl.getContextAttributes === "function") record.actualAttributes = contextAttributes(gl.getContextAttributes());
    } catch (error) {
      recordProbeError(`${contextRef}.getContextAttributes`, error);
    }
    installContextWrappers(state);
  }

  function patchCanvasConstructor(Constructor, fallbackPrefix) {
    if (typeof Constructor !== "function" || !Constructor.prototype || typeof Constructor.prototype.getContext !== "function") return false;
    const original = Constructor.prototype.getContext;
    const wrapped = function (type, attributes) {
      let result;
      try {
        result = original.apply(this, arguments);
      } catch (error) {
        throw error;
      }
      try {
        const normalized = typeof type === "string" ? type.toLowerCase() : "";
        if (normalized === "webgpu") {
          trace.webgpuDetected = true;
          trace.producerStatus = "blocked";
        } else if (/^(?:experimental-)?webgl2?$/.test(normalized) && result) {
          const api = normalized.includes("webgl2") ? "webgl2" : "webgl";
          instrumentContext(result, this, api, attributes);
          const state = contextStates.get(result);
          if (state && state.record.canvasSelector.startsWith("canvas:")) state.record.canvasSelector = `${fallbackPrefix}:${state.contextRef}`;
        }
      } catch (error) {
        recordProbeError(`${fallbackPrefix}.getContext`, error);
      }
      return result;
    };
    try {
      Object.defineProperty(Constructor.prototype, "getContext", { configurable: true, writable: true, value: wrapped });
      return true;
    } catch (error) {
      recordProbeError(`${fallbackPrefix}.wrap.getContext`, error);
      return false;
    }
  }

  function installAnimationFrameTracking() {
    if (typeof root.requestAnimationFrame !== "function") return;
    const original = root.requestAnimationFrame;
    const wrapped = function (callback) {
      if (typeof callback !== "function") return original.apply(this, arguments);
      const tracked = function (timestamp) {
        currentTime = Number.isFinite(timestamp) ? timestamp : clockNow();
        if (lastAnimationFrameTime !== currentTime) {
          currentFrame += 1;
          lastAnimationFrameTime = currentTime;
          breakDrawBatch();
        }
        return callback.apply(this, arguments);
      };
      return original.call(this, tracked);
    };
    try {
      Object.defineProperty(root, "requestAnimationFrame", { configurable: true, writable: true, value: wrapped });
    } catch (error) {
      recordProbeError("requestAnimationFrame.wrap", error);
    }
  }

  function checkpoint(label, conditions = {}) {
    breakDrawBatch();
    const selected = typeof conditions?.contextRef === "string"
      ? orderedContextStates.find((state) => state.contextRef === conditions.contextRef)
      : orderedContextStates[0];
    if (selected) updateContextDimensions(selected);
    const viewport = selected?.renderState.viewport || (selected
      ? [0, 0, selected.record.backingSize.width, selected.record.backingSize.height]
      : null);
    const record = {
      id: nextId("checkpoint"),
      label: typeof label === "string" && label ? label.slice(0, 512) : null,
      contextRef: selected?.contextRef || null,
      externalVisualRef: typeof conditions?.externalVisualRef === "string" && conditions.externalVisualRef
        ? conditions.externalVisualRef.slice(0, 2048)
        : null,
      conditions: {
        viewport,
        dpr: safeNumber(root.devicePixelRatio) ?? 1,
        frame: currentFrame,
        time: Number.isFinite(currentTime) ? currentTime : clockNow(),
        input: cleanCondition(conditions?.input),
        camera: cleanCondition(conditions?.camera),
        colorSettings: cleanCondition(conditions?.colorSettings),
      },
    };
    if (!appendBounded(trace.checkpoints, record, "checkpoints", LIMITS.checkpoints)) return null;
    if (record.label) {
      for (const state of orderedContextStates) {
        if (typeof state.native.getError !== "function") continue;
        try {
          const error = state.native.getError.call(state.gl);
          recordGetError(state, error, "checkpoint", record.id, record.label);
        } catch (error) {
          recordProbeError(`${state.contextRef}.checkpoint.getError`, error);
        }
      }
    }
    return record.id;
  }

  function exportTrace() {
    for (const state of orderedContextStates) updateContextDimensions(state);
    return JSON.parse(JSON.stringify(trace));
  }

  const patchedCanvas = patchCanvasConstructor(root.HTMLCanvasElement, "canvas");
  const patchedOffscreen = patchCanvasConstructor(root.OffscreenCanvas, "offscreen-canvas");
  if (!patchedCanvas && !patchedOffscreen) {
    trace.producerStatus = "blocked";
    recordProbeError("install", new Error("No canvas getContext prototype was available before navigation."));
  }
  installAnimationFrameTracking();
  root.__DSRA_GPU_PROBE__ = Object.freeze({ checkpoint, export: exportTrace });
}());
