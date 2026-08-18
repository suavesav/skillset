import { readFile, lstat, readlink, realpath, readdir } from 'node:fs/promises'
import { join, resolve, sep, dirname } from 'node:path'
import { loadLibrary } from '../utils/library'
import { normalize } from '../utils/driftNormalize'
import type { DriftPairResponse } from '../../shared/types'

export default defineEventHandler(async (event): Promise<DriftPairResponse> => {
  const { repoRoot, claudeHome } = useRuntimeConfig(event)
  const root = resolve(repoRoot as string)
  const home = resolve(claudeHome as string)
  const q = getQuery(event)

  const name = typeof q.name === 'string' ? q.name : ''
  const kind = q.kind === 'SKILL' || q.kind === 'AGENT' ? q.kind : null
  const localRel = typeof q.localPath === 'string' ? q.localPath : ''

  if (!name || !kind) {
    throw createError({ statusCode: 400, statusMessage: 'name is required and kind must be SKILL or AGENT' })
  }

  const library = await loadLibrary(root)
  const libraryNames = new Set(library.map((f) => f.name))
  const libEntry = library.find((f) => f.name === name && f.kind === kind)

  let libraryContent: string | null = null
  let libraryPath: string | null = null
  if (libEntry) {
    libraryPath = libEntry.path
    try {
      libraryContent = await readFile(join(root, libEntry.path), 'utf-8')
    } catch {
      libraryContent = null
    }
  }

  let localContent = ''
  let isSymlink = false
  let symlinkTarget: string | null = null

  if (localRel) {
    const localAbs = resolve(join(home, localRel))
    // String-level guard first (catches ".."), using sep so it holds on Windows.
    if (!localAbs.startsWith(home + sep) && localAbs !== home) {
      throw createError({ statusCode: 400, statusMessage: 'invalid localPath' })
    }
    try {
      const st = await lstat(localAbs)
      isSymlink = st.isSymbolicLink()
      if (isSymlink) {
        try { symlinkTarget = await realpath(localAbs) } catch { symlinkTarget = await readlink(localAbs) }
      } else {
        // The file itself isn't a link, but its containing skill/agent folder
        // might be (e.g. skills/lavish → ~/.agents/skills/lavish), so the folder
        // is the shortcut even though SKILL.md reads as a regular file.
        const parent = dirname(localAbs)
        const parentStat = await lstat(parent).catch(() => null)
        if (parentStat?.isSymbolicLink()) {
          isSymlink = true
          try { symlinkTarget = await realpath(parent) } catch { symlinkTarget = await readlink(parent) }
        }
      }
      // Follow symlinks safely: resolve the real target and require it to stay
      // inside the claude home OR the library repo. Synced installs legitimately
      // symlink into the repo, so home alone is too strict. A symlink that
      // escapes both (e.g. a bundled skill linked out to ~/.agents) is reported
      // as a shortcut — the UI explains it — but its contents are not read.
      const [realTarget, realHome, realRoot] = await Promise.all([
        realpath(localAbs), realpath(home), realpath(root)
      ])
      const inHome = realTarget === realHome || realTarget.startsWith(realHome + sep)
      const inRepo = realTarget === realRoot || realTarget.startsWith(realRoot + sep)
      if (inHome || inRepo) {
        const target = isSymlink ? await safeStat(localAbs) : st
        if (target?.isDirectory()) {
          localContent = await renderDirectory(localAbs, localRel)
        } else {
          localContent = await readFile(localAbs, 'utf-8')
        }
      } else if (!isSymlink) {
        // A non-symlink path that resolves outside the roots is a real traversal
        // attempt (e.g. an embedded ".."), not a shortcut — reject it.
        throw createError({ statusCode: 400, statusMessage: 'localPath resolves outside allowed roots' })
      }
    } catch (err: any) {
      if (err?.statusCode) throw err
      localContent = ''
    }
  }

  return {
    name,
    kind,
    libraryPath,
    localPath: localRel,
    libraryContent,
    localContent,
    normalizedLibrary: libraryContent === null ? null : normalize(libraryContent, { libraryNames }),
    normalizedLocal: localContent ? normalize(localContent, { libraryNames }) : '',
    isSymlink,
    symlinkTarget
  }
})

async function safeStat(p: string) {
  try {
    const { stat } = await import('node:fs/promises')
    return await stat(p)
  } catch {
    return null
  }
}

async function renderDirectory(absDir: string, relDir: string): Promise<string> {
  const lines: string[] = [`# ${relDir.replace(/\/$/, '')}/`, '', 'Local-only directory. Contents:', '']
  async function walk(dir: string, depth: number) {
    if (depth > 4) return
    let entries: string[] = []
    try { entries = await readdir(dir) } catch { return }
    entries.sort()
    for (const name of entries) {
      if (name.startsWith('.')) continue
      const abs = join(dir, name)
      let st
      try { st = await lstat(abs) } catch { continue }
      const indent = '  '.repeat(depth)
      if (st.isDirectory()) {
        lines.push(`${indent}${name}/`)
        await walk(abs, depth + 1)
      } else {
        lines.push(`${indent}${name}`)
      }
    }
  }
  await walk(absDir, 0)
  return lines.join('\n') + '\n'
}
