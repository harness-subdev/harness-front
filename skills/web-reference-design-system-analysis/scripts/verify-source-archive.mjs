#!/usr/bin/env node
/** Verify a reproducible archive of publicly served runtime artifacts. */
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SENSITIVE_QUERY_SEGMENTS = new Set([
  "auth", "authorization", "bearer", "cookie", "credential", "key", "passwd", "password", "secret",
  "session", "sig", "signature", "token",
]);
const SENSITIVE_QUERY_COMPOSITES = new Set([
  "accesstoken", "apikey", "authtoken", "authorizationtoken", "sessionid",
]);
const EXECUTABLE_ARTIFACT_CLASSES = new Set(["module", "script", "wasm", "worker"]);
const JAVASCRIPT_ARTIFACT_CLASSES = new Set(["module", "script", "worker"]);
const JAVASCRIPT_CONTENT_TYPES = new Set([
  "application/ecmascript", "application/javascript", "text/ecmascript", "text/javascript",
]);
const CAPTURE_METHOD_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const ARTIFACT_CLASSES = new Set([
  "asset", "audio", "data", "document", "font", "image", "module", "script", "style", "video", "wasm", "worker",
]);
const HTML_EXTENSIONS = new Set([".htm", ".html", ".xhtml"]);
const JAVASCRIPT_EXTENSIONS = new Set([".cjs", ".js", ".mjs"]);
const PRELOAD_ARTIFACT_CLASSES = new Map([
  ["font", "font"], ["image", "image"], ["audio", "audio"], ["video", "video"], ["fetch", "data"], ["track", "data"],
]);
const HTML_URL_CHARACTER_REFERENCES = new Map([
  ["AMP", "&"], ["amp", "&"], ["apos", "'"], ["ast", "*"], ["bsol", "\\"], ["colon", ":"],
  ["comma", ","], ["commat", "@"], ["dollar", "$"], ["equals", "="], ["excl", "!"], ["GT", ">"],
  ["gt", ">"], ["lpar", "("], ["lsqb", "["], ["LT", "<"], ["lt", "<"], ["lowbar", "_"],
  ["num", "#"], ["percnt", "%"], ["period", "."], ["plus", "+"], ["quest", "?"], ["QUOT", '"'],
  ["quot", '"'], ["rpar", ")"], ["rsqb", "]"], ["semi", ";"], ["sol", "/"],
]);
const LEGACY_ATTRIBUTE_REFERENCES = new Set(["AMP", "amp", "GT", "gt", "LT", "lt", "QUOT", "quot"]);
const NUMERIC_CHARACTER_REFERENCE_REPLACEMENTS = new Map([
  [0x80, 0x20AC], [0x82, 0x201A], [0x83, 0x0192], [0x84, 0x201E], [0x85, 0x2026],
  [0x86, 0x2020], [0x87, 0x2021], [0x88, 0x02C6], [0x89, 0x2030], [0x8A, 0x0160],
  [0x8B, 0x2039], [0x8C, 0x0152], [0x8E, 0x017D], [0x91, 0x2018], [0x92, 0x2019],
  [0x93, 0x201C], [0x94, 0x201D], [0x95, 0x2022], [0x96, 0x2013], [0x97, 0x2014],
  [0x98, 0x02DC], [0x99, 0x2122], [0x9A, 0x0161], [0x9B, 0x203A], [0x9C, 0x0153],
  [0x9E, 0x017E], [0x9F, 0x0178],
]);
const DEPENDENCY_EXTENSIONS = new Map([
  ["image", new Set([".avif", ".gif", ".ico", ".jpeg", ".jpg", ".png", ".svg", ".webp"])],
  ["font", new Set([".eot", ".otf", ".ttf", ".woff", ".woff2"])],
  ["audio", new Set([".aac", ".flac", ".m4a", ".mp3", ".oga", ".ogg", ".wav"])],
  ["video", new Set([".m4v", ".mov", ".mp4", ".ogv", ".webm"])],
]);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function isSensitiveQueryKey(key) {
  const segments = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  return segments.some((segment) => SENSITIVE_QUERY_SEGMENTS.has(segment)) ||
    SENSITIVE_QUERY_COMPOSITES.has(segments.join(""));
}

function queryKeys(url) {
  const keys = new Set(url.searchParams.keys());
  const query = url.search.slice(1);
  const candidates = [query];
  try {
    candidates.push(decodeURIComponent(query.replace(/\+/g, "%20")));
  } catch {
    // URLSearchParams still supplies safely decoded top-level keys.
  }
  for (const candidate of candidates) {
    for (const match of candidate.matchAll(/(?:^|[?&;])([^?&;=]+)=/g)) keys.add(match[1]);
  }
  return keys;
}

function validateHttpUrl(value, label, errors) {
  if (typeof value !== "string" || !value) {
    archiveError(errors, `${label} requires originalUrl.`);
    return false;
  }
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol)) {
      archiveError(errors, `${label} originalUrl must use http or https.`);
      return false;
    }
    if (url.username || url.password) {
      archiveError(errors, `${label} originalUrl must not contain credentials.`);
      return false;
    }
    if (url.hash) {
      archiveError(errors, `${label} originalUrl fragment is not part of HTTP request identity.`);
      return false;
    }
    for (const key of queryKeys(url)) {
      if (isSensitiveQueryKey(key)) {
        archiveError(errors, `${label} originalUrl contains sensitive query key: ${key}.`);
        return false;
      }
    }
  } catch {
    archiveError(errors, `${label} originalUrl is invalid.`);
    return false;
  }
  return true;
}

function isSafeHttpUrl(value) {
  return validateHttpUrl(value, "Static dependency", []);
}

function artifactClassCovers(artifactClass, roleClass) {
  return artifactClass === roleClass ||
    (JAVASCRIPT_ARTIFACT_CLASSES.has(artifactClass) && JAVASCRIPT_ARTIFACT_CLASSES.has(roleClass));
}

