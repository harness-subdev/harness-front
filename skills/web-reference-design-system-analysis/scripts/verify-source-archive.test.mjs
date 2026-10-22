#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { verifySourceArchive } from "./verify-source-archive.mjs";

const cliScript = fileURLToPath(new URL("./verify-source-archive.mjs", import.meta.url));

function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function expectedSnapshotId(artifacts) {
  const records = artifacts
    .map(({ artifactClass, originalUrl, localPath, bytes, sha256: digest, status, contentType, discovery, referrer, retrievalMethod, capturedAt }) => ({
      artifactClass, originalUrl, localPath, bytes, sha256: digest, status, contentType,
      ...(discovery ? { discovery } : {}),
      ...(referrer ? { referrer } : {}),
      retrievalMethod,
      capturedAt,
    }))
    .sort((left, right) =>
      compareCodeUnits(left.originalUrl, right.originalUrl) ||
      compareCodeUnits(left.localPath, right.localPath) ||
      compareCodeUnits(left.artifactClass, right.artifactClass),
    );
  return `sha256:${sha256(JSON.stringify(records))}`;
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "source-archive-"));
  const document = "<!doctype html><script src=\"/app.js?build=42\"></script>";
  const script = "console.log('original runtime');\n";
  mkdirSync(join(root, "original"));
  writeFileSync(join(root, "original", "index.html"), document);
  writeFileSync(join(root, "original", "app.js"), script);
  const artifacts = [
    {
      artifactClass: "document",
      originalUrl: "https://example.test/?route=home",
      localPath: "original/index.html",
      bytes: Buffer.byteLength(document),
      sha256: sha256(document),
      status: 200,
      contentType: "text/html; charset=utf-8",
      discovery: "navigation",
      retrievalMethod: "browser-response",
      capturedAt: "2026-08-06T00:00:00.000Z",
    },
    {
      artifactClass: "script",
      originalUrl: "https://example.test/app.js?build=42",
      localPath: "original/app.js",
      bytes: Buffer.byteLength(script),
      sha256: sha256(script),
      status: 200,
      contentType: "application/javascript",
      referrer: "https://example.test/?route=home",
      retrievalMethod: "browser-response",
      capturedAt: "2026-08-06T00:00:01.000Z",
    },
  ];
  return {
    root,
    manifest: {
      schemaVersion: 1,
      requiredArtifactClasses: ["document", "script"],
      artifacts,
      runtimeDiscovery: {
        status: "complete",
        method: "browser-network-log",
        capturedAt: "2026-08-06T00:00:02.000Z",
        observed: [{ artifactClass: "script", originalUrl: "https://example.test/app.js?build=42" }],
      },
    },
  };
}

function updateDocument(root, manifest, html) {
  writeFileSync(join(root, manifest.artifacts[0].localPath), html);
  manifest.artifacts[0].bytes = Buffer.byteLength(html);
  manifest.artifacts[0].sha256 = sha256(html);
}

function capturedArtifact(root, { artifactClass, originalUrl, localPath, contents, contentType, referrer }) {
  const archivedLocalPath = localPath.startsWith("original/") ? localPath : `original/${localPath}`;
  writeFileSync(join(root, archivedLocalPath), contents);
  return {
    artifactClass,
    originalUrl,
    localPath: archivedLocalPath,
    bytes: Buffer.byteLength(contents),
    sha256: sha256(contents),
    status: 200,
    contentType,
    referrer,
    retrievalMethod: "browser-response",
    capturedAt: "2026-08-06T00:00:01.000Z",
  };
}

function writeManifest(root, manifest) {
  const path = join(root, "source-manifest.json");
  writeFileSync(path, JSON.stringify(manifest, null, 2));
  return path;
}

function verify(root, manifest) {
  const manifestPath = writeManifest(root, manifest);
  const statusPath = join(root, "archive-status.json");
  return { result: verifySourceArchive(root, manifestPath, statusPath), statusPath };
}

function assertIncomplete(root, manifest, expectedError) {
  const { result, statusPath } = verify(root, manifest);
  assert.equal(result.complete, false);
  assert.equal(existsSync(statusPath), true, "incomplete archives still write archive-status.json");
  assert.match(readFileSync(statusPath, "utf8"), expectedError);
}

