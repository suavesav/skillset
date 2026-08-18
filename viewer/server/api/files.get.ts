import { loadLibrary } from '../utils/library'

export default defineEventHandler(async (event) => {
  const { repoRoot } = useRuntimeConfig(event)
  const files = await loadLibrary(repoRoot as string)
  return { repoRoot, files }
})
