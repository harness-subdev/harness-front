#!/usr/bin/env node
/**
 * Compact reference index extractor.
 *
 * Usage:
 *   node scripts/extract-reference-index.mjs <referenceGraphPath> <outputPath>
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const GENERATOR = "design-system-reference-analyzer/scripts/extract-reference-index.mjs";
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

function usage() {
  console.error("Usage: node extract-reference-index.mjs <referenceGraphPath> <outputPath>");
  process.exit(1);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sortStrings(values) {
  return [...new Set(values)].sort();
}

function emptyRefSets() {
  return Object.fromEntries(EVIDENCE_BUCKETS.map((bucket) => [bucket, new Set()]));
}

function emptyRefArrays() {
  return Object.fromEntries(EVIDENCE_BUCKETS.map((bucket) => [bucket, []]));
}

function setsToSortedArrays(refSets) {
  const out = {};
  for (const bucket of EVIDENCE_BUCKETS) {
    out[bucket] = sortStrings(refSets[bucket] || []);
  }
  return out;
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

function compactDomNode(node) {
  const out = {
    tag: node.tag,
    name: node.name,
    filePath: node.filePath,
    line: node.line,
    idAttr: node.idAttr ?? null,
    classes: Array.isArray(node.classes) ? [...node.classes] : [],
    parent: node.parent ?? null,
    children: Array.isArray(node.children) ? [...node.children] : [],
    depth: typeof node.depth === "number" ? node.depth : 0,
    openLine: node.openLine ?? node.line ?? null,
  };
  if (node.closeLine !== undefined) out.closeLine = node.closeLine;
  if (node.sourceRange) out.sourceRange = node.sourceRange;
  if (node.hierarchyConfidence) out.hierarchyConfidence = node.hierarchyConfidence;
  return out;
}

function buildDomHierarchy(domNodes) {
  const nodes = {};
  const roots = [];
  for (const node of domNodes) {
    nodes[node.id] = compactDomNode(node);
  }
  for (const node of domNodes) {
    if (!node.parent || !nodes[node.parent]) roots.push(node.id);
  }
  roots.sort((a, b) => {
    const left = nodes[a];
    const right = nodes[b];
    return (left.filePath || "").localeCompare(right.filePath || "") ||
      (left.line || 0) - (right.line || 0) ||
      a.localeCompare(b);
  });
  return { roots, nodes };
}

function buildSelectorIndex(domNodes) {
  const index = {};
  for (const node of domNodes) {
    for (const key of node.selectorKeys || []) {
      if (!index[key]) index[key] = [];
      index[key].push(node.id);
    }
  }
  return Object.fromEntries(
    Object.entries(index)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, ids]) => [key, sortStrings(ids)]),
  );
}

function buildEvidenceByType(nodes) {
  const byType = emptyRefArrays();
  for (const node of nodes) {
    const bucket = bucketForNode(node);
    if (bucket) byType[bucket].push(node.id);
  }
  for (const bucket of EVIDENCE_BUCKETS) {
    byType[bucket] = sortStrings(byType[bucket]);
  }
  return byType;
}

function addRef(refSets, bucket, id) {
  if (!bucket || !id) return;
  refSets[bucket].add(id);
}

function addAllRefs(target, source, buckets = EVIDENCE_BUCKETS) {
  for (const bucket of buckets) {
    for (const id of source[bucket] || []) target[bucket].add(id);
  }
}

function buildEvidenceByDomRef(graph, domNodes, nodeById) {
  const domIds = new Set(domNodes.map((node) => node.id));
  const direct = new Map(domNodes.map((node) => [node.id, emptyRefSets()]));

  for (const edge of graph.edges || []) {
    const sourceNode = nodeById.get(edge.source);
    const targetNode = nodeById.get(edge.target);
    if (domIds.has(edge.target)) {
      addRef(direct.get(edge.target), bucketForNode(sourceNode), edge.source);
    }
    if (domIds.has(edge.source)) {
      addRef(direct.get(edge.source), bucketForNode(targetNode), edge.target);
    }
  }

  const childrenByDom = new Map(domNodes.map((node) => [node.id, []]));
  for (const node of domNodes) {
    if (node.parent && childrenByDom.has(node.parent)) {
      childrenByDom.get(node.parent).push(node.id);
    }
  }
  for (const children of childrenByDom.values()) children.sort();

  const inherited = new Map(domNodes.map((node) => [node.id, emptyRefSets()]));
  const descendant = new Map(domNodes.map((node) => [node.id, emptyRefSets()]));

  for (const node of domNodes) {
    let parentId = node.parent;
    const seen = new Set();
    while (parentId && direct.has(parentId) && !seen.has(parentId)) {
      seen.add(parentId);
      addAllRefs(inherited.get(node.id), direct.get(parentId), ["cssRules"]);
      parentId = nodeById.get(parentId)?.parent;
    }
  }

  const visit = (domId) => {
    const refs = emptyRefSets();
    for (const childId of childrenByDom.get(domId) || []) {
      addAllRefs(refs, direct.get(childId));
      addAllRefs(refs, visit(childId));
    }
    addAllRefs(descendant.get(domId), refs);
    return refs;
  };

  for (const node of domNodes) {
    if (!node.parent || !domIds.has(node.parent)) visit(node.id);
  }

  const byDomRef = {};
  for (const node of [...domNodes].sort((a, b) => a.id.localeCompare(b.id))) {
    byDomRef[node.id] = {
      directRefs: setsToSortedArrays(direct.get(node.id)),
      inheritedRefs: setsToSortedArrays(inherited.get(node.id)),
      descendantRefs: setsToSortedArrays(descendant.get(node.id)),
    };
  }
  return byDomRef;
}

function main() {
  const [, , graphPath, outputPath] = process.argv;
  if (!graphPath || !outputPath) usage();

  const graph = readJson(graphPath);
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const domNodes = nodes
    .filter((node) => node.type === "dom-node")
    .sort((a, b) =>
      (a.filePath || "").localeCompare(b.filePath || "") ||
      (a.line || 0) - (b.line || 0) ||
      a.id.localeCompare(b.id)
    );
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const selectorIndex = buildSelectorIndex(domNodes);
  const byType = buildEvidenceByType(nodes);
  const hierarchyWarnings = graph.coverage?.hierarchyWarnings || [];

  const index = {
    schemaVersion: 2,
    generator: GENERATOR,
    generatedAt: new Date().toISOString(),
    sourceGraph: {
      path: graphPath,
      schemaVersion: graph.schemaVersion,
      sourceDir: graph.sourceDir,
      generatedAt: graph.generatedAt,
      stats: graph.stats,
    },
    analysis: graph.analysis || { engine: "unknown", parserBacked: false, partial: true },
    summary: {
      artifacts: Array.isArray(graph.artifacts) ? graph.artifacts.length : 0,
      domNodes: domNodes.length,
      evidenceItems: EVIDENCE_BUCKETS.reduce((total, bucket) => total + byType[bucket].length, 0),
      selectorKeys: Object.keys(selectorIndex).length,
      hierarchyWarnings: hierarchyWarnings.length,
    },
    domHierarchy: buildDomHierarchy(domNodes),
    selectorIndex,
    evidenceIndex: {
      byType,
      byDomRef: buildEvidenceByDomRef(graph, domNodes, nodeById),
    },
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(index, null, 2), "utf8");
  console.error(`Wrote reference index: ${outputPath}`);
}

main();
