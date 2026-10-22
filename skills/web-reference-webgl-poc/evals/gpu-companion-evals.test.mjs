import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const evalDir = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(evalDir, "evals.json"), "utf8"));

const byId = (id) => data.evals.find((entry) => entry.id === id);
const contractLines = (item) => [item.expected_output, ...item.expectations];
const scenarios = new Map([
  [
    10,
    {
      required: [
        /refuses an implementation-ready claim/i,
        /missing gpu-runtime-trace\.json and gpu-runtime-status\.json keep .* unresolved/i,
        /not promoted into shader, FBO, sampler, pass-order, or renderer-ownership proof/i,
      ],
      forbidden: [
        /implementation-ready despite/i,
        /visual (?:match|parity) proves .*(?:shader|FBO|pass-order|ownership)/i,
      ],
      contradictions: [
        "The visual match proves FBO ownership and is implementation-ready despite missing traces.",
      ],
    },
  ],
  [
    11,
    {
      required: [
        /blocked producer verdict/i,
        /not accepted as a complete runtime trace/i,
        /does not reinject/i,
      ],
      forbidden: [
        /not blocked/i,
        /(?<!not )(?<!never )\b(?:accept|approve)(?:s|ed|ing)?\b .*?(?:late injection|post-startup|partial trace)/i,
        /(?:late injection|post-startup trace) .*?(?:valid|accepted|approved)/i,
      ],
      contradictions: [
        "The producer is not blocked.",
        "Accept the late injection as a complete trace.",
      ],
    },
  ],
  [
    12,
    {
      required: [
        /rejected checkpoint join/i,
        /cannot reference itself as visual parity evidence/i,
        /does not fabricate an externalVisualRef/i,
      ],
      forbidden: [
        /(?<!not )(?<!never )\b(?:fabricat(?:e|es|ed|ing)|invent(?:s|ed|ing)?)\b .*externalVisualRef/i,
        /(?:accept|approve|merge)(?:s|ed|ing)? .*?(?:without|missing|no) .*?(?:externalVisualRef|clean visual reference)/i,
      ],
      contradictions: ["Fabricate an externalVisualRef and merge the checkpoint."],
    },
  ],
  [
    13,
    {
      required: [
        /blocked WebGPU verdict/i,
        /not relabeled as runtime validation/i,
        /does not claim .*runtime-validated/i,
      ],
      forbidden: [
        /not blocked/i,
        /(?<!not )(?<!never )\b(?:mark|treat|classify)(?:s|ed|ing)?\b .*WebGPU .*runtime[- ]validated/i,
        /WebGPU (?:is|counts as) runtime[- ]validated/i,
      ],
      contradictions: ["Treat this WebGPU evidence as runtime-validated."],
      validNegations: ["Do not treat this WebGPU target as runtime-validated."],
    },
  ],
  [
    14,
    {
      required: [
        /blocked or partial fail-closed verdict/i,
        /block a runtime-validated status/i,
        /do not override incomplete temporal evidence/i,
      ],
      forbidden: [
        /not blocked/i,
        /overflow .*?(?:still|may|can|is) .*?runtime[- ]validated/i,
        /(?<!not )(?<!never )\bpromot(?:e|es|ed|ing)\b .*?(?:overflow|dropped records)/i,
      ],
      contradictions: ["Promote overflow evidence to runtime-validated."],
      validNegations: ["Do not promote overflow evidence."],
    },
  ],
  [
    15,
    {
      required: [
        /without recursive DSRA invocation/i,
        /does not invoke DSRA recursively/i,
        /does not run the producer, validator, or render-contract merge/i,
      ],
      forbidden: [
        /(?:must|should|will|can) (?:invoke|reinvoke) DSRA recursively/i,
        /(?<!not )(?<!never )\binvoke DSRA recursively/i,
        /(?<!not )(?<!never )\binvoke DSRA again/i,
      ],
      contradictions: ["Invoke DSRA recursively."],
      validNegations: ["Do not invoke DSRA again."],
    },
  ],
]);

test("encodes scenario-specific fail-closed outcomes without contradictions", () => {
  for (const [id, { required, forbidden, contradictions, validNegations = [] }] of scenarios) {
    const item = byId(id);
    assert.ok(item, `missing eval ${id}`);
    const lines = contractLines(item);
    for (const pattern of required) {
      assert.ok(
        lines.some((line) => pattern.test(line)),
        `eval ${id} must include ${pattern}`,
      );
    }
    for (const pattern of forbidden) {
      for (const line of lines) assert.doesNotMatch(line, pattern, `eval ${id}`);
    }
    for (const contradiction of contradictions) {
      assert.ok(
        forbidden.some((pattern) => pattern.test(contradiction)),
        `eval ${id} must reject: ${contradiction}`,
      );
    }
    for (const validNegation of validNegations) {
      for (const pattern of forbidden) {
        assert.doesNotMatch(validNegation, pattern, `eval ${id} valid negation`);
      }
    }
  }
});

test("keeps eval identifiers unique", () => {
  const ids = data.evals.map(({ id }) => id);
  assert.equal(new Set(ids).size, ids.length);
});

test("aligns existing clean-room, R3F-plan, and Canvas 2D evals", () => {
  const text = (id) =>
    [byId(id).prompt, byId(id).expected_output, ...byId(id).expectations].join(" ");
  assert.match(text(1), /hypothesis matrix/i);
  assert.match(text(1), /strict behavior-only[\s\S]*(do not run|must not run)/i);
  assert.doesNotMatch(byId(4).expected_output, /implementation-ready/i);
  assert.match(byId(4).expected_output, /actionable/i);
  assert.match(text(4), /clean[\s\S]*instrumented/i);
  assert.match(text(7), /not-applicable/i);
  assert.match(text(7), /Canvas 2D/i);
});