function run(name, test) {
  const { root, manifest } = fixture();
  try {
    test(root, manifest);
    console.log(`PASS ${name}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

run("valid archive has a stable snapshot ID", (root, manifest) => {
  const first = verify(root, manifest).result;
  const second = verify(root, { ...manifest, artifacts: [...manifest.artifacts].reverse() }).result;
  assert.equal(first.complete, true);
  assert.match(first.snapshotId, /^sha256:[a-f0-9]{64}$/);
  assert.equal(second.snapshotId, first.snapshotId);
});

run("snapshot records use deterministic code-unit ordering", (root, manifest) => {
  const reordered = structuredClone(manifest);
  reordered.artifacts[0].originalUrl = "https://example.test/Z.html";
  reordered.artifacts[1].originalUrl = "https://example.test/a.js";
  reordered.artifacts[1].referrer = reordered.artifacts[0].originalUrl;
  reordered.runtimeDiscovery.observed[0].originalUrl = reordered.artifacts[1].originalUrl;
  updateDocument(root, reordered, "<!doctype html><script src=\"/a.js\"></script>");
  const result = verify(root, reordered).result;
  assert.equal(result.snapshotId, expectedSnapshotId(reordered.artifacts));
});

run("static script and stylesheet dependencies require exact verified artifacts", (root, manifest) => {
  const incomplete = structuredClone(manifest);
  incomplete.requiredArtifactClasses = ["document"];
  incomplete.artifacts = [incomplete.artifacts[0]];
  incomplete.runtimeDiscovery.observed = [];
  updateDocument(root, incomplete, [
    "<!doctype html>",
    "<link rel=\"stylesheet\" href=\"styles.css?v=1\">",
    "<link rel=\"stylesheet\" href=\"#theme\">",
    "<script src=\"app.js\"></script>",
    "<script src=\"data:text/javascript,void(0)\"></script>",
    "<script src=\"blob:https://example.test/id\"></script>",
  ].join(""));
  const { result } = verify(root, incomplete);
  assert.equal(result.complete, false);
  assert.deepEqual(result.discoveredDependencies, [
    { artifactClass: "script", originalUrl: "https://example.test/app.js", referrer: "https://example.test/?route=home" },
    { artifactClass: "style", originalUrl: "https://example.test/styles.css?v=1", referrer: "https://example.test/?route=home" },
  ]);
  assert.deepEqual(result.missingDiscoveredArtifacts, result.discoveredDependencies);
});

run("verified document and script satisfy static and runtime discovery", (root, manifest) => {
  const result = verify(root, manifest).result;
  assert.equal(result.complete, true);
  assert.deepEqual(result.discoveredDependencies, [
    { artifactClass: "script", originalUrl: "https://example.test/app.js?build=42", referrer: "https://example.test/?route=home" },
  ]);
  assert.deepEqual(result.missingDiscoveredArtifacts, []);
  assert.deepEqual(result.runtimeDiscovery.missing, []);
});

run("one JavaScript response covers classic and module execution roles", (root, manifest) => {
  const shared = structuredClone(manifest);
  shared.requiredArtifactClasses = ["document", "script", "module"];
  updateDocument(root, shared, [
    "<!doctype html>",
    "<script src=\"/app.js?build=42\"></script>",
    "<script type=\"module\" src=\"/app.js?build=42\"></script>",
  ].join(""));
  shared.runtimeDiscovery.observed = [
    { artifactClass: "script", originalUrl: shared.artifacts[1].originalUrl },
    { artifactClass: "module", originalUrl: shared.artifacts[1].originalUrl },
  ];
  const { result } = verify(root, shared);
  assert.equal(result.complete, true);
  assert.deepEqual(result.discoveredDependencies, [
    { artifactClass: "module", originalUrl: shared.artifacts[1].originalUrl, referrer: shared.artifacts[0].originalUrl },
    { artifactClass: "script", originalUrl: shared.artifacts[1].originalUrl, referrer: shared.artifacts[0].originalUrl },
  ]);
  assert.equal(result.verifiedArtifacts.filter((entry) => entry.originalUrl === shared.artifacts[1].originalUrl).length, 1);
  assert.deepEqual(result.missingArtifactClasses, []);
  assert.deepEqual(result.missingDiscoveredArtifacts, []);
  assert.deepEqual(result.runtimeDiscovery.missing, []);

  const relabeledDuplicate = structuredClone(shared);
  relabeledDuplicate.artifacts.push(capturedArtifact(root, {
    artifactClass: "module",
    originalUrl: shared.artifacts[1].originalUrl,
    localPath: "app-module-copy.js",
    contents: readFileSync(join(root, shared.artifacts[1].localPath)),
    contentType: "application/javascript",
    referrer: shared.artifacts[0].originalUrl,
  }));
  assertIncomplete(root, relabeledDuplicate, /Duplicate originalUrl/);
});

run("required JavaScript roles need exact execution evidence", (root, manifest) => {
  const classicOnly = structuredClone(manifest);
  classicOnly.requiredArtifactClasses = ["document", "script", "module", "worker"];
  const { result } = verify(root, classicOnly);
  assert.equal(result.complete, false);
  assert.deepEqual(result.missingArtifactClasses, ["module", "worker"]);
});

run("manifest JavaScript labels do not independently prove execution roles", (root, manifest) => {
  for (const artifactClass of ["module", "worker"]) {
    const relabeled = structuredClone(manifest);
    relabeled.artifacts[1].artifactClass = artifactClass;
    relabeled.requiredArtifactClasses = ["document", "script", artifactClass];
    const { result } = verify(root, relabeled);
    assert.equal(result.complete, false, artifactClass);
    assert.deepEqual(result.missingArtifactClasses, [artifactClass]);
  }
});

run("static dependency query strings must match exactly", (root, manifest) => {
  const mismatch = structuredClone(manifest);
  mismatch.artifacts[1].originalUrl = "https://example.test/app.js";
  mismatch.runtimeDiscovery.observed = [];
  updateDocument(root, mismatch, "<!doctype html><script src=\"app.js?v=1\"></script>");
  const { result } = verify(root, mismatch);
  assert.equal(result.complete, false);
  assert.deepEqual(result.missingDiscoveredArtifacts, [
    { artifactClass: "script", originalUrl: "https://example.test/app.js?v=1", referrer: "https://example.test/?route=home" },
  ]);
});

run("secret-bearing static dependency URLs are omitted from status", (root, manifest) => {
  const unsafe = structuredClone(manifest);
  unsafe.requiredArtifactClasses = ["document"];
  unsafe.artifacts = [unsafe.artifacts[0]];
  unsafe.runtimeDiscovery.observed = [];
  updateDocument(root, unsafe, [
    "<!doctype html>",
    "<script src=\"/app.js?ok=1;token=static-secret\"></script>",
    "<style>.hero { background: url('/hero.png?ok=1%3Btoken%3Dcss-secret'); }</style>",
  ].join(""));
  const { result, statusPath } = verify(root, unsafe);
  assert.equal(result.complete, false);
  assert.deepEqual(result.discoveredDependencies, []);
  assert.match(result.errors.join("\n"), /static dependency URL contains sensitive metadata/i);
  assert.doesNotMatch(readFileSync(statusPath, "utf8"), /static-secret|css-secret/);
});

run("module and preload links preserve exact queries and require runtime discovery", (root, manifest) => {
  const linked = structuredClone(manifest);
  linked.requiredArtifactClasses = ["document"];
  linked.artifacts = [linked.artifacts[0]];
  linked.runtimeDiscovery = {
    status: "complete",
    method: "not-applicable",
    capturedAt: "2026-08-06T00:00:02.000Z",
    observed: [],
  };
  updateDocument(root, linked, [
    "<!doctype html>",
    "<link rel=\"modulepreload\" href=\"mod.js?v=1\">",
    "<link rel=\"preload\" as=\"script\" href=\"pre.js?v=2\">",
    "<link rel=\"preload\" as=\"style\" href=\"theme.css?v=3\">",
    "<script type=\"module\" src=\"entry.js?v=4\"></script>",
  ].join(""));
  const { result } = verify(root, linked);
  assert.equal(result.complete, false);
  assert.deepEqual(result.discoveredDependencies, [
    { artifactClass: "module", originalUrl: "https://example.test/entry.js?v=4", referrer: "https://example.test/?route=home" },
    { artifactClass: "module", originalUrl: "https://example.test/mod.js?v=1", referrer: "https://example.test/?route=home" },
    { artifactClass: "script", originalUrl: "https://example.test/pre.js?v=2", referrer: "https://example.test/?route=home" },
    { artifactClass: "style", originalUrl: "https://example.test/theme.css?v=3", referrer: "https://example.test/?route=home" },
  ]);
  assert.deepEqual(result.unobservedStaticExecutables, result.discoveredDependencies.slice(0, 3));
  assert.match(result.errors.join("\n"), /not-applicable/);
});

run("media, srcset, poster, and font dependencies require runtime reconciliation", (root, manifest) => {
  const media = structuredClone(manifest);
  media.requiredArtifactClasses = ["document"];
  media.artifacts = [media.artifacts[0]];
  media.runtimeDiscovery.observed = [];
  updateDocument(root, media, [
    "<!doctype html>",
    "<img src=\"hero.png?v=1\" srcset=\"hero-2x.png?v=2 2x, hero-3x.png?v=3 3x\">",
    "<video src=\"clip.mp4?v=4\" poster=\"poster.jpg?v=5\"><source src=\"clip.webm?v=6\" type=\"video/webm\"></video>",
    "<audio src=\"sound.mp3?v=7\"></audio>",
    "<link rel=\"preload\" as=\"font\" href=\"font.woff2?v=8\">",
  ].join(""));
  const { result } = verify(root, media);
  assert.equal(result.complete, false);
  assert.deepEqual(result.discoveredDependencies, [
    { artifactClass: "video", originalUrl: "https://example.test/clip.mp4?v=4", referrer: "https://example.test/?route=home" },
    { artifactClass: "video", originalUrl: "https://example.test/clip.webm?v=6", referrer: "https://example.test/?route=home" },
    { artifactClass: "font", originalUrl: "https://example.test/font.woff2?v=8", referrer: "https://example.test/?route=home" },
    { artifactClass: "image", originalUrl: "https://example.test/hero-2x.png?v=2", referrer: "https://example.test/?route=home" },
    { artifactClass: "image", originalUrl: "https://example.test/hero-3x.png?v=3", referrer: "https://example.test/?route=home" },
    { artifactClass: "image", originalUrl: "https://example.test/hero.png?v=1", referrer: "https://example.test/?route=home" },
    { artifactClass: "image", originalUrl: "https://example.test/poster.jpg?v=5", referrer: "https://example.test/?route=home" },
    { artifactClass: "audio", originalUrl: "https://example.test/sound.mp3?v=7", referrer: "https://example.test/?route=home" },
  ]);
  assert.deepEqual(result.unobservedStaticDependencies, result.discoveredDependencies);
  assert.deepEqual(result.runtimeDiscovery.missing, result.discoveredDependencies.map(({ artifactClass, originalUrl }) => ({ artifactClass, originalUrl })));
});

run("track, image preload srcset, and adjacent HTML forms are discovered", (root, manifest) => {
  const adjacent = structuredClone(manifest);
  adjacent.requiredArtifactClasses = ["document"];
  adjacent.artifacts = [adjacent.artifacts[0]];
  adjacent.runtimeDiscovery.observed = [];
  updateDocument(root, adjacent, [
    "<!doctype html>",
    "<track src=\"captions.vtt?v=1\">",
    "<link rel=\"preload\" as=\"image\" href=\"fallback.jpg?v=2\" imagesrcset=\"small.jpg?v=3 1x, large.jpg?v=4 2x\">",
    "<input type=\"image\" src=\"submit.png?v=5\">",
    "<link rel=\"icon\" href=\"favicon.svg?v=6\">",
    "<object data=\"model.bin?v=7\" type=\"application/octet-stream\"></object>",
    "<embed src=\"movie.mp4?v=8\" type=\"video/mp4\">",
    "<iframe src=\"frame.html?v=9\"></iframe>",
    "<svg><image href=\"art.webp?v=10\"><image xlink:href=\"legacy.png?v=11\"></svg>",
  ].join(""));
  const { result } = verify(root, adjacent);
  assert.equal(result.complete, false);
  const keys = new Set(result.discoveredDependencies.map((entry) => `${entry.artifactClass} ${entry.originalUrl}`));
  for (const expected of [
    "data https://example.test/captions.vtt?v=1",
    "image https://example.test/fallback.jpg?v=2",
    "image https://example.test/small.jpg?v=3",
    "image https://example.test/large.jpg?v=4",
    "image https://example.test/submit.png?v=5",
    "image https://example.test/favicon.svg?v=6",
    "asset https://example.test/model.bin?v=7",
    "video https://example.test/movie.mp4?v=8",
    "document https://example.test/frame.html?v=9",
    "image https://example.test/art.webp?v=10",
    "image https://example.test/legacy.png?v=11",
  ]) assert.equal(keys.has(expected), true, expected);
  assert.equal(result.runtimeDiscovery.missing.length, result.discoveredDependencies.length);
});

run("static URL fragments reconcile as fragmentless HTTP requests", (root, manifest) => {
  const fragmented = structuredClone(manifest);
  updateDocument(root, fragmented, "<!doctype html><svg><image href=\"/icons.svg#check\"></svg>");
  const image = capturedArtifact(root, {
    artifactClass: "image",
    originalUrl: "https://example.test/icons.svg",
    localPath: "icons.svg",
    contents: "<svg></svg>",
    contentType: "image/svg+xml",
    referrer: fragmented.artifacts[0].originalUrl,
  });
  fragmented.requiredArtifactClasses = ["document", "image"];
  fragmented.artifacts = [fragmented.artifacts[0], image];
  fragmented.runtimeDiscovery.observed = [{ artifactClass: "image", originalUrl: image.originalUrl }];
  const { result } = verify(root, fragmented);
  assert.equal(result.complete, true);
  assert.deepEqual(result.discoveredDependencies, [{
    artifactClass: "image",
    originalUrl: image.originalUrl,
    referrer: fragmented.artifacts[0].originalUrl,
  }]);
});

run("HTML URL attributes decode entities and honor the first valid base", (root, manifest) => {
  const based = structuredClone(manifest);
  based.requiredArtifactClasses = ["document"];
  based.artifacts = [based.artifacts[0]];
  based.runtimeDiscovery.observed = [];
  updateDocument(root, based, [
    "<!doctype html>",
    "<base href=\"http://[\">",
    "<base href=\"/assets/\">",
    "<base href=\"/ignored/\">",
    "<script src=\"app.js?v=1&amp;lang=en\"></script>",
  ].join(""));
  const { result } = verify(root, based);
  assert.equal(result.complete, false);
  assert.deepEqual(result.discoveredDependencies, [{
    artifactClass: "script",
    originalUrl: "https://example.test/assets/app.js?v=1&lang=en",
    referrer: "https://example.test/?route=home",
  }]);
});

run("an empty first base href freezes the document fallback URL", (root, manifest) => {
  const based = structuredClone(manifest);
  based.requiredArtifactClasses = ["document"];
  based.artifacts = [based.artifacts[0]];
  based.runtimeDiscovery.observed = [];
  updateDocument(root, based, [
    "<!doctype html>",
    "<base href=\"\">",
    "<base href=\"/ignored/\">",
    "<script src=\"app.js\"></script>",
  ].join(""));
  const { result } = verify(root, based);
  assert.deepEqual(result.discoveredDependencies, [{
    artifactClass: "script",
    originalUrl: "https://example.test/app.js",
    referrer: "https://example.test/?route=home",
  }]);
});

run("HTML dependencies use the base active at their source position", (root, manifest) => {
  const ordered = structuredClone(manifest);
  ordered.requiredArtifactClasses = ["document"];
  ordered.artifacts = [ordered.artifacts[0]];
  ordered.runtimeDiscovery.observed = [];
  updateDocument(root, ordered, [
    "<!doctype html>",
    "<script src=\"before.js\"></script>",
    "<script>const fake = '<base href=\"/fake-script/\">';</script>",
    "<style>.pre { background: url('pre.png'); } .fake::after { content: \"<base href='/fake-style/'>\"; }</style>",
    "<template><base href=\"/fake-template/\"><script src=\"ignored.js\"></script></template>",
    "<base href=\"/assets/\">",
    "<script src=\"after.js\"></script>",
  ].join(""));
  const { result } = verify(root, ordered);
  assert.deepEqual(result.discoveredDependencies, [
    { artifactClass: "script", originalUrl: "https://example.test/assets/after.js", referrer: "https://example.test/?route=home" },
    { artifactClass: "script", originalUrl: "https://example.test/before.js", referrer: "https://example.test/?route=home" },
    { artifactClass: "image", originalUrl: "https://example.test/pre.png", referrer: "https://example.test/?route=home" },
  ]);
});

run("scripting-enabled discovery ignores noscript decoys", (root, manifest) => {
  const scripted = structuredClone(manifest);
  scripted.requiredArtifactClasses = ["document"];
  scripted.artifacts = [scripted.artifacts[0]];
  scripted.runtimeDiscovery.observed = [];
  updateDocument(root, scripted, [
    "<!doctype html>",
    "<noscript><base href=\"/decoy/\"><script src=\"ignored.js\"></script><img src=\"ignored.png\"></noscript>",
    "<script src=\"real.js\"></script>",
  ].join(""));
  const { result } = verify(root, scripted);
  assert.deepEqual(result.discoveredDependencies, [{
    artifactClass: "script",
    originalUrl: "https://example.test/real.js",
    referrer: "https://example.test/?route=home",
  }]);
});

run("HTML URL character references follow attribute parsing rules", (root, manifest) => {
  const encoded = structuredClone(manifest);
  encoded.requiredArtifactClasses = ["document"];
  encoded.artifacts = [encoded.artifacts[0]];
  encoded.runtimeDiscovery.observed = [];
  updateDocument(root, encoded, [
    "<!doctype html>",
    "<script src=\"https&colon;&sol;&sol;cdn.example&sol;app.js&quest;mode&equals;full&amp\"></script>",
    "<script src=\"https&#58;//cdn.example/&#x61;pp.js?one=1&#38two=2\"></script>",
    "<script src=\"/literal.js?one=1&ampvalue=2\"></script>",
  ].join(""));
  const { result } = verify(root, encoded);
  assert.deepEqual(result.discoveredDependencies, [
    { artifactClass: "script", originalUrl: "https://cdn.example/app.js?mode=full&", referrer: "https://example.test/?route=home" },
    { artifactClass: "script", originalUrl: "https://cdn.example/app.js?one=1&two=2", referrer: "https://example.test/?route=home" },
    { artifactClass: "script", originalUrl: "https://example.test/literal.js?one=1&ampvalue=2", referrer: "https://example.test/?route=home" },
  ]);
});

run("unsupported HTML named references in URLs fail closed", (root, manifest) => {
  const uncertain = structuredClone(manifest);
  uncertain.requiredArtifactClasses = ["document"];
  uncertain.artifacts = [uncertain.artifacts[0]];
  uncertain.runtimeDiscovery.observed = [];
  updateDocument(root, uncertain, [
    "<!doctype html>",
    "<img src=\"/images/&copy;.png\">",
    "<script src=\"/scripts/&notAReal;.js\"></script>",
    "<link rel=\"stylesheet\" href=\"/css/&copy.css\">",
    "<img src=\"/pixel.png?page=1&mode=full\">",
  ].join(""));
  const { result, statusPath } = verify(root, uncertain);
  assert.equal(result.complete, false);
  assert.deepEqual(result.discoveredDependencies, [{
    artifactClass: "image",
    originalUrl: "https://example.test/pixel.png?page=1&mode=full",
    referrer: "https://example.test/?route=home",
  }]);
  assert.match(result.errors.join("\n"), /unsupported named character reference/i);
  assert.doesNotMatch(readFileSync(statusPath, "utf8"), /&copy|notAReal/);
});

run("inline CSS, track and manifest links, and refresh URLs are discovered", (root, manifest) => {
  const inline = structuredClone(manifest);
  inline.requiredArtifactClasses = ["document"];
  inline.artifacts = [inline.artifacts[0]];
  inline.runtimeDiscovery.observed = [];
  updateDocument(root, inline, [
    "<!doctype html><base href=\"/assets/\">",
    "<style>@import url('theme.css?v=1&lang=en'); .hero { background: url('hero.png?v=2&lang=en'); }</style>",
    "<div style=\"background: url('inline.png?v=3&amp;lang=en')\"></div>",
    "<link rel=\"preload\" as=\"track\" href=\"captions.vtt?v=4&amp;lang=en\">",
    "<link rel=\"manifest\" href=\"site.webmanifest?v=5&amp;lang=en\">",
    "<meta http-equiv=\"refresh\" content=\"0; url=next.html?v=6&amp;lang=en\">",
  ].join(""));
  const { result } = verify(root, inline);
  assert.equal(result.complete, false);
  const keys = new Set(result.discoveredDependencies.map((entry) => `${entry.artifactClass} ${entry.originalUrl}`));
  for (const expected of [
    "style https://example.test/assets/theme.css?v=1&lang=en",
    "image https://example.test/assets/hero.png?v=2&lang=en",
    "image https://example.test/assets/inline.png?v=3&lang=en",
    "data https://example.test/assets/captions.vtt?v=4&lang=en",
    "data https://example.test/assets/site.webmanifest?v=5&lang=en",
    "document https://example.test/assets/next.html?v=6&lang=en",
  ]) assert.equal(keys.has(expected), true, expected);
  assert.equal(keys.has("asset https://example.test/assets/theme.css?v=1&lang=en"), false);
  assert.equal(result.runtimeDiscovery.missing.length, result.discoveredDependencies.length);
});

run("verified CSS imports, fonts, and URLs require exact runtime coverage", (root, manifest) => {
  const cssArchive = structuredClone(manifest);
  const documentUrl = "https://example.test/?route=home";
  updateDocument(root, cssArchive, "<!doctype html><link rel=\"stylesheet\" href=\"css/main.css?v=1\">");
  const main = capturedArtifact(root, {
    artifactClass: "style",
    originalUrl: "https://example.test/css/main.css?v=1",
    localPath: "main.css",
    contents: "@import url('theme.css?v=2'); @font-face { src: url('../fonts/site?v=3') format('woff2'); } .hero { background: url('../images/bg.png?v=4'); }",
    contentType: "text/css",
    referrer: documentUrl,
  });
  const theme = capturedArtifact(root, {
    artifactClass: "style",
    originalUrl: "https://example.test/css/theme.css?v=2",
    localPath: "theme.css",
    contents: ".theme { color: red; }",
    contentType: "text/css",
    referrer: main.originalUrl,
  });
  const font = capturedArtifact(root, {
    artifactClass: "font",
    originalUrl: "https://example.test/fonts/site?v=3",
    localPath: "site-font.bin",
    contents: Buffer.from([0, 1, 2]),
    contentType: "font/woff2",
    referrer: main.originalUrl,
  });
  const image = capturedArtifact(root, {
    artifactClass: "image",
    originalUrl: "https://example.test/images/bg.png?v=4",
    localPath: "bg.png",
    contents: Buffer.from([3, 4, 5]),
    contentType: "image/png",
    referrer: main.originalUrl,
  });
  cssArchive.requiredArtifactClasses = ["document", "style", "font", "image"];
  cssArchive.artifacts = [cssArchive.artifacts[0], main, theme, font, image];
  cssArchive.runtimeDiscovery.observed = cssArchive.artifacts.slice(1).map(({ artifactClass, originalUrl }) => ({ artifactClass, originalUrl }));
  const { result } = verify(root, cssArchive);
  assert.equal(result.complete, true);
  assert.deepEqual(result.discoveredDependencies.filter((entry) => entry.referrer === main.originalUrl), [
    { artifactClass: "style", originalUrl: theme.originalUrl, referrer: main.originalUrl },
    { artifactClass: "font", originalUrl: font.originalUrl, referrer: main.originalUrl },
    { artifactClass: "image", originalUrl: image.originalUrl, referrer: main.originalUrl },
  ]);
});

run("extensionless sources inherit picture, video, and audio context", (root, manifest) => {
  const contextual = structuredClone(manifest);
  updateDocument(root, contextual, [
    "<!doctype html>",
    "<video><source src=\"stream?id=video\"></video>",
    "<audio><source src=\"stream?id=audio\"></audio>",
  ].join(""));
  const video = capturedArtifact(root, {
    artifactClass: "video",
    originalUrl: "https://example.test/stream?id=video",
    localPath: "video-stream.bin",
    contents: Buffer.from([1, 2, 3]),
    contentType: "video/mp4",
    referrer: contextual.artifacts[0].originalUrl,
  });
  const audio = capturedArtifact(root, {
    artifactClass: "audio",
    originalUrl: "https://example.test/stream?id=audio",
    localPath: "audio-stream.bin",
    contents: Buffer.from([4, 5, 6]),
    contentType: "audio/mpeg",
    referrer: contextual.artifacts[0].originalUrl,
  });
  contextual.requiredArtifactClasses = ["document", "video", "audio"];
  contextual.artifacts = [contextual.artifacts[0], video, audio];
  contextual.runtimeDiscovery.observed = [video, audio].map(({ artifactClass, originalUrl }) => ({ artifactClass, originalUrl }));
  const { result } = verify(root, contextual);
  assert.equal(result.complete, true);
  assert.deepEqual(result.discoveredDependencies, [
    { artifactClass: "audio", originalUrl: audio.originalUrl, referrer: contextual.artifacts[0].originalUrl },
    { artifactClass: "video", originalUrl: video.originalUrl, referrer: contextual.artifacts[0].originalUrl },
  ]);
});

run("canonical MIME and path categories prevent artifact relabeling", (root, manifest) => {
  const htmlAsAsset = structuredClone(manifest);
  htmlAsAsset.artifacts[0].artifactClass = "asset";
  assertIncomplete(root, htmlAsAsset, /HTML sources must use artifactClass document/);

  const cssAsScript = structuredClone(manifest);
  const css = "body { color: red; }\n";
  writeFileSync(join(root, "original", "app.css"), css);
  cssAsScript.artifacts[1].localPath = "original/app.css";
  cssAsScript.artifacts[1].bytes = Buffer.byteLength(css);
  cssAsScript.artifacts[1].sha256 = sha256(css);
  cssAsScript.artifacts[1].contentType = "text/css";
  assertIncomplete(root, cssAsScript, /CSS sources|contradictory contentType and localPath source categories/);
});

run("URL extensions and HTML bytes close generic capture relabeling", (root, manifest) => {
  const htmlAsAsset = structuredClone(manifest);
  const html = "<!doctype html><html><script src=\"app.js?build=42\"></script></html>";
  writeFileSync(join(root, "original", "capture.bin"), html);
  htmlAsAsset.artifacts[0].artifactClass = "asset";
  htmlAsAsset.artifacts[0].originalUrl = "https://example.test/index.html";
  htmlAsAsset.artifacts[0].localPath = "original/capture.bin";
  htmlAsAsset.artifacts[0].bytes = Buffer.byteLength(html);
  htmlAsAsset.artifacts[0].sha256 = sha256(html);
  htmlAsAsset.artifacts[0].contentType = "application/octet-stream";
  assertIncomplete(root, htmlAsAsset, /HTML sources must use artifactClass document/);

  const cssAsScript = structuredClone(manifest);
  const css = "body { display: grid; }\n";
  writeFileSync(join(root, "original", "payload.bin"), css);
  cssAsScript.artifacts[1].originalUrl = "https://example.test/payload.css";
  cssAsScript.artifacts[1].localPath = "original/payload.bin";
  cssAsScript.artifacts[1].bytes = Buffer.byteLength(css);
  cssAsScript.artifacts[1].sha256 = sha256(css);
  cssAsScript.artifacts[1].contentType = "application/octet-stream";
  assertIncomplete(root, cssAsScript, /CSS sources must use artifactClass style/);

  const binary = structuredClone(manifest);
  updateDocument(root, binary, "<!doctype html><p>Static reference</p>");
  const bytes = Buffer.from([0, 1, 2, 3, 255]);
  writeFileSync(join(root, "original", "capture.bin"), bytes);
  const artifact = binary.artifacts[1];
  artifact.artifactClass = "asset";
  artifact.originalUrl = "https://example.test/capture.bin";
  artifact.localPath = "original/capture.bin";
  artifact.bytes = bytes.byteLength;
  artifact.sha256 = sha256(bytes);
  artifact.contentType = "application/octet-stream";
  binary.requiredArtifactClasses = ["document", "asset"];
  binary.artifacts = [binary.artifacts[0], artifact];
  binary.runtimeDiscovery = {
    status: "complete",
    method: "not-applicable",
    capturedAt: "2026-08-06T00:00:02.000Z",
    observed: [],
  };
  assert.equal(verify(root, binary).result.complete, true);
});

run("HTTP error bodies cannot satisfy referenced artifact coverage", (root, manifest) => {
  const notFound = structuredClone(manifest);
  notFound.artifacts[1].status = 404;
  notFound.artifacts[1].contentType = "text/html";
  const { result } = verify(root, notFound);
  assert.equal(result.complete, false);
  assert.equal(result.verifiedArtifacts.some((artifact) => artifact.artifactClass === "script"), false);
  assert.deepEqual(result.missingDiscoveredArtifacts, [{
    artifactClass: "script",
    originalUrl: "https://example.test/app.js?build=42",
    referrer: "https://example.test/?route=home",
  }]);
});

run("HTTP 206 partial bodies cannot satisfy exact archived artifacts", (root, manifest) => {
  const partial = structuredClone(manifest);
  updateDocument(root, partial, "<!doctype html><video src=\"clip.mp4\"></video>");
  const video = capturedArtifact(root, {
    artifactClass: "video",
    originalUrl: "https://example.test/clip.mp4",
    localPath: "clip.mp4",
    contents: Buffer.from([0, 1, 2, 3]),
    contentType: "video/mp4",
    referrer: partial.artifacts[0].originalUrl,
  });
  video.status = 206;
  partial.requiredArtifactClasses = ["document", "video"];
  partial.artifacts = [partial.artifacts[0], video];
  partial.runtimeDiscovery.observed = [{ artifactClass: "video", originalUrl: video.originalUrl }];
  assertIncomplete(root, partial, /status.*full response|partial response/i);
});

run("complete runtime discovery observes every static executable", (root, manifest) => {
  const unobserved = structuredClone(manifest);
  unobserved.runtimeDiscovery.observed = [];
  const { result } = verify(root, unobserved);
  assert.equal(result.complete, false);
  assert.deepEqual(result.unobservedStaticExecutables, [{
    artifactClass: "script",
    originalUrl: "https://example.test/app.js?build=42",
    referrer: "https://example.test/?route=home",
  }]);
});

run("runtime discovery requires every observed exact URL and class", (root, manifest) => {
  const missingRuntime = structuredClone(manifest);
  missingRuntime.runtimeDiscovery.observed.push({
    artifactClass: "script",
    originalUrl: "https://example.test/lazy.js?v=1",
  });
  const { result } = verify(root, missingRuntime);
  assert.equal(result.complete, false);
  assert.deepEqual(result.runtimeDiscovery.missing, [{
    artifactClass: "script",
    originalUrl: "https://example.test/lazy.js?v=1",
  }]);
});

run("runtime discovery is required and not-applicable is limited to static documents", (root, manifest) => {
  const absent = structuredClone(manifest);
  delete absent.runtimeDiscovery;
  assertIncomplete(root, absent, /runtimeDiscovery is required/);

  const staticOnly = structuredClone(manifest);
  staticOnly.requiredArtifactClasses = ["document"];
  staticOnly.artifacts = [staticOnly.artifacts[0]];
  staticOnly.runtimeDiscovery = {
    status: "complete",
    method: "not-applicable",
    capturedAt: "2026-08-06T00:00:02.000Z",
    observed: [],
  };
  updateDocument(root, staticOnly, "<!doctype html><p>Static reference</p>");
  assert.equal(verify(root, staticOnly).result.complete, true);

  const executable = structuredClone(manifest);
  executable.runtimeDiscovery.method = "not-applicable";
  executable.runtimeDiscovery.observed = [];
  assertIncomplete(root, executable, /not-applicable/);

  const blocked = structuredClone(manifest);
  blocked.runtimeDiscovery.status = "blocked";
  assertIncomplete(root, blocked, /runtimeDiscovery is blocked/);
});

run("unsafe runtime discovery fields are censored before status persistence", (root, manifest) => {
  const unsafe = structuredClone(manifest);
  unsafe.runtimeDiscovery = {
    status: "token: runtime-status-secret",
    method: "Authorization: Bearer runtime-method-secret",
    capturedAt: "Thu, 06 Aug 2026 00:00:00 GMT (password%3A runtime-time-secret)",
    observed: [
      {
        artifactClass: "X-Api-Key%3Aruntime-role-secret",
        originalUrl: unsafe.artifacts[1].originalUrl,
      },
      {
        artifactClass: "script",
        originalUrl: "https://example.test/X-Api-Key%3Aruntime-url-secret",
      },
    ],
  };
  const { result, statusPath } = verify(root, unsafe);
  assert.equal(result.complete, false);
  assert.deepEqual(result.runtimeDiscovery, {
    status: "missing",
    method: null,
    capturedAt: null,
    observed: [],
    missing: [{
      artifactClass: "script",
      originalUrl: unsafe.artifacts[1].originalUrl,
    }],
  });
  assert.deepEqual(JSON.parse(readFileSync(statusPath, "utf8")).runtimeDiscovery, result.runtimeDiscovery);
  assert.doesNotMatch(readFileSync(statusPath, "utf8"), /runtime-(?:status|method|time|role|url)-secret/);
});

run("artifact response and capture metadata are required", (root, manifest) => {
  const mutations = [
    ["status", 0, /status/],
    ["contentType", "", /contentType/],
    ["discovery", undefined, /discovery or referrer/],
    ["retrievalMethod", "", /retrievalMethod/],
    ["capturedAt", "not-a-date", /capturedAt/],
  ];
  for (const [field, value, expectedError] of mutations) {
    const invalid = structuredClone(manifest);
    if (value === undefined) delete invalid.artifacts[0][field];
    else invalid.artifacts[0][field] = value;
    assertIncomplete(root, invalid, expectedError);
  }
});

run("byte or hash drift makes an archive incomplete", (root, manifest) => {
  const byteMismatch = structuredClone(manifest);
  byteMismatch.artifacts[0].bytes += 1;
  assertIncomplete(root, byteMismatch, /byte count mismatch/);

  const hashMismatch = structuredClone(manifest);
  hashMismatch.artifacts[0].sha256 = "0".repeat(64);
  assertIncomplete(root, hashMismatch, /SHA-256 mismatch/);
});

run("a missing required artifact class makes an archive incomplete", (root, manifest) => {
  assertIncomplete(root, { ...manifest, artifacts: [manifest.artifacts[0]] }, /Missing required artifact classes: script/);
});

run("duplicate exact URLs and local paths make an archive incomplete", (root, manifest) => {
  const duplicateUrl = structuredClone(manifest);
  duplicateUrl.artifacts[1].originalUrl = duplicateUrl.artifacts[0].originalUrl;
  assertIncomplete(root, duplicateUrl, /Duplicate originalUrl/);

  const duplicatePath = structuredClone(manifest);
  duplicatePath.artifacts[1].localPath = duplicatePath.artifacts[0].localPath;
  assertIncomplete(root, duplicatePath, /Duplicate localPath/);
});

run("canonical local paths cannot duplicate or escape through symlinks", (root, manifest) => {
  const canonicalDuplicate = structuredClone(manifest);
  canonicalDuplicate.artifacts[1].localPath = "./original/index.html";
  canonicalDuplicate.artifacts[1].bytes = canonicalDuplicate.artifacts[0].bytes;
  canonicalDuplicate.artifacts[1].sha256 = canonicalDuplicate.artifacts[0].sha256;
  assertIncomplete(root, canonicalDuplicate, /Duplicate localPath/);

  const outside = mkdtempSync(join(tmpdir(), "source-archive-outside-"));
  try {
    const outsideFile = join(outside, "escape.js");
    const contents = "outside archive";
    writeFileSync(outsideFile, contents);
    symlinkSync(outsideFile, join(root, "original", "escape.js"));
    const symlinkEscape = structuredClone(manifest);
    symlinkEscape.artifacts[1].localPath = "original/escape.js";
    symlinkEscape.artifacts[1].bytes = Buffer.byteLength(contents);
    symlinkEscape.artifacts[1].sha256 = sha256(contents);
    assertIncomplete(root, symlinkEscape, /outside archive/);
  } finally {
    rmSync(outside, { recursive: true, force: true });
  }
});

run("path traversal makes an archive incomplete", (root, manifest) => {
  const invalid = structuredClone(manifest);
  invalid.artifacts[1].localPath = "../outside.js";
  assertIncomplete(root, invalid, /Unsafe localPath/);
});

run("archived artifacts must reside under original", (root, manifest) => {
  const derived = structuredClone(manifest);
  mkdirSync(join(root, "derived"), { recursive: true });
  writeFileSync(join(root, "derived", "app.js"), readFileSync(join(root, "original", "app.js")));
  derived.artifacts[1].localPath = "derived/app.js";
  assertIncomplete(root, derived, /localPath must reside under original\//);
});

run("URL credentials and sensitive query keys make an archive incomplete", (root, manifest) => {
  const credentials = structuredClone(manifest);
  credentials.artifacts[0].originalUrl = "https://user:pass@example.test/";
  assertIncomplete(root, credentials, /credentials/);

  const secretQuery = structuredClone(manifest);
  secretQuery.artifacts[0].originalUrl = "https://example.test/?token=secret";
  assertIncomplete(root, secretQuery, /sensitive query key/i);
});

run("manifest and runtime URLs reject fragments from request identity", (root, manifest) => {
  const fragmented = structuredClone(manifest);
  fragmented.artifacts[0].originalUrl += "#document-fragment";
  fragmented.artifacts[1].originalUrl += "#artifact-fragment";
  fragmented.runtimeDiscovery.observed[0].originalUrl += "#runtime-fragment";
  const { result, statusPath } = verify(root, fragmented);
  assert.equal(result.complete, false);
  assert.deepEqual(result.verifiedArtifacts, []);
  assert.deepEqual(result.runtimeDiscovery.observed, []);
  assert.match(result.errors.join("\n"), /fragment.*request identity/i);
  assert.doesNotMatch(readFileSync(statusPath, "utf8"), /document-fragment|artifact-fragment|runtime-fragment/);
});

run("semicolon-delimited and encoded secret query segments are rejected", (root, manifest) => {
  const segmented = structuredClone(manifest);
  segmented.artifacts[0].originalUrl = "https://example.test/?ok=1;token=semicolon-secret";
  segmented.artifacts[1].referrer = "https://example.test/?ok=1%3Btoken%3Dencoded-secret";
  const { result, statusPath } = verify(root, segmented);
  assert.equal(result.complete, false);
  assert.deepEqual(result.verifiedArtifacts, []);
  const status = readFileSync(statusPath, "utf8");
  assert.doesNotMatch(status, /semicolon-secret|encoded-secret/);
  assert.match(status, /sensitive query key/i);
});

run("secret-bearing artifact evidence metadata is rejected and omitted from status", (root, manifest) => {
  const unsafe = structuredClone(manifest);
  unsafe.artifacts[0].discovery = "https://example.test/capture?token=discovery-secret";
  unsafe.artifacts[1].referrer = "https://user:referrer-secret@example.test/";
  const { result, statusPath } = verify(root, unsafe);
  assert.equal(result.complete, false);
  assert.deepEqual(result.verifiedArtifacts, []);
  const status = readFileSync(statusPath, "utf8");
  assert.doesNotMatch(status, /discovery-secret|referrer-secret/);
  assert.match(status, /sensitive query key|credentials/);
});

run("retrieval methods are bounded identifiers and never secret-bearing text", (root, manifest) => {
  const unsafe = structuredClone(manifest);
  unsafe.artifacts[0].retrievalMethod = "https://example.test/capture?token=retrieval-secret";
  unsafe.artifacts[1].retrievalMethod = "Authorization: Bearer retrieval-bearer-secret";
  const { result, statusPath } = verify(root, unsafe);
  assert.equal(result.complete, false);
  assert.deepEqual(result.verifiedArtifacts, []);
  const status = readFileSync(statusPath, "utf8");
  assert.doesNotMatch(status, /retrieval-secret|retrieval-bearer-secret/);
  assert.match(status, /retrievalMethod.*identifier/);
});

run("capture identifiers and runtime roles reject sensitive terms", (root, manifest) => {
  const unsafe = structuredClone(manifest);
  unsafe.artifacts[0].retrievalMethod = "token-retrieval-secret123";
  unsafe.runtimeDiscovery.method = "token-runtime-secret123";
  unsafe.runtimeDiscovery.observed = [{
    artifactClass: "token-runtime-role-secret123",
    originalUrl: unsafe.artifacts[1].originalUrl,
  }];
  const { result, statusPath } = verify(root, unsafe);
  assert.equal(result.complete, false);
  assert.equal(result.verifiedArtifacts.some((entry) => entry.retrievalMethod === unsafe.artifacts[0].retrievalMethod), false);
  assert.equal(result.runtimeDiscovery.method, null);
  assert.deepEqual(result.runtimeDiscovery.observed, []);
  assert.doesNotMatch(readFileSync(statusPath, "utf8"), /token-(?:retrieval|runtime|role)-secret123/);
});

run("encoded metadata secrets are rejected without rewriting safe metadata", (root, manifest) => {
  const unsafe = structuredClone(manifest);
  let deeplyEncodedSecret = "token=blocked-deep-secret";
  for (let pass = 0; pass < 6; pass += 1) deeplyEncodedSecret = encodeURIComponent(deeplyEncodedSecret);
  unsafe.artifacts[0].discovery = "token: artifact-discovery-secret";
  unsafe.artifacts[1].referrer = "https://example.test/X-Api-Key%3Aartifact-referrer-secret";
  unsafe.blocked = [
    {
      artifactClass: "font",
      reason: "password%3Dblocked-reason-secret",
      capturedAt: "2026-08-06T00:00:03.000Z",
    },
    {
      artifactClass: "image",
      reason: "capture denied",
      discovery: "token%ZZ: blocked-invalid-secret",
      capturedAt: "2026-08-06T00:00:04.000Z",
    },
    {
      artifactClass: "asset",
      reason: "capture denied",
      referrer: "https://example.test/token%3Dblocked-referrer-secret",
      capturedAt: "2026-08-06T00:00:05.000Z",
    },
    {
      artifactClass: "video",
      reason: "capture denied",
      discovery: "token%FF: blocked-utf8-secret",
      capturedAt: "2026-08-06T00:00:06.000Z",
    },
    {
      artifactClass: "audio",
      reason: "capture denied",
      discovery: deeplyEncodedSecret,
      capturedAt: "2026-08-06T00:00:07.000Z",
    },
  ];
  const { result, statusPath } = verify(root, unsafe);
  assert.equal(result.complete, false);
  assert.deepEqual(result.verifiedArtifacts, []);
  assert.deepEqual(result.blocked, []);
  assert.doesNotMatch(readFileSync(statusPath, "utf8"), /artifact-(?:discovery|referrer)-secret|blocked-(?:reason|invalid|referrer|utf8|deep)-secret/);

  const safe = structuredClone(manifest);
  safe.artifacts[0].discovery = "navigation%20capture";
  const safeResult = verify(root, safe).result;
  assert.equal(safeResult.complete, true);
  assert.equal(safeResult.verifiedArtifacts.find((entry) => entry.artifactClass === "document").discovery, "navigation%20capture");
});

run("innocuous query keys are preserved without secret false positives", (root, manifest) => {
  const innocuous = structuredClone(manifest);
  innocuous.artifacts[0].originalUrl = "https://example.test/?monkey=banana";
  assert.equal(verify(root, innocuous).result.complete, true);
});

run("camelCase sensitive query keys make an archive incomplete", (root, manifest) => {
  for (const key of ["authToken", "accessToken", "sessionId"]) {
    const sensitive = structuredClone(manifest);
    sensitive.artifacts[0].originalUrl = `https://example.test/?${key}=secret`;
    assertIncomplete(root, sensitive, /sensitive query key/i);
  }
});

