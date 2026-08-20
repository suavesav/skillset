import { readFile, realpath, stat } from 'node:fs/promises'
import { join, normalize, resolve, sep } from 'node:path'
import { loadLibrary } from '../utils/library'
import { projectionOf } from '../utils/projectionCache'
import { PLATFORMS, type Platform } from '../../shared/types'

/**
 * Sources a platform's projection actually names — every `sourcePath` plus every
 * entry in an `inputs` list. Authorizing against this rather than a `platforms/`
 * prefix keeps unrelated platform scripts and configuration unreadable, and it
 * admits build inputs like VERSION that are not library files.
 */
async function projectionSources(repoRoot: string, platform: Platform): Promise<Set<string>> {
  const files = await loadLibrary(repoRoot)
  const { entries } = await projectionOf(platform, repoRoot, files)
  const out = new Set<string>()
  for (const e of entries) {
    if (e.sourcePath) out.add(e.sourcePath)
    for (const i of e.inputs ?? []) out.add(i)
  }
  return out
}

export default defineEventHandler(async (event) => {
  const { repoRoot } = useRuntimeConfig(event)
  const query = getQuery(event)
  const rel = typeof query.path === 'string' ? query.path : ''
  const platform = typeof query.platform === 'string' ? (query.platform as Platform) : null
  if (!rel || rel === '.' || rel === './') {
    throw createError({ statusCode: 400, statusMessage: 'path query param required' })
  }

  // Allowlist. Library markdown is always readable. Anything else must be named
  // as a source by the projection the caller is looking at — .git/config, .env,
  // local/ overrides and unrelated platform files stay unreachable.
  const norm = normalize(rel)
  const isLibrary = /^(SKILLS|AGENTS|KNOWLEDGE)\//.test(norm) && norm.endsWith('.md')
  if (!isLibrary) {
    if (!platform || !PLATFORMS.includes(platform) || platform === 'raw') {
      throw createError({ statusCode: 400, statusMessage: 'invalid path' })
    }
    const sources = await projectionSources(repoRoot as string, platform)
    if (!sources.has(norm)) {
      throw createError({ statusCode: 400, statusMessage: 'invalid path' })
    }
  }

  const root = resolve(repoRoot as string)
  const fullPath = resolve(join(root, norm))
  // String-level guard first (catches "..") before touching the filesystem.
  if (!fullPath.startsWith(root + sep) && fullPath !== root) {
    throw createError({ statusCode: 400, statusMessage: 'invalid path' })
  }

  let realRoot: string
  let realFull: string
  try {
    realRoot = await realpath(root)
    realFull = await realpath(fullPath)
  } catch {
    throw createError({ statusCode: 404, statusMessage: `not found: ${rel}` })
  }
  // Follow symlinks: reject anything that resolves outside the real repo root.
  if (!realFull.startsWith(realRoot + sep) && realFull !== realRoot) {
    throw createError({ statusCode: 400, statusMessage: 'invalid path' })
  }

  try {
    const st = await stat(realFull)
    if (!st.isFile()) {
      throw createError({ statusCode: 400, statusMessage: 'not a file' })
    }
    const content = await readFile(realFull, 'utf-8')
    return { path: rel, content }
  } catch (err: any) {
    if (err?.statusCode) throw err
    throw createError({ statusCode: 404, statusMessage: `not found: ${rel}` })
  }
})
