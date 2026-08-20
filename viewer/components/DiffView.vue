<template>
  <section class="diff-view">
    <div v-if="!selection" class="empty">Select a row on the left to view its diff.</div>
    <template v-else>
      <header class="head">
        <div class="title">
          <span class="kind" :class="selection.item.kind.toLowerCase()">{{ selection.item.kind[0] }}</span>
          <span class="name">{{ selection.item.name }}</span>
          <span v-if="selection.location" class="path">{{ selection.location.localPath }}</span>
          <span v-if="selection.item.libraryPath" class="path">↔ {{ selection.item.libraryPath }}</span>
        </div>
        <div class="controls">
          <template v-if="!singleFile">
            <select v-model="mode" class="ctrl">
              <option value="normalized">normalized</option>
              <option value="raw">raw</option>
              <option value="frontmatter">frontmatter</option>
            </select>
            <button class="ctrl" :class="{ on: changesOnly }" @click="changesOnly = !changesOnly" title="Collapse long runs of unchanged lines">
              <span class="box">{{ changesOnly ? '☑' : '☐' }}</span> Changes only
            </button>
            <button class="ctrl" :class="{ on: sideBySide }" @click="sideBySide = !sideBySide">
              {{ sideBySide ? 'side-by-side' : 'unified' }}
            </button>
          </template>
        </div>
      </header>

      <div v-if="pending" class="status">Loading…</div>
      <div v-else-if="error" class="status err">{{ error }}</div>
      <div v-else-if="symlink" class="status info symlink-note">
        <p v-if="symlink.syncedToLibrary">
          🔗 <strong>Linked to the library.</strong> This {{ kindWord }} is a shortcut pointing straight at the shared library copy<template v-if="symlink.target"> (<code>{{ symlink.target }}</code>)</template>, so it always stays in sync — there is nothing to compare.
        </p>
        <p v-else>
          🔗 <strong>This is a shortcut.</strong> The “{{ selection.item.name }}” {{ kindWord }} isn't kept in your skills folder — it links to another folder on your computer<template v-if="symlink.target"> (<code>{{ symlink.target }}</code>)</template>. You're seeing a reference to it, not your own copy.
        </p>
      </div>
      <div v-else-if="!pair" class="status">No comparison available.</div>
      <div v-else-if="singleFile" class="single-file">
        <div class="single-header">
          <span class="single-tag" :class="singleFile.label">{{ singleFile.label === 'library' ? 'library-only' : 'local-only' }}</span>
          <span class="path">{{ singleFile.path }}</span>
        </div>
        <pre class="single-body">{{ singleFile.content }}</pre>
      </div>
      <div v-else-if="!visibleRows.length" class="status info">
        Files are identical{{ mode === 'normalized' ? ' after normalization' : '' }}.
      </div>
      <div v-else class="diff-body">
        <template v-if="!sideBySide">
          <div
            v-for="(row, i) in visibleRows"
            :key="i"
            class="line"
            :class="row.kind === 'gap' ? 'gap' : rowClass(row)"
          >
            <template v-if="row.kind === 'gap'">
              <span class="marker">⋯</span>
              <span class="gap-label">{{ row.skipped }} unchanged line{{ row.skipped === 1 ? '' : 's' }}</span>
            </template>
            <template v-else>
              <span class="marker">{{ unifiedMarker(row) }}</span>
              <pre>{{ row.left ?? row.right ?? '' }}</pre>
            </template>
          </div>
        </template>
        <template v-else>
          <div class="sbs-header">
            <div class="sbs-cell sbs-label">library</div>
            <div class="sbs-cell sbs-label">local</div>
          </div>
          <div
            v-for="(row, i) in visibleRows"
            :key="i"
            class="sbs-row"
            :class="row.kind === 'gap' ? 'gap' : ''"
          >
            <template v-if="row.kind === 'gap'">
              <div class="sbs-cell gap-cell" colspan="2">
                <span class="marker">⋯</span>
                <span class="gap-label">{{ row.skipped }} unchanged line{{ row.skipped === 1 ? '' : 's' }}</span>
              </div>
            </template>
            <template v-else>
              <div class="sbs-cell" :class="leftClass(row)">
                <span class="marker">{{ leftMarker(row) }}</span>
                <pre>{{ row.left ?? '' }}</pre>
              </div>
              <div class="sbs-cell" :class="rightClass(row)">
                <span class="marker">{{ rightMarker(row) }}</span>
                <pre>{{ row.right ?? '' }}</pre>
              </div>
            </template>
          </div>
        </template>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch, toRefs } from 'vue'