run("prefixed segmented secret query keys make an archive incomplete", (root, manifest) => {
  for (const key of ["X-Amz-Signature", "x-api-key", "api.key"]) {
    const sensitive = structuredClone(manifest);
    sensitive.artifacts[0].originalUrl = `https://example.test/?${key}=secret`;
    assertIncomplete(root, sensitive, /sensitive query key/i);
  }
});

run("unsafe status outputs preserve the manifest and archived artifacts", (root, manifest) => {
  const manifestPath = writeManifest(root, manifest);
  const manifestBefore = readFileSync(manifestPath);
  const manifestRun = spawnSync(process.execPath, [cliScript, root, manifestPath, `./${manifestPath.slice(root.length + 1)}`], { encoding: "utf8" });
  assert.notEqual(manifestRun.status, 0);
  assert.match(manifestRun.stderr, /Unsafe status output/);
  assert.deepEqual(readFileSync(manifestPath), manifestBefore);

  const artifactPath = join(root, "original", "app.js");
  const artifactBefore = readFileSync(artifactPath);
  const aliasPath = join(root, "status-alias.json");
  symlinkSync(artifactPath, aliasPath);
  const artifactRun = spawnSync(process.execPath, [cliScript, root, manifestPath, aliasPath], { encoding: "utf8" });
  assert.notEqual(artifactRun.status, 0);
  assert.match(artifactRun.stderr, /Unsafe status output/);
  assert.deepEqual(readFileSync(artifactPath), artifactBefore);
});