function hasVerifiedArtifact(verifiedArtifacts, entry) {
  return verifiedArtifacts.some((artifact) =>
    artifact.originalUrl === entry.originalUrl && artifactClassCovers(artifact.artifactClass, entry.artifactClass));
}

function resolveArchivePath(sourceRoot, input, fallback) {
  const path = input || fallback;
  return isAbsolute(path) ? path : resolve(sourceRoot, path);
}

function isWithin(sourceRoot, targetPath) {
  const fromRoot = relative(sourceRoot, targetPath);
  return Boolean(fromRoot) && fromRoot !== ".." && !fromRoot.startsWith(`..${sep}`) && !isAbsolute(fromRoot);
}

function canonicalLocalPath(sourceRoot, localPath) {
  if (typeof localPath !== "string" || !localPath || isAbsolute(localPath)) return null;
  if (/^(?:[A-Za-z]:[\\/]|\\\\)/.test(localPath) || localPath.split(/[\\/]/).includes("..")) return null;
  const resolved = resolve(sourceRoot, localPath);
  if (!isWithin(sourceRoot, resolved)) return null;
  return relative(sourceRoot, resolved).split(sep).join("/");
}

function archiveError(errors, message) {
  errors.push(message);
}

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortedRecords(records) {
  return [...records].sort((left, right) =>
    compareStrings(left.originalUrl, right.originalUrl) ||
    compareStrings(left.localPath, right.localPath) ||
    compareStrings(left.artifactClass, right.artifactClass),
  );
}

function sortedDiscoveries(records) {
  return [...records].sort((left, right) =>
    compareStrings(left.originalUrl, right.originalUrl) ||
    compareStrings(left.artifactClass, right.artifactClass) ||
    compareStrings(left.referrer || "", right.referrer || ""),
  );
}

