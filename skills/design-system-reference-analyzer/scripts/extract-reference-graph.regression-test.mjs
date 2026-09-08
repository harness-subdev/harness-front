#!/usr/bin/env node
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const extractorPath =
  process.env.EXTRACT_REFERENCE_GRAPH ||
  fileURLToPath(new URL("./extract-reference-graph.mjs", import.meta.url));
const referenceIndexExtractorPath =
  process.env.EXTRACT_REFERENCE_INDEX ||
  fileURLToPath(new URL("./extract-reference-index.mjs", import.meta.url));
const componentContractsExtractorPath =
  process.env.EXTRACT_COMPONENT_CONTRACTS ||
  fileURLToPath(new URL("./extract-component-contracts.mjs", import.meta.url));

const evidenceBucketNames = ["directRefs", "inheritedRefs", "descendantRefs"];
const legacyEmbeddedEvidenceKeys = new Set([
  "assetContract",
  "cssContract",
  "dependencies",
  "jsContract",
  "markupContract",
]);
const evidenceObjectKeys = new Set([
  "declarations",
  "eventType",
  "handler",
  "mutationType",
  "operation",
  "properties",
  "rule",
  "selector",
  "sourceFile",
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function runScript(scriptPath, args, timeout = 5000) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    encoding: "utf8",
    timeout,
  });
}

function runExtractor(sourceDir, outputPath, timeout = 5000) {
  return runScript(extractorPath, [sourceDir, outputPath], timeout);
}

function runReferenceIndexExtractor(graphPath, indexPath, timeout = 5000) {
  return runScript(referenceIndexExtractorPath, [graphPath, indexPath], timeout);
}

function runComponentContractsExtractor(graphPath, contractsPath, indexPath, timeout = 5000) {
  return runScript(componentContractsExtractorPath, [graphPath, contractsPath, indexPath], timeout);
}

function withTempDir(prefix, fn) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function writeV2Fixture(sourceDir) {
  writeFileSync(
    join(sourceDir, "index.html"),
    [
      "<!doctype html>",
      "<html>",
      "  <body>",
      '    <header id="header">',
      '      <nav class="primary-nav">',
      '        <a class="logo-link" href="/">Brand</a>',
      '        <button class="menu-toggle" type="button">Menu</button>',
      "      </nav>",
      "    </header>",
      '    <main id="main">',
      '      <section class="content-section">',
      '        <form class="signup-form">',
      '          <input type="email" name="email">',
      '          <button type="submit">Join</button>',
      "        </form>",
      '        <ul class="cards">',
      '          <li class="card">',
      '            <a class="card-link" href="/one">',
      '              <span class="card-title">One</span>',
      '            <li class="card">',
      '              <a class="card-link" href="/two">',
      '                <span class="card-title">Two</span>',
      "        </ul>",
      '        <ul class="nested-list">',
      '          <li class="item">',
      "            Alpha",
      '            <ul class="nested-sublist">',
      '              <li class="subitem">Nested',
      "        </ul>",
      '        <canvas id="render-canvas" class="scene-canvas" data-renderer="webgl" width="1280" height="720"></canvas>',
      '        <canvas class="css-only-canvas" aria-label="Decorative gradient"></canvas>',
      "      </section>",
      "    </main>",
      '    <footer id="footer">',
      '      <a class="footer-link" href="/terms">Terms</a>',
      "    </footer>",
      '    <script id="inline-frag" type="x-shader/x-fragment">',
      "      uniform sampler2D inlineBake;",
      "      void main() { gl_FragColor = texture2D(inlineBake, vec2(0.25)).g; }",
      "    </script>",
      "  </body>",
      "</html>",
    ].join("\n"),
    "utf8",
  );

  writeFileSync(
    join(sourceDir, "styles.css"),
    [
      ":root { --card-gap: 16px; --surface: #f4f4f4; }",
      "body { font-family: system-ui; color: #111; }",
      "#header { background: #fff; }",
      "#header .menu-toggle { color: #333; }",
      ".content-section { padding: 24px; }",
      ".content-section .card, .content-section .card-link { border: 1px solid #111; }",
      ".signup-form input { border: 0; }",
      ".cards .card-title { color: #222; }",
      ".scene-canvas { display: block; width: 100%; }",
      ".css-only-canvas { background: linear-gradient(#111, #333); height: 24px; }",
      ".footer-link { text-decoration: none; }",
    ].join("\n"),
    "utf8",
  );

  writeFileSync(
    join(sourceDir, "script.js"),
    [
      'import vertexShader from "./scene.vert";',
      'import fragmentShader from "./bake.frag";',
      '$("#header").addClass("hydrated");',
      '$("#header .menu-toggle").attr("aria-expanded", "false");',
      '$(".content-section").data("ready", true);',
      'const $cards = $(".card");',
      '$cards.on("click", function () { $(".menu-toggle").toggleClass("open"); });',
      '$(".signup-form").on("submit", function () { $(".card-title").text("Joined"); });',
      '$(".footer-link").addClass("active");',
      'const canvas = document.querySelector("#render-canvas");',
      'const gl = canvas.getContext("webgl2");',
      'const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms: { bake2: { value: texture } } });',
      'const renderer = new THREE.WebGLRenderer({ canvas });',
      'const target = new THREE.WebGLRenderTarget(512, 512);',
      'renderer.setRenderTarget(target);',
      'renderer.render(scene, camera);',
      'renderer.setRenderTarget(null);',
      'renderer.render(scene, camera);',
      'const nativeProgram = gl.createProgram();',
      'const nativeFramebuffer = gl.createFramebuffer();',
      'const nativeTexture = gl.createTexture();',
      'gl.bindFramebuffer(gl.FRAMEBUFFER, nativeFramebuffer);',
      'gl.bindTexture(gl.TEXTURE_2D, nativeTexture);',
      'gl.drawArrays(gl.TRIANGLES, 0, 3);',
      'gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);',
    ].join("\n"),
    "utf8",
  );

  writeFileSync(
    join(sourceDir, "scene.vert"),
    [
      "attribute vec3 position;",
      "uniform mat4 projectionMatrix;",
      "void main() { gl_Position = projectionMatrix * vec4(position, 1.0); }",
    ].join("\n"),
    "utf8",
  );
  writeFileSync(
    join(sourceDir, "bake.frag"),
    [
      "precision highp float;",
      "uniform sampler2D bake2;",
      "uniform float level0;",
      "void main() {",
      "  float bakedTone = texture2D(bake2, vec2(0.5)).b * level0;",
      "  vec3 outgoingLight = vec3(bakedTone);",
      "  gl_FragColor = vec4(outgoingLight, 1.0);",
      "}",
    ].join("\n"),
    "utf8",
  );
  writeFileSync(join(sourceDir, "scene.glb"), "", "utf8");
  writeFileSync(join(sourceDir, "environment.ktx2"), "", "utf8");
}

