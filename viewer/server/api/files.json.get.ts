import { loadLibrary } from '../utils/library'
import type { FilesResponse } from '../../shared/types'

export default defineEventHandler(async (event): Promise<FilesResponse> => {
  const { repoRoot } = useRuntimeConfig(event)
  return { files: await loadLibrary(repoRoot as string) }
})
