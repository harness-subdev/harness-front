#!/usr/bin/env node

import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const inspectScript = join(scriptDirectory, 'inspect-glb.mjs')
const scanScript = join(scriptDirectory, 'scan-bundle.mjs')

function minimalGlb() {
  const document = {
    asset: { version: '2.0', generator: 'skill self-test' },
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, mode: 4 }] }],
    accessors: [{ count: 3, type: 'VEC3', componentType: 5126, min: [0, 0, 0], max: [1, 1, 0] }],
  }
  const raw = Buffer.from(JSON.stringify(document), 'utf8')
  const padding = Buffer.alloc((4 - (raw.length % 4)) % 4, 0x20)
  const json = Buffer.concat([raw, padding])
  const output = Buffer.alloc(20 + json.length)
  output.write('glTF', 0, 'ascii')
  output.writeUInt32LE(2, 4)
  output.writeUInt32LE(output.length, 8)
  output.writeUInt32LE(json.length, 12)
  output.writeUInt32LE(0x4e4f534a, 16)
  json.copy(output, 20)
  return output
}

test('GLB inspector reports deterministic accessor-derived geometry', () => {
  const directory = mkdtempSync(join(tmpdir(), 'webgl-skill-'))
  try {
    const file = join(directory, 'fixture.glb')
    writeFileSync(file, minimalGlb())
    const run = spawnSync(process.execPath, [inspectScript, file], { encoding: 'utf8' })
    assert.equal(run.status, 0, run.stderr)
    const result = JSON.parse(run.stdout)
    assert.equal(result.schema, 'clean-room-webgl.glb-metadata/v1')
    assert.equal(result.counts.scenes, 1)
    assert.equal(result.counts.meshes, 1)
    assert.equal(result.geometry.primitiveVertices, 3)
    assert.equal(result.geometry.triangles, 1)
    assert.match(result.sha256, /^[a-f0-9]{64}$/)
    const repeated = spawnSync(process.execPath, [inspectScript, file], { encoding: 'utf8' })
    assert.equal(repeated.status, 0, repeated.stderr)
    assert.equal(repeated.stdout, run.stdout)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('bundle scanner keeps character and UTF-8 byte offsets distinct', () => {
  const directory = mkdtempSync(join(tmpdir(), 'webgl-skill-'))
  try {
    const file = join(directory, 'fixture.js')
    writeFileSync(
      file,
      'const café = true; throw new Error("BUNDLE_EXECUTED"); const model = "rock.glb";\n',
      'utf8',
    )
    const run = spawnSync(
      process.execPath,
      [scanScript, '--needle', 'rock.glb', '--context', '20', file],
      { encoding: 'utf8' },
    )
    assert.equal(run.status, 0, run.stderr)
    const result = JSON.parse(run.stdout).results[0]
    assert.equal(result.totalMatches, 1)
    assert.equal(result.matches[0].byteOffset, result.matches[0].charOffset + 1)
    assert.equal(result.matches[0].match, 'rock.glb')
    const repeated = spawnSync(
      process.execPath,
      [scanScript, '--needle', 'rock.glb', '--context', '20', file],
      { encoding: 'utf8' },
    )
    assert.equal(repeated.stdout, run.stdout)

    const bomFile = join(directory, 'bom.js')
    writeFileSync(bomFile, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('X')]))
    const bomRun = spawnSync(
      process.execPath,
      [scanScript, '--needle', 'X', '--context', '0', bomFile],
      { encoding: 'utf8' },
    )
    assert.equal(bomRun.status, 0, bomRun.stderr)
    const bomMatch = JSON.parse(bomRun.stdout).results[0].matches[0]
    assert.equal(bomMatch.charOffset, 1)
    assert.equal(bomMatch.byteOffset, 3)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('tools reject malformed, oversized, empty, and invalid UTF-8 inputs', () => {
  const directory = mkdtempSync(join(tmpdir(), 'webgl-skill-'))
  try {
    const malformed = Buffer.concat([minimalGlb(), Buffer.alloc(4)])
    malformed.writeUInt32LE(malformed.length, 8)
    const glb = join(directory, 'malformed.glb')
    writeFileSync(glb, malformed)
    const malformedRun = spawnSync(process.execPath, [inspectScript, glb], { encoding: 'utf8' })
    assert.notEqual(malformedRun.status, 0)
    assert.match(malformedRun.stderr, /chunk table ends/)

    const text = join(directory, 'bundle.js')
    writeFileSync(text, 'needle', 'utf8')
    const emptyNeedle = spawnSync(
      process.execPath,
      [scanScript, '--needle', '', text],
      { encoding: 'utf8' },
    )
    assert.equal(emptyNeedle.status, 2)
    assert.match(emptyNeedle.stderr, /must not be empty/)

    const oversized = spawnSync(
      process.execPath,
      [scanScript, '--needle', 'needle', '--max-bytes', '4', text],
      { encoding: 'utf8' },
    )
    assert.equal(oversized.status, 2)
    assert.match(oversized.stderr, /limit is 4/)

    const invalidUtf8 = join(directory, 'invalid.js')
    writeFileSync(invalidUtf8, Buffer.from([0xff, 0x58]))
    const invalid = spawnSync(
      process.execPath,
      [scanScript, '--needle', 'X', invalidUtf8],
      { encoding: 'utf8' },
    )
    assert.equal(invalid.status, 1)
    assert.match(invalid.stderr, /encoded data was not valid/)

    const nonRegularScan = spawnSync(
      process.execPath,
      [scanScript, '--needle', 'X', directory],
      { encoding: 'utf8' },
    )
    assert.equal(nonRegularScan.status, 2)
    assert.match(nonRegularScan.stderr, /regular file/)

    const nonRegularGlb = spawnSync(process.execPath, [inspectScript, directory], {
      encoding: 'utf8',
    })
    assert.equal(nonRegularGlb.status, 1)
    assert.match(nonRegularGlb.stderr, /regular file/)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
