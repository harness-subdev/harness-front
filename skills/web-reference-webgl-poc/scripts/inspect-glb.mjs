#!/usr/bin/env node

import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'

const JSON_CHUNK = 0x4e4f534a
const BIN_CHUNK = 0x004e4942
const DEFAULT_MAX_BYTES = 100 * 1024 * 1024
const MAX_FILES = 20
const MAX_METADATA_ITEMS = 5000

function usage() {
  console.error(
    'Usage: node scripts/inspect-glb.mjs [--max-bytes 104857600] <file.glb> [more.glb ...]',
  )
}

function sourceLabel(uri) {
  if (!uri) return null
  if (uri.startsWith('data:')) return '<embedded data URI>'
  return uri.length > 240 ? `${uri.slice(0, 237)}...` : uri
}

function textureSlots(material = {}) {
  const pbr = material.pbrMetallicRoughness || {}
  return {
    baseColor: pbr.baseColorTexture?.index ?? null,
    metallicRoughness: pbr.metallicRoughnessTexture?.index ?? null,
    normal: material.normalTexture?.index ?? null,
    occlusion: material.occlusionTexture?.index ?? null,
    emissive: material.emissiveTexture?.index ?? null,
  }
}

function triangleCount(mode, count) {
  if (!Number.isFinite(count)) return null
  if (mode === 4) return Math.floor(count / 3)
  if (mode === 5 || mode === 6) return Math.max(0, count - 2)
  return 0
}

function parseGlb(inputPath, maxBytes) {
  const file = resolve(inputPath)
  const fileStats = statSync(file)
  if (!fileStats.isFile()) throw new Error('input must be a regular file')
  const fileBytes = fileStats.size
  if (fileBytes > maxBytes) throw new Error(`file is ${fileBytes} bytes; limit is ${maxBytes}`)
  const bytes = readFileSync(file)
  if (bytes.length > maxBytes) {
    throw new Error(`file grew to ${bytes.length} bytes while reading; limit is ${maxBytes}`)
  }
  if (bytes.length < 20) throw new Error('file is too small to be a GLB')
  if (bytes.toString('ascii', 0, 4) !== 'glTF') throw new Error('missing glTF magic')

  const version = bytes.readUInt32LE(4)
  const declaredLength = bytes.readUInt32LE(8)
  if (version !== 2) throw new Error(`unsupported GLB version ${version}; expected 2`)
  if (declaredLength !== bytes.length) {
    throw new Error(`declared length ${declaredLength} does not equal file length ${bytes.length}`)
  }

  const chunks = []
  let json = null
  let jsonChunks = 0
  let offset = 12
  while (offset + 8 <= declaredLength) {
    const byteLength = bytes.readUInt32LE(offset)
    const type = bytes.readUInt32LE(offset + 4)
    const start = offset + 8
    const end = start + byteLength
    if (byteLength % 4 !== 0) throw new Error(`chunk at ${offset} is not 4-byte aligned`)
    if (end > declaredLength) throw new Error(`chunk at ${offset} exceeds declared length`)
    if (chunks.length === 0 && type !== JSON_CHUNK) {
      throw new Error('the first GLB chunk must be JSON')
    }

    chunks.push({
      type: type === JSON_CHUNK ? 'JSON' : type === BIN_CHUNK ? 'BIN' : `0x${type.toString(16)}`,
      byteLength,
      offset,
    })
    if (type === JSON_CHUNK) {
      jsonChunks += 1
      if (jsonChunks > 1) throw new Error('GLB contains more than one JSON chunk')
      const text = bytes.toString('utf8', start, end).replace(/[\u0000\u0020]+$/g, '')
      json = JSON.parse(text)
    }
    offset = end
  }

  if (offset !== declaredLength) {
    throw new Error(`chunk table ends at ${offset}, not declared length ${declaredLength}`)
  }
  if (!json) throw new Error('GLB has no JSON chunk')

  for (const key of [
    'scenes',
    'nodes',
    'meshes',
    'materials',
    'textures',
    'images',
    'accessors',
    'animations',
    'skins',
    'cameras',
  ]) {
    if ((json[key]?.length || 0) > MAX_METADATA_ITEMS) {
      throw new Error(`${key} count exceeds the ${MAX_METADATA_ITEMS}-item output cap`)
    }
  }
  const primitiveCount = (json.meshes || []).reduce(
    (sum, mesh) => sum + (mesh.primitives?.length || 0),
    0,
  )
  if (primitiveCount > MAX_METADATA_ITEMS) {
    throw new Error(`primitive count exceeds the ${MAX_METADATA_ITEMS}-item output cap`)
  }

  const accessors = json.accessors || []
  const meshes = (json.meshes || []).map((mesh, meshIndex) => ({
    index: meshIndex,
    name: mesh.name || null,
    primitives: (mesh.primitives || []).map((primitive, primitiveIndex) => {
      const positionAccessorIndex = primitive.attributes?.POSITION
      const positionAccessor = Number.isInteger(positionAccessorIndex)
        ? accessors[positionAccessorIndex]
        : null
      const indexAccessor = Number.isInteger(primitive.indices)
        ? accessors[primitive.indices]
        : null
      return {
        index: primitiveIndex,
        mode: primitive.mode ?? 4,
        material: primitive.material ?? null,
        attributes: primitive.attributes || {},
        vertexCount: positionAccessor?.count ?? null,
        indexCount: indexAccessor?.count ?? null,
        triangleCount: triangleCount(
          primitive.mode ?? 4,
          indexAccessor?.count ?? positionAccessor?.count ?? null,
        ),
        positionBounds: positionAccessor
          ? { min: positionAccessor.min ?? null, max: positionAccessor.max ?? null }
          : null,
        draco: primitive.extensions?.KHR_draco_mesh_compression || null,
        extensions: Object.keys(primitive.extensions || {}),
      }
    }),
  }))

  const primitives = meshes.flatMap((mesh) => mesh.primitives)
  const positionAccessorIndices = new Set(
    (json.meshes || []).flatMap((mesh) =>
      (mesh.primitives || [])
        .map((primitive) => primitive.attributes?.POSITION)
        .filter(Number.isInteger),
    ),
  )

  return {
    schema: 'clean-room-webgl.glb-metadata/v1',
    file: inputPath,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    byteLength: bytes.length,
    declaredLength,
    trailingBytes: 0,
    version,
    chunks,
    asset: json.asset || null,
    extensionsUsed: json.extensionsUsed || [],
    extensionsRequired: json.extensionsRequired || [],
    counts: {
      scenes: json.scenes?.length || 0,
      nodes: json.nodes?.length || 0,
      meshes: json.meshes?.length || 0,
      primitives: meshes.reduce((sum, mesh) => sum + mesh.primitives.length, 0),
      materials: json.materials?.length || 0,
      textures: json.textures?.length || 0,
      images: json.images?.length || 0,
      accessors: accessors.length,
      animations: json.animations?.length || 0,
      skins: json.skins?.length || 0,
      cameras: json.cameras?.length || 0,
    },
    geometry: {
      countSource: 'accessor metadata; compressed payloads are not decoded',
      primitiveVertices: primitives.reduce(
        (sum, primitive) => sum + (primitive.vertexCount || 0),
        0,
      ),
      uniquePositionAccessorVertices: [...positionAccessorIndices].reduce(
        (sum, accessorIndex) => sum + (accessors[accessorIndex]?.count || 0),
        0,
      ),
      indices: primitives.reduce((sum, primitive) => sum + (primitive.indexCount || 0), 0),
      triangles: primitives.reduce((sum, primitive) => sum + (primitive.triangleCount || 0), 0),
    },
    scenes: (json.scenes || []).map((scene, index) => ({
      index,
      name: scene.name || null,
      nodes: scene.nodes || [],
    })),
    nodes: (json.nodes || []).map((node, index) => ({
      index,
      name: node.name || null,
      mesh: node.mesh ?? null,
      children: node.children || [],
      translation: node.translation || null,
      rotation: node.rotation || null,
      scale: node.scale || null,
      matrix: node.matrix || null,
    })),
    meshes,
    materials: (json.materials || []).map((material, index) => ({
      index,
      name: material.name || null,
      alphaMode: material.alphaMode || 'OPAQUE',
      doubleSided: Boolean(material.doubleSided),
      textureSlots: textureSlots(material),
      extensions: Object.keys(material.extensions || {}),
    })),
    textures: (json.textures || []).map((texture, index) => ({
      index,
      name: texture.name || null,
      source: texture.source ?? null,
      sampler: texture.sampler ?? null,
      extensions: texture.extensions || null,
    })),
    images: (json.images || []).map((image, index) => ({
      index,
      name: image.name || null,
      mimeType: image.mimeType || null,
      uri: sourceLabel(image.uri),
      bufferView: image.bufferView ?? null,
    })),
  }
}