function setupV2GraphFixture(fn) {
  return withTempDir("dsra-v2-", (dir) => {
    const sourceDir = join(dir, "source");
    mkdirSync(sourceDir, { recursive: true });
    writeV2Fixture(sourceDir);

    const graphPath = join(sourceDir, "reference-graph.json");
    const graphResult = runExtractor(sourceDir, graphPath, 5000);

    assert(
      !graphResult.error || graphResult.error.code !== "ETIMEDOUT",
      `reference graph extractor timed out while building the v2 fixture\nstdout:\n${graphResult.stdout}\nstderr:\n${graphResult.stderr}`,
    );
    assert(graphResult.status === 0, `reference graph extractor failed with status ${graphResult.status}\nstderr:\n${graphResult.stderr}`);

    return fn({
      sourceDir,
      graphPath,
      graph: readJson(graphPath),
    });
  });
}

function setupV2Fixture(fn) {
  return setupV2GraphFixture(({ sourceDir, graphPath, graph }) => {
    const indexPath = join(sourceDir, "reference-index.json");
    const contractsPath = join(sourceDir, "component-contracts.json");

    const indexResult = runReferenceIndexExtractor(graphPath, indexPath, 5000);
    assert(
      !indexResult.error || indexResult.error.code !== "ETIMEDOUT",
      `reference index extractor timed out while building the v2 fixture\nstdout:\n${indexResult.stdout}\nstderr:\n${indexResult.stderr}`,
    );
    assert(indexResult.status === 0, `reference index extractor failed with status ${indexResult.status}\nstderr:\n${indexResult.stderr}`);

    const contractsResult = runComponentContractsExtractor(graphPath, contractsPath, indexPath, 5000);
    assert(
      !contractsResult.error || contractsResult.error.code !== "ETIMEDOUT",
      `component contracts extractor timed out while building the v2 fixture\nstdout:\n${contractsResult.stdout}\nstderr:\n${contractsResult.stderr}`,
    );
    assert(contractsResult.status === 0, `component contracts extractor failed with status ${contractsResult.status}\nstderr:\n${contractsResult.stderr}`);

    return fn({
      sourceDir,
      graphPath,
      indexPath,
      contractsPath,
      graph,
    });
  });
}

function findDomNode(graph, predicate) {
  return graph.nodes.find((node) => node.type === "dom-node" && predicate(node));
}

function findComponent(componentContracts, predicate) {
  return componentContracts.componentTree.find(predicate);
}

function assertFileExists(path, label) {
  assert(existsSync(path), `missing ${label}: ${path}`);
}

function assertEvidenceRefBuckets(container, label) {
  assert(container && typeof container === "object" && !Array.isArray(container), `expected ${label} to be an object`);
  for (const bucketName of evidenceBucketNames) {
    const bucket = container[bucketName];
    assert(bucket && typeof bucket === "object" && !Array.isArray(bucket), `expected ${label}.${bucketName} to be an object`);
    for (const [refKind, refs] of Object.entries(bucket)) {
      assert(Array.isArray(refs), `expected ${label}.${bucketName}.${refKind} to be an array`);
      assert(
        refs.every((ref) => typeof ref === "string"),
        `expected ${label}.${bucketName}.${refKind} to contain string IDs only`,
      );
    }
  }
}

function assertNonEmptyStringRefs(refs, label) {
  assert(Array.isArray(refs), `expected ${label} to be an array`);
  assert(refs.length > 0, `expected ${label} to contain at least one ref`);
  assert(refs.every((ref) => typeof ref === "string"), `expected ${label} to contain string IDs only`);
}

function assertExpectedEvidenceRefs(container, label, expectedRefs) {
  assertEvidenceRefBuckets(container, label);
  for (const [bucketName, refKind] of expectedRefs) {
    assertNonEmptyStringRefs(container[bucketName]?.[refKind], `${label}.${bucketName}.${refKind}`);
  }
}

function objectLooksLikeEvidence(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  const evidenceKeyCount = keys.filter((key) => evidenceObjectKeys.has(key)).length;
  return evidenceKeyCount >= 2 || (keys.includes("selector") && (keys.includes("declarations") || keys.includes("operation")));
}

function assertNoEmbeddedEvidence(value, label) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    assert(
      !value.some(objectLooksLikeEvidence),
      `expected ${label} not to contain arrays of embedded evidence objects`,
    );
    value.forEach((item, index) => assertNoEmbeddedEvidence(item, `${label}[${index}]`));
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    assert(!legacyEmbeddedEvidenceKeys.has(key), `expected ${label} not to embed legacy ${key}`);
    assert(
      !objectLooksLikeEvidence(child),
      `expected ${label}.${key} not to embed a raw CSS/JS evidence object`,
    );
    assertNoEmbeddedEvidence(child, `${label}.${key}`);
  }
}

