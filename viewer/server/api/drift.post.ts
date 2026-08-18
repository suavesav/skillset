import { loadLibrary } from '../utils/library'
import { computeDriftFromFiles, type LocalFileInput } from '../utils/driftFromFiles'
import type { DriftResponse } from '../../shared/types'

/**
 * Content-driven drift: the browser reads the user's local skills folder and
 * POSTs the file contents here, so this works in the hosted app where the
 * server has no access to the user's ~/.claude. The library side is read from
 * repoRoot (the GitHub snapshot). See drift.get.ts for the local-dev path that
 * reads the server's own ~/.claude.
 */
export default defineEventHandler(async (event): Promise<DriftResponse> => {
  const { repoRoot } = useRuntimeConfig(event)
  const root = repoRoot as string

  const body = await readBody<{ files?: LocalFileInput[] }>(event)
  const files = Array.isArray(body?.files) ? body.files : []
  if (!files.every((f) => typeof f?.path === 'string' && typeof f?.content === 'string')) {
    throw createError({ statusCode: 400, statusMessage: 'files must be [{ path, content }]' })
  }

  const library = await loadLibrary(root)
  const items = await computeDriftFromFiles(files, library, root)
  return { items }
})
