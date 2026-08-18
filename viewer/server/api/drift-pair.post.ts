import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { loadLibrary } from '../utils/library'
import { normalize } from '../utils/driftNormalize'
import type { DriftPairResponse } from '../../shared/types'

/**
 * Content-driven counterpart to drift-pair.get.ts: the browser supplies the
 * local file content (read from the user's picked folder), so this works in the
 * hosted app with no filesystem access to the user's install. The library side
 * is read from repoRoot (the GitHub snapshot).
 */
export default defineEventHandler(async (event): Promise<DriftPairResponse> => {
  const { repoRoot } = useRuntimeConfig(event)
  const root = resolve(repoRoot as string)

  const body = await readBody<{ name?: string; kind?: string; localPath?: string; localContent?: string }>(event)
  const name = typeof body?.name === 'string' ? body.name : ''
  const kind = body?.kind === 'SKILL' || body?.kind === 'AGENT' ? body.kind : null
  const localPath = typeof body?.localPath === 'string' ? body.localPath : ''
  const localContent = typeof body?.localContent === 'string' ? body.localContent : ''

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

  return {
    name,
    kind,
    libraryPath,
    localPath,
    libraryContent,
    localContent,
    normalizedLibrary: libraryContent === null ? null : normalize(libraryContent, { libraryNames }),
    normalizedLocal: localContent ? normalize(localContent, { libraryNames }) : '',
    isSymlink: false,
    symlinkTarget: null
  }
})
