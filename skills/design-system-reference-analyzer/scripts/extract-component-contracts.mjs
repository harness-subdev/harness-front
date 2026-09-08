#!/usr/bin/env node
/**
 * Compact v2 component contract extractor for design-system reference graphs.
 *
 * Usage:
 *   node scripts/extract-component-contracts.mjs <referenceGraphPath> <outputPath> [referenceIndexPath]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const GENERATOR = "design-system-reference-analyzer/scripts/extract-component-contracts.mjs";
const EVIDENCE_BUCKETS = [
  "cssRules",
  "motionContracts",
  "jsSelectors",
  "events",
  "mutations",
  "controllers",
  "stateVariables",
  "assets",
  "libraries",
  "gpuContracts",
];
const REF_BUCKETS = ["directRefs", "inheritedRefs", "descendantRefs"];
const GPU_RELATION_TYPES = new Set([
  "binds_texture",
  "configures",
  "declares_uniform",
  "precedes",
  "reads_channel",
  "uses_shader",
  "writes_to",
]);
const GPU_IDENTITY_REF_FIELDS = [
  "domNodeId",
  "canvasRef",
  "canvasRefs",
  "contextRef",
  "ownerRef",
  "ownerRefs",
  "passRef",
  "programRef",
  "rendererRef",
  "shaderRef",
  "targetRef",
  "textureRef",
  "uniformRef",
];
const TOP_LEVEL_TAGS = new Set(["header", "footer"]);
const MAIN_CHILD_TOP_LEVEL_TAGS = new Set(["section", "article", "aside"]);
const CHILD_COMPONENT_TAGS = new Set([
  "nav",
  "form",
  "button",
  "a",
  "input",
  "select",
  "textarea",
  "summary",
  "dialog",
  "canvas",
]);
const REPEATED_BOX_TAGS = new Set(["div", "article", "aside"]);
const TRANSPARENT_WRAPPER_NAMES = new Set([
  "app",
  "application",
  "container",
  "content",
  "layout",
  "page",
  "root",
  "shell",
  "site",
  "viewport",
  "wrapper",
]);
const UTILITY_CLASSES = new Set([
  "active",
  "button",
  "container",
  "current",
  "hidden",
  "item",
  "on",
  "open",
  "selected",
  "visible",
]);

function usage() {
  console.error("Usage: node extract-component-contracts.mjs <referenceGraphPath> <outputPath> [referenceIndexPath]");
  process.exit(1);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function uniq(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function sortStrings(values) {
  return uniq(values).sort();
}

function toPascalCase(value) {
  return String(value || "")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("") || "Component";
}

function slug(value) {
  return String(value || "component").replace(/[^a-zA-Z0-9_.:#-]/g, "_");
}

function emptyEvidenceRefs() {
  return Object.fromEntries(EVIDENCE_BUCKETS.map((bucket) => [bucket, []]));
}

function emptyEvidenceBuckets() {
  return {
    directRefs: emptyEvidenceRefs(),
    inheritedRefs: emptyEvidenceRefs(),
    descendantRefs: emptyEvidenceRefs(),
  };
}

function normalizeEvidenceRefs(refs) {
  const out = emptyEvidenceBuckets();
  for (const refBucket of REF_BUCKETS) {
    for (const evidenceBucket of EVIDENCE_BUCKETS) {
      out[refBucket][evidenceBucket] = sortStrings(refs?.[refBucket]?.[evidenceBucket] || []);
    }
  }
  return out;
}

function mergeEvidenceRefs(...items) {
  const out = emptyEvidenceBuckets();
  for (const item of items) {
    const refs = normalizeEvidenceRefs(item);
    for (const refBucket of REF_BUCKETS) {
      for (const evidenceBucket of EVIDENCE_BUCKETS) {
        out[refBucket][evidenceBucket].push(...refs[refBucket][evidenceBucket]);
      }
    }
  }
  return normalizeEvidenceRefs(out);
}

function addRef(target, refBucket, evidenceBucket, id) {
  if (!target?.[refBucket]?.[evidenceBucket] || !id) return;
  target[refBucket][evidenceBucket].push(id);
}

function bucketForNode(node) {
  if (!node) return null;
  if (node.type === "css-rule") return "cssRules";
  if (node.type === "motion-contract") return "motionContracts";
  if (node.type === "js-selector") return "jsSelectors";
  if (node.type === "event-listener") return "events";
  if (node.type === "dom-mutation") return "mutations";
  if (node.type === "interaction-controller") return "controllers";
  if (node.type === "state-variable") return "stateVariables";
  if (node.type === "asset") return "assets";
  if (node.type === "library") return "libraries";
  if (node.type === "gpu-contract") return "gpuContracts";
  return null;
}

function selectorFromDom(dom) {
  if (dom.idAttr) return `#${dom.idAttr}`;
  const semanticClass = (dom.classes || []).find((className) => !UTILITY_CLASSES.has(className));
  if (semanticClass) return `.${semanticClass}`;
  if (dom.classes?.length) return `.${dom.classes[0]}`;
  return dom.tag || dom.name || "component";
}

function componentNameFromDom(dom, options = {}) {
  if (options.exactTagName && ["header", "section", "footer"].includes(dom.tag)) {
    return toPascalCase(dom.tag);
  }
  if (dom.tag === "nav") return "Nav";
  if (dom.tag === "form") return "Form";
  if (dom.tag === "button") return "Button";
  if (dom.tag === "a") return "Link";
  if (dom.tag === "input") return "Input";
  if (dom.idAttr) return toPascalCase(dom.idAttr);
  const semanticClass = (dom.classes || []).find((className) => !UTILITY_CLASSES.has(className));
  if (semanticClass) return toPascalCase(semanticClass);
  if (dom.classes?.length) return toPascalCase(dom.classes[0]);
  if (dom.role) return toPascalCase(dom.role);
  return toPascalCase(dom.tag);
}

function roleFromDom(dom) {
  if (dom.role) return dom.role;
  if (dom.tag === "header") return "banner";
  if (dom.tag === "footer") return "contentinfo";
  if (dom.tag === "main") return "main";
  if (dom.tag === "nav") return "navigation";
  if (dom.tag === "form") return "form";
  if (dom.tag === "a") return "link";
  if (dom.tag === "button") return "button";
  if (dom.tag === "input") return "input";
  return dom.tag || "component";
}

function domSource(dom) {
  return {
    filePath: dom.filePath || null,
    line: dom.line ?? null,
  };
}

function compactEvidence(node) {
  const base = {
    id: node.id,
    filePath: node.filePath || null,
    line: node.line ?? null,
  };
  if (node.type === "css-rule") {
    return {
      ...base,
      selector: node.selector,
      declarations: (node.declarations || []).slice(0, 12),
      tokenUses: node.tokenUses || [],
      keyframeUses: node.keyframeUses || [],
    };
  }
  if (node.type === "motion-contract") {
    return {
      ...base,
      selector: node.selector,
      trigger: node.trigger || null,
      affectedProperties: node.affectedProperties || [],
      declarations: (node.declarations || []).slice(0, 12),
    };
  }
  if (node.type === "js-selector") {
    return {
      ...base,
      selector: node.selector,
      selectorKind: node.selectorKind || null,
      alias: node.alias || null,
    };
  }
  if (node.type === "event-listener") {
    return {
      ...base,
      eventType: node.eventType,
      targetSelector: node.targetSelector || null,
      delegatedSelector: node.delegatedSelector || null,
      sourceKind: node.sourceKind || null,
    };
  }
  if (node.type === "dom-mutation") {
    return {
      ...base,
      operation: node.operation || null,
      mutationKind: node.mutationKind || null,
      targetSelector: node.targetSelector || null,
      classNames: node.classNames || [],
      styleProperty: node.styleProperty || null,
    };
  }
  if (node.type === "interaction-controller") {
    return {
      ...base,
      controllerKind: node.controllerKind || null,
      targetSelector: node.targetSelector || null,
      triggerSelector: node.triggerSelector || null,
    };
  }
  if (node.type === "state-variable") {
    return {
      ...base,
      name: node.name,
      stateKind: node.stateKind || null,
    };
  }
  if (node.type === "asset") {
    return {
      ...base,
      name: node.name,
      url: node.url || null,
      assetKind: node.assetKind || null,
    };
  }
  if (node.type === "library") {
    return {
      ...base,
      name: node.name || node.packageName || node.id,
    };
  }
  if (node.type === "gpu-contract") {
    const out = {
      ...base,
      name: node.name ?? null,
      gpuKind: node.gpuKind ?? null,
      stage: node.stage ?? null,
      uniformKind: node.uniformKind ?? null,
      sampler: node.sampler ?? null,
      channel: node.channel ?? null,
      rendererKind: node.rendererKind ?? null,
      programKind: node.programKind ?? null,
      contextType: node.contextType ?? null,
      targetKind: node.targetKind ?? null,
      stateKind: node.stateKind ?? null,
      sourceRange: node.sourceRange ?? null,
      confidence: node.confidence ?? "partial",
      provenance: node.provenance ?? "static-scanner",
    };
    if (node.label !== undefined) out.label = node.label;
    for (const field of GPU_IDENTITY_REF_FIELDS) {
      if (node[field] !== undefined) out[field] = Array.isArray(node[field]) ? [...node[field]] : node[field];
    }
    return out;
  }
  return base;
}

function buildEvidence(graph) {
  const evidence = Object.fromEntries(EVIDENCE_BUCKETS.map((bucket) => [bucket, {}]));
  for (const node of graph.nodes || []) {
    const bucket = bucketForNode(node);
    if (!bucket) continue;
    evidence[bucket][node.id] = compactEvidence(node);
  }
  return evidence;
}

function buildGpuRelationships(graph) {
  const gpuRefs = new Set((graph.nodes || []).filter((node) => node.type === "gpu-contract").map((node) => node.id));
  return (graph.edges || [])
    .filter((edge) => GPU_RELATION_TYPES.has(edge.type) && (gpuRefs.has(edge.source) || gpuRefs.has(edge.target)))
    .map((edge) => ({
      sourceRef: edge.source,
      targetRef: edge.target,
      relation: edge.type,
    }))
    .sort((left, right) =>
      left.sourceRef.localeCompare(right.sourceRef) ||
      left.relation.localeCompare(right.relation) ||
      left.targetRef.localeCompare(right.targetRef)
    );
}

function buildGraphEvidenceByDomRef(graph, domNodes, nodeById) {
  const byDomRef = Object.fromEntries(domNodes.map((dom) => [dom.id, emptyEvidenceBuckets()]));
  const domIds = new Set(domNodes.map((dom) => dom.id));
  for (const edge of graph.edges || []) {
    if (domIds.has(edge.target)) {
      addRef(byDomRef[edge.target], "directRefs", bucketForNode(nodeById.get(edge.source)), edge.source);
    }
    if (domIds.has(edge.source)) {
      addRef(byDomRef[edge.source], "directRefs", bucketForNode(nodeById.get(edge.target)), edge.target);
    }
  }

  const childrenByDom = new Map(domNodes.map((dom) => [dom.id, []]));
  for (const dom of domNodes) {
    if (dom.parent && childrenByDom.has(dom.parent)) childrenByDom.get(dom.parent).push(dom.id);
  }

  for (const dom of domNodes) {
    let parentId = dom.parent;
    const seen = new Set();
    while (parentId && byDomRef[parentId] && !seen.has(parentId)) {
      seen.add(parentId);
      byDomRef[dom.id] = mergeEvidenceRefs(byDomRef[dom.id], {
        inheritedRefs: {
          ...emptyEvidenceRefs(),
          cssRules: byDomRef[parentId].directRefs.cssRules,
        },
      });
      parentId = nodeById.get(parentId)?.parent;
    }
  }

  function visit(domId) {
    let refs = emptyEvidenceBuckets();
    for (const childId of childrenByDom.get(domId) || []) {
      refs = mergeEvidenceRefs(refs, { directRefs: byDomRef[childId].directRefs }, visit(childId));
    }
    byDomRef[domId] = mergeEvidenceRefs(byDomRef[domId], { descendantRefs: refs.directRefs });
    return refs;
  }

  for (const dom of domNodes) {
    if (!dom.parent || !domIds.has(dom.parent)) visit(dom.id);
  }

  return Object.fromEntries(
    Object.entries(byDomRef).map(([domRef, refs]) => [domRef, normalizeEvidenceRefs(refs)]),
  );
}

function readReferenceIndex(graphPath, explicitPath) {
  const siblingPath = join(dirname(graphPath), "reference-index.json");
  const path = explicitPath || (existsSync(siblingPath) ? siblingPath : null);
  if (!path || !existsSync(path)) {
    return { path: path || null, found: false, index: null };
  }
  return { path, found: true, index: readJson(path) };
}

function topLevelRank(dom) {
  if (dom.tag === "header") return 10;
  if (dom.tag === "section") return 20;
  if (dom.tag === "article") return 21;
  if (dom.tag === "aside") return 22;
  if (dom.tag === "main") return 30;
  if (dom.tag === "footer") return 90;
  return 50;
}

function wrapperNameTokens(dom) {
  return [
    dom.idAttr,
    ...(dom.classes || []),
    dom.role,
    dom.name,
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).toLowerCase().split(/[^a-z0-9]+/))
    .filter(Boolean);
}

function isTransparentWrapperDom(dom) {
  if (!dom || dom.tag !== "div") return false;
  return wrapperNameTokens(dom).some((token) => TRANSPARENT_WRAPPER_NAMES.has(token));
}

function nearestRegionDetectionAncestor(dom, nodeById) {
  let ancestor = nodeById.get(dom.parent);
  const seen = new Set();
  while (ancestor && !seen.has(ancestor.id) && isTransparentWrapperDom(ancestor)) {
    seen.add(ancestor.id);
    ancestor = nodeById.get(ancestor.parent);
  }
  return ancestor || null;
}

function hasMainChildTopLevelRegion(dom, nodeById) {
  const children = (dom.children || []).map((id) => nodeById.get(id)).filter(Boolean);
  for (const child of children) {
    if (MAIN_CHILD_TOP_LEVEL_TAGS.has(child.tag)) return true;
    if (isTransparentWrapperDom(child) && hasMainChildTopLevelRegion(child, nodeById)) return true;
  }
  return false;
}

function isTopLevelDom(dom, nodeById) {
  if (TOP_LEVEL_TAGS.has(dom.tag)) return true;
  const parent = nearestRegionDetectionAncestor(dom, nodeById);
  if (MAIN_CHILD_TOP_LEVEL_TAGS.has(dom.tag) && (!parent || parent.tag === "main" || parent.tag === "body")) return true;
  if (dom.tag === "main") {
    return !hasMainChildTopLevelRegion(dom, nodeById);
  }
  return false;
}

function isDescendantOf(dom, ancestorId, nodeById) {
  let parentId = dom.parent;
  const seen = new Set();
  while (parentId && !seen.has(parentId)) {
    if (parentId === ancestorId) return true;
    seen.add(parentId);
    parentId = nodeById.get(parentId)?.parent;
  }
  return false;
}

function nearestTopLevelAncestor(dom, topLevelDomIds, nodeById) {
  let parentId = dom.parent;
  const seen = new Set();
  while (parentId && !seen.has(parentId)) {
    if (topLevelDomIds.has(parentId)) return parentId;
    seen.add(parentId);
    parentId = nodeById.get(parentId)?.parent;
  }
  return null;
}

function hasDirectSourceHook(dom, evidenceRefs) {
  if (dom.idAttr || dom.classes?.length || dom.dataAttrs?.length || dom.ariaAttrs?.length) return true;
  const direct = evidenceRefs?.directRefs || {};
  return EVIDENCE_BUCKETS.some((bucket) => (direct[bucket] || []).length > 0);
}

function isRepeatedCandidate(dom, allDomNodes) {
  if (!dom.classes?.length) return false;
  const signature = repeatedSignature(dom);
  return allDomNodes.filter((node) => repeatedSignature(node) === signature).length >= 2;
}

function repeatedSignature(dom) {
  const classes = (dom.classes || []).filter((className) => !UTILITY_CLASSES.has(className)).sort();
  return `${dom.tag}.${classes.join(".")}`;
}

function shouldCreateChildComponent(dom, evidenceRefs, allDomNodes) {
  if (CHILD_COMPONENT_TAGS.has(dom.tag)) return hasDirectSourceHook(dom, evidenceRefs);
  if (dom.tag === "article") return hasDirectSourceHook(dom, evidenceRefs);
  if (dom.tag === "li" && isRepeatedCandidate(dom, allDomNodes)) return hasDirectSourceHook(dom, evidenceRefs);
  if (REPEATED_BOX_TAGS.has(dom.tag) && isRepeatedCandidate(dom, allDomNodes)) return hasDirectSourceHook(dom, evidenceRefs);
  if (dom.tag === "img" && hasDirectSourceHook(dom, evidenceRefs)) return true;
  return false;
}

function componentIdForDom(dom, prefix = "component") {
  const selector = selectorFromDom(dom);
  const position = dom.sourceRange?.start ?? dom.id;
  return `${prefix}:${slug(`${dom.tag}:${selector}:${dom.line || "unknown"}:${position}`)}`;
}

function contractStatusFor(refs, unresolvedRefs = [], analysis = null) {
  if (unresolvedRefs.length > 0) return "unresolved";
  if (analysis?.partial) return "partial";
  const normalized = normalizeEvidenceRefs(refs);
  const directCount = EVIDENCE_BUCKETS.reduce((total, bucket) => total + normalized.directRefs[bucket].length, 0);
  const descendantCount = EVIDENCE_BUCKETS.reduce((total, bucket) => total + normalized.descendantRefs[bucket].length, 0);
  return directCount > 0 || descendantCount > 0 ? "ready" : "partial";
}

function buildComponents(graph, referenceIndex) {
  const domNodes = (graph.nodes || [])
    .filter((node) => node.type === "dom-node")
    .sort((a, b) =>
      (a.filePath || "").localeCompare(b.filePath || "") ||
      (a.line || 0) - (b.line || 0) ||
      a.id.localeCompare(b.id)
    );
  const nodeById = new Map((graph.nodes || []).map((node) => [node.id, node]));
  const indexedEvidence = referenceIndex?.evidenceIndex?.byDomRef;
  const evidenceByDomRef = indexedEvidence || buildGraphEvidenceByDomRef(graph, domNodes, nodeById);

  const topLevelDoms = domNodes
    .filter((dom) => isTopLevelDom(dom, nodeById))
    .sort((a, b) =>
      (a.filePath || "").localeCompare(b.filePath || "") ||
      topLevelRank(a) - topLevelRank(b) ||
      (a.line || 0) - (b.line || 0) ||
      a.id.localeCompare(b.id)
    );
  const topLevelDomIds = new Set(topLevelDoms.map((dom) => dom.id));
  const componentByDomRef = new Map();
  const components = {};
  const componentTree = [];

  for (const dom of topLevelDoms) {
    const refs = normalizeEvidenceRefs(evidenceByDomRef[dom.id]);
    const component = {
      id: componentIdForDom(dom, "component"),
      name: componentNameFromDom(dom, { exactTagName: true }),
      kind: "top-level",
      role: roleFromDom(dom),
      parentRef: null,
      rootDomRef: dom.id,
      childComponentRefs: [],
      patternRef: null,
      evidenceRefs: refs,
      contractStatus: contractStatusFor(refs, [], graph.analysis),
      unresolvedRefs: [],
      source: domSource(dom),
    };
    components[component.id] = component;
    componentByDomRef.set(dom.id, component.id);
    componentTree.push({
      id: component.id,
      name: component.name,
      kind: "top-level",
      role: component.role,
      rootDomRef: component.rootDomRef,
      childComponentRefs: component.childComponentRefs,
      evidenceRefs: component.evidenceRefs,
      contractStatus: component.contractStatus,
    });
  }

  const childDoms = domNodes
    .filter((dom) => !topLevelDomIds.has(dom.id))
    .filter((dom) => {
      const nearest = nearestTopLevelAncestor(dom, topLevelDomIds, nodeById);
      return nearest && shouldCreateChildComponent(dom, normalizeEvidenceRefs(evidenceByDomRef[dom.id]), domNodes);
    })
    .sort((a, b) =>
      (a.filePath || "").localeCompare(b.filePath || "") ||
      (a.line || 0) - (b.line || 0) ||
      a.id.localeCompare(b.id)
    );

  for (const dom of childDoms) {
    const parentDomRef = nearestTopLevelAncestor(dom, topLevelDomIds, nodeById);
    const parentRef = componentByDomRef.get(parentDomRef);
    if (!parentRef) continue;
    const refs = normalizeEvidenceRefs(evidenceByDomRef[dom.id]);
    const component = {
      id: componentIdForDom(dom, "component"),
      name: componentNameFromDom(dom),
      kind: "child",
      role: roleFromDom(dom),
      parentRef,
      rootDomRef: dom.id,
      childComponentRefs: [],
      patternRef: null,
      evidenceRefs: refs,
      contractStatus: contractStatusFor(refs, [], graph.analysis),
      unresolvedRefs: [],
      source: domSource(dom),
    };
    components[component.id] = component;
    componentByDomRef.set(dom.id, component.id);
    components[parentRef].childComponentRefs.push(component.id);
  }

  for (const component of Object.values(components)) {
    component.childComponentRefs = sortStrings(component.childComponentRefs);
  }
  for (const treeItem of componentTree) {
    treeItem.childComponentRefs = components[treeItem.id].childComponentRefs;
    treeItem.evidenceRefs = components[treeItem.id].evidenceRefs;
  }

  return { components, componentTree, domNodes, nodeById, evidenceByDomRef, componentByDomRef };
}

function refsUsedByComponents(components) {
  const used = Object.fromEntries(EVIDENCE_BUCKETS.map((bucket) => [bucket, new Set()]));
  for (const component of Object.values(components)) {
    const refs = normalizeEvidenceRefs(component.evidenceRefs);
    for (const refBucket of REF_BUCKETS) {
      for (const evidenceBucket of EVIDENCE_BUCKETS) {
        for (const id of refs[refBucket][evidenceBucket]) used[evidenceBucket].add(id);
      }
    }
  }
  return Object.fromEntries(Object.entries(used).map(([bucket, ids]) => [bucket, sortStrings([...ids])]));
}

function buildPatterns(components, domNodes, nodeById) {
  const groups = new Map();
  for (const component of Object.values(components)) {
    if (component.kind !== "child") continue;
    const dom = nodeById.get(component.rootDomRef);
    if (!dom || !dom.classes?.length) continue;
    const signature = repeatedSignature(dom);
    if (!signature.includes(".")) continue;
    if (!groups.has(signature)) groups.set(signature, []);
    groups.get(signature).push(component);
  }

  const patterns = {};
  for (const [signature, instances] of groups) {
    if (instances.length < 2) continue;
    const id = `pattern:${slug(signature)}`;
    const firstDom = nodeById.get(instances[0].rootDomRef);
    const shared = {};
    for (const evidenceBucket of EVIDENCE_BUCKETS) {
      const lists = instances.map((component) => normalizeEvidenceRefs(component.evidenceRefs).directRefs[evidenceBucket]);
      const [first = []] = lists;
      shared[evidenceBucket] = sortStrings(first.filter((ref) => lists.every((list) => list.includes(ref))));
    }
    patterns[id] = {
      id,
      name: `${componentNameFromDom(firstDom || { tag: "item" })}Pattern`,
      rootSignature: signature,
      instanceComponentRefs: instances.map((component) => component.id).sort(),
      variantFields: ["sourceLine", "instanceIndex"],
      sharedEvidenceRefs: shared,
    };
    instances
      .sort((a, b) => (a.source.line || 0) - (b.source.line || 0) || a.id.localeCompare(b.id))
      .forEach((component, index) => {
        component.patternRef = id;
        component.variant = {
          sourceLine: component.source.line,
          instanceIndex: index,
        };
      });
  }
  return patterns;
}

function componentForDomRef(domRef, componentByDomRef, components, domNodes, nodeById) {
  if (componentByDomRef.has(domRef)) return componentByDomRef.get(domRef);
  const dom = nodeById.get(domRef);
  if (!dom) return null;
  let best = null;
  for (const component of Object.values(components)) {
    if (isDescendantOf(dom, component.rootDomRef, nodeById)) {
      const candidateDom = nodeById.get(component.rootDomRef);
      if (!best || (candidateDom?.depth || 0) > (nodeById.get(best.rootDomRef)?.depth || 0)) best = component;
    }
  }
  return best?.id || null;
}

function buildRelationships(graph, components, componentByDomRef, nodeById) {
  const relationships = [];
  const keys = new Set();
  const events = (graph.nodes || []).filter((node) => node.type === "event-listener");
  const mutations = (graph.nodes || []).filter((node) => node.type === "dom-mutation");
  const mutationsByFile = new Map();
  for (const mutation of mutations) {
    if (!mutation.filePath) continue;
    if (!mutationsByFile.has(mutation.filePath)) mutationsByFile.set(mutation.filePath, []);
    mutationsByFile.get(mutation.filePath).push(mutation);
  }
  const targetEdgesBySource = new Map();
  for (const edge of graph.edges || []) {
    if (!targetEdgesBySource.has(edge.source)) targetEdgesBySource.set(edge.source, []);
    targetEdgesBySource.get(edge.source).push(edge);
  }

  function targetedComponents(node, edgeTypes) {
    const ids = new Set();
    for (const edge of targetEdgesBySource.get(node.id) || []) {
      if (!edgeTypes.has(edge.type)) continue;
      const target = nodeById.get(edge.target);
      if (target?.type !== "dom-node") continue;
      const componentRef = componentForDomRef(target.id, componentByDomRef, components, [], nodeById);
      if (componentRef) ids.add(componentRef);
    }
    return [...ids].sort();
  }

  for (const event of events) {
    const fromRefs = targetedComponents(event, new Set(["listens_to"]));
    if (fromRefs.length === 0 || !event.filePath || !event.line) continue;
    const nearbyMutations = (mutationsByFile.get(event.filePath) || [])
      .filter((mutation) => mutation.line >= event.line && mutation.line <= event.line + 80);
    for (const mutation of nearbyMutations) {
      const toRefs = targetedComponents(mutation, new Set([
        "mutates_class",
        "mutates_style",
        "mutates_dom",
        "mutates_attribute",
        "mutates_dataset",
      ]));
      for (const fromComponentRef of fromRefs) {
        for (const toComponentRef of toRefs) {
          const key = `${fromComponentRef}\u0000${toComponentRef}\u0000${event.id}\u0000${mutation.id}`;
          if (keys.has(key)) continue;
          keys.add(key);
          relationships.push({
            id: `relationship:${relationships.length + 1}`,
            type: "event-mutates-dom",
            fromComponentRef,
            toComponentRef,
            eventRef: event.id,
            mutationRef: mutation.id,
            confidence: "line-proximity",
          });
        }
      }
    }
  }
  return relationships;
}

function buildUnresolvedRefs(graph) {
  return sortStrings([
    ...(graph.coverage?.unresolvedCssSelectors || []).map((item) => item.id || item.selector),
    ...(graph.coverage?.unresolvedJsSelectors || []).map((item) => item.id || item.selector),
  ]);
}

function main() {
  const [, , graphPath, outputPath, explicitIndexPath] = process.argv;
  if (!graphPath || !outputPath) usage();

  const graph = readJson(graphPath);
  const referenceIndex = readReferenceIndex(graphPath, explicitIndexPath);
  const evidence = buildEvidence(graph);
  const gpuRelationships = buildGpuRelationships(graph);
  const {
    components,
    componentTree,
    domNodes,
    nodeById,
    evidenceByDomRef,
    componentByDomRef,
  } = buildComponents(graph, referenceIndex.index);
  const patterns = buildPatterns(components, domNodes, nodeById);
  const relationships = buildRelationships(graph, components, componentByDomRef, nodeById);
  const unresolvedRefs = buildUnresolvedRefs(graph);
  for (const component of Object.values(components)) {
    component.unresolvedRefs = unresolvedRefs.filter((ref) => {
      const allRefs = REF_BUCKETS.flatMap((refBucket) =>
        EVIDENCE_BUCKETS.flatMap((bucket) => component.evidenceRefs[refBucket][bucket])
      );
      return allRefs.includes(ref);
    });
    component.contractStatus = contractStatusFor(component.evidenceRefs, component.unresolvedRefs, graph.analysis);
  }
  for (const treeItem of componentTree) {
    treeItem.contractStatus = components[treeItem.id].contractStatus;
  }

  const usedEvidenceRefs = refsUsedByComponents(components);
  const output = {
    schemaVersion: 2,
    generator: GENERATOR,
    generatedAt: new Date().toISOString(),
    sourceGraph: {
      path: graphPath,
      schemaVersion: graph.schemaVersion ?? null,
      generator: graph.generator || null,
      sourceDir: graph.sourceDir || null,
      generatedAt: graph.generatedAt || null,
      stats: graph.stats || null,
    },
    analysis: graph.analysis || { engine: "unknown", parserBacked: false, partial: true },
    sourceIndex: {
      path: referenceIndex.path,
      found: referenceIndex.found,
      schemaVersion: referenceIndex.index?.schemaVersion ?? null,
      generator: referenceIndex.index?.generator || null,
      generatedAt: referenceIndex.index?.generatedAt || null,
      fallback: referenceIndex.found ? null : "graph-derived-evidence-buckets",
    },
    summary: {
      components: Object.keys(components).length,
      topLevelComponents: componentTree.length,
      patterns: Object.keys(patterns).length,
      relationships: relationships.length,
      evidence: Object.fromEntries(EVIDENCE_BUCKETS.map((bucket) => [bucket, Object.keys(evidence[bucket]).length])),
      usedEvidenceRefs,
    },
    componentTree,
    components: Object.fromEntries(
      Object.entries(components).sort(([a], [b]) => a.localeCompare(b)),
    ),
    patterns: Object.fromEntries(
      Object.entries(patterns).sort(([a], [b]) => a.localeCompare(b)),
    ),
    evidence,
    gpuRelationships,
    relationships,
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf8");
  console.error(`Wrote component contracts: ${outputPath}`);
  console.error(`components=${output.summary.components} patterns=${output.summary.patterns} relationships=${relationships.length}`);
}

main();
