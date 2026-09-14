import { apiSearchIndex } from '../shared/api'
import { searchIndex } from '../shared/search'
import type { SearchIndexEntry, SearchIndexResponse, SearchMatch } from '../shared/types'

/**
 * The whole searchable corpus, fetched once and queried in the browser. The
 * static build has no server to query, and the index is small enough that a
 * single download beats a request per keystroke.
 */

let loading: Promise<SearchIndexEntry[]> | null = null

function ensureLoaded(): Promise<SearchIndexEntry[]> {
  if (!loading) {
    loading = $fetch<SearchIndexResponse>(apiSearchIndex())
      .then((res) => res.entries)
      .catch((err) => {
        loading = null // allow a retry on the next query
        throw err
      })
  }
  return loading
}

export function useSearchIndex() {
  async function search(q: string): Promise<SearchMatch[]> {
    try {
      return searchIndex(await ensureLoaded(), q)
    } catch {
      return []
    }
  }
  return { search }
}
