#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const outputDirectory = join(dirname(fileURLToPath(import.meta.url)), 'files')
mkdirSync(outputDirectory, { recursive: true })

function pad(buffer, byte = 0) {
  const padding = Buffer.alloc((4 - (buffer.length % 4)) % 4, byte)
  return Buffer.concat([buffer, padding])
}

function makeGlb(name, positions, indices) {
  const positionBytes = Buffer.alloc(positions.length * 4)
  positions.forEach((value, index) => positionBytes.writeFloatLE(value, index * 4))
  const indexBytes = Buffer.alloc(indices.length * 2)
  indices.forEach((value, index) => indexBytes.writeUInt16LE(value, index * 2))
  const binary = Buffer.concat([positionBytes, pad(indexBytes)])

  const xs = positions.filter((_, index) => index % 3 === 0)
  const ys = positions.filter((_, index) => index % 3 === 1)
  const zs = positions.filter((_, index) => index % 3 === 2)
  const document = {
    asset: { version: '2.0', generator: 'clean-room-webgl synthetic eval fixture' },
    scene: 0,
    scenes: [{ name: `${name} scene`, nodes: [0] }],
    nodes: [{ name, mesh: 0 }],
    meshes: [
      {
        name,
        primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0, mode: 4 }],
      },
    ],
    materials: [{ name: 'synthetic matte' }],
    buffers: [{ byteLength: binary.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positionBytes.length, target: 34962 },
      {
        buffer: 0,
        byteOffset: positionBytes.length,
        byteLength: indexBytes.length,
        target: 34963,
      },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: positions.length / 3,
        type: 'VEC3',
        min: [Math.min(...xs), Math.min(...ys), Math.min(...zs)],
        max: [Math.max(...xs), Math.max(...ys), Math.max(...zs)],
      },
      { bufferView: 1, componentType: 5123, count: indices.length, type: 'SCALAR' },
    ],
  }

  const json = pad(Buffer.from(JSON.stringify(document), 'utf8'), 0x20)
  const output = Buffer.alloc(12 + 8 + json.length + 8 + binary.length)
  output.write('glTF', 0, 'ascii')
  output.writeUInt32LE(2, 4)
  output.writeUInt32LE(output.length, 8)
  output.writeUInt32LE(json.length, 12)
  output.writeUInt32LE(0x4e4f534a, 16)
  json.copy(output, 20)
  const binHeader = 20 + json.length
  output.writeUInt32LE(binary.length, binHeader)
  output.writeUInt32LE(0x004e4942, binHeader + 4)
  binary.copy(output, binHeader + 8)
  return output
}

const lite = makeGlb(
  'synthetic-lite',
  [0, 0, 0, 1, 0, 0, 0, 1, 0],
  [0, 1, 2],
)
const full = makeGlb(
  'synthetic-full',
  [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, -1, 1, 0, -1, 0, 0],
  [0, 1, 2, 0, 2, 3, 0, 4, 5],
)

const bundle = `throw new Error("SYNTHETIC_BUNDLE_MUST_NOT_EXECUTE");
const selectedModel = useModel("/models/synthetic-mosaic-lite.glb");
preload("/models/synthetic-mosaic-lite.glb");
const sceneConfig = { id: "mosaic-model", model: "/models/synthetic-mosaic-lite.glb" };
preload("/models/synthetic-mosaic-full.glb");
`

writeFileSync(join(outputDirectory, 'synthetic-mosaic-lite.glb'), lite)
writeFileSync(join(outputDirectory, 'synthetic-mosaic-full.glb'), full)
writeFileSync(join(outputDirectory, 'synthetic-bundle.js'), bundle, 'utf8')

console.log('Synthetic eval fixtures generated.')
