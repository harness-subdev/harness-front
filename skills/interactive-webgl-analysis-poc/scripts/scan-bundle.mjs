#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const DEFAULT_MAX_BYTES = 25 * 1024 * 1024
const MAX_FILES = 50
const MAX_NEEDLES = 20
const MAX_NEEDLE_LENGTH = 512
const MAX_SCAN_WORK_BYTES = 500 * 1024 * 1024

function usage() {
  console.error(`Usage:
  node scripts/scan-bundle.mjs --needle <literal> [--needle <literal> ...]
    [--context 400] [--max-matches 10] [--max-bytes 26214400]
    <file.js> [more files ...]`)
}

function cliError(message) {
  console.error(`scan-bundle: ${message}`)
  usage()
  process.exit(2)
}

const needles = []
const files = []
let context = 400
let maxMatches = 10
let maxBytes = DEFAULT_MAX_BYTES
let help = false

const args = process.argv.slice(2)
for (let index = 0; index < args.length; index += 1) {
  const argument = args[index]
  if (argument === '--needle') {
    const value = args[index + 1]
    if (value === undefined) cliError('--needle requires a value')
    needles.push(value)
    index += 1
  } else if (argument === '--context') {
    context = Number(args[index + 1])
    index += 1
  } else if (argument === '--max-matches') {
    maxMatches = Number(args[index + 1])
    index += 1
  } else if (argument === '--max-bytes') {
    maxBytes = Number(args[index + 1])
    index += 1
  } else if (argument === '-h' || argument === '--help') {
    help = true
  } else if (argument.startsWith('-')) {
    cliError(`unknown option: ${argument}`)
  } else {
    files.push(argument)
  }
}

if (help) {
  usage()
  process.exit(0)
}
if (needles.length === 0 || files.length === 0) cliError('at least one needle and file are required')
if (needles.length > MAX_NEEDLES) cliError(`at most ${MAX_NEEDLES} needles are allowed`)
if (files.length > MAX_FILES) cliError(`at most ${MAX_FILES} files are allowed`)
if (needles.some((needle) => needle.length === 0)) cliError('needles must not be empty')
if (needles.some((needle) => needle.length > MAX_NEEDLE_LENGTH)) {
  cliError(`needles must be at most ${MAX_NEEDLE_LENGTH} characters`)
}
if (!Number.isInteger(context) || context < 0 || context > 4000) {
  cliError('--context must be an integer from 0 to 4000')
}
if (!Number.isInteger(maxMatches) || maxMatches < 1 || maxMatches > 50) {
  cliError('--max-matches must be an integer from 1 to 50')
}
if (!Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > 200 * 1024 * 1024) {
  cliError('--max-bytes must be an integer from 1 to 209715200')
}
if (files.length * needles.length * maxMatches > 2000) {
  cliError('requested file × needle × match work exceeds the 2000-result safety cap')
}

let scanWorkBytes = 0
for (const input of files) {
  try {
    const fileStats = statSync(resolve(input))
    if (!fileStats.isFile()) cliError(`${input} must be a regular file`)
    const fileBytes = fileStats.size
    if (fileBytes > maxBytes) {
      cliError(`${input} is ${fileBytes} bytes; limit is ${maxBytes}`)
    }
    scanWorkBytes += fileBytes * needles.length
  } catch (error) {
    cliError(`${input}: ${error instanceof Error ? error.message : String(error)}`)
  }
}
if (scanWorkBytes > MAX_SCAN_WORK_BYTES) {
  cliError(`requested literal scan work exceeds ${MAX_SCAN_WORK_BYTES} bytes`)
}

const clean = (value) => value.replace(/\s+/g, ' ').trim()
const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
const results = []

for (const input of files) {
  const file = resolve(input)
  let raw
  let text
  try {
    raw = readFileSync(file)
    if (raw.length > maxBytes) {
      throw new Error(`file grew to ${raw.length} bytes while reading; limit is ${maxBytes}`)
    }
    text = decoder.decode(raw)
  } catch (error) {
    console.error(`${input}: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
    continue
  }

  const fileBytes = raw.length
  const sha256 = createHash('sha256').update(raw).digest('hex')
  for (const needle of needles) {
    const encodedNeedle = Buffer.from(needle, 'utf8')
    const matches = []
    let fromByte = 0
    let fromChar = 0
    let line = 1
    let lineStartChar = 0
    let truncated = false

    while (fromByte <= raw.length) {
      const byteAt = raw.indexOf(encodedNeedle, fromByte)
      if (byteAt === -1) break
      const between = raw.toString('utf8', fromByte, byteAt)
      const at = fromChar + between.length
      for (let index = 0; index < between.length; index += 1) {
        if (between[index] === '\n') {
          line += 1
          lineStartChar = fromChar + index + 1
        }
      }
      if (matches.length >= maxMatches) {
        truncated = true
        break
      }

      const start = Math.max(0, at - context)
      const end = Math.min(text.length, at + needle.length + context)
      matches.push({
        charOffset: at,
        byteOffset: byteAt,
        line,
        column: at - lineStartChar + 1,
        before: clean(text.slice(start, at)),
        match: text.slice(at, at + needle.length),
        after: clean(text.slice(at + needle.length, end)),
      })
      for (let index = 0; index < needle.length; index += 1) {
        if (needle[index] === '\n') {
          line += 1
          lineStartChar = at + index + 1
        }
      }
      fromByte = byteAt + encodedNeedle.length
      fromChar = at + needle.length
    }

    results.push({
      file: input,
      fileBytes,
      sha256,
      needle,
      totalMatches: truncated ? null : matches.length,
      atLeastMatches: truncated ? matches.length + 1 : matches.length,
      returnedMatches: matches.length,
      truncated,
      matches,
    })
  }
}

console.log(JSON.stringify({ context, maxMatches, maxBytes, results }, null, 2))