import { diffLines, type Change } from 'diff'
import type { DriftPairResponse } from '../shared/types'
import type { DriftSelection } from './DriftList.vue'
import { useLocalFolder } from '../composables/useLocalFolder'
import { useViewerSettings } from '../composables/useViewerSettings'

const props = defineProps<{ selection: DriftSelection | null }>()

const { files: localFiles } = useLocalFolder()

// Persisted diff prefs, exposed as refs so the rest of the component is unchanged.
const settings = useViewerSettings()
const { diffMode: mode, diffChangesOnly: changesOnly, diffSideBySide: sideBySide } = toRefs(settings)
const pair = ref<DriftPairResponse | null>(null)
const pending = ref(false)
const error = ref<string | null>(null)

type DiffRow =
  | { kind: 'unchanged' | 'added' | 'removed' | 'change'; left: string | null; right: string | null }
  | { kind: 'gap'; skipped: number; left: null; right: null }

// A skill/agent installed as a symlink: either linked into the library (synced)
// or a shortcut to a folder elsewhere on the user's machine (local-only). Either
// way there's no local copy to diff — we explain it in plain language instead.
const symlink = computed(() => {
  const loc = props.selection?.location
  if (!loc?.isSymlink) return null
  return {
    syncedToLibrary: loc.status === 'synced',
    target: pair.value?.symlinkTarget ?? null
  }
})
const kindWord = computed(() => (props.selection?.item.kind === 'AGENT' ? 'agent' : 'skill'))

async function loadPair() {
  const sel = props.selection
  pair.value = null
  error.value = null
  if (!sel) return
  pending.value = true
  try {
    const localRel = sel.location?.localPath ?? ''
    if (localFiles.value.length) {
      // Folder picked: send the browser-read content (works in the hosted app).
      const local = localFiles.value.find((f) => f.path === localRel)
      const localContent = local ? await local.read() : ''
      pair.value = await $fetch<DriftPairResponse>('/api/drift-pair', {
        method: 'POST',
        body: { name: sel.item.name, kind: sel.item.kind, localPath: localRel, localContent }
      })
    } else {
      // No folder: read the server's own ~/.claude (local dev).
      const params = new URLSearchParams({ name: sel.item.name, kind: sel.item.kind, localPath: localRel })
      pair.value = await $fetch<DriftPairResponse>(`/api/drift-pair?${params}`)
    }
  } catch (e: any) {
    error.value = e?.message || 'Failed to load file.'
  } finally {
    pending.value = false
  }
}

// Reload on selection change *and* when the picked local folder changes — picking
// or clearing a folder swaps which side the local content comes from, so a stale
// pair would keep showing the previous source until the user reselected.
watch([() => props.selection, localFiles], loadPair, { immediate: true })

const singleFile = computed(() => {
  if (!pair.value) return null
  const lib = pair.value.libraryContent
  const loc = pair.value.localContent
  if (lib !== null && !loc) {
    return { label: 'library', path: pair.value.libraryPath, content: lib }
  }
  if (loc && lib === null) {
    return { label: 'local', path: pair.value.localPath, content: loc }
  }
  return null
})

const leftText = computed(() => {
  if (!pair.value) return ''
  if (mode.value === 'raw') return pair.value.libraryContent || ''
  if (mode.value === 'frontmatter') return extractFrontmatter(pair.value.libraryContent || '')
  return pair.value.normalizedLibrary || ''
})

const rightText = computed(() => {
  if (!pair.value) return ''
  if (mode.value === 'raw') return pair.value.localContent
  if (mode.value === 'frontmatter') return extractFrontmatter(pair.value.localContent)
  return pair.value.normalizedLocal
})

const rows = computed<DiffRow[]>(() => {
  if (!pair.value) return []
  return buildRows(diffLines(leftText.value, rightText.value))
})

const CONTEXT = 2

