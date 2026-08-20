import { reactive, watch } from 'vue'
import type { Platform } from '../shared/types'

export interface ViewerSettings {
  showGraph: boolean
  /** Files view: selected platform projection. */
  platform: Platform
}

const STORAGE_KEY = 'skillset:viewer-settings'
const DEFAULTS: ViewerSettings = {
  showGraph: false,
  platform: 'raw'
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
