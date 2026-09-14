import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { loadLibrary } from '../utils/library'
import type { SearchIndexResponse } from '../../shared/types'

/** The corpus the browser searches: every library file's raw text. */
export default defineEventHandler(async (event): Promise<SearchIndexResponse> => {
  const { repoRoot } = useRuntimeConfig(event)
  const root = repoRoot as string
  const files = await loadLibrary(root)

  const entries = await Promise.all(
    files.map(async (f) => ({
      name: f.name,
      kind: f.kind,
      path: f.path,
      // An unreadable file still matches by name, as it did server-side.
      content: await readFile(join(root, f.path), 'utf-8').catch(() => '')
    }))
  )

  return { entries }
})