function parseAttributes(tag) {
  const attributes = {};
  const uncertain = new Set();
  for (const match of tag.matchAll(/\b([A-Za-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g)) {
    const name = match[1].toLowerCase();
    const decoded = decodeHtmlAttribute(match[2] ?? match[3] ?? match[4]);
    attributes[name] = decoded.value;
    if (decoded.uncertain) uncertain.add(name);
  }
  Object.defineProperty(attributes, UNCERTAIN_ATTRIBUTES, { value: uncertain });
  return attributes;
}

function decodeHtmlAttribute(value) {
  let uncertain = false;
  const decodedValue = value.replace(/&#(?:[xX]([0-9a-fA-F]+)|(\d+));?|&([A-Za-z][A-Za-z0-9]*)(;?)/g,
    (reference, hexadecimal, decimal, name, semicolon, offset, input) => {
      if (hexadecimal || decimal) {
        let codePoint = Number.parseInt(hexadecimal || decimal, hexadecimal ? 16 : 10);
        if (!codePoint || codePoint > 0x10FFFF || (codePoint >= 0xD800 && codePoint <= 0xDFFF)) codePoint = 0xFFFD;
        codePoint = NUMERIC_CHARACTER_REFERENCE_REPLACEMENTS.get(codePoint) || codePoint;
        return String.fromCodePoint(codePoint);
      }
      const decoded = HTML_URL_CHARACTER_REFERENCES.get(name);
      const next = input[offset + reference.length];
      if (decoded === undefined) {
        if (semicolon || next !== "=") uncertain = true;
        return reference;
      }
      if (!semicolon) {
        if (!LEGACY_ATTRIBUTE_REFERENCES.has(name)) return reference;
        if (next === "=" || /[0-9A-Za-z]/.test(next || "")) return reference;
      }
      return decoded;
    });
  return { value: decodedValue, uncertain };
}

const UNCERTAIN_ATTRIBUTES = Symbol("uncertainAttributes");
const RAW_TEXT_ELEMENTS = new Set(["iframe", "noembed", "noframes", "noscript", "script", "style", "textarea", "title", "xmp"]);
const DEPENDENCY_URL_ATTRIBUTES = new Map([
  ["audio", ["src"]], ["base", ["href"]], ["embed", ["src"]], ["iframe", ["src"]],
  ["image", ["href", "xlink:href"]], ["img", ["src", "srcset"]], ["input", ["src"]],
  ["link", ["href", "imagesrcset"]], ["object", ["data"]], ["script", ["src"]],
  ["source", ["src", "srcset"]], ["track", ["src"]], ["video", ["poster", "src"]],
]);

function tagEnd(html, start) {
  let quote = null;
  for (let index = start; index < html.length; index += 1) {
    const character = html[index];
    if (quote) {
      if (character === quote) quote = null;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === ">") {
      return index;
    }
  }
  return html.length - 1;
}

function* htmlTokens(html) {
  let index = 0;
  let templateDepth = 0;
  while (index < html.length) {
    const start = html.indexOf("<", index);
    if (start < 0) return;
    if (html.startsWith("<!--", start)) {
      const end = html.indexOf("-->", start + 4);
      index = end < 0 ? html.length : end + 3;
      continue;
    }
    if (html.startsWith("<![CDATA[", start)) {
      const end = html.indexOf("]]>", start + 9);
      index = end < 0 ? html.length : end + 3;
      continue;
    }
    const head = html.slice(start).match(/^<\s*(\/?)\s*([A-Za-z][\w:.-]*)\b/);
    if (!head) {
      index = start + 1;
      continue;
    }
    const end = tagEnd(html, start + head[0].length);
    const closing = Boolean(head[1]);
    const name = head[2].toLowerCase();
    const source = html.slice(start, end + 1);
    const selfClosing = /\/\s*>$/.test(source);
    if (closing) {
      const inTemplate = templateDepth > 0;
      if (name === "template" && templateDepth) templateDepth -= 1;
      yield { closing, inTemplate, name, source };
      index = end + 1;
      continue;
    }
    const inTemplate = templateDepth > 0;
    if (name === "template" && !selfClosing) templateDepth += 1;
    if (name === "plaintext") {
      yield { closing, inTemplate, name, source, text: html.slice(end + 1) };
      return;
    }
    if (RAW_TEXT_ELEMENTS.has(name) && !selfClosing) {
      const closingTag = new RegExp(`</${name}(?:\\s[^>]*)?>`, "gi");
      closingTag.lastIndex = end + 1;
      const close = closingTag.exec(html);
      const textEnd = close ? close.index : html.length;
      yield { closing, inTemplate, name, source, text: html.slice(end + 1, textEnd) };
      index = close ? closingTag.lastIndex : html.length;
      continue;
    }
    yield { closing, inTemplate, name, source };
    index = end + 1;
  }
}

function discoverUrl(reference, baseUrl) {
  if (typeof reference !== "string") return null;
  const value = reference.trim();
  if (!value || value.startsWith("#") || /^(?:data|blob):/i.test(value)) return null;
  try {
    const url = new URL(value, baseUrl);
    if (!/^https?:$/.test(url.protocol)) return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function srcsetReferences(value) {
  if (typeof value !== "string") return [];
  return value
    .replace(/\b(?:data|blob):[^\s]+(?:\s+[\d.]+[wx])?/gi, "")
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/, 1)[0])
    .filter(Boolean);
}

function dependencyClass(reference, type, fallback = "asset") {
  const mime = typeof type === "string" ? type.split(";", 1)[0].trim().toLowerCase() : "";
  if (mime === "text/html" || mime === "application/xhtml+xml") return "document";
  if (mime === "text/css") return "style";
  if (JAVASCRIPT_CONTENT_TYPES.has(mime)) return "script";
  if (mime === "application/wasm") return "wasm";
  for (const artifactClass of ["image", "font", "audio", "video"]) {
    if (mime.startsWith(`${artifactClass}/`)) return artifactClass;
  }
  if (mime === "application/font-woff" || mime.startsWith("font/")) return "font";
  if (mime === "application/json" || mime.startsWith("text/")) return "data";
  let extension = "";
  try {
    extension = extname(new URL(reference, "https://archive.invalid/").pathname).toLowerCase();
  } catch {
    // The caller will ignore an invalid URL.
  }
  if (HTML_EXTENSIONS.has(extension)) return "document";
  if (extension === ".css") return "style";
  if (JAVASCRIPT_EXTENSIONS.has(extension)) return "script";
  if (extension === ".wasm") return "wasm";
  for (const [artifactClass, extensions] of DEPENDENCY_EXTENSIONS) {
    if (extensions.has(extension)) return artifactClass;
  }
  return fallback;
}

function discoverDocumentDependencies(contents, documentUrl) {
  const html = contents.toString("utf8");
  let resolutionBase = documentUrl;
  let hasBase = false;
  const discovered = new Map();
  let hasRuntimeReferences = false;
  let hasUncertainReferences = false;
  let hasUnsafeReferences = false;
  const mediaContexts = [];
  const include = (record) => discovered.set(`${record.artifactClass}\0${record.originalUrl}`, record);
  const add = (artifactClass, reference) => {
    const originalUrl = discoverUrl(reference, resolutionBase);
    if (!originalUrl) return;
    if (!isSafeHttpUrl(originalUrl)) {
      hasUnsafeReferences = true;
      return;
    }
    include({ artifactClass, originalUrl, referrer: documentUrl });
  };
  const unsafeStylesheetReference = () => { hasUnsafeReferences = true; };
  for (const token of htmlTokens(html)) {
    if (token.closing) {
      if (token.inTemplate) continue;
      const context = mediaContexts.lastIndexOf(token.name);
      if (context >= 0) mediaContexts.splice(context, 1);
      continue;
    }
    if (token.inTemplate || token.name === "template") continue;
    const attributes = parseAttributes(token.source);
    const urlAttributes = [
      ...(DEPENDENCY_URL_ATTRIBUTES.get(token.name) || []),
      ...(attributes.style && /\burl\s*\(/i.test(attributes.style) ? ["style"] : []),
      ...(token.name === "meta" && (attributes["http-equiv"] || "").toLowerCase() === "refresh" ? ["content"] : []),
    ];
    for (const name of urlAttributes) {
      if (!attributes[UNCERTAIN_ATTRIBUTES].has(name)) continue;
      hasUncertainReferences = true;
      delete attributes[name];
    }
    if (token.name === "base" && !hasBase && Object.hasOwn(attributes, "href")) {
      try {
        const candidate = new URL(attributes.href.trim(), documentUrl);
        if (/^https?:$/.test(candidate.protocol)) {
          resolutionBase = candidate.href;
          hasBase = true;
        }
      } catch {
        // Keep looking for the first usable base href.
      }
      continue;
    }
    if (attributes.style) {
      for (const entry of discoverStylesheetDependencies(attributes.style, resolutionBase, documentUrl, unsafeStylesheetReference)) include(entry);
    }
    if (token.name === "style") {
      for (const entry of discoverStylesheetDependencies(token.text || "", resolutionBase, documentUrl, unsafeStylesheetReference)) include(entry);
    } else if (token.name === "script") {
      hasRuntimeReferences = true;
      add((attributes.type || "").toLowerCase() === "module" ? "module" : "script", attributes.src);
    } else if (token.name === "link") {
      const relations = (attributes.rel || "").toLowerCase().split(/\s+/);
      if (relations.includes("modulepreload")) {
        hasRuntimeReferences = true;
        add("module", attributes.href);
      }
      if (relations.includes("preload") && (attributes.as || "").toLowerCase() === "script") {
        hasRuntimeReferences = true;
        add("script", attributes.href);
      }
      if (relations.includes("stylesheet") || (relations.includes("preload") && (attributes.as || "").toLowerCase() === "style")) {
        add("style", attributes.href);
      }
      if (relations.includes("preload")) {
        const preloadAs = (attributes.as || "").toLowerCase();
        const artifactClass = PRELOAD_ARTIFACT_CLASSES.get(preloadAs);
        if (artifactClass) add(artifactClass, attributes.href);
        if (preloadAs === "image") {
          for (const reference of srcsetReferences(attributes.imagesrcset)) add("image", reference);
        }
      }
      if (relations.some((relation) => relation === "icon" || relation.endsWith("-icon"))) add("image", attributes.href);
      if (relations.includes("manifest")) add("data", attributes.href);
    } else if (token.name === "img") {
      add("image", attributes.src);
      for (const reference of srcsetReferences(attributes.srcset)) add("image", reference);
    } else if (token.name === "source") {
      const container = mediaContexts.at(-1);
      const fallback = container === "picture" ? "image" : container;
      if (attributes.src) add(dependencyClass(attributes.src, attributes.type, fallback), attributes.src);
      for (const reference of srcsetReferences(attributes.srcset)) add(dependencyClass(reference, attributes.type, fallback || "image"), reference);
    } else if (token.name === "video") {
      add("video", attributes.src);
      add("image", attributes.poster);
    } else if (token.name === "audio") {
      add("audio", attributes.src);
    } else if (token.name === "track") {
      add("data", attributes.src);
    } else if (token.name === "input" && (attributes.type || "").toLowerCase() === "image") {
      add("image", attributes.src);
    } else if (token.name === "object") {
      add(dependencyClass(attributes.data, attributes.type), attributes.data);
    } else if (token.name === "embed") {
      add(dependencyClass(attributes.src, attributes.type), attributes.src);
    } else if (token.name === "iframe") {
      add("document", attributes.src);
    } else if (token.name === "image") {
      add("image", attributes.href || attributes["xlink:href"]);
    } else if (token.name === "meta" && (attributes["http-equiv"] || "").toLowerCase() === "refresh") {
      const refresh = (attributes.content || "").match(/(?:^|;)\s*url\s*=\s*(?:"([^"]*)"|'([^']*)'|(.+))$/i);
      if (refresh) add("document", (refresh[1] ?? refresh[2] ?? refresh[3]).trim());
    }
    if (["picture", "video", "audio"].includes(token.name) && !/\/\s*>$/.test(token.source)) mediaContexts.push(token.name);
  }
  return {
    discovered: sortedDiscoveries(discovered.values()),
    hasRuntimeReferences: hasRuntimeReferences || discovered.size > 0,
    hasUncertainReferences,
    hasUnsafeReferences,
  };
}

function discoverStylesheetDependencies(contents, stylesheetUrl, referrer = stylesheetUrl, onUnsafeUrl = () => {}) {
  const css = (typeof contents === "string" ? contents : contents.toString("utf8")).replace(/\/\*[\s\S]*?\*\//g, "");
  const discovered = new Map();
  const handled = new Set();
  const add = (artifactClass, reference) => {
    const originalUrl = discoverUrl(reference, stylesheetUrl);
    if (!originalUrl) return null;
    if (!isSafeHttpUrl(originalUrl)) {
      onUnsafeUrl();
      return null;
    }
    discovered.set(`${artifactClass}\0${originalUrl}`, { artifactClass, originalUrl, referrer });
    return originalUrl;
  };
  const urls = (text) => [...text.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"\s]+))\s*\)/gi)].map((match) => match[1] ?? match[2] ?? match[3]);
  for (const match of css.matchAll(/@import\s+(?:url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"\s]+))\s*\)|"([^"]*)"|'([^']*)')/gi)) {
    const originalUrl = add("style", match[1] ?? match[2] ?? match[3] ?? match[4] ?? match[5]);
    if (originalUrl) handled.add(originalUrl);
  }
  for (const match of css.matchAll(/@font-face\s*\{[^}]*\}/gi)) {
    for (const reference of urls(match[0])) {
      const originalUrl = add("font", reference);
      if (originalUrl) handled.add(originalUrl);
    }
  }
  for (const reference of urls(css)) {
    const originalUrl = discoverUrl(reference, stylesheetUrl);
    if (!originalUrl || handled.has(originalUrl)) continue;
    add(dependencyClass(reference, null), reference);
  }
  return sortedDiscoveries(discovered.values());
}

function canonicalSourceCategory(contentType, localPath, originalUrl, contents) {
  const categories = new Set();
  const mime = typeof contentType === "string" ? contentType.split(";", 1)[0].trim().toLowerCase() : "";
  const extensions = [typeof localPath === "string" ? extname(localPath).toLowerCase() : ""];
  try {
    extensions.push(extname(new URL(originalUrl).pathname).toLowerCase());
  } catch {
    // originalUrl validation reports this separately.
  }
  const htmlSignature = contents && /^(?:<!doctype\s+html\b|<html(?:\s|>))/i.test(contents.subarray(0, 1024).toString("utf8").replace(/^\uFEFF/, "").trimStart());
  if (mime === "text/html" || mime === "application/xhtml+xml" || extensions.some((extension) => HTML_EXTENSIONS.has(extension)) || htmlSignature) categories.add("document");
  if (mime === "text/css" || extensions.includes(".css")) categories.add("style");
  if (JAVASCRIPT_CONTENT_TYPES.has(mime) || extensions.some((extension) => JAVASCRIPT_EXTENSIONS.has(extension))) categories.add("javascript");
  if (mime === "application/wasm" || extensions.includes(".wasm")) categories.add("wasm");
  return [...categories];
}

function validateSourceCategory(artifactClass, contentType, localPath, originalUrl, contents, label, errors) {
  const categories = canonicalSourceCategory(contentType, localPath, originalUrl, contents);
  if (categories.length > 1) {
    archiveError(errors, `${label} has contradictory contentType and localPath source categories: ${categories.join(", ")}.`);
    return { category: null, valid: false };
  }
  const category = categories[0] || null;
  const compatible = category === "document" ? artifactClass === "document"
    : category === "style" ? artifactClass === "style"
      : category === "javascript" ? JAVASCRIPT_ARTIFACT_CLASSES.has(artifactClass)
        : category === "wasm" ? artifactClass === "wasm"
          : true;
  if (!compatible) {
    const name = category === "document" ? "HTML" : category === "style" ? "CSS" : category === "javascript" ? "JavaScript" : "WASM";
    const expected = category === "document" ? "document" : category === "style" ? "style" : category === "javascript" ? "script, module, or worker" : "wasm";
    archiveError(errors, `${label} ${name} sources must use artifactClass ${expected}.`);
  }
  return { category, valid: compatible };
}

function snapshotId(records) {
  return `sha256:${sha256(JSON.stringify(sortedRecords(records)))}`;
}

function writeStatus(statusPath, status) {
  mkdirSync(dirname(statusPath), { recursive: true });
  writeFileSync(statusPath, `${JSON.stringify(status, null, 2)}\n`, "utf8");
}

function canonicalPotentialPath(path) {
  let candidate = resolve(path);
  const suffix = [];
  while (!existsSync(candidate)) {
    try {
      if (lstatSync(candidate).isSymbolicLink()) throw new Error("Cannot safely resolve a dangling symlink.");
    } catch (error) {
      if (error && error.code !== "ENOENT") throw error;
    }
    const parent = dirname(candidate);
    if (parent === candidate) throw new Error("Cannot resolve output path.");
    suffix.unshift(basename(candidate));
    candidate = parent;
  }
  return resolve(realpathSync(candidate), ...suffix);
}

function statusOutputError(sourceRoot, manifestPath, statusPath, manifest) {
  let outputPath;
  try {
    outputPath = canonicalPotentialPath(statusPath);
    const originalPath = canonicalPotentialPath(resolve(sourceRoot, "original"));
    if (outputPath === originalPath || isWithin(originalPath, outputPath)) {
      return "Unsafe status output: it must not be written under original/.";
    }
    if (outputPath === canonicalPotentialPath(manifestPath) || sameExistingFile(statusPath, manifestPath)) {
      return "Unsafe status output: it collides with the manifest.";
    }
    for (const artifact of Array.isArray(manifest?.artifacts) ? manifest.artifacts : []) {
      const artifactPath = typeof artifact?.localPath === "string" ? resolve(sourceRoot, artifact.localPath) : null;
      if (artifactPath && (outputPath === canonicalPotentialPath(artifactPath) || sameExistingFile(statusPath, artifactPath))) {
        return "Unsafe status output: it collides with an archived artifact.";
      }
    }
    if (originalTreeContainsFile(originalPath, statusPath)) {
      return "Unsafe status output: it collides with an existing file under original/.";
    }
  } catch {
    return "Unsafe status output: it cannot be safely resolved.";
  }
  return null;
}

function sameExistingFile(left, right) {
  if (!existsSync(left) || !existsSync(right)) return false;
  const leftStats = statSync(left);
  const rightStats = statSync(right);
  return leftStats.dev === rightStats.dev && leftStats.ino === rightStats.ino;
}

function originalTreeContainsFile(originalRoot, candidate) {
  if (!existsSync(originalRoot) || !existsSync(candidate)) return false;
  const candidateStats = statSync(candidate);
  const directories = [originalRoot];
  while (directories.length) {
    const directory = directories.pop();
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const entryPath = resolve(directory, entry.name);
      const entryStats = statSync(entryPath);
      if (entryStats.dev === candidateStats.dev && entryStats.ino === candidateStats.ino) return true;
      if (entry.isDirectory()) directories.push(entryPath);
    }
  }
  return false;
}

function manifestIfReadable(manifestPath) {
  try {
    return JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    return null;
  }
}

function validTimestamp(value) {
  return typeof value === "string" && Boolean(value) && !Number.isNaN(Date.parse(value));
}

function metadataCandidates(value) {
  const candidates = [value];
  let current = value;
  let uncertainEncoding = false;
  for (let pass = 0; pass < 4 && current.includes("%"); pass += 1) {
    uncertainEncoding ||= /%(?![0-9a-f]{2})/i.test(current);
    let decoded;
    try {
      decoded = decodeURIComponent(current);
    } catch {
      uncertainEncoding = true;
      decoded = current.replace(/%([0-9a-f]{2})/gi, (_, hexadecimal) =>
        String.fromCharCode(Number.parseInt(hexadecimal, 16)));
    }
    if (decoded === current) break;
    candidates.push(decoded);
    current = decoded;
  }
  uncertainEncoding ||= /%[0-9a-f]{2}/i.test(current);
  return { candidates, uncertainEncoding };
}

function containsSecretAssignment(value) {
  if (/\bbearer\s+\S+/i.test(value)) return true;
  for (const match of value.matchAll(/(?:^|[^A-Za-z0-9])([A-Za-z][A-Za-z0-9_.-]*)\s*[:=]/g)) {
    if (isSensitiveQueryKey(match[1])) return true;
  }
  return false;
}

function containsSensitiveTerm(value) {
  for (const match of value.matchAll(/[A-Za-z][A-Za-z0-9_.-]*/g)) {
    if (isSensitiveQueryKey(match[0])) return true;
  }
  return false;
}

function isSafeCaptureMethod(value) {
  return typeof value === "string" && CAPTURE_METHOD_PATTERN.test(value) && !containsSensitiveTerm(value);
}

function validateSafeMetadataValue(value, label, errors) {
  let valid = true;
  const { candidates, uncertainEncoding } = metadataCandidates(value);
  if (candidates.some(containsSecretAssignment) ||
      (uncertainEncoding && candidates.some(containsSensitiveTerm))) {
    archiveError(errors, `${label} contains secret-bearing metadata.`);
    valid = false;
  }
  const checkedUrls = new Set();
  for (const candidate of candidates) {
    for (const match of candidate.matchAll(/https?:\/\/[^\s"'<>]+/gi)) {
      if (checkedUrls.has(match[0])) continue;
      checkedUrls.add(match[0]);
      if (!validateHttpUrl(match[0], label, errors)) valid = false;
    }
  }
  return valid;
}

function validatedBlockedEntries(entries, errors) {
  const validated = [];
  for (const [index, entry] of entries.entries()) {
    const label = `Blocked ${index + 1}`;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      archiveError(errors, `${label} must be an object.`);
      continue;
    }
    const { artifactClass, originalUrl, reason, discovery, referrer, capturedAt } = entry;
    let valid = true;
    if (typeof artifactClass !== "string" || !artifactClass) {
      archiveError(errors, `${label} requires artifactClass.`);
      valid = false;
    }
    if (typeof reason !== "string" || !reason) {
      archiveError(errors, `${label} requires reason.`);
      valid = false;
    } else if (!validateSafeMetadataValue(reason, `${label} reason`, errors)) {
      valid = false;
    }
    if (!validTimestamp(capturedAt)) {
      archiveError(errors, `${label} capturedAt must be a valid timestamp.`);
      valid = false;
    }
    if (originalUrl !== undefined && !validateHttpUrl(originalUrl, label, errors)) valid = false;
    if (discovery !== undefined) {
      if (typeof discovery !== "string" || !discovery) {
        archiveError(errors, `${label} discovery must be a non-empty string when present.`);
        valid = false;
      } else if (!validateSafeMetadataValue(discovery, `${label} discovery`, errors)) {
        valid = false;
      }
    }
    if (referrer !== undefined &&
        (!validateHttpUrl(referrer, `${label} referrer`, errors) ||
         (typeof referrer === "string" && !validateSafeMetadataValue(referrer, `${label} referrer`, errors)))) valid = false;
    if (!valid) continue;
    validated.push({
      artifactClass,
      ...(originalUrl !== undefined ? { originalUrl } : {}),
      reason,
      ...(discovery !== undefined ? { discovery } : {}),
      ...(referrer !== undefined ? { referrer } : {}),
      capturedAt,
    });
  }
  return validated;
}

function runtimeDiscoveryCoverage(runtimeDiscovery, verifiedArtifacts, hasRuntimeReferences, errors) {
  const coverage = {
    status: "missing",
    method: null,
    capturedAt: null,
    observed: [],
    missing: [],
  };
  if (!runtimeDiscovery || typeof runtimeDiscovery !== "object" || Array.isArray(runtimeDiscovery)) {
    archiveError(errors, "Manifest runtimeDiscovery is required.");
    return coverage;
  }
  const { status, method, capturedAt, observed } = runtimeDiscovery;
  if (status !== "complete" && status !== "blocked") {
    archiveError(errors, "runtimeDiscovery status must be complete or blocked.");
  } else {
    coverage.status = status;
    if (status === "blocked") archiveError(errors, "runtimeDiscovery is blocked.");
  }
  if (!isSafeCaptureMethod(method)) {
    archiveError(errors, "runtimeDiscovery method must be a safe bounded identifier.");
  } else {
    coverage.method = method;
  }
  if (!validTimestamp(capturedAt)) {
    archiveError(errors, "runtimeDiscovery capturedAt must be a valid timestamp.");
  } else if (validateSafeMetadataValue(capturedAt, "runtimeDiscovery capturedAt", errors)) {
    coverage.capturedAt = capturedAt;
  }
  if (!Array.isArray(observed)) {
    archiveError(errors, "runtimeDiscovery observed must be an array.");
  } else {
    const seen = new Set();
    for (const [index, entry] of observed.entries()) {
      const label = `runtimeDiscovery observed ${index + 1}`;
      if (!entry || typeof entry !== "object" || !ARTIFACT_CLASSES.has(entry.artifactClass)) {
        archiveError(errors, `${label} requires a canonical artifactClass.`);
        continue;
      }
      const safeOriginalUrl = typeof entry.originalUrl === "string" &&
        validateSafeMetadataValue(entry.originalUrl, `${label} originalUrl`, errors);
      if (!safeOriginalUrl || !validateHttpUrl(entry.originalUrl, label, errors)) continue;
      const key = `${entry.artifactClass}\0${entry.originalUrl}`;
      if (seen.has(key)) continue;
      seen.add(key);
      coverage.observed.push({ artifactClass: entry.artifactClass, originalUrl: entry.originalUrl });
    }
  }
  coverage.observed = sortedDiscoveries(coverage.observed);
  coverage.missing = coverage.observed.filter((entry) => !hasVerifiedArtifact(verifiedArtifacts, entry));
  for (const entry of coverage.missing) {
    archiveError(errors, `Missing runtime-discovered artifact: ${entry.artifactClass} ${entry.originalUrl}.`);
  }
  if (method === "not-applicable") {
    if (hasRuntimeReferences) archiveError(errors, "runtimeDiscovery method not-applicable is invalid when external dependency/runtime references exist.");
    if (coverage.observed.length) archiveError(errors, "runtimeDiscovery method not-applicable cannot include observed entries.");
  }
  return coverage;
}

export function verifySourceArchive(sourceRoot, manifestPath, statusOutput) {
  const root = realpathSync(resolve(sourceRoot));
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const unsafeStatusOutput = statusOutputError(root, manifestPath, statusOutput, manifest);
  if (unsafeStatusOutput) throw new Error(unsafeStatusOutput);
  const errors = [];
  const artifacts = Array.isArray(manifest.artifacts) ? manifest.artifacts : [];
  const requiredArtifactClasses = [];
  const blockedEntries = Array.isArray(manifest.blocked) ? manifest.blocked : [];
  let blocked = [];
  const verifiedArtifacts = [];
  const verifiedDocuments = [];
  const verifiedStylesheets = [];
  const seenUrls = new Set();
  const seenPaths = new Set();

  if (manifest.schemaVersion !== 1) archiveError(errors, "Manifest schemaVersion must be 1.");
  if (!Array.isArray(manifest.requiredArtifactClasses)) {
    archiveError(errors, "Manifest requiredArtifactClasses must be an array.");
  } else {
    if (!manifest.requiredArtifactClasses.length) archiveError(errors, "Manifest requiredArtifactClasses must not be empty.");
    for (const [index, artifactClass] of manifest.requiredArtifactClasses.entries()) {
      if (typeof artifactClass !== "string" || !artifactClass) {
        archiveError(errors, `requiredArtifactClasses member ${index + 1} must be a non-empty string.`);
      } else if (!requiredArtifactClasses.includes(artifactClass)) {
        requiredArtifactClasses.push(artifactClass);
      }
    }
    requiredArtifactClasses.sort();
  }
  if (!Array.isArray(manifest.artifacts)) {
    archiveError(errors, "Manifest artifacts must be an array.");
  } else if (!manifest.artifacts.length) {
    archiveError(errors, "Manifest artifacts must not be empty.");
  }
  if (manifest.blocked !== undefined && !Array.isArray(manifest.blocked)) archiveError(errors, "Manifest blocked must be an array.");
  blocked = validatedBlockedEntries(blockedEntries, errors);

  for (const [index, artifact] of artifacts.entries()) {
    const label = `Artifact ${index + 1}`;
    if (!artifact || typeof artifact !== "object") {
      archiveError(errors, `${label} must be an object.`);
      continue;
    }
    const {
      artifactClass, originalUrl, localPath: rawLocalPath, bytes, sha256: expectedSha256,
      status, contentType, discovery, referrer, retrievalMethod, capturedAt,
    } = artifact;
    const localPath = canonicalLocalPath(root, rawLocalPath);
    let valid = true;
    if (typeof artifactClass !== "string" || !artifactClass) {
      archiveError(errors, `${label} requires artifactClass.`);
      valid = false;
    }
    if (!validateHttpUrl(originalUrl, label, errors)) {
      valid = false;
    } else {
      if (seenUrls.has(originalUrl)) {
        archiveError(errors, `${label} has Duplicate originalUrl: ${originalUrl}.`);
        valid = false;
      }
      seenUrls.add(originalUrl);
    }
    if (!localPath) {
      archiveError(errors, `${label} has Unsafe localPath: ${rawLocalPath}.`);
      valid = false;
    } else if (!localPath.startsWith("original/")) {
      archiveError(errors, `${label} localPath must reside under original/.`);
      valid = false;
    } else {
      if (seenPaths.has(localPath)) {
        archiveError(errors, `${label} has Duplicate localPath: ${localPath}.`);
        valid = false;
      }
      seenPaths.add(localPath);
    }
    if (!Number.isInteger(bytes) || bytes < 0) {
      archiveError(errors, `${label} bytes must be a non-negative integer.`);
      valid = false;
    }
    if (typeof expectedSha256 !== "string" || !/^[a-f0-9]{64}$/i.test(expectedSha256)) {
      archiveError(errors, `${label} sha256 must be a hexadecimal SHA-256 digest.`);
      valid = false;
    }
    if (!Number.isInteger(status) || status < 200 || status > 205) {
      archiveError(errors, `${label} status must be a full response in the supported 200-205 range; partial response assembly is not modeled.`);
      valid = false;
    }
    if (typeof contentType !== "string" || !contentType) {
      archiveError(errors, `${label} contentType must be a non-empty string.`);
      valid = false;
    }
    let validDiscovery = typeof discovery === "string" && discovery;
    let validReferrer = typeof referrer === "string" && referrer;
    if (!validDiscovery && !validReferrer) {
      archiveError(errors, `${label} requires discovery or referrer.`);
      valid = false;
    }
    if (discovery !== undefined && !validDiscovery) {
      archiveError(errors, `${label} discovery must be a non-empty string when present.`);
      valid = false;
    } else if (validDiscovery && !validateSafeMetadataValue(discovery, `${label} discovery`, errors)) {
      validDiscovery = false;
      valid = false;
    }
    if (referrer !== undefined && !validReferrer) {
      archiveError(errors, `${label} referrer must be a non-empty string when present.`);
      valid = false;
    } else if (validReferrer) {
      const safeReferrer = validateSafeMetadataValue(referrer, `${label} referrer`, errors);
      const httpReferrer = validateHttpUrl(referrer, `${label} referrer`, errors);
      if (!safeReferrer || !httpReferrer) {
        validReferrer = false;
        valid = false;
      }
    }
    if (!isSafeCaptureMethod(retrievalMethod)) {
      archiveError(errors, `${label} retrievalMethod must be a safe bounded identifier.`);
      valid = false;
    }
    if (!validTimestamp(capturedAt)) {
      archiveError(errors, `${label} capturedAt must be a valid timestamp.`);
      valid = false;
    }
    let sourceCategory = validateSourceCategory(artifactClass, contentType, rawLocalPath, originalUrl, null, label, errors);
    if (!sourceCategory.valid) valid = false;
    if (!valid) continue;

    let contents;
    try {
      const realPath = realpathSync(resolve(root, localPath));
      if (!isWithin(root, realPath)) {
        archiveError(errors, `${label} localPath resolves outside archive: ${rawLocalPath}.`);
        continue;
      }
      if (!isWithin(resolve(root, "original"), realPath)) {
        archiveError(errors, `${label} localPath resolves outside original/: ${rawLocalPath}.`);
        continue;
      }
      contents = readFileSync(realPath);
    } catch {
      archiveError(errors, `${label} local file is missing: ${localPath}.`);
      continue;
    }
    if (contents.byteLength !== bytes) {
      archiveError(errors, `${label} byte count mismatch for ${localPath}.`);
      continue;
    }
    const actualSha256 = sha256(contents);
    if (actualSha256 !== expectedSha256.toLowerCase()) {
      archiveError(errors, `${label} SHA-256 mismatch for ${localPath}.`);
      continue;
    }
    sourceCategory = validateSourceCategory(artifactClass, contentType, rawLocalPath, originalUrl, contents, label, errors);
    if (!sourceCategory.valid) continue;
    if (sourceCategory.category === "document" && !contents.toString("utf8").trim()) {
      archiveError(errors, `${label} document must contain non-empty HTML bytes.`);
      continue;
    }
    const verifiedArtifact = {
      artifactClass, originalUrl, localPath, bytes, sha256: actualSha256, status, contentType,
      ...(validDiscovery ? { discovery } : {}),
      ...(validReferrer ? { referrer } : {}),
      retrievalMethod,
      capturedAt,
    };
    verifiedArtifacts.push(verifiedArtifact);
    if (sourceCategory.category === "document") verifiedDocuments.push({ originalUrl, contents });
    if (sourceCategory.category === "style") verifiedStylesheets.push({ originalUrl, contents });
  }

  if (!verifiedDocuments.length) archiveError(errors, "Archive requires at least one verified document capture.");
  if (blockedEntries.length) archiveError(errors, "Blocked artifacts prevent a complete archive.");

  const discoveredByKey = new Map();
  let hasUnsafeStaticReferences = false;
  let hasRuntimeReferences = verifiedArtifacts.some((artifact) => EXECUTABLE_ARTIFACT_CLASSES.has(artifact.artifactClass));
  for (const document of verifiedDocuments) {
    const discovery = discoverDocumentDependencies(document.contents, document.originalUrl);
    hasRuntimeReferences ||= discovery.hasRuntimeReferences;
    if (discovery.hasUncertainReferences) {
      archiveError(errors, "HTML URL-bearing attribute contains an unsupported named character reference.");
    }
    hasUnsafeStaticReferences ||= discovery.hasUnsafeReferences;
    for (const entry of discovery.discovered) discoveredByKey.set(`${entry.artifactClass}\0${entry.originalUrl}`, entry);
  }
  for (const stylesheet of verifiedStylesheets) {
    const discovered = discoverStylesheetDependencies(
      stylesheet.contents,
      stylesheet.originalUrl,
      stylesheet.originalUrl,
      () => { hasUnsafeStaticReferences = true; },
    );
    hasRuntimeReferences ||= discovered.length > 0;
    for (const entry of discovered) discoveredByKey.set(`${entry.artifactClass}\0${entry.originalUrl}`, entry);
  }
  if (hasUnsafeStaticReferences) archiveError(errors, "Static dependency URL contains sensitive metadata.");
  const discoveredDependencies = sortedDiscoveries(discoveredByKey.values());
  const missingDiscoveredArtifacts = discoveredDependencies.filter((entry) => !hasVerifiedArtifact(verifiedArtifacts, entry));
  for (const entry of missingDiscoveredArtifacts) {
    archiveError(errors, `Missing discovered artifact: ${entry.artifactClass} ${entry.originalUrl}.`);
  }
  const runtimeDiscovery = runtimeDiscoveryCoverage(manifest.runtimeDiscovery, verifiedArtifacts, hasRuntimeReferences, errors);
  const evidencedArtifactClasses = new Set(
    verifiedArtifacts
      .map((artifact) => artifact.artifactClass)
      .filter((artifactClass) => !JAVASCRIPT_ARTIFACT_CLASSES.has(artifactClass)),
  );
  for (const entry of [...discoveredDependencies, ...runtimeDiscovery.observed]) {
    if (hasVerifiedArtifact(verifiedArtifacts, entry)) evidencedArtifactClasses.add(entry.artifactClass);
  }
  const missingArtifactClasses = requiredArtifactClasses.filter((artifactClass) => !evidencedArtifactClasses.has(artifactClass));
  if (missingArtifactClasses.length) {
    archiveError(errors, `Missing required artifact classes: ${missingArtifactClasses.join(", ")}.`);
  }
  const runtimeObservedKeys = new Set(runtimeDiscovery.observed.map((entry) => `${entry.artifactClass}\0${entry.originalUrl}`));
  const unobservedStaticDependencies = discoveredDependencies.filter((entry) => !runtimeObservedKeys.has(`${entry.artifactClass}\0${entry.originalUrl}`));
  const unobservedStaticExecutables = unobservedStaticDependencies.filter((entry) => EXECUTABLE_ARTIFACT_CLASSES.has(entry.artifactClass));
  const runtimeMissing = new Map(runtimeDiscovery.missing.map((entry) => [`${entry.artifactClass}\0${entry.originalUrl}`, entry]));
  for (const entry of unobservedStaticDependencies) {
    archiveError(errors, `Static dependency was not runtime-observed: ${entry.artifactClass} ${entry.originalUrl}.`);
    runtimeMissing.set(`${entry.artifactClass}\0${entry.originalUrl}`, { artifactClass: entry.artifactClass, originalUrl: entry.originalUrl });
  }
  runtimeDiscovery.missing = sortedDiscoveries(runtimeMissing.values());

  const complete = errors.length === 0;
  const status = {
    schemaVersion: 1,
    complete,
    snapshotId: complete ? snapshotId(verifiedArtifacts) : null,
    verifiedArtifacts: sortedRecords(verifiedArtifacts),
    missingArtifactClasses,
    discoveredDependencies,
    missingDiscoveredArtifacts,
    runtimeDiscovery,
    unobservedStaticDependencies,
    unobservedStaticExecutables,
    blocked,
    errors,
  };
  writeStatus(statusOutput, status);
  return status;
}

function usage() {
  console.error("Usage: node scripts/verify-source-archive.mjs <source-root> [manifest] [status-output]");
}

function main() {
  const [, , sourceRoot, manifestInput, statusInput] = process.argv;
  if (!sourceRoot) {
    usage();
    process.exitCode = 1;
    return;
  }
  const root = resolve(sourceRoot);
  const manifestPath = resolveArchivePath(root, manifestInput, "source-manifest.json");
  const statusPath = resolveArchivePath(root, statusInput, "archive-status.json");
  try {
    const status = verifySourceArchive(root, manifestPath, statusPath);
    if (!status.complete) process.exitCode = 1;
  } catch (error) {
    const manifest = manifestIfReadable(manifestPath);
    if (!manifest) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
      return;
    }
    const unsafeStatusOutput = statusOutputError(root, manifestPath, statusPath, manifest);
    if (unsafeStatusOutput) {
      console.error(unsafeStatusOutput);
      process.exitCode = 1;
      return;
    }
    writeStatus(statusPath, {
      schemaVersion: 1,
      complete: false,
      snapshotId: null,
      verifiedArtifacts: [],
      missingArtifactClasses: [],
      discoveredDependencies: [],
      missingDiscoveredArtifacts: [],
      runtimeDiscovery: { status: "unprocessed", method: null, capturedAt: null, observed: [], missing: [] },
      unobservedStaticDependencies: [],
      unobservedStaticExecutables: [],
      blocked: [],
      errors: [error instanceof Error ? error.message : String(error)],
    });
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
