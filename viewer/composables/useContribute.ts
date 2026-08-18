import { ref, reactive } from 'vue'
import type {
  ContributeRequest,
  ContributePreviewResponse,
  ContributeSubmitResponse
} from '../shared/types'

/**
 * Record of items already submitted (key → PR url), persisted to localStorage so
 * the "view PR" affordance survives reloads and marks rows in the drift list.
 */
const STORAGE_KEY = 'skillset:submitted-prs'

function loadSubmitted(): Map<string, string> {
  if (typeof window === 'undefined') return new Map()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? new Map(Object.entries(JSON.parse(raw) as Record<string, string>)) : new Map()
  } catch {
    return new Map()
  }
}

const submitted = reactive(loadSubmitted())

function persistSubmitted() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(submitted)))
  } catch {}
}

export function useContribute() {
  const pending = ref(false)
  const error = ref<string | null>(null)

  async function preview(req: ContributeRequest): Promise<ContributePreviewResponse | null> {
    pending.value = true
    error.value = null
    try {
      return await $fetch<ContributePreviewResponse>('/api/contribute/preview', {
        method: 'POST',
        body: req
      })
    } catch (e: any) {
      error.value = e?.data?.statusMessage || e?.message || 'Preview failed.'
      return null
    } finally {
      pending.value = false
    }
  }

  async function submit(req: ContributeRequest, key: string): Promise<ContributeSubmitResponse | null> {
    pending.value = true
    error.value = null
    try {
      const res = await $fetch<ContributeSubmitResponse>('/api/contribute/submit', {
        method: 'POST',
        body: req
      })
      submitted.set(key, res.prUrl)
      persistSubmitted()
      return res
    } catch (e: any) {
      const data = e?.data?.data
      if (data?.validationErrors?.length) {
        error.value = data.validationErrors.join('\n')
      } else {
        error.value = e?.data?.statusMessage || e?.message || 'Submission failed.'
      }
      return null
    } finally {
      pending.value = false
    }
  }

  return { pending, error, preview, submit, submitted }
}