run("status output cannot be created under original", (root, manifest) => {
  const manifestPath = writeManifest(root, manifest);
  const statusPath = join(root, "original", "new-status.json");
  assert.throws(
    () => verifySourceArchive(root, manifestPath, statusPath),
    /Unsafe status output.*original/i,
  );
  assert.equal(existsSync(statusPath), false);
});

run("status output cannot hardlink the manifest", (root, manifest) => {
  const manifestPath = writeManifest(root, manifest);
  const manifestBefore = readFileSync(manifestPath);
  const statusPath = join(root, "manifest-hardlink-status.json");
  linkSync(manifestPath, statusPath);
  assert.throws(() => verifySourceArchive(root, manifestPath, statusPath), /Unsafe status output.*manifest/i);
  assert.deepEqual(readFileSync(manifestPath), manifestBefore);
});

run("status output cannot hardlink an archived artifact", (root, manifest) => {
  const manifestPath = writeManifest(root, manifest);
  const artifactPath = join(root, "original", "app.js");
  const artifactBefore = readFileSync(artifactPath);
  const statusPath = join(root, "artifact-hardlink-status.json");
  linkSync(artifactPath, statusPath);
  assert.throws(() => verifySourceArchive(root, manifestPath, statusPath), /Unsafe status output.*artifact/i);
  assert.deepEqual(readFileSync(artifactPath), artifactBefore);
});

