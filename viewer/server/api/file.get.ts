import { readFile, realpath, stat } from 'node:fs/promises'
import { join, normalize, resolve, sep } from 'node:path'

export default defineEventHandler(async (event) => {
  const { repoRoot } = useRuntimeConfig(event)
  const query = getQuery(event)
  const rel = typeof query.path === 'string' ? query.path : ''
  if (!rel || rel === '.' || rel === './') {
    throw createError({ statusCode: 400, statusMessage: 'path query param required' })
  }

  // Allowlist: only library markdown is viewable. Keeps .git/config, .env,
  // and local/ overrides unreadable even though they live under the repo root.
  const norm = normalize(rel)
  if (!/^(SKILLS|AGENTS|KNOWLEDGE)\//.test(norm) || !norm.endsWith('.md')) {
    throw createError({ statusCode: 400, statusMessage: 'invalid path' })
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
