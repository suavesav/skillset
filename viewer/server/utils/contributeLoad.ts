/**
 * Shared IO for the contribute endpoints: request guards, loading the local
 * and library versions of an item, running the conversion, and validating a
 * candidate change with scripts/validate.py against a throwaway library copy.
 */

import { readFile, mkdtemp, rm, cp, writeFile, mkdir } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import { join, resolve, dirname, sep } from 'node:path'
import type { H3Event } from 'h3'
import { loadLibrary } from './library'
import { convertToLibrary, type ConversionResult } from './contribute'
import type { ContributeRequest, FileKind } from '../../shared/types'

const execFileP = promisify(execFile)

export interface ContributionContext {
  root: string
  home: string
  request: ContributeRequest
  result: ConversionResult
  libraryContent: string | null
}

/** Validate the request body, apply path guards, load both sides, convert. */
export async function loadConversion(event: H3Event): Promise<ContributionContext> {
  const { repoRoot, claudeHome } = useRuntimeConfig(event)
  const root = resolve(repoRoot as string)
  const home = resolve(claudeHome as string)
  const body = await readBody<ContributeRequest>(event)

  const name = typeof body?.name === 'string' ? body.name : ''
  const kind = body?.kind === 'SKILL' || body?.kind === 'AGENT' ? body.kind : null
  const localRel = typeof body?.localPath === 'string' ? body.localPath : ''
  if (!name || !kind || !localRel) {
    throw createError({ statusCode: 400, statusMessage: 'name, kind, and localPath are required' })
  }

  let localContent: string
  if (typeof body?.localContent === 'string') {
    // Browser-supplied content (hosted app) — no filesystem read.
    localContent = body.localContent
  } else {
    // Local dev: read the server's own ~/.claude.
    const localAbs = resolve(join(home, localRel))
    // Use `sep` so the guard holds on Windows too (matches drift-pair.get.ts).
    if (!localAbs.startsWith(home + sep) && localAbs !== home) {
      throw createError({ statusCode: 400, statusMessage: 'invalid localPath' })
    }
    try {
      localContent = await readFile(localAbs, 'utf-8')
    } catch {
      throw createError({ statusCode: 404, statusMessage: `local not found: ${localRel}` })
    }
  }

  const library = await loadLibrary(root)
  const libraryKinds = new Map<string, FileKind>(library.map((f) => [f.name, f.kind]))
  const libEntry = library.find((f) => f.name === name && f.kind === kind)

  let libraryContent: string | null = null
  if (libEntry) {
    try {
      libraryContent = await readFile(join(root, libEntry.path), 'utf-8')
    } catch {
      libraryContent = null
    }
  }

  const overrides = body?.overrides
  const submitter = typeof body?.submitter === 'string' ? body.submitter : undefined
  const result = convertToLibrary({ name, kind, localContent, libraryContent, libraryKinds, overrides })
  return {
    root,
    home,
    request: { name, kind, localPath: localRel, overrides, submitter },
    result,
    libraryContent
  }
}

/**
 * Run scripts/validate.py against a temp copy of the library (from `sourceRoot`)
 * with the converted file applied. Returns the ERROR lines (empty = clean).
 */
export async function validateCandidate(root: string, sourceRoot: string, result: ConversionResult): Promise<string[]> {
  const tmp = await mkdtemp(join(tmpdir(), 'skillset-validate-'))
  try {
    for (const dir of ['SKILLS', 'AGENTS', 'KNOWLEDGE']) {
      await cp(join(sourceRoot, dir), join(tmp, dir), { recursive: true })
    }
    await cp(join(sourceRoot, 'VERSION'), join(tmp, 'VERSION'))
    const target = join(tmp, result.targetPath)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, result.content, 'utf-8')
    return await runValidator(root, tmp)
  } finally {
    await rm(tmp, { recursive: true, force: true })
  }
}

/** Run the repo validator against `libRoot`; returns ERROR lines. */
export async function runValidator(root: string, libRoot: string): Promise<string[]> {
  try {
    await execFileP('python3', [join(root, 'scripts', 'validate.py'), libRoot], {
      maxBuffer: 1024 * 1024
    })
    return []
  } catch (err: any) {
    const stdout: string = err?.stdout ?? ''
    const errors = stdout
      .split('\n')
      .filter((l: string) => l.trimStart().startsWith('ERROR'))
      .map((l: string) => l.trim())
    return errors.length > 0 ? errors : [`validator failed: ${err?.message ?? 'unknown error'}`]
  }
}
