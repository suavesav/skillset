import { createHash } from 'node:crypto'
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { emitAll, project, type EmittedFile } from './projections'
import type { LibraryFile, Platform, ProjectionEntry } from '../../shared/types'

/** Directories whose contents can change what a projection reports. */
const WATCHED = ['SKILLS', 'AGENTS', 'KNOWLEDGE', 'ASSETS', 'platforms']

async function statTree(dir: string, h: ReturnType<typeof createHash>) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = join(dir, e.name)
    if (e.isDirectory()) {
      await statTree(full, h)
      continue
    }
    try {
      const st = await stat(full)
      h.update(`${full}\0${st.size}\0${st.mtimeMs}\n`)
    } catch {
      // Raced with a delete; the next request re-reads anyway.
    }
  }
}

/**
 * Revision of everything a projection depends on. Size + mtime rather than a
 * digest of parsed content, which missed same-length `[[link]]` swaps,
 * frontmatter, and every edit under platforms/.
 */
export async function libraryRevision(repoRoot: string): Promise<string> {
  const h = createHash('sha1')
  for (const dir of WATCHED) await statTree(join(repoRoot, dir), h)
  return h.digest('hex')
}

/** Per-platform memo. claude-plugin's --list takes ~2s and has two callers. */
export function createProjectionCache<T>() {
  const entries = new Map<Platform, { rev: string; value: Promise<T> }>()
  return {
    /** Run `compute` unless this platform + revision is already in flight or done. */
    get(platform: Platform, rev: string, compute: () => Promise<T>): Promise<T> {
      const hit = entries.get(platform)
      if (hit && hit.rev === rev) return hit.value
      // The promise, not the value: concurrent callers share one bash run.
      const value = compute().catch((err) => {
        const current = entries.get(platform)
        if (current && current.value === value) entries.delete(platform) // never cache a failure
        throw err
      })
      entries.set(platform, { rev, value })
      return value
    }
  }
}

export interface CachedProjection {
  entries: ProjectionEntry[]
}

const projections = createProjectionCache<CachedProjection>()

/** Shared by every route that needs a projection. */
export async function projectionOf(
  platform: Platform,
  repoRoot: string,
  files: LibraryFile[]
): Promise<CachedProjection> {
  const rev = await libraryRevision(repoRoot)
  return projections.get(platform, rev, async () => ({
    entries: await project(platform, repoRoot, files)
  }))
}

const compiled = createProjectionCache<Map<string, EmittedFile>>()

/**
 * The whole compiled projection, from one `--emit-all`. Prerendering asks for
 * every projected file in turn; without this each one would be its own build.
 */
export async function compiledOf(
  platform: Platform,
  repoRoot: string
): Promise<Map<string, EmittedFile>> {
  const rev = await libraryRevision(repoRoot)
  return compiled.get(platform, rev, () => emitAll(platform, repoRoot))
}
