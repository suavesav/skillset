import { loadConversion, validateCandidate } from '../../utils/contributeLoad'
import { assertSameOrigin } from '../../utils/submitGuard'
import type { ContributePreviewResponse } from '../../../shared/types'

export default defineEventHandler(async (event): Promise<ContributePreviewResponse> => {
  // Preview spawns the Python validator against a temp copy of the library, so
  // it is worth the same cross-site guard as submit (no rate limit — it opens
  // nothing on GitHub).
  assertSameOrigin(event)

  const { root, result, libraryContent } = await loadConversion(event)
  const validationErrors = await validateCandidate(root, root, result)

  return {
    name: result.name,
    kind: result.kind,
    isNew: result.isNew,
    targetPath: result.targetPath,
    converted: result.content,
    libraryContent,
    description: result.description,
    validationErrors
  }
})
