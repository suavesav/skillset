import { ref } from 'vue'

/**
 * Lets the user grant read access to their local skills folder so the diff view
 * can compare their install against the GitHub library — without the (hosted)
 * server ever touching their disk. The browser reads the files; only content is
 * sent onward.
 *
 * Two mechanisms behind one interface:
 *  - Chromium: File System Access API (`showDirectoryPicker`) — richer, re-readable.
 *  - Firefox / Safari: `<input type="file" webkitdirectory>` — read-only, one-shot.
 */

export interface LocalFile {
  /** POSIX path relative to the picked folder, e.g. "skills/meta/SKILL.md". */
  path: string
  /** Lazily read the file's text. */
  read: () => Promise<string>
}

export type FolderMode = 'fs-access' | 'input' | null

/** Strip the leading root segment webkitdirectory prepends ("root/skills/x" -> "skills/x"). */
export function relativizeInputPath(webkitRelativePath: string): string {
  const parts = webkitRelativePath.split('/')
  return parts.length > 1 ? parts.slice(1).join('/') : webkitRelativePath
}

export function isMarkdown(name: string): boolean {
  return name.toLowerCase().endsWith('.md')
}

/** True when the richer File System Access API is available (Chromium). */
export function hasFsAccess(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

// Module-level singleton — the picked folder is app-global, so every caller
// (DriftList, DiffView, …) shares the same files.
const files = ref<LocalFile[]>([])
const folderName = ref<string | null>(null)
const mode = ref<FolderMode>(null)
const error = ref<string | null>(null)

export function useLocalFolder() {
  const supportsFsAccess = hasFsAccess()

  async function pickViaFsAccess() {
    // Types for the FS Access API aren't in the DOM lib yet — cast through any.
    const dir: any = await (window as any).showDirectoryPicker({ mode: 'read' })
    const out: LocalFile[] = []
    async function walk(handle: any, prefix: string) {
      for await (const [name, entry] of handle.entries()) {
        if (name.startsWith('.')) continue
        const path = prefix ? `${prefix}/${name}` : name
        if (entry.kind === 'directory') {
          await walk(entry, path)
        } else if (isMarkdown(name)) {
          out.push({ path, read: async () => (await entry.getFile()).text() })
        }
      }
    }
    await walk(dir, '')
    folderName.value = dir.name
    files.value = out
    mode.value = 'fs-access'
  }

  function pickViaInput(): Promise<void> {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.multiple = true
      // Directory picking in Firefox/Safari (and Chromium as a fallback).
      ;(input as any).webkitdirectory = true
      input.addEventListener('cancel', () => resolve())
      input.addEventListener('change', () => {
        const list = Array.from(input.files ?? [])
        if (list.length) {
          folderName.value = list[0].webkitRelativePath.split('/')[0] || null
          files.value = list
            .filter((f) => isMarkdown(f.name))
            .map((f) => ({ path: relativizeInputPath(f.webkitRelativePath), read: () => f.text() }))
          mode.value = 'input'
        }
        resolve()
      })
      input.click()
    })
  }

  async function pick() {
    error.value = null
    try {
      if (supportsFsAccess) await pickViaFsAccess()
      else await pickViaInput()
    } catch (e: any) {
      // User dismissing the picker is not an error.
      if (e?.name === 'AbortError') return
      error.value = e?.message || 'Could not read that folder.'
    }
  }

  function clear() {
    files.value = []
    folderName.value = null
    mode.value = null
    error.value = null
  }

  return { files, folderName, mode, error, supportsFsAccess, pick, clear }
}