run("status output cannot hardlink an undeclared file under original", (root, manifest) => {
  const manifestPath = writeManifest(root, manifest);
  const rawDirectory = join(root, "original", "raw");
  const undeclaredPath = join(rawDirectory, "undeclared.bin");
  mkdirSync(rawDirectory);
  writeFileSync(undeclaredPath, "undeclared original bytes");
  const originalBytes = readFileSync(undeclaredPath);
  const statusPath = join(root, "undeclared-hardlink-status.json");
  linkSync(undeclaredPath, statusPath);
  assert.throws(() => verifySourceArchive(root, manifestPath, statusPath), /Unsafe status output.*original/i);
  assert.deepEqual(readFileSync(undeclaredPath), originalBytes);
});

run("a malformed manifest never writes through a status symlink", (root, manifest) => {
  const manifestPath = writeManifest(root, manifest);
  writeFileSync(manifestPath, "{ malformed json");
  const artifactPath = join(root, "original", "app.js");
  const artifactBefore = readFileSync(artifactPath);
  const aliasPath = join(root, "malformed-status.json");
  symlinkSync(artifactPath, aliasPath);
  const run = spawnSync(process.execPath, [cliScript, root, manifestPath, aliasPath], { encoding: "utf8" });
  assert.notEqual(run.status, 0);
  assert.deepEqual(readFileSync(artifactPath), artifactBefore);
});

