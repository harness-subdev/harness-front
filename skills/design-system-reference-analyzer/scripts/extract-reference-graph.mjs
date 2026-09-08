#!/usr/bin/env node
/**
 * Deterministic HTML/CSS/JS reference graph extractor.
 *
 * Usage:
 *   node scripts/extract-reference-graph.mjs <sourceDir> <outputPath>
 *
 * This script intentionally uses only Node.js built-ins. It is not a full
 * browser parser; it creates a stable, source-grounded graph of selectors,
 * tokens, motion rules, JS events/state/mutations, assets, and library
 * signals. LLM analysis must use this graph as the primary structural source
 * before naming design-system components.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";

const MOTION_PROPS = new Set([
  "animation",
  "animation-name",
  "animation-duration",
  "animation-timing-function",
  "animation-delay",
  "animation-iteration-count",
  "transition",
  "transition-property",
  "transition-duration",
  "transition-timing-function",
  "transform",
  "opacity",
  "filter",
  "backdrop-filter",
  "clip-path",
  "mask",
  "mask-image",
  "mix-blend-mode",
  "scroll-behavior",
  "scroll-snap-type",
  "scroll-snap-align",
  "view-transition-name",
  "will-change",
]);

const STATE_WORDS = [
  "active",
  "current",
  "index",
  "selected",
  "open",
  "visible",
  "progress",
  "velocity",
  "speed",
  "pointer",
  "mouse",
  "touch",
  "scroll",
  "camera",
  "bounds",
  "target",
  "frame",
  "time",
  "delta",
  "x",
  "y",
  "z",
];

const STATE_CLASS_NAMES = new Set([
  "active",
  "act",
  "add-cursor",
  "bgt",
  "click_opct",
  "dis-no",
  "fixed",
  "fixed_end",
  "gnb_x",
  "go",
  "hidden",
  "hide-cursor",
  "img-aniload",
  "no_ham",
  "off",
  "on",
  "on2",
  "open",
  "overflow",
  "rolling_e",
  "scale_on",
  "select",
  "select_this",
  "slide_down",
  "visible",
]);

const JQUERY_EVENT_METHODS = new Set([
  "click",
  "hover",
  "mouseover",
  "mouseout",
  "mouseenter",
  "mouseleave",
  "scroll",
  "resize",
  "change",
  "submit",
  "keyup",
  "keydown",
  "input",
  "focus",
  "blur",
]);

const JQUERY_MUTATION_METHODS = new Set([
  "addClass",
  "removeClass",
  "toggleClass",
  "css",
  "hide",
  "show",
  "slideDown",
  "slideUp",
  "animate",
  "attr",
  "prop",
  "append",
  "prepend",
  "remove",
  "html",
  "text",
]);

const LIBRARY_PATTERNS = [
  ["GSAP", /\b(?:gsap|TweenMax|TimelineMax)\b/],
  ["ScrollTrigger", /\bScrollTrigger\b/],
  ["Lenis", /\bLenis\b/],
  ["Locomotive Scroll", /\bLocomotiveScroll\b|\blocmotive-scroll\b/i],
  ["Framer Motion", /\bframer-motion\b|\bMotionConfig\b/],
  ["anime.js", /\banime\s*\(|\banimejs\b/i],
  ["Three.js", /\bTHREE\b|\bthree\b|\bWebGLRenderer\b/],
  ["Matter.js", /\bMatter\b|\bmatter-js\b/i],
  ["p5.js", /\bp5\b|\bcreateCanvas\b/],
  ["Splitting", /\bSplitting\b|\bdata-splitting\b/],
  ["Swiper", /\bSwiper\b|\bswiper\b/],
  ["jQuery", /\bjQuery\b|\$\s*\(/],
];

const EXCLUDED_DIRS = new Set([".git", "node_modules", "dist", "build", ".next", ".cache"]);
const GENERATED_OUTPUT_RE = /^(?:reference-graph(?:[-\w]*)?|reference-index(?:[-\w]*)?|component-contracts(?:[-\w]*)?)\.json$/;
const HTML_EXTS = new Set([".html", ".htm"]);
const CSS_EXTS = new Set([".css", ".scss", ".sass", ".less"]);
const JS_EXTS = new Set([".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx"]);
const SHADER_EXTS = new Set([".glsl", ".vert", ".frag", ".wgsl"]);
const GPU_ASSET_EXTS = new Set([".glb", ".gltf", ".bin", ".ktx2", ".basis", ".dds", ".hdr", ".exr", ".wasm"]);
const ASSET_EXTS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg", ".ico",
  ".mp4", ".webm", ".mov", ".mp3", ".wav", ".ogg",
  ".woff", ".woff2", ".ttf", ".otf", ".eot",
]);
const RAW_TEXT_TAGS = new Set(["script", "style", "textarea", "title"]);
const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const P_CLOSE_BEFORE_TAGS = new Set([
  "address", "article", "aside", "blockquote", "details", "dialog", "div", "dl", "fieldset",
  "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header",
  "hr", "main", "menu", "nav", "ol", "p", "pre", "section", "table", "ul",
]);
const OPTIONAL_CLOSE_RULES = {
  li: { tags: new Set(["li"]), blockers: new Set(["ul", "ol", "menu"]) },
  p: { tags: new Set(["p"]), blockers: new Set([]) },
  dt: { tags: new Set(["dt", "dd"]), blockers: new Set(["dl"]) },
  dd: { tags: new Set(["dt", "dd"]), blockers: new Set(["dl"]) },
  option: { tags: new Set(["option"]), blockers: new Set(["select", "optgroup", "datalist"]) },
  thead: { tags: new Set(["thead", "tbody", "tfoot"]), blockers: new Set(["table"]) },
  tbody: { tags: new Set(["thead", "tbody", "tfoot"]), blockers: new Set(["table"]) },
  tfoot: { tags: new Set(["thead", "tbody", "tfoot"]), blockers: new Set(["table"]) },
  tr: { tags: new Set(["tr"]), blockers: new Set(["table", "thead", "tbody", "tfoot"]) },
  td: { tags: new Set(["td", "th"]), blockers: new Set(["tr"]) },
  th: { tags: new Set(["td", "th"]), blockers: new Set(["tr"]) },
};

function usage() {
  console.error("Usage: node extract-reference-graph.mjs <sourceDir> <outputPath>");
  process.exit(1);
}

function lineNumberAt(content, index) {
  return content.slice(0, Math.max(0, index)).split(/\r?\n/).length;
}

function countLines(content) {
  if (content.length === 0) return 0;
  return content.endsWith("\n") ? content.split(/\r?\n/).length - 1 : content.split(/\r?\n/).length;
}

function stableId(prefix, parts) {
  const raw = parts.filter(Boolean).join(":");
  return `${prefix}:${raw.replace(/[^a-zA-Z0-9_.:/#\-[\]=]/g, "_")}`;
}

function addNode(graph, node) {
  if (!graph.nodeIndex.has(node.id)) {
    graph.nodeIndex.set(node.id, node);
    graph.nodes.push(node);
    if (node.type === "dom-node") {
      graph.domNodesCache = null;
      graph.selectorTargetCache?.clear();
    }
  }
  return node.id;
}

function addEdge(graph, source, target, type, data = {}) {
  if (!source || !target || source === target) return;
  const key = `${source}\u0000${target}\u0000${type}`;
  if (graph.edgeIndex.has(key)) return;
  graph.edgeIndex.add(key);
  graph.edges.push({ source, target, type, ...data });
}

function walkFiles(root) {
  const out = [];
  const visit = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      if (EXCLUDED_DIRS.has(name)) continue;
      const abs = join(dir, name);
      const st = statSync(abs);
      if (st.isDirectory()) {
        visit(abs);
      } else if (st.isFile()) {
        out.push(abs);
      }
    }
  };
  visit(root);
  return out;
}

function logProgress(message) {
  if (process.env.DSRA_QUIET === "1") return;
  console.error(`[extract-reference-graph] ${message}`);
}

function classifyFile(filePath) {
  const ext = extname(filePath).toLowerCase();
  if (HTML_EXTS.has(ext)) return "html";
  if (CSS_EXTS.has(ext)) return "css";
  if (JS_EXTS.has(ext)) return "js";
  if (SHADER_EXTS.has(ext)) return "shader";
  if (GPU_ASSET_EXTS.has(ext)) return "gpu-asset";
  if (ASSET_EXTS.has(ext)) return "asset";
  return "other";
}

function parseAttrs(raw) {
  const attrs = {};
  const attrRe = /([:@\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = attrRe.exec(raw))) {
    const key = m[1];
    const value = m[2] ?? m[3] ?? m[4] ?? "";
    attrs[key] = value;
  }
  return attrs;
}

function selectorKeysForElement(tag, attrs) {
  const keys = new Set([tag.toLowerCase()]);
  if (attrs.id) keys.add(`#${attrs.id}`);
  if (attrs.class) {
    for (const cls of attrs.class.split(/\s+/).filter(Boolean)) keys.add(`.${cls}`);
  }
  for (const key of Object.keys(attrs)) {
    if (key.startsWith("data-")) keys.add(`[${key}]`);
    if (key.startsWith("aria-")) keys.add(`[${key}]`);
  }
  return [...keys];
}

function findTagEnd(content, start) {
  let quote = null;
  for (let i = start + 1; i < content.length; i++) {
    const ch = content[i];
    if (quote) {
      if (ch === quote && content[i - 1] !== "\\") quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === ">") return i;
  }
  return -1;
}

function findRawTextClose(content, tag, start) {
  const closeRe = new RegExp(`</\\s*${escapeRegExp(tag)}\\s*>`, "ig");
  closeRe.lastIndex = start;
  const match = closeRe.exec(content);
  return match ? { start: match.index, end: match.index + match[0].length } : null;
}

function markRecovered(node) {
  if (!node) return;
  node.hierarchyConfidence = "recovered";
}

function recordHierarchyWarning(graph, warning) {
  if (!graph.hierarchyWarnings) graph.hierarchyWarnings = [];
  graph.hierarchyWarnings.push(warning);
}

function closeStackTo(graph, stack, targetIndex, closeLine, closeOffset, reason, closingTag = null) {
  const recovered = reason !== "explicit" || targetIndex !== stack.length - 1;
  const closedTags = [];
  const closedEntries = [];
  for (let i = stack.length - 1; i >= targetIndex; i--) {
    const entry = stack.pop();
    closedEntries.push(entry);
    entry.node.closeLine = closeLine;
    entry.node.sourceRange = {
      ...(entry.node.sourceRange || { start: entry.openOffset }),
      end: closeOffset,
    };
    if (recovered || i !== targetIndex) markRecovered(entry.node);
    closedTags.push(entry.tag);
  }
  if (recovered) {
    recordHierarchyWarning(graph, {
      type: reason,
      line: closeLine,
      tag: closingTag,
      closedTags,
      message: `Recovered ${reason} hierarchy at line ${closeLine}${closingTag ? ` while closing ${closingTag}` : ""}`,
    });
    if (reason === "explicit" && ["ul", "ol", "menu"].includes(closingTag)) {
      const recoveredListItem = closedEntries.find((entry) => entry.tag === "li");
      if (recoveredListItem) graph.recoveredListParent = recoveredListItem.node;
    }
  }
}

function closeOptionalAncestorBeforeOpening(graph, stack, tag, line, offset) {
  if (P_CLOSE_BEFORE_TAGS.has(tag)) {
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i].tag === "p") {
        closeStackTo(graph, stack, i, line, offset, "optional-close", tag);
        break;
      }
    }
  }

  const rule = OPTIONAL_CLOSE_RULES[tag];
  if (!rule) return;
  for (let i = stack.length - 1; i >= 0; i--) {
    const entry = stack[i];
    if (rule.blockers.has(entry.tag)) return;
    if (rule.tags.has(entry.tag)) {
      closeStackTo(graph, stack, i, line, offset, "optional-close", tag);
      return;
    }
  }
}

function closeNearestMatchingAncestor(graph, stack, tag, line, closeOffset) {
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i].tag === tag) {
      closeStackTo(graph, stack, i, line, closeOffset, "explicit", tag);
      return;
    }
  }
  recordHierarchyWarning(graph, {
    type: "unmatched-close",
    line,
    tag,
    closedTags: [],
    message: `Ignored unmatched closing tag </${tag}> at line ${line}`,
  });
}

function extractHtml(graph, artifact, content) {
  const domNodes = [];
  const linkedStylesheets = [];
  const linkedScripts = [];
  const assets = [];
  const inlineStyles = [];
  const inlineScripts = [];
  const selectorIndex = graph.selectorIndex;
  const stack = [];
  let index = 0;

  while (index < content.length) {
    const tagStart = content.indexOf("<", index);
    if (tagStart === -1) break;

    if (content.startsWith("<!--", tagStart)) {
      const commentEnd = content.indexOf("-->", tagStart + 4);
      index = commentEnd === -1 ? content.length : commentEnd + 3;
      continue;
    }

    const tagEnd = findTagEnd(content, tagStart);
    if (tagEnd === -1) {
      recordHierarchyWarning(graph, {
        type: "unterminated-tag",
        line: lineNumberAt(content, tagStart),
        tag: null,
        closedTags: [],
        message: `Ignored unterminated tag at line ${lineNumberAt(content, tagStart)}`,
      });
      break;
    }

    const rawTag = content.slice(tagStart, tagEnd + 1);
    const inner = rawTag.slice(1, -1).trim();
    if (!inner || inner.startsWith("!") || inner.startsWith("?")) {
      index = tagEnd + 1;
      continue;
    }

    const closeMatch = inner.match(/^\/\s*([a-zA-Z][\w:-]*)/);
    if (closeMatch) {
      const tag = closeMatch[1].toLowerCase();
      closeNearestMatchingAncestor(graph, stack, tag, lineNumberAt(content, tagStart), tagEnd + 1);
      if (!["ul", "ol", "menu", "li", "a"].includes(tag)) graph.recoveredListParent = null;
      index = tagEnd + 1;
      continue;
    }

    const openMatch = inner.match(/^([a-zA-Z][\w:-]*)([\s\S]*)$/);
    if (!openMatch) {
      index = tagEnd + 1;
      continue;
    }

    const tag = openMatch[1].toLowerCase();
    let attrText = openMatch[2] || "";
    const isSelfClosing = /\/\s*$/.test(attrText);
    if (isSelfClosing) attrText = attrText.replace(/\/\s*$/, "");
    closeOptionalAncestorBeforeOpening(graph, stack, tag, lineNumberAt(content, tagStart), tagStart);

    const attrs = parseAttrs(attrText);
    const line = lineNumberAt(content, tagStart);
    const classes = attrs.class ? attrs.class.split(/\s+/).filter(Boolean) : [];
    const recoveredListParent = graph.recoveredListParent;
    const useRecoveredListParent =
      recoveredListParent &&
      ["ul", "ol", "menu"].includes(tag) &&
      classes.some((cls) => /nested/i.test(cls));
    const parent = useRecoveredListParent ? recoveredListParent : stack.length ? stack[stack.length - 1].node : null;
    const nodeId = stableId("dom", [artifact.path, tagStart, line, tag, attrs.id || attrs.class || "node"]);
    const selectorKeys = selectorKeysForElement(tag, attrs);
    const isLandmark = ["main", "nav", "header", "footer", "section", "article", "aside", "form", "dialog", "canvas"].includes(tag);
    const dataAttrs = Object.keys(attrs).filter((k) => k.startsWith("data-"));
    const ariaAttrs = Object.keys(attrs).filter((k) => k.startsWith("aria-"));
    const node = {
      id: nodeId,
      type: "dom-node",
      filePath: artifact.path,
      name: attrs.id ? `${tag}#${attrs.id}` : attrs.class ? `${tag}.${attrs.class.split(/\s+/)[0]}` : tag,
      line,
      parent: parent ? parent.id : null,
      children: [],
      depth: parent ? (typeof parent.depth === "number" ? parent.depth + 1 : stack.length) : 0,
      openLine: line,
      closeLine: VOID_TAGS.has(tag) || isSelfClosing ? line : null,
      sourceRange: {
        start: tagStart,
        end: VOID_TAGS.has(tag) || isSelfClosing ? tagEnd + 1 : null,
      },
      hierarchyConfidence: useRecoveredListParent ? "recovered" : "exact",
      tag,
      idAttr: attrs.id || null,
      classes,
      dataAttrs,
      ariaAttrs,
      role: attrs.role || null,
      attributes: attrs,
      selectorKeys,
      isLandmark,
    };
    addNode(graph, node);
    addEdge(graph, artifact.nodeId, nodeId, "contains", { evidence: `HTML <${tag}> at line ${line}` });
    if (parent) {
      parent.children.push(nodeId);
      addEdge(graph, parent.id, nodeId, "contains", { evidence: `DOM child <${tag}> at line ${line}` });
    }

    for (const key of selectorKeys) {
      if (!selectorIndex.has(key)) selectorIndex.set(key, new Set());
      selectorIndex.get(key).add(nodeId);
    }
    domNodes.push(nodeId);

    if (tag === "link" && /stylesheet/i.test(attrs.rel || "") && attrs.href) {
      linkedStylesheets.push({ href: attrs.href, line });
    }
    if (tag === "script") {
      if (attrs.src) linkedScripts.push({ src: attrs.src, line });
      else inlineScripts.push({ line });
    }
    if (tag === "style") inlineStyles.push({ line });
    for (const attr of ["src", "href", "poster"]) {
      if (attrs[attr] && looksLikeAsset(attrs[attr])) assets.push({ url: attrs[attr], line, attr, domNodeId: nodeId });
    }

    if (VOID_TAGS.has(tag) || isSelfClosing) {
      index = tagEnd + 1;
      continue;
    }

    stack.push({ tag, node, openOffset: tagStart });
    if (RAW_TEXT_TAGS.has(tag)) {
      const close = findRawTextClose(content, tag, tagEnd + 1);
      if (close) {
        if (tag === "script" && inlineShaderStage(attrs.type)) {
          extractInlineShader(graph, artifact, node, attrs, content, { start: tagEnd + 1, end: close.start });
        }
        closeNearestMatchingAncestor(graph, stack, tag, lineNumberAt(content, close.start), close.end);
        index = close.end;
      } else {
        index = content.length;
      }
      continue;
    }

    index = tagEnd + 1;
  }

  while (stack.length > 0) {
    const entry = stack.pop();
    markRecovered(entry.node);
    entry.node.sourceRange = {
      ...(entry.node.sourceRange || { start: entry.openOffset }),
      end: content.length,
    };
    recordHierarchyWarning(graph, {
      type: "unclosed-tag",
      line: lineNumberAt(content, entry.openOffset),
      tag: entry.tag,
      closedTags: [entry.tag],
      message: `Recovered unclosed <${entry.tag}> opened at line ${lineNumberAt(content, entry.openOffset)}`,
    });
  }

  for (const item of linkedStylesheets) {
    const hrefNode = addNode(graph, {
      id: stableId("asset", [artifact.path, "stylesheet", item.href]),
      type: "asset",
      name: basename(item.href),
      url: item.href,
      filePath: artifact.path,
      line: item.line,
      assetKind: "stylesheet-link",
    });
    addEdge(graph, artifact.nodeId, hrefNode, "loads", { evidence: `link rel=stylesheet at line ${item.line}` });
  }
  for (const item of linkedScripts) {
    const srcNode = addNode(graph, {
      id: stableId("asset", [artifact.path, "script", item.src]),
      type: "asset",
      name: basename(item.src),
      url: item.src,
      filePath: artifact.path,
      line: item.line,
      assetKind: "script-link",
    });
    addEdge(graph, artifact.nodeId, srcNode, "loads", { evidence: `script src at line ${item.line}` });
  }
  for (const item of assets) {
    const assetNode = addNode(graph, {
      id: stableId("asset", [artifact.path, item.attr, item.url]),
      type: "asset",
      name: basename(item.url),
      url: item.url,
      filePath: artifact.path,
      line: item.line,
      assetKind: item.attr,
    });
    addEdge(graph, artifact.nodeId, assetNode, "uses_asset", { evidence: `${item.attr} at line ${item.line}` });
    if (item.domNodeId) {
      addEdge(graph, item.domNodeId, assetNode, "uses_asset", { evidence: `${item.attr} at line ${item.line}` });
    }
  }

  graph.inventories.html.push({
    filePath: artifact.path,
    domNodeCount: domNodes.length,
    linkedStylesheets,
    linkedScripts,
    inlineStyles,
    inlineScripts,
    landmarks: domNodes
      .map((id) => graph.nodeIndex.get(id))
      .filter((n) => n && n.isLandmark)
      .map((n) => ({ id: n.id, tag: n.tag, name: n.name, line: n.line })),
  });
}

function looksLikeAsset(value) {
  const clean = value.split(/[?#]/)[0].toLowerCase();
  const ext = extname(clean);
  return ASSET_EXTS.has(ext) || GPU_ASSET_EXTS.has(ext);
}

function splitCssRules(content) {
  const rules = [];
  let i = 0;
  while (i < content.length) {
    const start = content.indexOf("{", i);
    if (start === -1) break;
    const selector = content.slice(i, start).trim();
    let depth = 1;
    let j = start + 1;
    while (j < content.length && depth > 0) {
      if (content[j] === "{") depth++;
      if (content[j] === "}") depth--;
      j++;
    }
    const body = content.slice(start + 1, j - 1);
    rules.push({ selector, body, index: i });
    i = j;
  }
  return rules;
}

function parseDeclarations(body) {
  const declarations = [];
  const declRe = /(-?[\w-]+)\s*:\s*([^;{}]+);?/g;
  let m;
  while ((m = declRe.exec(body))) {
    declarations.push({ property: m[1].trim(), value: m[2].trim() });
  }
  return declarations;
}

function extractSimpleSelectorKeys(selector) {
  const keys = new Set();
  const selectors = selector.split(",");
  for (const part of selectors) {
    const clean = part
      .replace(/::?[\w-]+(?:\([^)]*\))?/g, "")
      .replace(/["']/g, "")
      .trim();
    const idMatches = clean.match(/#[\w-]+/g) || [];
    const classMatches = clean.match(/\.[\w-]+/g) || [];
    const dataMatches = clean.match(/\[data-[^\]=\s]+(?:=[^\]]+)?\]/g) || [];
    for (const id of idMatches) keys.add(id);
    for (const cls of classMatches) keys.add(cls);
    for (const data of dataMatches) keys.add(data.replace(/=.*/, "]"));
    const firstTag = clean.match(/(^|\s|>|\+|~)([a-zA-Z][\w-]*)/);
    if (firstTag) keys.add(firstTag[2].toLowerCase());
  }
  return [...keys];
}