const args = process.argv.slice(2)
const inputs = []
let maxBytes = DEFAULT_MAX_BYTES
let help = false
for (let index = 0; index < args.length; index += 1) {
  const argument = args[index]
  if (argument === '--max-bytes') {
    maxBytes = Number(args[index + 1])
    index += 1
  } else if (argument === '-h' || argument === '--help') {
    help = true
  } else if (argument.startsWith('-')) {
    console.error(`inspect-glb: unknown option: ${argument}`)
    usage()
    process.exit(2)
  } else {
    inputs.push(argument)
  }
}

if (help || inputs.length === 0) {
  usage()
  process.exitCode = help ? 0 : 2
} else {
  if (inputs.length > MAX_FILES) {
    console.error(`inspect-glb: at most ${MAX_FILES} files are allowed`)
    process.exit(2)
  }
  if (!Number.isInteger(maxBytes) || maxBytes < 20 || maxBytes > 1024 * 1024 * 1024) {
    console.error('inspect-glb: --max-bytes must be an integer from 20 to 1073741824')
    process.exit(2)
  }
  const results = []
  for (const input of inputs) {
    try {
      results.push(parseGlb(input, maxBytes))
    } catch (error) {
      console.error(`${input}: ${error instanceof Error ? error.message : String(error)}`)
      process.exitCode = 1
    }
  }
  if (results.length > 0) {
    console.log(JSON.stringify(inputs.length === 1 ? results[0] : results, null, 2))
  }
}