run("every required artifact class member must be a non-empty string", (root, manifest) => {
  const invalid = { ...manifest, requiredArtifactClasses: ["document", "", 42, null] };
  const { result, statusPath } = verify(root, invalid);
  assert.equal(result.complete, false);
  const errors = JSON.parse(readFileSync(statusPath, "utf8")).errors;
  assert.equal(errors.filter((message) => message.includes("requiredArtifactClasses member")).length, 3);
});

run("empty manifests cannot verify as complete archives", (root) => {
  const empty = {
    schemaVersion: 1,
    requiredArtifactClasses: [],
    artifacts: [],
    runtimeDiscovery: {
      status: "complete",
      method: "not-applicable",
      capturedAt: "2026-08-06T00:00:02.000Z",
      observed: [],
    },
    blocked: [],
  };
  const { result } = verify(root, empty);
  assert.equal(result.complete, false);
  assert.match(result.errors.join("\n"), /requiredArtifactClasses must not be empty/);
  assert.match(result.errors.join("\n"), /artifacts must not be empty/);
});

run("archives require at least one verified document capture", (root, manifest) => {
  const noDocument = structuredClone(manifest);
  noDocument.requiredArtifactClasses = ["script"];
  noDocument.artifacts = [noDocument.artifacts[1]];
  assertIncomplete(root, noDocument, /at least one verified document/);
});

