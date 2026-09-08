import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const skillRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const skill = readFileSync(join(skillRoot, "SKILL.md"), "utf8");
const companionPath = join(skillRoot, "references", "gpu-evidence-companion.md");
const readReference = (name) =>
  readFileSync(join(skillRoot, "references", name), "utf8");
const implementationReadyStatusContract =
  /gpu-runtime-status\.json\.status\s*===\s*[`"]runtime-validated[`"][\s\S]*render-contracts\.json\.status\s*===\s*[`"]runtime-validated[`"][\s\S]*render-contracts\.json\.unresolved[\s\S]*empty/i;

test("routes implementation-ready GPU proof through the DSRA companion", () => {
  assert.equal(existsSync(companionPath), true, "companion reference must exist");
  assert.match(skill, /GPU evidence companion gate/);
  assert.match(skill, /\$design-system-reference-analyzer/);
  assert.match(skill, /DSRA is already primary[\s\S]*(do not invoke|do not route back)/i);
  assert.match(skill, /runtime-validated/);
  assert.match(skill, /public-artifact-assisted/);
  assert.match(skill, /(saved-research|non-deliverable research)/i);
  assert.doesNotMatch(skill, /^compatibility:/m);
});

test("requires both runtime statuses before implementation-ready GPU work", () => {
  assert.equal(existsSync(companionPath), true, "companion reference must exist");
  const companion = readFileSync(companionPath, "utf8");
  assert.match(companion, implementationReadyStatusContract);
  assert.match(skill, implementationReadyStatusContract);
});

test("requires separate clean and pre-navigation instrumented evidence", () => {
  assert.equal(existsSync(companionPath), true, "companion reference must exist");
  const companion = readFileSync(companionPath, "utf8");
  assert.match(companion, /clean, uninstrumented/i);
  assert.match(companion, /before navigation/i);
  assert.match(companion, /gpu-runtime-trace\.json/);
  assert.match(companion, /gpu-runtime-status\.json/);
  assert.match(companion, /render-contracts\.json/);
  const joinClause = companion.split("\n").find((line) => /Join checkpoints/i.test(line));
  assert.ok(joinClause, "paired-run join clause must exist");
  assert.match(joinClause, /reduced[- ]motion/i);
  assert.match(joinClause, /asset state/i);
  assert.match(companion, /complete shader source/i);
  assert.match(companion, /strict behavior-only/i);
  assert.match(companion, /referenced clean artifact exists/i);
  for (const blocker of [
    "late injection",
    "overflow",
    "dropped records",
    "WebGPU",
    "clean visual reference",
  ]) {
    assert.match(companion, new RegExp(blocker, "i"));
  }
});

test("keeps the signature effect replaceable until ownership is resolved", () => {
  assert.equal(existsSync(companionPath), true, "companion reference must exist");
  const companion = readFileSync(companionPath, "utf8");
  for (const hypothesis of [
    "root transform",
    "camera motion",
    "vertex deformation",
    "UV/composite motion",
    "baked texture",
    "idle/random",
    "hover/pointer",
    "ping-pong",
  ]) {
    assert.match(companion, new RegExp(hypothesis, "i"));
  }
  assert.match(companion, /thin replaceable seam/i);
});

test("aligns capture, hypothesis, completion, and report contracts", () => {
  const capture = readReference("evidence-and-capture.md");
  const visual = readReference("visual-system-analysis.md");
  const validation = readReference("validation-playbook.md");
  const reports = readReference("report-templates.md");
  assert.match(capture, /distinct run IDs/i);
  assert.match(capture, /externalVisualRef/);
  assert.match(visual, /candidate mechanism/i);
  assert.match(visual, /falsifying experiment/i);
  assert.match(validation, /render-contracts\.json/);
  assert.match(validation, /runtime-validated/);
  assert.match(reports, /claim ceiling/i);
});