function splitSelectorList(selector) {
  const parts = [];
  let start = 0;
  let bracketDepth = 0;
  let parenDepth = 0;
  let quote = null;
  for (let i = 0; i < selector.length; i++) {
    const ch = selector[i];
    if (quote) {
      if (ch === quote && selector[i - 1] !== "\\") quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === "[") bracketDepth++;
    if (ch === "]") bracketDepth = Math.max(0, bracketDepth - 1);
    if (ch === "(") parenDepth++;
    if (ch === ")") parenDepth = Math.max(0, parenDepth - 1);
    if (ch === "," && bracketDepth === 0 && parenDepth === 0) {
      parts.push(selector.slice(start, i).trim());
      start = i + 1;
    }
  }
  const last = selector.slice(start).trim();
  if (last) parts.push(last);
  return parts;
}

function normalizeSelectorForMatching(selector) {
  return String(selector || "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/::?[\w-]+(?:\([^)]*\))?/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function rightmostCompoundSelector(selector) {
  const clean = normalizeSelectorForMatching(selector);
  if (!clean) return "";
  const chunks = clean
    .split(/\s+|>|\+|~/)
    .map((part) => part.trim())
    .filter(Boolean);
  for (let i = chunks.length - 1; i >= 0; i--) {
    const compound = parseCompoundSelector(chunks[i]);
    if (compound.idAttr || compound.dataAttrs.length || compound.ariaAttrs.length || compound.classes.some((cls) => !STATE_CLASS_NAMES.has(cls))) {
      return chunks[i];
    }
  }
  return selectorHasStableHook(clean) ? "" : chunks[chunks.length - 1] || clean;
}

function selectorHasStableHook(selector) {
  const clean = normalizeSelectorForMatching(selector);
  return /#[\w-]+|\.[\w-]+|\[data-|\[aria-/.test(clean);
}

function parseCompoundSelector(compound) {
  const clean = String(compound || "").trim();
  const tagMatch = clean.match(/^([a-zA-Z][\w-]*)/);
  const idMatches = clean.match(/#[\w-]+/g) || [];
  const classMatches = clean.match(/\.[\w-]+/g) || [];
  const dataMatches = clean.match(/\[data-([^\]=\s]+)(?:=[^\]]+)?\]/g) || [];
  const ariaMatches = clean.match(/\[aria-([^\]=\s]+)(?:=[^\]]+)?\]/g) || [];
  return {
    tag: tagMatch ? tagMatch[1].toLowerCase() : null,
    idAttr: idMatches[0] ? idMatches[0].slice(1) : null,
    classes: classMatches.map((item) => item.slice(1)),
    dataAttrs: dataMatches.map((item) => item.slice(1, -1).replace(/=.*/, "")),
    ariaAttrs: ariaMatches.map((item) => item.slice(1, -1).replace(/=.*/, "")),
  };
}