run("an empty document cannot satisfy the verified archive root", (root, manifest) => {
  const emptyDocument = structuredClone(manifest);
  emptyDocument.requiredArtifactClasses = ["document"];
  emptyDocument.artifacts = [emptyDocument.artifacts[0]];
  emptyDocument.runtimeDiscovery = {
    status: "complete",
    method: "not-applicable",
    capturedAt: "2026-08-06T00:00:02.000Z",
    observed: [],
  };
  updateDocument(root, emptyDocument, "");
  assertIncomplete(root, emptyDocument, /document.*non-empty/i);
});

run("a zero-byte opaque artifact remains valid beside a real document root", (root, manifest) => {
  const opaque = structuredClone(manifest);
  updateDocument(root, opaque, "<!doctype html><p>Static reference</p>");
  const emptyAsset = capturedArtifact(root, {
    artifactClass: "asset",
    originalUrl: "https://example.test/empty.bin",
    localPath: "empty.bin",
    contents: Buffer.alloc(0),
    contentType: "application/octet-stream",
    referrer: opaque.artifacts[0].originalUrl,
  });
  opaque.requiredArtifactClasses = ["document", "asset"];
  opaque.artifacts = [opaque.artifacts[0], emptyAsset];
  opaque.runtimeDiscovery = {
    status: "complete",
    method: "not-applicable",
    capturedAt: "2026-08-06T00:00:02.000Z",
    observed: [],
  };
  assert.equal(verify(root, opaque).result.complete, true);
});