const visibleRows = computed<DiffRow[]>(() => {
  if (!changesOnly.value) return rows.value
  const out: DiffRow[] = []
  const r = rows.value
  // Mark which rows are "interesting" (in or near a change)
  const keep = new Array(r.length).fill(false)
  for (let i = 0; i < r.length; i++) {
    if (r[i].kind !== 'unchanged') {
      for (let j = Math.max(0, i - CONTEXT); j <= Math.min(r.length - 1, i + CONTEXT); j++) {
        keep[j] = true
      }
    }
  }
  let skipped = 0
  for (let i = 0; i < r.length; i++) {
    if (keep[i]) {
      if (skipped > 0) {
        out.push({ kind: 'gap', skipped, left: null, right: null })
        skipped = 0
      }
      out.push(r[i])
    } else {
      skipped++
    }
  }
  if (skipped > 0) out.push({ kind: 'gap', skipped, left: null, right: null })
  return out
})

function buildRows(changes: Change[]): DiffRow[] {
  const rows: DiffRow[] = []
  for (let i = 0; i < changes.length; i++) {
    const c = changes[i]
    if (c.removed && i + 1 < changes.length && changes[i + 1].added) {
      const next = changes[i + 1]
      const a = splitLines(c.value)
      const b = splitLines(next.value)
      const max = Math.max(a.length, b.length)
      for (let j = 0; j < max; j++) {
        const left = a[j] ?? null
        const right = b[j] ?? null
        if (left !== null && right !== null) {
          rows.push({ kind: 'change', left, right })
        } else if (left !== null) {
          rows.push({ kind: 'removed', left, right: null })
        } else {
          rows.push({ kind: 'added', left: null, right })
        }
      }
      i++
    } else if (c.removed) {
      for (const ln of splitLines(c.value)) rows.push({ kind: 'removed', left: ln, right: null })
    } else if (c.added) {
      for (const ln of splitLines(c.value)) rows.push({ kind: 'added', left: null, right: ln })
    } else {
      for (const ln of splitLines(c.value)) rows.push({ kind: 'unchanged', left: ln, right: ln })
    }
  }
  return rows
}

function splitLines(s: string): string[] {
  if (s === '') return []
  const lines = s.split('\n')
  if (lines[lines.length - 1] === '') lines.pop()
  return lines
}

function unifiedMarker(row: DiffRow): string {
  if (row.kind === 'added') return '+'
  if (row.kind === 'removed') return '-'
  if (row.kind === 'change') return '±'
  return ' '
}

function rowClass(row: DiffRow): string {
  return row.kind
}

function leftClass(row: DiffRow): string {
  if (row.kind === 'removed' || row.kind === 'change') return 'removed'
  if (row.kind === 'added') return 'empty'
  return 'unchanged'
}
function rightClass(row: DiffRow): string {
  if (row.kind === 'added' || row.kind === 'change') return 'added'
  if (row.kind === 'removed') return 'empty'
  return 'unchanged'
}
function leftMarker(row: DiffRow): string {
  if (row.kind === 'removed' || row.kind === 'change') return '-'
  if (row.kind === 'added') return ''
  return ' '
}
function rightMarker(row: DiffRow): string {
  if (row.kind === 'added' || row.kind === 'change') return '+'
  if (row.kind === 'removed') return ''
  return ' '
}

function extractFrontmatter(text: string): string {
  const m = text.match(/^---\n[\s\S]*?\n---\n?/)
  return m ? m[0] : '(no frontmatter)'
}
</script>