function testNonJqueryBundleDoesNotTimeout() {
  withTempDir("dsra-bundle-", (dir) => {
    const nonJqueryBundle = [
      "const x=",
      Array.from({ length: 250 }, (_, index) =>
        `module${index}.map(value).filter(value).reduce(value)`
      ).join("+"),
      ";",
    ].join("");
    writeFileSync(join(dir, "chunk.js"), nonJqueryBundle, "utf8");

    const outputPath = join(dir, "reference-graph.json");
    const result = runExtractor(dir, outputPath, 5000);

    assert(
      !result.error || result.error.code !== "ETIMEDOUT",
      `extractor timed out on a minified bundle with no jQuery calls\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
    assert(result.status === 0, `extractor failed with status ${result.status}\nstderr:\n${result.stderr}`);

    const graph = JSON.parse(readFileSync(outputPath, "utf8"));
    assert(graph.inventories.js.length === 1, "expected one JS inventory entry");
  });
}

function testBinaryAssetsUseMetadataWithoutTextReads() {
  withTempDir("dsra-binary-assets-", (dir) => {
    const modelBytes = Buffer.from([0x67, 0x6c, 0x54, 0x46, 0x00, 0xff, 0x80, 0x01]);
    const videoBytes = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0xff]);
    const modelPath = join(dir, "scene.glb");
    const videoPath = join(dir, "intro.mp4");
    writeFileSync(join(dir, "index.html"), '<main><canvas id="scene"></canvas></main>', "utf8");
    writeFileSync(modelPath, modelBytes);
    writeFileSync(videoPath, videoBytes);
    chmodSync(modelPath, 0o000);
    chmodSync(videoPath, 0o000);

    const graphPath = join(dir, "reference-graph.json");
    const result = runExtractor(dir, graphPath, 5000);
    chmodSync(modelPath, 0o600);
    chmodSync(videoPath, 0o600);

    assert(result.status === 0, `extractor read an unreadable binary artifact as text\nstderr:\n${result.stderr}`);
    const graph = readJson(graphPath);
    const modelArtifact = graph.artifacts.find((artifact) => artifact.path === "scene.glb");
    const videoArtifact = graph.artifacts.find((artifact) => artifact.path === "intro.mp4");
    const modelAsset = graph.nodes.find((node) => node.type === "asset" && node.filePath === "scene.glb");
    const videoAsset = graph.nodes.find((node) => node.type === "asset" && node.filePath === "intro.mp4");

    assert(modelArtifact?.bytes === modelBytes.byteLength, "expected GLB byte metadata without decoding its contents");
    assert(videoArtifact?.bytes === videoBytes.byteLength, "expected video byte metadata without decoding its contents");
    assert(!Object.hasOwn(modelArtifact, "lineCount"), "expected binary GLB artifact not to report decoded line counts");
    assert(!Object.hasOwn(videoArtifact, "lineCount"), "expected binary video artifact not to report decoded line counts");
    assert(modelAsset?.bytes === modelBytes.byteLength, "expected GPU asset evidence to preserve byte metadata");
    assert(videoAsset?.bytes === videoBytes.byteLength, "expected binary asset evidence to preserve byte metadata");
  });
}

function testDomHierarchyExtractsParentsChildrenAndDepth() {
  setupV2GraphFixture(({ graph }) => {
    const header = findDomNode(graph, (node) => node.tag === "header" && node.idAttr === "header");
    const nav = findDomNode(graph, (node) => node.tag === "nav" && node.classes?.includes("primary-nav"));
    const logoLink = findDomNode(graph, (node) => node.tag === "a" && node.classes?.includes("logo-link"));
    const main = findDomNode(graph, (node) => node.tag === "main" && node.idAttr === "main");
    const section = findDomNode(graph, (node) => node.tag === "section" && node.classes?.includes("content-section"));
    const signupForm = findDomNode(graph, (node) => node.tag === "form" && node.classes?.includes("signup-form"));
    const input = findDomNode(graph, (node) => node.tag === "input" && node.name === "input");
    const footer = findDomNode(graph, (node) => node.tag === "footer" && node.idAttr === "footer");
    const cardsList = findDomNode(graph, (node) => node.tag === "ul" && node.classes?.includes("cards"));
    const cardItems = graph.nodes
      .filter((node) => node.type === "dom-node" && node.tag === "li" && node.classes?.includes("card"))
      .sort((a, b) => a.line - b.line);
    const nestedList = findDomNode(graph, (node) => node.tag === "ul" && node.classes?.includes("nested-sublist"));
    const nestedItem = findDomNode(graph, (node) => node.tag === "li" && node.classes?.includes("subitem"));

    assert(header && nav && logoLink && main && section && signupForm && input && footer && cardsList && cardItems.length === 2 && nestedList && nestedItem,
      "expected header/main/footer hierarchy fixtures to be present in the graph");
    assert(header.children?.includes(nav.id), "expected header to own the nav child");
    assert(nav.parent === header.id, "expected nav parent to be the header");
    assert(nav.children?.includes(logoLink.id), "expected nav to own its anchor child");
    assert(main.children?.includes(section.id), "expected main to own the content section");
    assert(section.parent === main.id, "expected section parent to be main");
    assert(section.children?.includes(signupForm.id), "expected section to own the form child");
    assert(signupForm.parent === section.id, "expected form to stay under the major region section");
    assert(input.parent === signupForm.id, "expected void input to preserve the form hierarchy");
    assert(footer.parent === graph.nodes.find((node) => node.type === "dom-node" && node.tag === "body")?.id, "expected footer parent to be body");
    assert(cardItems[0].parent === cardsList.id, "expected first card item to stay under the list");
    assert(cardItems[1].parent === cardsList.id, "expected second card item to stay under the list");
    assert(nestedList.parent === cardItems[1].id, "expected nested list to stay inside the second list item");
    assert(nestedItem.parent === nestedList.id, "expected nested subitem to stay under the nested list");
    assert(cardItems[0].depth === cardsList.depth + 1, "expected card depth to reflect DOM nesting");
    assert(nestedItem.depth > nestedList.depth, "expected nested list item depth to increase");
  });
}

function testReferenceIndexIsCompactAndDeDuplicatedByRef() {
  setupV2Fixture(({ indexPath }) => {
    assertFileExists(indexPath, "reference-index.json");

    const index = readJson(indexPath);
    assert(index.schemaVersion === 2, "expected reference-index.json schemaVersion 2");
    assert(Array.isArray(index.domHierarchy?.roots), "expected domHierarchy.roots to be an array");
    const headerEntry = Object.entries(index.domHierarchy?.nodes || {}).find(([, node]) => node.tag === "header");
    assert(headerEntry, "expected a header entry in domHierarchy.nodes");
    const [headerDomRef, headerDom] = headerEntry;
    assert(typeof headerDom.parent === "string", "expected domHierarchy nodes to carry parent refs");
    assert(Array.isArray(headerDom.children), "expected domHierarchy nodes to carry children refs");
    assert(typeof headerDom.depth === "number", "expected domHierarchy nodes to carry depth");
    const headerEvidenceRefs = index.evidenceIndex?.byDomRef?.[headerDomRef];
    assertExpectedEvidenceRefs(headerEvidenceRefs, `evidenceIndex.byDomRef.${headerDomRef}`, [
      ["directRefs", "cssRules"],
      ["directRefs", "jsSelectors"],
      ["inheritedRefs", "cssRules"],
      ["descendantRefs", "cssRules"],
      ["descendantRefs", "jsSelectors"],
    ]);
  });
}

function testComponentContractsAreV2AndKeepMajorRegionsTopLevel() {
  setupV2Fixture(({ contractsPath }) => {
    assertFileExists(contractsPath, "component-contracts.json");

    const contracts = readJson(contractsPath);
    assert(contracts.schemaVersion === 2, "expected component-contracts.json schemaVersion 2");
    const components = Object.values(contracts.components || {});
    const componentNames = contracts.componentTree.map((component) => component.name);
    assert(componentNames.includes("Header"), "expected Header in componentTree");
    assert(componentNames.includes("Section"), "expected Section in componentTree");
    assert(componentNames.includes("Footer"), "expected Footer in componentTree");
    assert(!componentNames.includes("Nav"), "expected nav under header to stay a child component");
    assert(!componentNames.includes("Form"), "expected form under section to stay a child component");

    const header = findComponent(contracts, (component) => component.name === "Header");
    const section = findComponent(contracts, (component) => component.name === "Section");
    assert(header, "expected a Header component");
    assert(section, "expected a Section component");
    assert(header.kind === "top-level", "expected Header to be top-level");
    assert(section.kind === "top-level", "expected Section to be top-level");
    assert(header.childComponentRefs?.length > 0, "expected Header to expose child component refs");
    assert(section.childComponentRefs?.length > 0, "expected Section to expose child component refs");

    const navChild = components.find((component) => component.parentRef === header.id && /nav/i.test(component.name || component.role || ""));
    const formChild = components.find((component) => component.parentRef === section.id && /form/i.test(component.name || component.role || ""));
    assert(navChild, "expected a nav child component under Header");
    assert(formChild, "expected a form child component under Section");
    assert(header.childComponentRefs.includes(navChild.id), "expected Header child refs to include the nav component");
    assert(section.childComponentRefs.includes(formChild.id), "expected Section child refs to include the form component");

    assertExpectedEvidenceRefs(header.evidenceRefs, "Header.evidenceRefs", [
      ["directRefs", "cssRules"],
      ["directRefs", "jsSelectors"],
      ["inheritedRefs", "cssRules"],
      ["descendantRefs", "cssRules"],
      ["descendantRefs", "jsSelectors"],
    ]);
    assertExpectedEvidenceRefs(section.evidenceRefs, "Section.evidenceRefs", [
      ["directRefs", "cssRules"],
      ["directRefs", "jsSelectors"],
      ["inheritedRefs", "cssRules"],
      ["descendantRefs", "cssRules"],
      ["descendantRefs", "jsSelectors"],
    ]);
    for (const component of components) {
      assertNoEmbeddedEvidence(component, `components.${component.id || "unknown"}`);
    }
  });
}

function testGpuEvidenceIsPartialAndNeverRuntimeReady() {
  setupV2Fixture(({ graphPath, indexPath, contractsPath }) => {
    const graph = readJson(graphPath);
    const index = readJson(indexPath);
    const contracts = readJson(contractsPath);
    const canvas = findDomNode(graph, (node) => node.tag === "canvas" && node.idAttr === "render-canvas");
    const cssOnlyCanvas = findDomNode(graph, (node) => node.tag === "canvas" && node.classes?.includes("css-only-canvas"));
    const gpuContracts = graph.nodes.filter((node) => node.type === "gpu-contract");

    assert(graph.schemaVersion === 2, "expected raw graph schemaVersion 2");
    assert(graph.analysis?.engine === "scanner", "expected scanner analysis provenance");
    assert(graph.analysis?.parserBacked === false, "expected parserBacked false for scanner output");
    assert(graph.analysis?.partial === true, "expected scanner output to be partial");
    assert(canvas?.attributes?.["data-renderer"] === "webgl", "expected canvas renderer attribute to be preserved");
    assert(canvas?.attributes?.width === "1280", "expected canvas dimensions to be preserved");
    assert(cssOnlyCanvas, "expected CSS-only canvas fixture to be present");
    const inlineShaderDom = findDomNode(graph, (node) => node.tag === "script" && node.idAttr === "inline-frag");
    assert(inlineShaderDom?.attributes?.type === "x-shader/x-fragment", "expected inline shader MIME attribute to be preserved");
    const inlineShader = gpuContracts.find((node) => node.filePath === "index.html" && node.gpuKind === "shader-stage" && node.stage === "fragment");
    assert(inlineShader?.rawSource?.includes("inlineBake"), "expected recognized inline fragment shader source to be preserved");
    assert(typeof inlineShader?.sourceRange?.start === "number" && inlineShader.sourceRange.end > inlineShader.sourceRange.start, "expected inline shader source range");
    assert(gpuContracts.some((node) => node.filePath === "index.html" && node.gpuKind === "uniform" && node.name === "inlineBake" && node.uniformKind === "sampler2D"), "expected inline sampler uniform contract");
    assert(gpuContracts.some((node) => node.filePath === "index.html" && node.gpuKind === "texture-channel-read" && node.sampler === "inlineBake" && node.channel === "g"), "expected inline shader channel contract");
    assert(graph.inventories.gpu?.shaders?.some((shader) => shader.filePath === "bake.frag" && shader.rawSource.includes("bake2")), "expected raw fragment shader inventory evidence");
    assert(graph.inventories.gpu?.assets?.some((asset) => asset.filePath === "scene.glb" && asset.assetKind === "gpu-model"), "expected GPU model asset classification");
    assert(graph.inventories.gpu?.assets?.some((asset) => asset.filePath === "environment.ktx2" && asset.assetKind === "gpu-texture"), "expected GPU texture asset classification");
    assert(gpuContracts.some((node) => node.gpuKind === "shader-stage" && node.stage === "fragment"), "expected fragment shader contract");
    assert(gpuContracts.some((node) => node.gpuKind === "uniform" && node.name === "bake2" && node.uniformKind === "sampler2D"), "expected sampler uniform contract");
    assert(gpuContracts.some((node) => node.gpuKind === "texture-channel-read" && node.channel === "b" && node.sampler === "bake2"), "expected bake2.b channel read contract");
    assert(gpuContracts.some((node) => node.gpuKind === "render-target"), "expected render target contract");
    assert(gpuContracts.some((node) => node.gpuKind === "material-or-program" && node.name === "nativeProgram"), "expected native program contract");
    assert(gpuContracts.some((node) => node.gpuKind === "render-target" && node.name === "nativeFramebuffer" && node.targetKind === "framebuffer"), "expected native framebuffer contract");
    assert(gpuContracts.some((node) => node.gpuKind === "texture" && node.name === "nativeTexture"), "expected native texture contract");
    assert(gpuContracts.some((node) => node.gpuKind === "pass"), "expected render pass contract");
    assert(graph.edges.some((edge) => edge.type === "uses_shader"), "expected shader ownership relation");
    assert(graph.edges.some((edge) => edge.type === "reads_channel"), "expected shader channel relation");
    assert(graph.edges.some((edge) => edge.type === "precedes"), "expected ordered render pass relation");
    assert(graph.edges.some((edge) => edge.type === "binds_texture"), "expected native texture binding relation");
    assert(graph.edges.some((edge) => edge.type === "writes_to"), "expected native framebuffer write relation");
    assert(index.analysis?.partial === true, "expected analysis provenance propagated to reference index");
    assert(index.evidenceIndex?.byType?.gpuContracts?.length > 0, "expected compact gpuContracts index bucket");
    assert(index.evidenceIndex?.byDomRef?.[canvas.id]?.directRefs?.gpuContracts?.length > 0, "expected canvas GPU ownership evidence in index");
    assert(contracts.analysis?.partial === true, "expected analysis provenance propagated to component contracts");
    assert(Object.keys(contracts.evidence?.gpuContracts || {}).length > 0, "expected compact gpuContracts contract bucket");
    const renderer = gpuContracts.find((node) => node.gpuKind === "renderer" && node.name === "renderer");
    const program = gpuContracts.find((node) => node.gpuKind === "material-or-program" && node.programKind === "ShaderMaterial");
    const context = gpuContracts.find((node) => node.gpuKind === "renderer-state" && node.contextType === "webgl2");
    const pass = gpuContracts.find((node) => node.gpuKind === "pass" && node.name === "renderer.render");
    for (const node of [renderer, program, context, pass]) {
      const compact = contracts.evidence.gpuContracts[node?.id];
      assert(compact?.name === node?.name, `expected compact ${node?.gpuKind} evidence to preserve its name`);
      assert(compact?.sourceRange?.start === node?.sourceRange?.start && compact?.sourceRange?.end === node?.sourceRange?.end,
        `expected compact ${node?.gpuKind} evidence to preserve its source range`);
    }
    assert(contracts.evidence.gpuContracts[renderer?.id]?.rendererKind === "WebGLRenderer", "expected compact renderer kind");
    assert(contracts.evidence.gpuContracts[program?.id]?.programKind === "ShaderMaterial", "expected compact program kind");
    assert(contracts.evidence.gpuContracts[context?.id]?.contextType === "webgl2", "expected compact context type");
    assert(contracts.gpuRelationships?.some((relation) => relation.sourceRef === renderer?.id && relation.targetRef === canvas.id && relation.relation === "configures"),
      "expected compact renderer-to-canvas ownership relation");
    assert(contracts.gpuRelationships?.some((relation) => relation.sourceRef === pass?.id && relation.targetRef === renderer?.id && relation.relation === "configures"),
      "expected compact pass-to-renderer ownership relation");
    const canvasComponents = Object.values(contracts.components || {}).filter((component) => component.role === "canvas");
    assert(canvasComponents.length >= 1, "expected canvas component contracts");
    assert(canvasComponents.every((component) => component.contractStatus !== "ready"), "expected scanner-derived canvas contracts never to be ready");
  });
}

function testShaderOwnershipUsesOnlyExplicitSourceLinks() {
  withTempDir("dsra-shader-ownership-", (dir) => {
    writeFileSync(join(dir, "index.html"), '<canvas id="scene"></canvas>', "utf8");
    writeFileSync(join(dir, "only.frag"), "void main() { gl_FragColor = vec4(1.0); }", "utf8");
    writeFileSync(join(dir, "unused.frag"), "void main() { gl_FragColor = vec4(0.0); }", "utf8");
    writeFileSync(
      join(dir, "scene.js"),
      [
        'import fragmentShader from "./only.frag?raw";',
        'const material = new THREE.ShaderMaterial({ fragmentShader });',
      ].join("\n"),
      "utf8",
    );
    const graphPath = join(dir, "reference-graph.json");
    const result = runExtractor(dir, graphPath, 5000);
    assert(result.status === 0, `extractor failed with status ${result.status}\nstderr:\n${result.stderr}`);
    const graph = readJson(graphPath);
    const material = graph.nodes.find((node) => node.type === "gpu-contract" && node.gpuKind === "material-or-program");
    const shaderRefs = graph.edges
      .filter((edge) => edge.source === material?.id && edge.type === "uses_shader")
      .map((edge) => graph.nodes.find((node) => node.id === edge.target)?.filePath)
      .sort();

    assert(material, "expected ShaderMaterial contract");
    assert(JSON.stringify(shaderRefs) === JSON.stringify(["only.frag"]), "expected material to link only its explicitly imported shader");
  });
}

function testGenericRenderCallDoesNotCreateGpuEvidence() {
  withTempDir("dsra-react-render-", (dir) => {
    writeFileSync(join(dir, "app.js"), 'const root = createRoot(document.getElementById("root")); root.render(App);', "utf8");
    const graphPath = join(dir, "reference-graph.json");
    const result = runExtractor(dir, graphPath, 5000);
    assert(result.status === 0, `extractor failed with status ${result.status}\nstderr:\n${result.stderr}`);
    const graph = readJson(graphPath);
    assert(graph.nodes.filter((node) => node.type === "gpu-contract").length === 0, "expected generic React render call not to create GPU contracts");
  });
}

function testMinifiedMemberConstructorsAndEmbeddedShaders() {
  withTempDir("dsra-minified-gpu-", (dir) => {
    writeFileSync(join(dir, "index.html"), '<main><canvas id="scene"></canvas></main>', "utf8");
    writeFileSync(
      join(dir, "chunk.js"),
      [
        'const c=document.querySelector("#scene");',
        "const r=new t.WebGLRenderer({canvas:c});",
        "new t.WebGLRenderer();",
        "const m=new t.ShaderMaterial({",
        "vertexShader:`uniform mat4 modelMatrix;void main(){gl_Position=modelMatrix*vec4(1.);}` ,",
        'fragmentShader:"precision highp float;\\nuniform sampler2D bake2;\\n// uniform sampler2D commentDecoy;\\nuniform float level0;\\nvoid main(){float bakedTone=texture2D(bake2,vec2(.5)).b*level0;gl_FragColor=vec4(bakedTone);}"',
        "});",
        "r.render(scene,camera);root.render(App);",
      ].join(""),
      "utf8",
    );

    const graphPath = join(dir, "reference-graph.json");
    const indexPath = join(dir, "reference-index.json");
    const contractsPath = join(dir, "component-contracts.json");
    const graphResult = runExtractor(dir, graphPath, 5000);
    assert(graphResult.status === 0, `extractor failed with status ${graphResult.status}\nstderr:\n${graphResult.stderr}`);
    const indexResult = runReferenceIndexExtractor(graphPath, indexPath, 5000);
    assert(indexResult.status === 0, `reference index extractor failed with status ${indexResult.status}\nstderr:\n${indexResult.stderr}`);
    const contractsResult = runComponentContractsExtractor(graphPath, contractsPath, indexPath, 5000);
    assert(contractsResult.status === 0, `component contracts extractor failed with status ${contractsResult.status}\nstderr:\n${contractsResult.stderr}`);

    const graph = readJson(graphPath);
    const index = readJson(indexPath);
    const contracts = readJson(contractsPath);
    const canvas = findDomNode(graph, (node) => node.tag === "canvas" && node.idAttr === "scene");
    const gpuContracts = graph.nodes.filter((node) => node.type === "gpu-contract");
    const renderer = gpuContracts.find((node) => node.gpuKind === "renderer" && node.name === "r");
    const program = gpuContracts.find((node) => node.gpuKind === "material-or-program" && node.programKind === "ShaderMaterial");
    const stages = gpuContracts.filter((node) => node.gpuKind === "shader-stage");
    const passes = gpuContracts.filter((node) => node.gpuKind === "pass");

    assert(renderer?.rendererKind === "WebGLRenderer", "expected aliased member WebGLRenderer lead");
    assert(gpuContracts.filter((node) => node.gpuKind === "renderer" && node.rendererKind === "WebGLRenderer").length === 2,
      "expected standalone member WebGLRenderer constructor lead");
    assert(program, "expected aliased member ShaderMaterial lead");
    assert(stages.some((node) => node.stage === "vertex" && node.rawSource.includes("modelMatrix")), "expected embedded vertex shader lead");
    assert(stages.some((node) => node.stage === "fragment" && node.rawSource.includes("bake2")), "expected embedded fragment shader lead");
    assert(gpuContracts.some((node) => node.gpuKind === "uniform" && node.name === "bake2" && node.sampler === true), "expected embedded sampler uniform lead");
    assert(gpuContracts.some((node) => node.gpuKind === "uniform" && node.name === "level0" && node.uniformKind === "float"), "expected uniform after embedded line comment");
    assert(!gpuContracts.some((node) => node.gpuKind === "uniform" && node.name === "commentDecoy"), "expected embedded line-comment decoy to stay unconfirmed");
    assert(gpuContracts.some((node) => node.gpuKind === "texture-channel-read" && node.sampler === "bake2" && node.channel === "b"), "expected embedded shader channel lead");
    assert(graph.edges.some((edge) => edge.source === program.id && stages.some((stage) => stage.id === edge.target) && edge.type === "uses_shader"), "expected embedded shader ownership edge");
    assert(passes.length === 1 && passes[0].name === "r.render", "expected only the known GPU renderer call to produce a pass");
    assert(graph.analysis?.partial === true && contracts.analysis?.partial === true, "expected minified static leads to remain partial");
    assert(index.evidenceIndex?.byDomRef?.[canvas?.id]?.directRefs?.gpuContracts?.includes(renderer.id), "expected renderer ownership to propagate through the compact index");
    assert(contracts.evidence?.gpuContracts?.[renderer.id]?.name === "r", "expected aliased renderer identity in compact contracts");
    assert(contracts.evidence?.gpuContracts?.[program.id]?.programKind === "ShaderMaterial", "expected aliased program identity in compact contracts");
  });
}

function testUniformDeclarationsHandlePrecisionListsAndMalformedText() {
  withTempDir("dsra-uniform-declarations-", (dir) => {
    writeFileSync(
      join(dir, "material.frag"),
      [
        "/* uniform sampler2D blockDecoy; */",
        "uniform highp sampler2D bake2, untraced[2];",
        "uniform",
        "  mediump vec4 tint, accents[COUNT];",
        "uniform samplerCube environment; // uniform sampler2D lineDecoy;",
        "uniform lowp sampler2D shadow /* separator */, detail[2];",
        "uniform highp isampler2D signedBake;",
        "uniform usamplerCube unsignedBake;",
        "uniform Broken { vec4 member; } blockInstance;",
        "uniform sampler2D broken,,ignored;",
        "uniform sampler2D missingSemicolon",
        "void main() {",
        "  float sampled = texture2D(bake2, vec2(.5)).b + texture2D(untraced[0], vec2(.5)).r;",
        "  gl_FragColor = vec4(sampled);",
        "}",
      ].join("\n"),
      "utf8",
    );

    const graphPath = join(dir, "reference-graph.json");
    const result = runExtractor(dir, graphPath, 5000);
    assert(result.status === 0, `extractor failed with status ${result.status}\nstderr:\n${result.stderr}`);
    const graph = readJson(graphPath);
    const uniforms = graph.nodes.filter((node) =>
      node.type === "gpu-contract" && node.gpuKind === "uniform" && node.filePath === "material.frag"
    );
    const uniformNames = uniforms.map((uniform) => uniform.name).sort();
    const expectedNames = ["accents", "bake2", "detail", "environment", "shadow", "signedBake", "tint", "unsignedBake", "untraced"];
    assert(JSON.stringify(uniformNames) === JSON.stringify(expectedNames),
      `expected only complete non-block uniform declarators, got ${JSON.stringify(uniformNames)}`);
    for (const name of ["bake2", "untraced"]) {
      const uniform = uniforms.find((candidate) => candidate.name === name);
      assert(uniform?.uniformKind === "sampler2D" && uniform.sampler === true, `expected ${name} sampler lead`);
      assert(graph.edges.some((edge) => edge.target === uniform.id && edge.type === "declares_uniform"),
        `expected ${name} declaration edge`);
    }
    for (const name of ["signedBake", "unsignedBake"]) {
      assert(uniforms.find((uniform) => uniform.name === name)?.sampler === true,
        `expected ${name} integer sampler classification`);
    }
    const untracedRead = graph.nodes.find((node) =>
      node.type === "gpu-contract" && node.gpuKind === "texture-channel-read" && node.sampler === "untraced"
    );
    assert(untracedRead?.uniformRef === uniforms.find((uniform) => uniform.name === "untraced")?.id,
      "expected sampled array uniform to link to its declaration");
    assert(graph.analysis?.partial === true, "expected scanner uniform evidence to remain partial");
  });
}

function testGetElementByIdCanvasOwnership() {
  withTempDir("dsra-canvas-id-", (dir) => {
    writeFileSync(join(dir, "index.html"), '<canvas id="scene"></canvas>', "utf8");
    writeFileSync(join(dir, "scene.js"), 'const canvas = document.getElementById("scene"); const gl = canvas.getContext("webgl");', "utf8");
    const graphPath = join(dir, "reference-graph.json");
    const result = runExtractor(dir, graphPath, 5000);
    assert(result.status === 0, `extractor failed with status ${result.status}\nstderr:\n${result.stderr}`);
    const graph = readJson(graphPath);
    const canvas = findDomNode(graph, (node) => node.tag === "canvas" && node.idAttr === "scene");
    assert(canvas, "expected canvas markup");
    assert(graph.edges.some((edge) => edge.target === canvas.id && edge.type === "configures" && graph.nodes.find((node) => node.id === edge.source)?.gpuKind === "renderer-state"), "expected getElementById context ownership evidence");
  });
}

function testExplicitRendererCanvasOwnershipDoesNotCrossLink() {
  withTempDir("dsra-renderer-canvas-", (dir) => {
    writeFileSync(
      join(dir, "index.html"),
      [
        '<canvas id="primary"></canvas>',
        '<canvas id="secondary"></canvas>',
        '<canvas id="tertiary"></canvas>',
        '<canvas class="shared"></canvas>',
        '<canvas class="shared"></canvas>',
      ].join("\n"),
      "utf8",
    );
    writeFileSync(
      join(dir, "scene.js"),
      [
        'const canvas = document.querySelector("#primary");',
        "const primaryRenderer = new THREE.WebGLRenderer({ canvas });",
        'const secondaryRenderer = new t.WebGLRenderer({ canvas: document.getElementById("secondary") });',
        'const tertiaryRenderer = new t.WebGLRenderer({ canvas: document.querySelector("#tertiary") });',
        'const ambiguousRenderer = new THREE.WebGLRenderer({ canvas: document.querySelector(".shared") });',
        "const unownedRenderer = new THREE.WebGLRenderer();",
      ].join("\n"),
      "utf8",
    );

    const graphPath = join(dir, "reference-graph.json");
    const result = runExtractor(dir, graphPath, 5000);
    assert(result.status === 0, `extractor failed with status ${result.status}\nstderr:\n${result.stderr}`);
    const graph = readJson(graphPath);
    const gpuContracts = graph.nodes.filter((node) => node.type === "gpu-contract");
    const domByIdAttr = new Map(graph.nodes.filter((node) => node.type === "dom-node").map((node) => [node.idAttr, node]));
    const rendererTargets = (name) => {
      const renderer = gpuContracts.find((node) => node.gpuKind === "renderer" && node.name === name);
      return {
        renderer,
        targets: graph.edges.filter((edge) => edge.source === renderer?.id && edge.type === "configures").map((edge) => edge.target),
      };
    };
    const primary = rendererTargets("primaryRenderer");
    const secondary = rendererTargets("secondaryRenderer");
    const tertiary = rendererTargets("tertiaryRenderer");
    const ambiguous = rendererTargets("ambiguousRenderer");
    const unowned = rendererTargets("unownedRenderer");

    assert(primary.targets.length === 1 && primary.targets[0] === domByIdAttr.get("primary")?.id, "expected shorthand canvas identifier ownership");
    assert(secondary.targets.length === 1 && secondary.targets[0] === domByIdAttr.get("secondary")?.id, "expected direct document lookup canvas ownership");
    assert(tertiary.targets.length === 1 && tertiary.targets[0] === domByIdAttr.get("tertiary")?.id, "expected direct document selector canvas ownership");
    assert(ambiguous.renderer && ambiguous.targets.length === 0, "expected ambiguous canvas selectors not to cross-link renderer ownership");
    assert(unowned.renderer && unowned.targets.length === 0, "expected renderer without explicit canvas not to gain ownership");
  });
}

function testRendererStateDoesNotCrossRendererInstances() {
  withTempDir("dsra-renderer-state-", (dir) => {
    writeFileSync(
      join(dir, "scene.js"),
      [
        "const left = new THREE.WebGLRenderer();",
        "const right = new THREE.WebGLRenderer();",
        "const leftTarget = new THREE.WebGLRenderTarget(64, 64);",
        "const rightTarget = new THREE.WebGLRenderTarget(64, 64);",
        "const leftTexture = gl.createTexture();",
        "const rightTexture = gl.createTexture();",
        "left.setRenderTarget(leftTarget);",
        "right.setRenderTarget(rightTarget);",
        "right.render(scene, camera);",
        "left.render(scene, camera);",
      ].join("\n"),
      "utf8",
    );
    const graphPath = join(dir, "reference-graph.json");
    const indexPath = join(dir, "reference-index.json");
    const contractsPath = join(dir, "component-contracts.json");
    const result = runExtractor(dir, graphPath, 5000);
    assert(result.status === 0, `extractor failed with status ${result.status}\nstderr:\n${result.stderr}`);
    const indexResult = runReferenceIndexExtractor(graphPath, indexPath, 5000);
    assert(indexResult.status === 0, `reference index extractor failed with status ${indexResult.status}\nstderr:\n${indexResult.stderr}`);
    const contractsResult = runComponentContractsExtractor(graphPath, contractsPath, indexPath, 5000);
    assert(contractsResult.status === 0, `component contracts extractor failed with status ${contractsResult.status}\nstderr:\n${contractsResult.stderr}`);
    const graph = readJson(graphPath);
    const index = readJson(indexPath);
    const contracts = readJson(contractsPath);
    const leftTarget = graph.nodes.find((node) => node.type === "gpu-contract" && node.gpuKind === "render-target" && node.name === "leftTarget");
    const rightTarget = graph.nodes.find((node) => node.type === "gpu-contract" && node.gpuKind === "render-target" && node.name === "rightTarget");
    const rightPass = graph.nodes.find((node) => node.type === "gpu-contract" && node.gpuKind === "pass" && node.name === "right.render");
    const leftPass = graph.nodes.find((node) => node.type === "gpu-contract" && node.gpuKind === "pass" && node.name === "left.render");
    const leftRenderer = graph.nodes.find((node) => node.type === "gpu-contract" && node.gpuKind === "renderer" && node.name === "left");
    const rightRenderer = graph.nodes.find((node) => node.type === "gpu-contract" && node.gpuKind === "renderer" && node.name === "right");
    const compactGpu = contracts.evidence?.gpuContracts || {};

    assert(leftTarget && rightTarget && rightPass && leftPass && leftRenderer && rightRenderer, "expected distinct renderer, pass, and target evidence");
    assert(!graph.edges.some((edge) => edge.source === rightPass.id && edge.target === leftTarget.id && edge.type === "writes_to"), "expected right renderer not to inherit left render target");
    assert(graph.edges.some((edge) => edge.source === rightPass.id && edge.target === rightTarget.id && edge.type === "writes_to"), "expected right renderer to retain its render target");
    assert(graph.edges.some((edge) => edge.source === leftPass.id && edge.target === leftTarget.id && edge.type === "writes_to"), "expected left renderer to retain its render target");
    assert(!graph.edges.some((edge) => edge.source === rightPass.id && edge.target === leftPass.id && edge.type === "precedes"), "expected pass order not to cross renderer instances");
    for (const name of ["left", "right", "leftTarget", "rightTarget", "leftTexture", "rightTexture", "left.render", "right.render"]) {
      assert(Object.values(compactGpu).some((node) => node.name === name), `expected compact GPU identity for ${name}`);
    }
    assert(compactGpu[leftPass.id]?.rendererRef === leftRenderer.id && compactGpu[leftPass.id]?.targetRef === leftTarget.id,
      "expected compact left pass ownership refs");
    assert(compactGpu[rightPass.id]?.rendererRef === rightRenderer.id && compactGpu[rightPass.id]?.targetRef === rightTarget.id,
      "expected compact right pass ownership refs");
    assert(index.evidenceIndex?.byType?.gpuContracts?.includes(leftPass.id) && index.evidenceIndex.byType.gpuContracts.includes(rightPass.id),
      "expected distinct GPU refs to propagate through the reference index");
  });
}

function testRepeatedBlocksBecomePatterns() {
  setupV2Fixture(({ contractsPath }) => {
    assertFileExists(contractsPath, "component-contracts.json");

    const contracts = readJson(contractsPath);
    assert(Object.keys(contracts.patterns || {}).length > 0, "expected repeated card/list items to produce patterns");
    const pattern = Object.values(contracts.patterns)[0];
    assert(Array.isArray(pattern.instanceComponentRefs) && pattern.instanceComponentRefs.length >= 2, "expected pattern instances to be grouped");
    assert(Array.isArray(pattern.variantFields) && pattern.variantFields.length > 0, "expected pattern variant fields");
    assert(Object.values(pattern.sharedEvidenceRefs || {}).every((refs) => Array.isArray(refs) && refs.every((ref) => typeof ref === "string")),
      "expected shared pattern evidence to be stored by ref only");
    const instance = contracts.components?.[pattern.instanceComponentRefs[0]];
    assert(instance && instance.patternRef === pattern.id, "expected pattern instances to keep only a patternRef");
    assert(instance.rootDomRef, "expected pattern instances to retain rootDomRef");
    assert(instance.variant && Object.keys(instance.variant).length > 0, "expected pattern instances to carry variant fields");
  });
}

function testWrappedSectionKeepsRepeatedSameLineCardsAndArticleChildren() {
  withTempDir("dsra-wrapped-section-", (dir) => {
    writeFileSync(
      join(dir, "index.html"),
      '<div id="app"><section class="feature-section"><div class="card"><a class="card-link" href="/one">One</a></div><div class="card"><a class="card-link" href="/two">Two</a></div><article class="story">Story</article></section></div>',
      "utf8",
    );
    writeFileSync(
      join(dir, "styles.css"),
      [
        ".feature-section { padding: 16px; }",
        ".feature-section .card { border: 1px solid #111; }",
        ".feature-section .card-link { color: #111; }",
        ".feature-section .story { margin: 0; }",
      ].join("\n"),
      "utf8",
    );
    writeFileSync(
      join(dir, "script.js"),
      [
        'const section = document.querySelector(".feature-section");',
        'const cards = document.querySelectorAll(".card");',
        'document.querySelectorAll(".card-link").forEach((link) => link.addEventListener("click", () => section.classList.add("selected")));',
      ].join("\n"),
      "utf8",
    );

    const graphPath = join(dir, "reference-graph.json");
    const indexPath = join(dir, "reference-index.json");
    const contractsPath = join(dir, "component-contracts.json");

    const graphResult = runExtractor(dir, graphPath, 5000);
    assert(graphResult.status === 0, `reference graph extractor failed with status ${graphResult.status}\nstderr:\n${graphResult.stderr}`);
    const indexResult = runReferenceIndexExtractor(graphPath, indexPath, 5000);
    assert(indexResult.status === 0, `reference index extractor failed with status ${indexResult.status}\nstderr:\n${indexResult.stderr}`);
    const contractsResult = runComponentContractsExtractor(graphPath, contractsPath, indexPath, 5000);
    assert(contractsResult.status === 0, `component contracts extractor failed with status ${contractsResult.status}\nstderr:\n${contractsResult.stderr}`);

    const contracts = readJson(contractsPath);
    const section = findComponent(contracts, (component) => component.name === "Section");
    assert(section, "expected wrapped feature section to appear in componentTree");

    const childComponents = Object.values(contracts.components || {}).filter((component) => component.parentRef === section.id);
    const storyChild = childComponents.find((component) => component.name === "Story" || component.role === "article");
    const cardPattern = Object.values(contracts.patterns || {}).find(
      (pattern) => pattern.rootSignature === "div.card" && pattern.instanceComponentRefs?.length >= 2,
    );
    const cardChildren = (cardPattern?.instanceComponentRefs || [])
      .map((componentRef) => contracts.components?.[componentRef])
      .filter(Boolean);

    assert(cardChildren.length >= 2, "expected repeated div.card boxes as child components under Section");
    assert(cardChildren.every((component) => component.parentRef === section.id), "expected repeated div.card boxes to belong to Section");
    assert(storyChild, "expected unique article.story to remain a child component under Section");
    assert(section.childComponentRefs.includes(storyChild.id), "expected Section child refs to include the article component");

    const cardIds = new Set(cardChildren.map((component) => component.id));
    const cardRootDomRefs = new Set(cardChildren.map((component) => component.rootDomRef));
    assert(cardIds.size >= 2, "expected same-line repeated cards to keep distinct component ids");
    assert(cardRootDomRefs.size >= 2, "expected same-line repeated cards to keep distinct rootDomRefs");

    assert(cardPattern, "expected repeated div.card child components to be grouped into a pattern");
  });
}

function testJqueryEventContractsStillExtract() {
  withTempDir("dsra-jquery-", (dir) => {
    writeFileSync(
      join(dir, "index.html"),
      [
        '<button class="btn">Go</button>',
        '<ul class="list"><li class="item">One</li></ul>',
      ].join("\n"),
      "utf8",
    );
    writeFileSync(
      join(dir, "script.js"),
      [
        'const $btn = $(".btn");',
        '$btn.click(function(){ $(".item").addClass("active"); });',
        '$(".list").on("click", ".item", function(){ $(this).toggleClass("selected"); });',
      ].join("\n"),
      "utf8",
    );

    const outputPath = join(dir, "reference-graph.json");
    const result = runExtractor(dir, outputPath, 5000);
    assert(result.status === 0, `extractor failed with status ${result.status}\nstderr:\n${result.stderr}`);

    const graph = JSON.parse(readFileSync(outputPath, "utf8"));
    const events = graph.nodes.filter((node) => node.type === "event-listener");
    const mutations = graph.nodes.filter((node) => node.type === "dom-mutation");
    const selectors = graph.nodes.filter((node) => node.type === "js-selector").map((node) => node.selector);

    assert(events.some((event) => event.sourceKind === "jquery" && event.eventType === "click"), "missing direct jQuery click event");
    assert(events.some((event) => event.sourceKind === "jquery-on" && event.delegatedSelector === ".item"), "missing delegated jQuery .on event");
    assert(mutations.some((mutation) => mutation.operation === "addClass"), "missing jQuery addClass mutation");
    assert(mutations.some((mutation) => mutation.operation === "toggleClass"), "missing jQuery toggleClass mutation");
    assert(selectors.includes(".btn"), "missing .btn selector");
    assert(selectors.includes(".item"), "missing .item selector");
  });
}

const tests = [
  ["non-jquery bundle does not timeout", testNonJqueryBundleDoesNotTimeout],
  ["binary assets use metadata without text reads", testBinaryAssetsUseMetadataWithoutTextReads],
  ["dom hierarchy extracts parents, children, and depth", testDomHierarchyExtractsParentsChildrenAndDepth],
  ["reference index is compact and deduplicated by ref", testReferenceIndexIsCompactAndDeDuplicatedByRef],
  ["component contracts are v2 and keep major regions top-level", testComponentContractsAreV2AndKeepMajorRegionsTopLevel],
  ["GPU evidence is partial and never runtime ready", testGpuEvidenceIsPartialAndNeverRuntimeReady],
  ["shader ownership uses only explicit source links", testShaderOwnershipUsesOnlyExplicitSourceLinks],
  ["generic render call does not create GPU evidence", testGenericRenderCallDoesNotCreateGpuEvidence],
  ["minified member constructors and embedded shaders", testMinifiedMemberConstructorsAndEmbeddedShaders],
  ["uniform declarations handle precision lists and malformed text", testUniformDeclarationsHandlePrecisionListsAndMalformedText],
  ["getElementById canvas ownership", testGetElementByIdCanvasOwnership],
  ["explicit renderer canvas ownership does not cross-link", testExplicitRendererCanvasOwnershipDoesNotCrossLink],
  ["renderer state does not cross renderer instances", testRendererStateDoesNotCrossRendererInstances],
  ["repeated blocks become patterns", testRepeatedBlocksBecomePatterns],
  ["wrapped section keeps repeated same-line cards and article children", testWrappedSectionKeepsRepeatedSameLineCardsAndArticleChildren],
  ["jquery event contracts still extract", testJqueryEventContractsStillExtract],
];

let failures = 0;
for (const [name, fn] of tests) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`not ok - ${name}`);
    console.error(error && error.stack ? error.stack : String(error));
  }
}

if (failures > 0) {
  console.error(`${failures} regression test(s) failed`);
  process.exit(1);
}

console.log("extract-reference-graph regression tests passed");
