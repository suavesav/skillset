import { reactive, watch } from 'vue'
import type { Platform, DiffViewMode } from '../shared/types'

export interface ViewerSettings {
  showDiff: boolean
  showGraph: boolean
  /** Files view: selected platform projection. */
  platform: Platform
  /** Diff view: drift-list "show synced/unchanged" toggle. */
  driftShowAll: boolean
  /** Diff view: normalized / raw / frontmatter. */
  diffMode: DiffViewMode
  /** Diff view: collapse unchanged runs. */
  diffChangesOnly: boolean
  /** Diff view: side-by-side vs unified. */
  diffSideBySide: boolean
}

const STORAGE_KEY = 'skillset:viewer-settings'
const DEFAULTS: ViewerSettings = {
  showDiff: false,
  showGraph: false,
  platform: 'raw',
  driftShowAll: false,
  diffMode: 'normalized',
  diffChangesOnly: true,
  diffSideBySide: false
}

let state: ViewerSettings | null = null

function load(): ViewerSettings {
  if (typeof window === 'undefined') return { ...DEFAULTS }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw)
    return { ...DEFAULTS, ...parsed }
  } catch {
    return { ...DEFAULTS }
  }
}

export function useViewerSettings() {
  if (!state) {
    state = reactive(load())
    if (typeof window !== 'undefined') {
      watch(state, (v) => {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(v))
        } catch {}
      }, { deep: true })
    }
  }
  return state
}