<style scoped>
.diff-view { flex: 1; min-width: 0; display: flex; flex-direction: column; background: var(--r-surface); overflow: hidden; }
.empty { color: var(--r-muted); padding: var(--r-7); text-align: center; }
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px;
  border-bottom: 1px solid var(--r-line);
  background: var(--r-surface-2);
  gap: var(--r-3);
  flex-shrink: 0;
}
.title { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; }
.kind { width: 16px; height: 16px; border-radius: 3px; text-align: center; font-size: 10px; font-weight: bold; line-height: 16px; flex-shrink: 0; }
.kind.skill { background: var(--r-pine); color: #fff; }
.kind.agent { background: var(--r-violet); color: var(--r-ink); }
.name { font-family: var(--r-mono); font-size: 13px; color: var(--r-ink); }
.path { font-family: var(--r-mono); font-size: 11px; color: var(--r-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.controls { display: flex; gap: 6px; flex-shrink: 0; }
.ctrl {
  background: var(--r-surface);
  color: var(--r-ink-2);
  border: 1px solid var(--r-line);
  border-radius: var(--r-radius-sm);
  padding: 4px 10px;
  font-size: 11px;
  cursor: pointer;
  font-family: var(--r-mono);
  transition: border-color var(--r-dur) var(--r-ease);
}
.ctrl:hover { border-color: var(--r-pine); }
.ctrl.on { background: var(--r-pine); color: #fff; border-color: var(--r-pine); }
.ctrl .box { font-family: var(--r-font); margin-right: 1px; }
.status { padding: var(--r-6); color: var(--r-ink-2); font-size: 13px; }
.status.err { color: var(--r-del); }
.status.info { color: var(--r-ink-2); }
.symlink-note p { margin: 0; line-height: 1.65; max-width: 64ch; }
.symlink-note code { word-break: break-all; }
.diff-body { flex: 1; overflow: auto; padding: var(--r-2) 0; font-family: var(--r-mono); font-size: 12px; line-height: 1.55; }

/* Unified */
.line { display: flex; }
.line .marker { width: 24px; flex-shrink: 0; text-align: center; color: var(--r-muted); padding-top: 0; }
.line pre { flex: 1; margin: 0; padding: 0 8px; background: transparent; white-space: pre-wrap; word-break: break-word; color: var(--r-ink); }
.line.added { background: var(--r-add-bg); }
.line.added .marker { color: var(--r-add); }
.line.removed { background: var(--r-del-bg); }
.line.removed .marker { color: var(--r-del); }
.line.change { background: var(--r-chg-bg); }
.line.change .marker { color: var(--r-chg); }
.line.unchanged .marker { color: var(--r-line); }

/* Gap */
.line.gap, .sbs-row.gap { background: var(--r-surface-2); color: var(--r-muted); font-style: italic; padding: 2px 0; border-top: 1px dashed var(--r-line); border-bottom: 1px dashed var(--r-line); }
.gap-cell { display: flex; align-items: center; flex: 1; padding: 0 12px; }
.gap-label { padding: 0 10px; }

/* Side-by-side */
.sbs-header, .sbs-row { display: flex; gap: 1px; }
.sbs-header { position: sticky; top: 0; background: var(--r-surface-2); z-index: 1; border-bottom: 1px solid var(--r-line); }
.sbs-cell { flex: 1; min-width: 0; display: flex; padding: 0; background: var(--r-surface); }
.sbs-cell.sbs-label { padding: 6px 12px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--r-muted); }
.sbs-cell .marker { width: 18px; flex-shrink: 0; text-align: center; color: var(--r-muted); }
.sbs-cell pre { flex: 1; margin: 0; padding: 0 8px; background: transparent; white-space: pre-wrap; word-break: break-word; color: var(--r-ink); }
.sbs-cell.added { background: var(--r-add-bg); }
.sbs-cell.added .marker { color: var(--r-add); }
.sbs-cell.removed { background: var(--r-del-bg); }
.sbs-cell.removed .marker { color: var(--r-del); }
.sbs-cell.empty { background: var(--r-surface-2); }
.sbs-cell.unchanged { background: transparent; }
.sbs-row.gap .sbs-cell { flex: 1 0 auto; width: 100%; }

code { font-family: var(--r-mono); font-size: 12px; color: var(--r-ink); background: var(--r-surface-3); padding: 1px 5px; border-radius: 3px; }

/* Single-file (library-only or local-only) */
.single-file { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.single-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: var(--r-2) 18px;
  background: var(--r-surface-2);
  border-bottom: 1px solid var(--r-line);
  font-family: var(--r-mono);
  font-size: 11px;
}
.single-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--r-radius-pill);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #fff;
}
.single-tag.library { background: var(--r-pine); }
.single-tag.local { background: var(--r-ink-2); }
.single-body {
  flex: 1;
  margin: 0;
  padding: var(--r-3) 18px;
  overflow: auto;
  font-family: var(--r-mono);
  font-size: 12px;
  line-height: 1.55;
  color: var(--r-ink);
  background: var(--r-surface);
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