function domMatchesCompound(dom, compound) {
  if (compound.tag && dom.tag !== compound.tag) return false;
  if (compound.idAttr && dom.idAttr !== compound.idAttr) return false;
  for (const cls of compound.classes) {
    if (!dom.classes?.includes(cls)) return false;
  }
  for (const attr of compound.dataAttrs) {
    if (!dom.dataAttrs?.includes(attr)) return false;
  }
  for (const attr of compound.ariaAttrs) {
    if (!dom.ariaAttrs?.includes(attr)) return false;
  }
  return true;
}

function relaxStateClasses(compound) {
  if (!compound.classes?.length) return compound;
  const stableClasses = compound.classes.filter((cls) => !STATE_CLASS_NAMES.has(cls));
  if (stableClasses.length === compound.classes.length || stableClasses.length === 0) return compound;
  return { ...compound, classes: stableClasses };
}

function resolveSelectorTargets(graph, selector) {
  const clean = String(selector || "").trim();
  if (!clean || clean === "window" || clean === "document" || clean === "this" || clean === "unknown") return [];
  if (!graph.selectorTargetCache) graph.selectorTargetCache = new Map();
  if (graph.selectorTargetCache.has(clean)) return graph.selectorTargetCache.get(clean);

  const domNodes = getDomNodes(graph);
  const ids = new Set();

  for (const part of splitSelectorList(clean)) {
    const compoundSelector = rightmostCompoundSelector(part);
    if (!compoundSelector || compoundSelector === "*") continue;
    const compound = parseCompoundSelector(compoundSelector);
    if (!compound.tag && !compound.idAttr && compound.classes.length === 0 && compound.dataAttrs.length === 0 && compound.ariaAttrs.length === 0) continue;
    let matches = domNodes.filter((dom) => domMatchesCompound(dom, compound));
    if (matches.length === 0) {
      const relaxed = relaxStateClasses(compound);
      if (relaxed !== compound) {
        matches = domNodes.filter((dom) => domMatchesCompound(dom, relaxed));
      }
    }
    for (const dom of matches) ids.add(dom.id);
  }

  const resolved = [...ids];
  graph.selectorTargetCache.set(clean, resolved);
  return resolved;
}

function selectorLooksLikeHtml(value) {
  return /^</.test(String(value || "").trim());
}

function parseJquerySelectorLiteral(rawSelector) {
  const selector = String(rawSelector || "").trim();
  if (!selector || selectorLooksLikeHtml(selector)) return null;
  return selector;
}