run("blocked artifacts make an archive incomplete and write status", (root, manifest) => {
  const blocked = { ...manifest, blocked: [{
    artifactClass: "font",
    originalUrl: "https://example.test/font.woff2",
    reason: "robots denied capture",
    discovery: "browser-network-log",
    capturedAt: "2026-08-06T00:00:03.000Z",
  }] };
  const { result, statusPath } = verify(root, blocked);
  assert.equal(result.complete, false);
  assert.equal(existsSync(statusPath), true);
  const status = JSON.parse(readFileSync(statusPath, "utf8"));
  assert.deepEqual(status.blocked, blocked.blocked);
  assert.equal(status.snapshotId, null);
});

run("blocked entries are structural and never persist secret URLs", (root, manifest) => {
  const unsafe = structuredClone(manifest);
  unsafe.blocked = [
    {
      artifactClass: "font",
      originalUrl: "https://example.test/font.woff2?X-Amz-Signature=blocked-secret",
      reason: "signed URL expired",
      capturedAt: "2026-08-06T00:00:03.000Z",
    },
    {
      artifactClass: "image",
      reason: "capture denied",
      discovery: "https://example.test/capture?token=discovery-secret",
      capturedAt: "2026-08-06T00:00:04.000Z",
    },
    { artifactClass: "", reason: "", capturedAt: "not-a-date" },
  ];
  const { result, statusPath } = verify(root, unsafe);
  assert.equal(result.complete, false);
  assert.deepEqual(result.blocked, []);
  const status = readFileSync(statusPath, "utf8");
  assert.doesNotMatch(status, /blocked-secret|discovery-secret/);
  assert.match(status, /requires artifactClass/);
  assert.match(status, /requires reason/);
  assert.match(status, /capturedAt/);
  assert.match(status, /sensitive query key/i);
});

run("blocked metadata rejects authorization and bearer secrets", (root, manifest) => {
  const unsafe = structuredClone(manifest);
  unsafe.blocked = [
    {
      artifactClass: "font",
      reason: "Authorization: Bearer blocked-bearer-secret",
      capturedAt: "2026-08-06T00:00:03.000Z",
    },
    {
      artifactClass: "image",
      reason: "capture denied",
      discovery: "Bearer discovery-bearer-secret",
      capturedAt: "2026-08-06T00:00:04.000Z",
    },
  ];
  const { result, statusPath } = verify(root, unsafe);
  assert.equal(result.complete, false);
  assert.deepEqual(result.blocked, []);
  const status = readFileSync(statusPath, "utf8");
  assert.doesNotMatch(status, /blocked-bearer-secret|discovery-bearer-secret/);
  assert.match(status, /secret-bearing metadata/i);
});

console.log("All source archive verifier assertions passed.");