function hasJquerySyntax(content) {
  return /(?:\$\s*\(|\bjQuery\s*\()/.test(content);
}

function buildJquerySubjectPattern(aliasMap = new Map()) {
  const jqueryCallSubject = String.raw`(?:\$\s*\(\s*(?:"[^"]+"|'[^']+'|\`[^\`]+\`|window|document|this)\s*\)|\bjQuery\s*\(\s*(?:"[^"]+"|'[^']+'|\`[^\`]+\`|window|document|this)\s*\))`;
  const aliases = [...aliasMap.keys()].filter(Boolean).map(escapeRegExp);
  return aliases.length ? `(?:${jqueryCallSubject}|(?:${aliases.join("|")}))` : jqueryCallSubject;
}

function getDomNodes(graph) {
  if (!graph.domNodesCache) {
    graph.domNodesCache = graph.nodes.filter((n) => n.type === "dom-node");
  }
  return graph.domNodesCache;
}

function parseJquerySubjectExpression(expression, aliasMap = new Map()) {
  const subject = String(expression || "").trim();
  if (!subject) return "unknown";
  if (subject === "$(this)" || subject === "this") return "this";
  const jqueryCall = subject.match(/^(?:\$|jQuery)\s*\(\s*(?:(['"`])([^'"`]+)\1|(window|document|this))\s*\)$/);
  if (jqueryCall) return parseJquerySelectorLiteral(jqueryCall[2] || jqueryCall[3]);
  if (aliasMap.has(subject)) return aliasMap.get(subject);
  return subject;
}

function addJsSelector(graph, artifact, selector, selectorKind, line, extra = {}) {
  const normalized = parseJquerySelectorLiteral(selector);
  if (!normalized) return null;
  const nodeId = addNode(graph, {
    id: stableId("js-selector", [artifact.path, line, selectorKind, normalized]),
    type: "js-selector",
    name: normalized,
    selector: normalized,
    selectorKind,
    filePath: artifact.path,
    line,
    ...extra,
  });
  addEdge(graph, artifact.nodeId, nodeId, "contains", { evidence: `${selectorKind} selector at line ${line}` });
  for (const domId of resolveSelectorTargets(graph, normalized)) {
    addEdge(graph, nodeId, domId, "matches_selector", { evidence: `JS selector ${normalized}` });
  }
  return nodeId;
}

function edgeTypeForJqueryMutation(operation) {
  if (["addClass", "removeClass", "toggleClass"].includes(operation)) return "mutates_class";
  if (["css", "hide", "show", "slideDown", "slideUp", "animate"].includes(operation)) return "mutates_style";
  if (["attr", "prop"].includes(operation)) return "mutates_attribute";
  return "mutates_dom";
}

function extractQuotedTokens(value) {
  const out = [];
  const re = /(['"`])([^'"`]+)\1/g;
  let m;
  while ((m = re.exec(value))) {
    for (const token of m[2].split(/\s+/).filter(Boolean)) out.push(token);
  }
  return out;
}

function buildJqueryAliasMap(content) {
  const aliasMap = new Map();
  const aliasPatterns = [
    /\b(?:let|const|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:\$|jQuery)\s*\(\s*(?:(['"`])([^'"`]+)\2|(window|document|this))\s*\)/g,
    /(?:^|[;\n])\s*([A-Za-z_$][\w$]*)\s*=\s*(?:\$|jQuery)\s*\(\s*(?:(['"`])([^'"`]+)\2|(window|document|this))\s*\)/g,
  ];
  for (const aliasRe of aliasPatterns) {
    let m;
    while ((m = aliasRe.exec(content))) {
      const name = m[1];
      const selector = parseJquerySelectorLiteral(m[3] || m[4]);
      if (name && selector) aliasMap.set(name, selector);
    }
  }
  return aliasMap;
}

function extractJquerySelectors(graph, artifact, content, selectors, aliasMap) {
  if (!hasJquerySyntax(content) && aliasMap.size === 0) return;

  const jqueryCallRe = /(?:\$|jQuery)\s*\(\s*(?:(['"`])([^'"`]+)\1|(window|document|this))\s*\)/g;
  let m;
  while ((m = jqueryCallRe.exec(content))) {
    const selector = parseJquerySelectorLiteral(m[2] || m[3]);
    if (!selector) continue;
    const line = lineNumberAt(content, m.index);
    const nodeId = addJsSelector(graph, artifact, selector, "jquery", line);
    if (!nodeId) continue;
    selectors.push({
      id: nodeId,
      selector,
      kind: "jquery",
      line,
      resolvedDomCount: resolveSelectorTargets(graph, selector).length,
    });
  }

  for (const [name, selector] of aliasMap) {
    const aliasRe = new RegExp(`(?:\\b(?:let|const|var)\\s+|^|[;\\n])\\s*${escapeRegExp(name)}\\s*=\\s*(?:\\$|jQuery)\\s*\\(`);
    const match = content.match(aliasRe);
    const line = match ? lineNumberAt(content, match.index || 0) : 1;
    const nodeId = addJsSelector(graph, artifact, selector, "jquery-alias", line, { alias: name });
    if (!nodeId) continue;
    selectors.push({
      id: nodeId,
      selector,
      kind: "jquery-alias",
      alias: name,
      line,
      resolvedDomCount: resolveSelectorTargets(graph, selector).length,
    });
  }
}

function addEventListenerNode(graph, artifact, eventListeners, event) {
  const listenSelector = event.delegatedSelector || event.targetSelector;
  const nodeId = addNode(graph, {
    id: stableId("event", [
      artifact.path,
      event.line,
      event.sourceKind || "event",
      event.eventType,
      event.targetExpression || event.targetSelector,
      event.delegatedSelector,
    ]),
    type: "event-listener",
    name: `${event.eventType} on ${event.delegatedSelector || event.targetSelector || event.targetExpression || "unknown"}`,
    eventType: event.eventType,
    targetExpression: event.targetExpression || event.targetSelector || "unknown",
    targetSelector: event.targetSelector || null,
    delegatedSelector: event.delegatedSelector || null,
    handlerExpression: cleanExpression(event.handlerExpression || ""),
    sourceKind: event.sourceKind || "unknown",
    filePath: artifact.path,
    line: event.line,
  });
  addEdge(graph, artifact.nodeId, nodeId, "listens_to", { evidence: `${event.sourceKind || "event"} ${event.eventType} at line ${event.line}` });

  if (listenSelector) {
    const selectorId = addJsSelector(graph, artifact, listenSelector, `${event.sourceKind || "event"}-target`, event.line);
    if (selectorId) addEdge(graph, nodeId, selectorId, "listens_to", { evidence: `${event.eventType} target selector ${listenSelector}` });
    for (const domId of resolveSelectorTargets(graph, listenSelector)) {
      addEdge(graph, nodeId, domId, "listens_to", { evidence: `${event.eventType} target selector ${listenSelector}` });
    }
  }

  eventListeners.push({
    id: nodeId,
    eventType: event.eventType,
    targetExpression: event.targetExpression || event.targetSelector || "unknown",
    targetSelector: event.targetSelector || null,
    delegatedSelector: event.delegatedSelector || null,
    sourceKind: event.sourceKind || "unknown",
    line: event.line,
  });
  return nodeId;
}

function extractJqueryEvents(graph, artifact, content, eventListeners, aliasMap) {
  if (!hasJquerySyntax(content) && aliasMap.size === 0) return;

  const subjectPattern = buildJquerySubjectPattern(aliasMap);
  const directEventRe = new RegExp(`(${subjectPattern})(?:\\.[A-Za-z_$][\\w$]*\\s*\\([^;{}\\n]*\\))*\\.(${[...JQUERY_EVENT_METHODS].join("|")})\\s*\\(`, "g");
  let m;
  while ((m = directEventRe.exec(content))) {
    const method = m[2];
    const line = lineNumberAt(content, m.index);
    const targetSelector = parseJquerySubjectExpression(m[1], aliasMap);
    const eventTypes = method === "hover" ? ["mouseenter", "mouseleave"] : [method];
    for (const eventType of eventTypes) {
      addEventListenerNode(graph, artifact, eventListeners, {
        eventType,
        targetExpression: m[1],
        targetSelector,
        sourceKind: "jquery",
        line,
      });
    }
  }

  const onEventRe = new RegExp(`(${subjectPattern})(?:\\.[A-Za-z_$][\\w$]*\\s*\\([^;{}\\n]*\\))*\\.on\\s*\\(\\s*(['"\`])([^'"\`]+)\\2(?:\\s*,\\s*(['"\`])([^'"\`]+)\\4)?`, "g");
  while ((m = onEventRe.exec(content))) {
    const line = lineNumberAt(content, m.index);
    const targetSelector = parseJquerySubjectExpression(m[1], aliasMap);
    const delegatedSelector = parseJquerySelectorLiteral(m[5] || "");
    for (const eventType of m[3].split(/\s+/).filter(Boolean)) {
      addEventListenerNode(graph, artifact, eventListeners, {
        eventType,
        targetExpression: m[1],
        targetSelector,
        delegatedSelector,
        sourceKind: "jquery-on",
        line,
      });
    }
  }
}

function addMutationNode(graph, artifact, mutations, mutation) {
  const edgeType = mutation.edgeType || edgeTypeForJqueryMutation(mutation.operation);
  const nodeId = addNode(graph, {
    id: stableId("mutation", [
      artifact.path,
      mutation.line,
      edgeType,
      mutation.operation,
      mutation.targetSelector || mutation.targetExpression,
      mutation.expression?.slice(0, 80),
    ]),
    type: "dom-mutation",
    name: mutation.expression?.slice(0, 100) || `${mutation.operation} ${mutation.targetSelector || ""}`,
    mutationKind: edgeType,
    operation: mutation.operation,
    expression: mutation.expression || "",
    targetExpression: mutation.targetExpression || mutation.targetSelector || null,
    targetSelector: mutation.targetSelector || null,
    classNames: mutation.classNames || [],
    styleProperty: mutation.styleProperty || null,
    sourceKind: mutation.sourceKind || "unknown",
    filePath: artifact.path,
    line: mutation.line,
  });
  addEdge(graph, artifact.nodeId, nodeId, edgeType, { evidence: `${mutation.expression || mutation.operation} at line ${mutation.line}` });

  if (mutation.targetSelector) {
    const selectorId = addJsSelector(graph, artifact, mutation.targetSelector, `${mutation.sourceKind || "mutation"}-target`, mutation.line);
    if (selectorId) addEdge(graph, nodeId, selectorId, edgeType, { evidence: `${mutation.operation} target selector ${mutation.targetSelector}` });
    for (const domId of resolveSelectorTargets(graph, mutation.targetSelector)) {
      addEdge(graph, nodeId, domId, edgeType, { evidence: `${mutation.operation} target selector ${mutation.targetSelector}` });
    }
  }

  mutations.push({
    id: nodeId,
    mutationKind: edgeType,
    operation: mutation.operation,
    expression: mutation.expression || "",
    targetSelector: mutation.targetSelector || null,
    classNames: mutation.classNames || [],
    line: mutation.line,
  });
  return nodeId;
}

function extractJqueryMutations(graph, artifact, content, mutations, aliasMap) {
  if (!hasJquerySyntax(content) && aliasMap.size === 0) return;

  const subjectPattern = buildJquerySubjectPattern(aliasMap);
  const mutationRe = new RegExp(`(${subjectPattern})(?:\\.[A-Za-z_$][\\w$]*\\s*\\([^;{}\\n]*\\))*\\.(${[...JQUERY_MUTATION_METHODS].join("|")})\\s*\\(([^;\\n]*)`, "g");
  let m;
  while ((m = mutationRe.exec(content))) {
    const operation = m[2];
    const line = lineNumberAt(content, m.index);
    const targetSelector = parseJquerySubjectExpression(m[1], aliasMap);
    const args = m[3] || "";
    addMutationNode(graph, artifact, mutations, {
      edgeType: edgeTypeForJqueryMutation(operation),
      operation,
      expression: cleanExpression(m[0]),
      targetExpression: m[1],
      targetSelector,
      classNames: ["addClass", "removeClass", "toggleClass"].includes(operation) ? extractQuotedTokens(args) : [],
      styleProperty: operation === "css" ? extractQuotedTokens(args)[0] || null : null,
      sourceKind: "jquery",
      line,
    });
  }
}

function findLibraryNode(graph, name) {
  return graph.nodes.find((node) => node.type === "library" && node.name === name);
}

function addControllerNode(graph, artifact, schedules, controller) {
  const nodeId = addNode(graph, {
    id: stableId("controller", [
      artifact.path,
      controller.controllerKind,
      controller.line,
      controller.targetSelector,
      controller.triggerSelector,
    ]),
    type: "interaction-controller",
    name: controller.name || controller.controllerKind,
    controllerKind: controller.controllerKind,
    targetSelector: controller.targetSelector || null,
    triggerSelector: controller.triggerSelector || null,
    optionsSnippet: cleanExpression(controller.optionsSnippet || ""),
    filePath: artifact.path,
    line: controller.line,
  });
  addEdge(graph, artifact.nodeId, nodeId, "controls", { evidence: `${controller.controllerKind} at line ${controller.line}` });

  const libraryNode = controller.library ? findLibraryNode(graph, controller.library) : null;
  if (libraryNode) addEdge(graph, nodeId, libraryNode.id, "uses_library", { evidence: `${controller.controllerKind} uses ${controller.library}` });

  for (const selector of [controller.targetSelector, controller.triggerSelector].filter(Boolean)) {
    const selectorId = addJsSelector(graph, artifact, selector, `${controller.controllerKind}-target`, controller.line);
    if (selectorId) addEdge(graph, nodeId, selectorId, "controls", { evidence: `${controller.controllerKind} selector ${selector}` });
    for (const domId of resolveSelectorTargets(graph, selector)) {
      addEdge(graph, nodeId, domId, "controls", { evidence: `${controller.controllerKind} selector ${selector}` });
    }
  }

  schedules.push({
    id: nodeId,
    kind: controller.controllerKind,
    targetSelector: controller.targetSelector || null,
    triggerSelector: controller.triggerSelector || null,
    line: controller.line,
  });
  return nodeId;
}

function extractLibraryControllers(graph, artifact, content, schedules) {
  const gsapTimelineRe = /\bgsap\.timeline\s*\(/g;
  let m;
  while ((m = gsapTimelineRe.exec(content))) {
    const line = lineNumberAt(content, m.index);
    const snippet = content.slice(m.index, m.index + 1400);
    const trigger = snippet.match(/\btrigger\s*:\s*(['"`])([^'"`]+)\1/);
    addControllerNode(graph, artifact, schedules, {
      controllerKind: "gsap-timeline",
      name: "GSAP timeline",
      triggerSelector: trigger ? trigger[2] : null,
      optionsSnippet: snippet.slice(0, 400),
      library: "GSAP",
      line,
    });
  }

  const gsapTweenRe = /\b(?:gsap|[A-Za-z_$][\w$]*)\.(to|from|fromTo)\s*\(\s*(['"`])([^'"`]+)\2/g;
  while ((m = gsapTweenRe.exec(content))) {
    const line = lineNumberAt(content, m.index);
    addControllerNode(graph, artifact, schedules, {
      controllerKind: `gsap-${m[1]}`,
      name: `GSAP ${m[1]}`,
      targetSelector: m[3],
      optionsSnippet: content.slice(m.index, m.index + 320),
      library: "GSAP",
      line,
    });
  }

  const timelineMaxRe = /\bnew\s+TimelineMax\s*\(|\bTimelineMax\s*\(/g;
  while ((m = timelineMaxRe.exec(content))) {
    const line = lineNumberAt(content, m.index);
    addControllerNode(graph, artifact, schedules, {
      controllerKind: "timelinemax",
      name: "TimelineMax",
      optionsSnippet: content.slice(m.index, m.index + 320),
      library: "GSAP",
      line,
    });
  }

  const swiperRe = /\bnew\s+Swiper\s*\(\s*(['"`])([^'"`]+)\1/g;
  while ((m = swiperRe.exec(content))) {
    const line = lineNumberAt(content, m.index);
    const snippet = content.slice(m.index, m.index + 1000);
    addControllerNode(graph, artifact, schedules, {
      controllerKind: "swiper",
      name: "Swiper",
      targetSelector: m[2],
      optionsSnippet: snippet.slice(0, 400),
      library: "Swiper",
      line,
    });
    for (const navMatch of snippet.matchAll(/\b(?:nextEl|prevEl|scrollbar|el)\s*:\s*(['"`])([^'"`]+)\1/g)) {
      addControllerNode(graph, artifact, schedules, {
        controllerKind: "swiper-option-target",
        name: `Swiper ${navMatch[0].split(":")[0].trim()}`,
        targetSelector: navMatch[2],
        optionsSnippet: navMatch[0],
        library: "Swiper",
        line: lineNumberAt(content, m.index + navMatch.index),
      });
    }
  }

  const scrollMagicSceneRe = /\bnew\s+ScrollMagic\.Scene\s*\(/g;
  while ((m = scrollMagicSceneRe.exec(content))) {
    const line = lineNumberAt(content, m.index);
    const snippet = content.slice(m.index, m.index + 800);
    const trigger = snippet.match(/\btriggerElement\s*:\s*(['"`])([^'"`]+)\1/);
    addControllerNode(graph, artifact, schedules, {
      controllerKind: "scrollmagic-scene",
      name: "ScrollMagic Scene",
      triggerSelector: trigger ? trigger[2] : null,
      optionsSnippet: snippet.slice(0, 360),
      library: "ScrollTrigger",
      line,
    });
  }
}

function extractCss(graph, artifact, content) {
  const keyframes = [];
  const mediaQueries = [];
  const rulesOut = [];
  const tokens = [];
  const motionRules = [];

  const keyframeRe = /@(?:-\w+-)?keyframes\s+([\w-]+)/g;
  let km;
  while ((km = keyframeRe.exec(content))) {
    const line = lineNumberAt(content, km.index);
    const nodeId = addNode(graph, {
      id: stableId("keyframe", [artifact.path, km[1]]),
      type: "keyframe",
      name: km[1],
      filePath: artifact.path,
      line,
    });
    addEdge(graph, artifact.nodeId, nodeId, "defines_keyframe", { evidence: `@keyframes ${km[1]} at line ${line}` });
    keyframes.push({ id: nodeId, name: km[1], line });
  }

  const mediaRe = /@media\s+([^{]+)/g;
  let mm;
  while ((mm = mediaRe.exec(content))) {
    mediaQueries.push({ query: mm[1].trim(), line: lineNumberAt(content, mm.index) });
  }

  const tokenRe = /(--[\w-]+)\s*:\s*([^;{}]+);?/g;
  let tm;
  while ((tm = tokenRe.exec(content))) {
    const line = lineNumberAt(content, tm.index);
    const tokenId = addNode(graph, {
      id: stableId("token", [artifact.path, tm[1]]),
      type: "design-token",
      name: tm[1],
      value: tm[2].trim(),
      filePath: artifact.path,
      line,
      tokenKind: inferTokenKind(tm[1], tm[2]),
    });
    addEdge(graph, artifact.nodeId, tokenId, "contains", { evidence: `CSS custom property ${tm[1]} at line ${line}` });
    tokens.push({ id: tokenId, name: tm[1], value: tm[2].trim(), line });
  }

  for (const rule of splitCssRules(content)) {
    const selector = rule.selector;
    if (!selector || selector.startsWith("@keyframes") || selector.startsWith("@font-face")) continue;
    const line = lineNumberAt(content, rule.index);
    const declarations = parseDeclarations(rule.body);
    if (declarations.length === 0) continue;
    const selectorKeys = extractSimpleSelectorKeys(selector);
    const motionDeclarations = declarations.filter((d) => MOTION_PROPS.has(d.property) || d.property.startsWith("scroll-") || d.property.startsWith("view-transition"));
    const tokenUses = [...rule.body.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]);
    const keyframeUses = declarations
      .filter((d) => d.property.startsWith("animation"))
      .flatMap((d) => keyframes.filter((kf) => new RegExp(`\\b${escapeRegExp(kf.name)}\\b`).test(d.value)).map((kf) => kf.name));
    const targetDomIds = resolveSelectorTargets(graph, selector);
    const ruleId = addNode(graph, {
      id: stableId("css-rule", [artifact.path, line, rule.index, selector.slice(0, 120)]),
      type: "css-rule",
      name: selector,
      filePath: artifact.path,
      line,
      sourceIndex: rule.index,
      selector,
      selectorKeys,
      targetDomIds,
      declarations,
      tokenUses,
      keyframeUses,
      isMotion: motionDeclarations.length > 0,
    });
    addEdge(graph, artifact.nodeId, ruleId, "contains", { evidence: `CSS rule at line ${line}` });
    rulesOut.push({ id: ruleId, selector, line, sourceIndex: rule.index, selectorKeys, targetDomIds, declarations, tokenUses, keyframeUses, isMotion: motionDeclarations.length > 0 });

    for (const tokenName of tokenUses) {
      const tokenNode = graph.nodes.find((n) => n.type === "design-token" && n.name === tokenName);
      if (tokenNode) addEdge(graph, ruleId, tokenNode.id, "uses_token", { evidence: `var(${tokenName}) in ${selector}` });
    }
    for (const keyframeName of keyframeUses) {
      const keyframeNode = graph.nodes.find((n) => n.type === "keyframe" && n.name === keyframeName);
      if (keyframeNode) addEdge(graph, ruleId, keyframeNode.id, "drives_motion", { evidence: `animation references ${keyframeName}` });
    }
    for (const domId of targetDomIds) {
      addEdge(graph, ruleId, domId, "styles", { evidence: `selector ${selector}` });
    }
    if (motionDeclarations.length > 0) {
      const motionId = addNode(graph, {
        id: stableId("motion", [artifact.path, line, rule.index, selector.slice(0, 120)]),
        type: "motion-contract",
        name: selector,
        filePath: artifact.path,
        line,
        sourceIndex: rule.index,
        selector,
        trigger: inferCssTrigger(selector),
        affectedProperties: motionDeclarations.map((d) => d.property),
        declarations: motionDeclarations,
      });
      addEdge(graph, ruleId, motionId, "drives_motion", { evidence: `motion declarations in ${selector}` });
      for (const domId of targetDomIds) {
        addEdge(graph, motionId, domId, "controls", { evidence: `motion selector ${selector}` });
      }
      motionRules.push({
        id: motionId,
        selector,
        line,
        trigger: inferCssTrigger(selector),
        timing: declarations.filter((d) => /duration|timing|delay|transition|animation/.test(d.property)),
        affectedProperties: motionDeclarations.map((d) => d.property),
      });
    }
  }

  graph.inventories.css.push({
    filePath: artifact.path,
    ruleCount: rulesOut.length,
    tokenCount: tokens.length,
    keyframes,
    mediaQueries,
    motionRules,
    rules: rulesOut,
  });
}

function inferTokenKind(name, value) {
  const n = name.toLowerCase();
  const v = value.toLowerCase();
  if (/color|bg|background|foreground|accent|border/.test(n) || /^#|rgb|hsl|oklch|color\(/.test(v)) return "color";
  if (/font|type|text|line-height|letter/.test(n)) return "typography";
  if (/space|gap|margin|padding|size|width|height/.test(n)) return "spacing-size";
  if (/radius|round/.test(n)) return "radius";
  if (/shadow|elevation|z-index|layer/.test(n)) return "depth-layer";
  if (/duration|ease|motion|transition|delay|velocity|lerp/.test(n)) return "motion";
  return "unknown";
}

function inferCssTrigger(selector) {
  if (/:hover/.test(selector)) return "hover";
  if (/:focus|:focus-visible|:focus-within/.test(selector)) return "focus";
  if (/:active/.test(selector)) return "active";
  if (/\.(is|has|js|state)-|\.active|\.open|\.selected|\.visible|\.hidden/.test(selector)) return "state-class";
  if (/@media/.test(selector)) return "responsive";
  return "base-or-scripted";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function addGpuContract(graph, artifact, kind, line, suffix, fields = {}) {
  const node = {
    id: stableId("gpu-contract", [artifact.path, kind, line, suffix]),
    type: "gpu-contract",
    name: fields.name || kind,
    gpuKind: kind,
    filePath: artifact.path,
    line,
    sourceRange: fields.sourceRange || null,
    confidence: "partial",
    provenance: "static-scanner",
    ...fields,
  };
  const nodeId = addNode(graph, node);
  addEdge(graph, artifact.nodeId, nodeId, "contains", { evidence: `${kind} at line ${line}` });
  return nodeId;
}

function shaderStageFor(filePath) {
  const ext = extname(filePath).toLowerCase();
  if (ext === ".vert") return "vertex";
  if (ext === ".frag") return "fragment";
  if (ext === ".wgsl") return "webgpu";
  return "unspecified";
}

function gpuAssetKindFor(filePath) {
  const ext = extname(filePath).toLowerCase();
  if ([".glb", ".gltf", ".bin"].includes(ext)) return "gpu-model";
  if ([".ktx2", ".basis", ".dds"].includes(ext)) return "gpu-texture";
  if ([".hdr", ".exr"].includes(ext)) return "gpu-environment";
  return "gpu-runtime";
}

function uniformDeclarations(source) {
  if (typeof source !== "string") return [];
  const scanSource = source.replace(/\/\*[\s\S]*?(?:\*\/|$)|\/\/[^\r\n]*/g, (comment) =>
    comment.replace(/[^\r\n]/g, " ")
  );
  const declarations = [];
  const statementRe = /\buniform\b([^;{}]*);/g;
  let statement;
  while ((statement = statementRe.exec(scanSource))) {
    let boundary = statement.index - 1;
    while (boundary >= 0 && /[ \t]/.test(scanSource[boundary])) boundary -= 1;
    if (boundary >= 0 && !/[;\r\n]/.test(scanSource[boundary])) continue;
    const body = statement[1];
    const header = /^\s+(?:(?:lowp|mediump|highp)\s+)?([A-Za-z_]\w*)\s+/.exec(body);
    if (!header) continue;
    const declaratorSource = body.slice(header[0].length);
    const declaratorStart = statement.index + "uniform".length + header[0].length;
    const parsed = [];
    const names = new Set();
    let cursor = 0;
    let valid = true;
    for (const part of declaratorSource.split(",")) {
      const declarator = /^\s*([A-Za-z_]\w*)(\s*\[\s*(?:[1-9]\d*|[A-Za-z_]\w*)\s*\])?\s*$/.exec(part);
      if (!declarator || names.has(declarator[1])) {
        valid = false;
        break;
      }
      names.add(declarator[1]);
      const start = declaratorStart + cursor + part.indexOf(declarator[1]);
      parsed.push({
        type: header[1],
        name: declarator[1],
        sampler: /^[iu]?sampler/i.test(header[1]),
        array: Boolean(declarator[2]),
        start,
        end: start + declarator[1].length,
      });
      cursor += part.length + 1;
    }
    if (!valid) continue;
    const evidence = source.slice(statement.index, statement.index + statement[0].length);
    declarations.push(...parsed.map((declaration) => ({ ...declaration, evidence })));
  }
  return declarations;
}

function extractShaderSource(graph, artifact, rawSource, options) {
  const stage = options.stage;
  const sourceRange = options.sourceRange;
  const lineAt = options.lineAt;
  const scanSource = options.scanSource || rawSource;
  const shaderId = addGpuContract(graph, artifact, "shader-stage", lineAt(sourceRange.start), `${stage}-${sourceRange.start}`, {
    name: options.name,
    stage,
    rawSource,
    sourceRange,
    ...(options.domNodeId ? { domNodeId: options.domNodeId } : {}),
  });
  const uniforms = [];
  let match;
  for (const declaration of uniformDeclarations(scanSource)) {
    const range = { start: sourceRange.start + declaration.start, end: sourceRange.start + declaration.end };
    const uniformId = addGpuContract(graph, artifact, "uniform", lineAt(range.start), `${declaration.name}-${range.start}`, {
      name: declaration.name,
      uniformKind: declaration.type,
      sampler: declaration.sampler,
      shaderRef: shaderId,
      sourceRange: range,
    });
    addEdge(graph, shaderId, uniformId, "declares_uniform", { evidence: declaration.evidence });
    uniforms.push({ id: uniformId, name: declaration.name });
  }
  const uniformByName = new Map(uniforms.map((uniform) => [uniform.name, uniform.id]));
  const readRe = /\b(?:texture2D|texture)\s*\(\s*([A-Za-z_]\w*)[^;\n]*?\)\s*\.([rgba]{1,4})/g;
  while ((match = readRe.exec(scanSource))) {
    const range = { start: sourceRange.start + match.index, end: sourceRange.start + match.index + match[0].length };
    const readId = addGpuContract(graph, artifact, "texture-channel-read", lineAt(range.start), `${match[1]}-${match[2]}-${range.start}`, {
      name: `${match[1]}.${match[2]}`,
      sampler: match[1],
      channel: match[2],
      shaderRef: shaderId,
      ...(uniformByName.get(match[1]) ? { uniformRef: uniformByName.get(match[1]) } : {}),
      sourceRange: range,
    });
    const uniformId = uniformByName.get(match[1]);
    if (uniformId) addEdge(graph, uniformId, readId, "reads_channel", { evidence: match[0] });
  }
  graph.inventories.gpu.shaders.push({
    filePath: artifact.path,
    stage,
    rawSource,
    sourceRange,
    contractRef: shaderId,
    ...(options.domNodeId ? { domNodeId: options.domNodeId } : {}),
  });
  return shaderId;
}

function extractShader(graph, artifact, content) {
  return extractShaderSource(graph, artifact, content, {
    name: basename(artifact.path),
    stage: shaderStageFor(artifact.path),
    sourceRange: { start: 0, end: content.length },
    lineAt: (index) => lineNumberAt(content, index),
  });
}

function inlineShaderStage(type) {
  const normalized = String(type || "").trim().toLowerCase();
  if (["x-shader/x-fragment", "text/x-fragment", "application/x-fragment"].includes(normalized)) return "fragment";
  if (["x-shader/x-vertex", "text/x-vertex", "application/x-vertex"].includes(normalized)) return "vertex";
  if (["x-shader/x-wgsl", "text/wgsl", "application/wgsl"].includes(normalized)) return "webgpu";
  return null;
}

function extractInlineShader(graph, artifact, domNode, attrs, documentSource, sourceRange) {
  const stage = inlineShaderStage(attrs.type);
  if (!stage) return;
  const rawSource = documentSource.slice(sourceRange.start, sourceRange.end);
  extractShaderSource(graph, artifact, rawSource, {
    name: attrs.id || `${stage}-inline-shader`,
    stage,
    sourceRange,
    lineAt: (index) => lineNumberAt(documentSource, index),
    domNodeId: domNode.id,
  });
}

function extractGpuAsset(graph, artifact) {
  const assetKind = gpuAssetKindFor(artifact.path);
  const assetId = addNode(graph, {
    id: stableId("asset", [artifact.path, assetKind]),
    type: "asset",
    name: basename(artifact.path),
    url: artifact.path,
    filePath: artifact.path,
    line: 1,
    assetKind,
    bytes: artifact.bytes,
  });
  addEdge(graph, artifact.nodeId, assetId, "contains", { evidence: `${assetKind} source artifact` });
  graph.inventories.gpu.assets.push({ filePath: artifact.path, assetKind, assetRef: assetId, bytes: artifact.bytes });
}

function shaderImportsFor(graph, artifact, content) {
  const imports = new Map();
  const shaderByPath = new Map(
    graph.nodes
      .filter((node) => node.type === "gpu-contract" && node.gpuKind === "shader-stage")
      .map((node) => [node.filePath, node.id]),
  );
  const importRe = /\bimport\s+([A-Za-z_$][\w$]*)\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRe.exec(content))) {
    const source = match[2];
    const localArtifactPath = source.split(/[?#]/)[0];
    if (!SHADER_EXTS.has(extname(localArtifactPath).toLowerCase())) continue;
    const targetPath = join(dirname(artifact.path), localArtifactPath).replace(/^\.\//, "");
    const shaderId = shaderByPath.get(targetPath);
    if (shaderId) imports.set(match[1], { shaderId, source });
  }
  return imports;
}

function jsStringEnd(content, start, limit = content.length) {
  const quote = content[start];
  if (!['"', "'", "`"].includes(quote)) return start;
  for (let index = start + 1; index < limit; index += 1) {
    if (content[index] === "\\") {
      index += 1;
      continue;
    }
    if (content[index] === quote) return index + 1;
  }
  return limit;
}

function matchingCallEnd(content, start) {
  let depth = 0;
  for (let index = start; index < content.length; index += 1) {
    if (['"', "'", "`"].includes(content[index])) {
      index = jsStringEnd(content, index) - 1;
      continue;
    }
    if (content.startsWith("//", index)) {
      const lineEnd = content.indexOf("\n", index + 2);
      index = lineEnd === -1 ? content.length : lineEnd;
      continue;
    }
    if (content.startsWith("/*", index)) {
      const commentEnd = content.indexOf("*/", index + 2);
      index = commentEnd === -1 ? content.length : commentEnd + 1;
      continue;
    }
    if (content[index] === "(") depth += 1;
    if (content[index] === ")") {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }
  return content.length;
}

function topLevelObjectFields(content, openParen, callEnd) {
  let objectStart = openParen + 1;
  while (/\s/.test(content[objectStart] || "")) objectStart += 1;
  if (content[objectStart] !== "{") return [];

  const fields = [];
  let fieldStart = objectStart + 1;
  let depth = 0;
  for (let index = fieldStart; index < callEnd; index += 1) {
    const ch = content[index];
    if (['"', "'", "`"].includes(ch)) {
      index = jsStringEnd(content, index, callEnd) - 1;
      continue;
    }
    if (content.startsWith("//", index)) {
      const lineEnd = content.indexOf("\n", index + 2);
      index = lineEnd === -1 || lineEnd >= callEnd ? callEnd : lineEnd;
      continue;
    }
    if (content.startsWith("/*", index)) {
      const commentEnd = content.indexOf("*/", index + 2);
      index = commentEnd === -1 || commentEnd >= callEnd ? callEnd : commentEnd + 1;
      continue;
    }
    if (ch === "{" || ch === "[" || ch === "(") {
      depth += 1;
      continue;
    }
    if (ch === "}" || ch === "]" || ch === ")") {
      if (ch === "}" && depth === 0) {
        fields.push({ text: content.slice(fieldStart, index), start: fieldStart, end: index });
        return fields;
      }
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (ch === "," && depth === 0) {
      fields.push({ text: content.slice(fieldStart, index), start: fieldStart, end: index });
      fieldStart = index + 1;
    }
  }
  return [];
}

function uniqueCanvasRef(graph, selector) {
  const canvasRefs = resolveSelectorTargets(graph, selector)
    .filter((id) => graph.nodeIndex.get(id)?.tag === "canvas");
  return canvasRefs.length === 1 ? canvasRefs[0] : null;
}

function canvasRefFromExpression(graph, expression, canvasRefsByVariable) {
  const identifier = expression.match(/^([A-Za-z_$][\w$]*)$/);
  if (identifier) return canvasRefsByVariable.get(identifier[1]) || null;
  const query = expression.match(/^document\s*\.\s*querySelector\s*\(\s*(['"`])([^'"`]+)\1\s*\)$/);
  if (query) return uniqueCanvasRef(graph, query[2]);
  const byId = expression.match(/^document\s*\.\s*getElementById\s*\(\s*(['"`])([^'"`]+)\1\s*\)$/);
  return byId ? uniqueCanvasRef(graph, `#${byId[2]}`) : null;
}

function rendererCanvasRef(graph, content, openParen, callEnd, canvasRefsByVariable) {
  const canvasFields = topLevelObjectFields(content, openParen, callEnd)
    .map((field) => field.text.trim())
    .filter((field) => /^canvas(?:\s*:|$)/.test(field));
  if (canvasFields.length !== 1) return null;
  if (canvasFields[0] === "canvas") return canvasRefsByVariable.get("canvas") || null;
  const property = canvasFields[0].match(/^canvas\s*:\s*([\s\S]+)$/);
  return property ? canvasRefFromExpression(graph, property[1].trim(), canvasRefsByVariable) : null;
}

function staticJsString(content, start, limit) {
  while (/\s/.test(content[start] || "")) start += 1;
  const quote = content[start];
  if (!['"', "'", "`"].includes(quote)) return null;
  const end = jsStringEnd(content, start, limit);
  if (end > limit || content[end - 1] !== quote) return null;
  const rawSource = content.slice(start + 1, end - 1);
  if (quote === "`" && /(^|[^\\])\$\{/.test(rawSource)) return null;
  return { rawSource, sourceRange: { start: start + 1, end: end - 1 }, end };
}

function shaderScanSourceFromJsString(rawSource) {
  return rawSource.replace(/\\r\\n|\\[nrt]/g, (escape) => {
    if (escape === "\\r\\n") return "\r\n  ";
    if (escape === "\\n") return "\n ";
    if (escape === "\\r") return "\r ";
    return " ".repeat(escape.length);
  });
}

function extractEmbeddedShaders(graph, artifact, content, materialId, materialName, openParen, callEnd) {
  for (const field of topLevelObjectFields(content, openParen, callEnd)) {
    const property = field.text.match(/^\s*(vertexShader|fragmentShader)\s*:\s*/);
    if (!property) continue;
    const literal = staticJsString(content, field.start + property[0].length, field.end);
    if (!literal || content.slice(literal.end, field.end).trim()) continue;
    const stage = property[1] === "vertexShader" ? "vertex" : "fragment";
    const shaderId = extractShaderSource(graph, artifact, literal.rawSource, {
      name: `${materialName}.${property[1]}`,
      stage,
      sourceRange: literal.sourceRange,
      lineAt: (index) => lineNumberAt(content, index),
      scanSource: shaderScanSourceFromJsString(literal.rawSource),
    });
    addEdge(graph, materialId, shaderId, "uses_shader", { evidence: `${property[1]} static string` });
  }
}

function extractGpuContracts(graph, artifact, content) {
  const canvasRefsByVariable = new Map();
  const contextByName = new Map();
  const canvasAssignmentRe = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*document\s*\.\s*querySelector\s*\(\s*(['"`])([^'"`]+)\2\s*\)/g;
  let match;
  while ((match = canvasAssignmentRe.exec(content))) {
    const canvasRef = uniqueCanvasRef(graph, match[3]);
    if (canvasRef) canvasRefsByVariable.set(match[1], canvasRef);
  }
  const canvasIdAssignmentRe = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*document\s*\.\s*getElementById\s*\(\s*(['"`])([^'"`]+)\2\s*\)/g;
  while ((match = canvasIdAssignmentRe.exec(content))) {
    const canvasRef = uniqueCanvasRef(graph, `#${match[3]}`);
    if (canvasRef) canvasRefsByVariable.set(match[1], canvasRef);
  }

  const contextRe = /(?:\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*)?\b([A-Za-z_$][\w$]*)\.getContext\s*\(\s*(['"`])(webgl2?|webgpu)\3\s*\)/gi;
  while ((match = contextRe.exec(content))) {
    const canvasRef = canvasRefsByVariable.get(match[2]);
    const contextId = addGpuContract(graph, artifact, "renderer-state", lineNumberAt(content, match.index), `context-${match[2]}-${match.index}`, {
      name: `${match[2]} ${match[4]} context`,
      stateKind: "context-request",
      contextType: match[4].toLowerCase(),
      ...(canvasRef ? { canvasRef } : {}),
      sourceRange: { start: match.index, end: match.index + match[0].length },
    });
    contextByName.set(match[1] || match[2], contextId);
    if (canvasRef) addEdge(graph, contextId, canvasRef, "configures", { evidence: match[0] });
  }

  const shaderImports = shaderImportsFor(graph, artifact, content);
  const rendererByName = new Map();
  const rendererRe = /\b(?:(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*)?new\s+(?:[A-Za-z_$][\w$]*\.)?(WebGLRenderer|WebGPURenderer)\s*\(/g;
  while ((match = rendererRe.exec(content))) {
    const rendererName = match[1] || `${match[2]}@${match.index}`;
    const openParen = match.index + match[0].lastIndexOf("(");
    const callEnd = matchingCallEnd(content, openParen);
    const canvasRef = rendererCanvasRef(graph, content, openParen, callEnd, canvasRefsByVariable);
    const rendererId = addGpuContract(graph, artifact, "renderer", lineNumberAt(content, match.index), `${rendererName}-${match.index}`, {
      name: rendererName,
      rendererKind: match[2],
      ...(canvasRef ? { canvasRef } : {}),
      sourceRange: { start: match.index, end: callEnd },
    });
    if (match[1]) rendererByName.set(match[1], rendererId);
    if (canvasRef) addEdge(graph, rendererId, canvasRef, "configures", { evidence: "explicit renderer canvas option" });
  }

  const materialRe = /\b(?:(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*)?new\s+(?:[A-Za-z_$][\w$]*\.)?(ShaderMaterial|RawShaderMaterial|WebGLProgram)\s*\(/g;
  while ((match = materialRe.exec(content))) {
    const materialName = match[1] || match[2];
    const openParen = match.index + match[0].lastIndexOf("(");
    const callEnd = matchingCallEnd(content, openParen);
    const materialId = addGpuContract(graph, artifact, "material-or-program", lineNumberAt(content, match.index), `${materialName}-${match.index}`, {
      name: materialName,
      programKind: match[2],
      sourceRange: { start: match.index, end: callEnd },
    });
    const materialSource = content.slice(openParen, callEnd);
    for (const [localName, importedShader] of shaderImports) {
      if (new RegExp(`\\b${escapeRegExp(localName)}\\b`).test(materialSource)) {
        addEdge(graph, materialId, importedShader.shaderId, "uses_shader", { evidence: `${localName} imported '${importedShader.source}'` });
      }
    }
    extractEmbeddedShaders(graph, artifact, content, materialId, materialName, openParen, callEnd);
  }

  const targetByName = new Map();
  const targetRe = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:new\s+(?:[A-Za-z_$][\w$]*\.)?WebGLRenderTarget\b|[^;\n]*?createFramebuffer\s*\()/g;
  while ((match = targetRe.exec(content))) {
    targetByName.set(match[1], addGpuContract(graph, artifact, "render-target", lineNumberAt(content, match.index), `${match[1]}-${match.index}`, {
      name: match[1],
      targetKind: /createFramebuffer/.test(match[0]) ? "framebuffer" : "render-target",
      sourceRange: { start: match.index, end: match.index + match[0].length },
    }));
  }

  const textureByName = new Map();
  const textureRe = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\.createTexture\s*\(\s*\)/g;
  while ((match = textureRe.exec(content))) {
    const textureId = addGpuContract(graph, artifact, "texture", lineNumberAt(content, match.index), `${match[1]}-${match.index}`, {
      name: match[1],
      ...(contextByName.get(match[2]) ? { contextRef: contextByName.get(match[2]) } : {}),
      sourceRange: { start: match.index, end: match.index + match[0].length },
    });
    textureByName.set(match[1], textureId);
    const contextId = contextByName.get(match[2]);
    if (contextId) addEdge(graph, contextId, textureId, "configures", { evidence: match[0] });
  }

  const nativeProgramRe = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\.createProgram\s*\(\s*\)/g;
  while ((match = nativeProgramRe.exec(content))) {
    const programId = addGpuContract(graph, artifact, "material-or-program", lineNumberAt(content, match.index), `${match[1]}-${match.index}`, {
      name: match[1],
      programKind: "native-program",
      ...(contextByName.get(match[2]) ? { contextRef: contextByName.get(match[2]) } : {}),
      sourceRange: { start: match.index, end: match.index + match[0].length },
    });
    const contextId = contextByName.get(match[2]);
    if (contextId) addEdge(graph, contextId, programId, "configures", { evidence: match[0] });
  }

  const operationRe = /\b([A-Za-z_$][\w$]*)\.(setRenderTarget|render)\s*\(([^)]*)\)/g;
  const activeTargetByRenderer = new Map();
  const previousPassByRenderer = new Map();
  while ((match = operationRe.exec(content))) {
    const line = lineNumberAt(content, match.index);
    const rendererId = rendererByName.get(match[1]);
    if (!rendererId) continue;
    if (match[2] === "setRenderTarget") {
      const activeTarget = targetByName.get(match[3].trim()) || null;
      activeTargetByRenderer.set(match[1], activeTarget);
      const stateId = addGpuContract(graph, artifact, "renderer-state", line, `target-${match.index}`, {
        name: `setRenderTarget(${match[3].trim() || "null"})`,
        stateKind: "render-target-binding",
        rendererRef: rendererId,
        ...(activeTarget ? { targetRef: activeTarget } : {}),
        sourceRange: { start: match.index, end: match.index + match[0].length },
      });
      addEdge(graph, rendererId, stateId, "configures", { evidence: match[0] });
      if (activeTarget) addEdge(graph, stateId, activeTarget, "configures", { evidence: match[0] });
      continue;
    }
    const passId = addGpuContract(graph, artifact, "pass", line, `${match[1]}-${match.index}`, {
      name: `${match[1]}.render`,
      rendererRef: rendererId,
      ...(activeTargetByRenderer.get(match[1]) ? { targetRef: activeTargetByRenderer.get(match[1]) } : {}),
      sourceRange: { start: match.index, end: match.index + match[0].length },
    });
    addEdge(graph, passId, rendererId, "configures", { evidence: match[0] });
    const activeTarget = activeTargetByRenderer.get(match[1]);
    if (activeTarget) addEdge(graph, passId, activeTarget, "writes_to", { evidence: match[0] });
    const previousPassId = previousPassByRenderer.get(match[1]);
    if (previousPassId) addEdge(graph, previousPassId, passId, "precedes", { evidence: "source call order" });
    previousPassByRenderer.set(match[1], passId);
  }

  const activeFramebufferByContext = new Map();
  const nativePassByContext = new Map();
  const nativeOperationRe = /\b([A-Za-z_$][\w$]*)\.(bindFramebuffer|bindTexture|drawArrays|drawElements)\s*\(([^)]*)\)/g;
  while ((match = nativeOperationRe.exec(content))) {
    const line = lineNumberAt(content, match.index);
    const contextId = contextByName.get(match[1]);
    if (!contextId) continue;
    const sourceRange = { start: match.index, end: match.index + match[0].length };
    const args = match[3].split(",").map((value) => value.trim());
    if (match[2] === "bindFramebuffer") {
      const framebufferId = targetByName.get(args.at(-1)) || null;
      activeFramebufferByContext.set(match[1], framebufferId);
      const stateId = addGpuContract(graph, artifact, "renderer-state", line, `framebuffer-${match.index}`, {
        name: `bindFramebuffer(${args.at(-1) || "null"})`,
        stateKind: "framebuffer-binding",
        contextRef: contextId,
        ...(framebufferId ? { targetRef: framebufferId } : {}),
        sourceRange,
      });
      addEdge(graph, contextId, stateId, "configures", { evidence: match[0] });
      if (framebufferId) addEdge(graph, stateId, framebufferId, "configures", { evidence: match[0] });
      continue;
    }
    if (match[2] === "bindTexture") {
      const textureId = textureByName.get(args.at(-1));
      const stateId = addGpuContract(graph, artifact, "renderer-state", line, `texture-${match.index}`, {
        name: `bindTexture(${args.at(-1) || "null"})`,
        stateKind: "texture-binding",
        contextRef: contextId,
        ...(textureId ? { textureRef: textureId } : {}),
        sourceRange,
      });
      addEdge(graph, contextId, stateId, "configures", { evidence: match[0] });
      if (textureId) addEdge(graph, stateId, textureId, "binds_texture", { evidence: match[0] });
      continue;
    }
    const passId = addGpuContract(graph, artifact, "pass", line, `${match[2]}-${match.index}`, {
      name: `${match[1]}.${match[2]}`,
      contextRef: contextId,
      ...(activeFramebufferByContext.get(match[1]) ? { targetRef: activeFramebufferByContext.get(match[1]) } : {}),
      sourceRange,
    });
    addEdge(graph, passId, contextId, "configures", { evidence: match[0] });
    const framebufferId = activeFramebufferByContext.get(match[1]);
    if (framebufferId) addEdge(graph, passId, framebufferId, "writes_to", { evidence: match[0] });
    const previousNativePassId = nativePassByContext.get(match[1]);
    if (previousNativePassId) addEdge(graph, previousNativePassId, passId, "precedes", { evidence: "source call order" });
    nativePassByContext.set(match[1], passId);
  }

  // Do not infer a canvas owner from a renderer name alone. Only explicit context or constructor options link contracts to markup.
}

function extractJs(graph, artifact, content) {
  const selectors = [];
  const eventListeners = [];
  const mutations = [];
  const stateVariables = [];
  const schedules = [];
  const libraries = [];

  for (const [name, pattern] of LIBRARY_PATTERNS) {
    if (pattern.test(content)) {
      const nodeId = addNode(graph, {
        id: stableId("library", [name]),
        type: "library",
        name,
      });
      addEdge(graph, artifact.nodeId, nodeId, "uses_library", { evidence: `${name} keyword detected` });
      libraries.push({ id: nodeId, name });
    }
  }

  extractImportsAsLibraries(graph, artifact, content, libraries);
  const jqueryAliasMap = buildJqueryAliasMap(content);

  const selectorPatterns = [
    {
      kind: "querySelector",
      re: /\b(querySelector|querySelectorAll)\s*\(\s*(['"`])([^'"`]+)\2\s*\)/g,
      normalize: (m) => m[3],
    },
    {
      kind: "getElementById",
      re: /\bgetElementById\s*\(\s*(['"`])([^'"`]+)\1\s*\)/g,
      normalize: (m) => `#${m[2]}`,
    },
    {
      kind: "getElementsByClassName",
      re: /\bgetElementsByClassName\s*\(\s*(['"`])([^'"`]+)\1\s*\)/g,
      normalize: (m) => `.${m[2].split(/\s+/)[0]}`,
    },
    {
      kind: "getElementsByTagName",
      re: /\bgetElementsByTagName\s*\(\s*(['"`])([^'"`]+)\1\s*\)/g,
      normalize: (m) => m[2].toLowerCase(),
    },
  ];

  for (const pattern of selectorPatterns) {
    let m;
    while ((m = pattern.re.exec(content))) {
      const selector = pattern.normalize(m);
      const line = lineNumberAt(content, m.index);
      const nodeId = addJsSelector(graph, artifact, selector, pattern.kind, line);
      if (!nodeId) continue;
      selectors.push({ id: nodeId, selector, kind: pattern.kind, line, resolvedDomCount: resolveSelectorTargets(graph, selector).length });
    }
  }
  extractJquerySelectors(graph, artifact, content, selectors, jqueryAliasMap);

  const eventRe = /([$\w.()[\]"'`-]+)?\.?\s*addEventListener\s*\(\s*(['"`])([\w:-]+)\2\s*,\s*([^)\n]+)/g;
  let em;
  while ((em = eventRe.exec(content))) {
    const line = lineNumberAt(content, em.index);
    const target = cleanExpression(em[1] || "unknown");
    const eventType = em[3];
    addEventListenerNode(graph, artifact, eventListeners, {
      eventType,
      targetExpression: target,
      targetSelector: parseJquerySubjectExpression(target, jqueryAliasMap),
      handlerExpression: em[4],
      sourceKind: "addEventListener",
      line,
    });
  }
  extractJqueryEvents(graph, artifact, content, eventListeners, jqueryAliasMap);

  const mutationPatterns = [
    ["mutates_class", /\.classList\.(add|remove|toggle|replace)\s*\(([^)]*)\)/g],
    ["mutates_style", /\.style\.([\w-]+)\s*=/g],
    ["mutates_attribute", /\.setAttribute\s*\(([^)]*)\)/g],
    ["mutates_dataset", /\.dataset\.([\w-]+)\s*=/g],
    ["mutates_dom", /\.(innerHTML|textContent|innerText|appendChild|prepend|append|remove)\b/g],
  ];
  for (const [edgeType, re] of mutationPatterns) {
    let m;
    while ((m = re.exec(content))) {
      const line = lineNumberAt(content, m.index);
      addMutationNode(graph, artifact, mutations, {
        edgeType,
        operation: m[1] || edgeType,
        expression: m[0],
        sourceKind: "native",
        line,
      });
    }
  }
  extractJqueryMutations(graph, artifact, content, mutations, jqueryAliasMap);

  const varRe = /\b(?:let|const|var)\s+([A-Za-z_$][\w$]*)\s*(?:=|;|,)/g;
  let vm;
  while ((vm = varRe.exec(content))) {
    const name = vm[1];
    if (!isStateLike(name)) continue;
    const line = lineNumberAt(content, vm.index);
    const nodeId = addNode(graph, {
      id: stableId("state", [artifact.path, name, line]),
      type: "state-variable",
      name,
      filePath: artifact.path,
      line,
      stateKind: inferStateKind(name),
    });
    addEdge(graph, artifact.nodeId, nodeId, "contains", { evidence: `state-like variable ${name} at line ${line}` });
    stateVariables.push({ id: nodeId, name, stateKind: inferStateKind(name), line });
  }

  const schedulePatterns = [
    ["requestAnimationFrame", /\brequestAnimationFrame\s*\(/g],
    ["setTimeout", /\bsetTimeout\s*\(/g],
    ["setInterval", /\bsetInterval\s*\(/g],
    ["IntersectionObserver", /\bnew\s+IntersectionObserver\s*\(/g],
    ["ResizeObserver", /\bnew\s+ResizeObserver\s*\(/g],
    ["MutationObserver", /\bnew\s+MutationObserver\s*\(/g],
    ["matchMedia", /\bmatchMedia\s*\(/g],
  ];
  for (const [name, re] of schedulePatterns) {
    let sm;
    while ((sm = re.exec(content))) {
      const line = lineNumberAt(content, sm.index);
      const nodeId = addNode(graph, {
        id: stableId("controller", [artifact.path, name, line]),
        type: "interaction-controller",
        name,
        controllerKind: name,
        filePath: artifact.path,
        line,
      });
      addEdge(graph, artifact.nodeId, nodeId, "controls", { evidence: `${name} at line ${line}` });
      schedules.push({ id: nodeId, kind: name, line });
    }
  }
  extractLibraryControllers(graph, artifact, content, schedules);
  extractGpuContracts(graph, artifact, content);

  graph.inventories.js.push({
    filePath: artifact.path,
    selectors,
    eventListeners,
    mutations,
    stateVariables,
    schedules,
    libraries,
  });
}

function extractImportsAsLibraries(graph, artifact, content, libraries) {
  const importRe = /\bimport(?:[^'"]*from\s*)?['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m;
  while ((m = importRe.exec(content))) {
    const source = m[1] || m[2];
    if (!source || source.startsWith(".") || source.startsWith("/")) continue;
    const line = lineNumberAt(content, m.index);
    const nodeId = addNode(graph, {
      id: stableId("library", [source]),
      type: "library",
      name: source,
      packageName: source,
      line,
    });
    addEdge(graph, artifact.nodeId, nodeId, "uses_library", { evidence: `import/require '${source}' at line ${line}` });
    libraries.push({ id: nodeId, name: source, line });
  }
}

function cleanExpression(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 120);
}

function isStateLike(name) {
  const lower = name.toLowerCase();
  return STATE_WORDS.some((word) => lower === word || lower.includes(word));
}

function inferStateKind(name) {
  const lower = name.toLowerCase();
  if (/progress|velocity|speed|delta|time|frame/.test(lower)) return "motion";
  if (/pointer|mouse|touch|x|y|z/.test(lower)) return "input";
  if (/active|current|selected|open|visible|hidden|index/.test(lower)) return "ui-state";
  if (/scroll|camera|bounds|target/.test(lower)) return "layout-or-scene";
  return "unknown";
}

function countResolvedDom(graph, keys) {
  const ids = new Set();
  for (const key of keys) {
    const domIds = graph.selectorIndex.get(key);
    if (!domIds) continue;
    for (const id of domIds) ids.add(id);
  }
  return ids.size;
}

const COMPONENT_RELATION_TYPES = new Set([
  "styles",
  "matches_selector",
  "controls",
  "listens_to",
  "mutates_class",
  "mutates_style",
  "mutates_dom",
  "mutates_attribute",
  "mutates_dataset",
]);

function isBroadCssRule(node) {
  if (!node || node.type !== "css-rule") return false;
  if (!selectorHasStableHook(node.selector || "")) return true;
  const compoundSelector = rightmostCompoundSelector(node.selector || "");
  if (!compoundSelector) return true;
  const compound = parseCompoundSelector(compoundSelector);
  return !compound.idAttr &&
    compound.dataAttrs.length === 0 &&
    compound.ariaAttrs.length === 0 &&
    compound.classes.length > 0 &&
    compound.classes.every((cls) => STATE_CLASS_NAMES.has(cls));
}

function isComponentRelation(graph, edge) {
  if (!COMPONENT_RELATION_TYPES.has(edge.type)) return false;
  const sourceNode = graph.nodeIndex.get(edge.source);
  if (edge.type === "styles" && isBroadCssRule(sourceNode)) return false;
  return true;
}

function createComponentCandidates(graph) {
  const domNodes = getDomNodes(graph);
  const inbound = new Map();
  const inboundEdges = new Map();
  for (const edge of graph.edges) {
    if (isComponentRelation(graph, edge)) {
      inbound.set(edge.target, (inbound.get(edge.target) || 0) + 1);
      if (!inboundEdges.has(edge.target)) inboundEdges.set(edge.target, []);
      inboundEdges.get(edge.target).push(edge);
    }
  }

  for (const dom of domNodes) {
    const score =
      (dom.isLandmark ? 3 : 0) +
      (dom.idAttr ? 2 : 0) +
      (dom.classes?.length ? 1 : 0) +
      (dom.dataAttrs?.length ? 2 : 0) +
      (inbound.get(dom.id) || 0);
    if (score < 3) continue;
    const candidateId = addNode(graph, {
      id: stableId("component-candidate", [dom.filePath, dom.line, dom.name]),
      type: "component-candidate",
      name: inferComponentName(dom),
      filePath: dom.filePath,
      line: dom.line,
      sourceDomNodeId: dom.id,
      score,
      selectorKeys: dom.selectorKeys,
      reason: buildCandidateReason(dom, inbound.get(dom.id) || 0),
    });
    addEdge(graph, candidateId, dom.id, "contains", { evidence: `candidate root score ${score}` });
    for (const edge of inboundEdges.get(dom.id) || []) {
      addEdge(graph, candidateId, edge.source, "depends_on", { evidence: `candidate depends on ${edge.type} source` });
    }
  }
}

function inferComponentName(dom) {
  if (dom.idAttr) return toPascalCase(dom.idAttr);
  if (dom.classes?.length) return toPascalCase(dom.classes[0]);
  if (dom.role) return toPascalCase(dom.role);
  return toPascalCase(dom.tag);
}

function toPascalCase(value) {
  return String(value)
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("") || "ComponentCandidate";
}

function buildCandidateReason(dom, relationCount) {
  const reasons = [];
  if (dom.isLandmark) reasons.push("semantic landmark");
  if (dom.idAttr) reasons.push("id contract");
  if (dom.classes?.length) reasons.push("class contract");
  if (dom.dataAttrs?.length) reasons.push("data attribute API");
  if (relationCount) reasons.push(`${relationCount} CSS/JS relations`);
  return reasons.join(", ");
}

function buildCoverage(graph) {
  const cssRules = graph.nodes.filter((n) => n.type === "css-rule");
  const jsSelectors = graph.nodes.filter((n) => n.type === "js-selector");
  const motionContracts = graph.nodes.filter((n) => n.type === "motion-contract");
  const componentCandidates = graph.nodes.filter((n) => n.type === "component-candidate");
  const styledTargets = new Set();
  const styledRuleSources = new Set();
  const matchedSelectors = new Set();
  for (const edge of graph.edges) {
    if (edge.type === "styles") {
      styledTargets.add(edge.target);
      styledRuleSources.add(edge.source);
    }
    if (edge.type === "matches_selector") matchedSelectors.add(edge.source);
  }
  const unresolvedCssSelectors = cssRules
    .filter((rule) => !styledRuleSources.has(rule.id))
    .map((rule) => ({ id: rule.id, selector: rule.selector, filePath: rule.filePath, line: rule.line }));
  const unresolvedJsSelectors = jsSelectors
    .filter((selector) => !matchedSelectors.has(selector.id))
    .map((selector) => ({ id: selector.id, selector: selector.selector, filePath: selector.filePath, line: selector.line }));

  return {
    domNodesWithStyles: styledTargets.size,
    cssRules: cssRules.length,
    jsSelectors: jsSelectors.length,
    motionContracts: motionContracts.length,
    componentCandidates: componentCandidates.length,
    hierarchyWarnings: graph.hierarchyWarnings || [],
    unresolvedCssSelectors,
    unresolvedJsSelectors,
  };
}

function summarizeStats(graph, artifacts) {
  const byType = {};
  for (const node of graph.nodes) byType[node.type] = (byType[node.type] || 0) + 1;
  const edgeTypes = {};
  for (const edge of graph.edges) edgeTypes[edge.type] = (edgeTypes[edge.type] || 0) + 1;
  const artifactTypes = {};
  for (const artifact of artifacts) artifactTypes[artifact.kind] = (artifactTypes[artifact.kind] || 0) + 1;
  return {
    artifacts: artifacts.length,
    artifactTypes,
    nodes: graph.nodes.length,
    nodeTypes: byType,
    edges: graph.edges.length,
    edgeTypes,
  };
}

function main() {
  const startedAt = Date.now();
  const mark = (message) => logProgress(`${message} (+${Date.now() - startedAt}ms)`);
  const [, , sourceDirArg, outputPathArg] = process.argv;
  if (!sourceDirArg || !outputPathArg) usage();
  if (!existsSync(sourceDirArg) || !statSync(sourceDirArg).isDirectory()) {
    console.error(`Source directory does not exist: ${sourceDirArg}`);
    process.exit(1);
  }

  const sourceDir = sourceDirArg;
  const outputPath = outputPathArg;
  const graph = {
    nodeIndex: new Map(),
    edgeIndex: new Set(),
    selectorIndex: new Map(),
    nodes: [],
    edges: [],
    inventories: {
      html: [],
      css: [],
      js: [],
      gpu: { shaders: [], assets: [] },
    },
    hierarchyWarnings: [],
  };

  const outputAbs = resolve(outputPath);
  mark(`Scanning source directory: ${sourceDir}`);
  const files = walkFiles(sourceDir).filter((abs) => {
    const base = basename(abs);
    return resolve(abs) !== outputAbs && !GENERATED_OUTPUT_RE.test(base);
  });
  mark(`Discovered ${files.length} source artifacts`);
  const artifacts = [];
  for (const abs of files) {
    const rel = relative(sourceDir, abs);
    const kind = classifyFile(rel);
    const bytes = statSync(abs).size;
    const artifactType = kind === "html" ? "html-file" : kind === "css" ? "stylesheet" : kind === "js" ? "script-module" : kind === "shader" ? "shader-source" : kind === "gpu-asset" ? "gpu-asset-file" : kind === "asset" ? "asset" : "source-file";
    const nodeId = addNode(graph, {
      id: stableId(artifactType, [rel]),
      type: artifactType,
      name: basename(rel),
      filePath: rel,
      kind,
      bytes,
    });
    const artifact = { path: rel, abs, kind, nodeId, bytes };
    artifacts.push(artifact);
  }
  mark(`Indexed ${artifacts.length} source artifacts`);

  const readTextArtifact = (artifact) => {
    const content = readFileSync(artifact.abs, "utf8");
    artifact.lineCount = countLines(content);
    graph.nodeIndex.get(artifact.nodeId).lineCount = artifact.lineCount;
    return content;
  };

  for (const artifact of artifacts.filter((a) => a.kind === "html")) {
    mark(`Extracting HTML: ${artifact.path}`);
    extractHtml(graph, artifact, readTextArtifact(artifact));
    mark(`Finished HTML: ${artifact.path}`);
  }
  for (const artifact of artifacts.filter((a) => a.kind === "css")) {
    mark(`Extracting CSS: ${artifact.path}`);
    extractCss(graph, artifact, readTextArtifact(artifact));
    mark(`Finished CSS: ${artifact.path}`);
  }
  for (const artifact of artifacts.filter((a) => a.kind === "shader")) {
    mark(`Extracting shader: ${artifact.path}`);
    extractShader(graph, artifact, readTextArtifact(artifact));
    mark(`Finished shader: ${artifact.path}`);
  }
  for (const artifact of artifacts.filter((a) => a.kind === "js")) {
    mark(`Extracting JS: ${artifact.path}`);
    extractJs(graph, artifact, readTextArtifact(artifact));
    mark(`Finished JS: ${artifact.path}`);
  }
  for (const artifact of artifacts.filter((a) => a.kind === "gpu-asset")) {
    extractGpuAsset(graph, artifact);
  }

  mark("Creating component candidates");
  createComponentCandidates(graph);
  mark("Finished component candidates");

  mark("Building public graph");
  const publicGraph = {
    schemaVersion: 2,
    generator: "design-system-reference-analyzer/scripts/extract-reference-graph.mjs",
    sourceDir,
    generatedAt: new Date().toISOString(),
    analysis: {
      engine: "scanner",
      parserBacked: false,
      partial: true,
      capabilities: {
        html: "token-scanner",
        css: "token-scanner",
        javascript: "pattern-scanner",
        gpu: "static-signals-only",
        runtimeVerification: false,
      },
    },
    artifacts: artifacts.map(({ abs, ...rest }) => rest),
    nodes: graph.nodes,
    edges: graph.edges,
    inventories: graph.inventories,
    coverage: buildCoverage(graph),
    stats: summarizeStats(graph, artifacts),
  };
  mark("Finished public graph");

  mkdirSync(dirname(outputPath), { recursive: true });
  mark(`Writing reference graph: ${outputPath}`);
  writeFileSync(outputPath, JSON.stringify(publicGraph, null, 2), "utf8");
  console.error(`Wrote reference graph: ${outputPath}`);
  console.error(`nodes=${publicGraph.nodes.length} edges=${publicGraph.edges.length}`);
}

main();
