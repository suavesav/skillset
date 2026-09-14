<template>
  <aside class="tree">
    <div class="picker">
      <label>View:</label>
      <select v-model="settings.platform">
        <option value="raw">raw (repo)</option>
        <option value="claude-plugin">claude-plugin</option>
        <option value="codex">codex</option>
      </select>
    </div>

    <div class="search">
      <input v-model="filter" type="text" placeholder="Filter by name…" />
      <button v-if="filter" class="clear" @click="filter = ''" title="Clear">×</button>
    </div>
    <div v-if="pending" class="hint">Loading…</div>
    <div v-else-if="error" class="hint err">{{ error }}</div>
    <ul v-else-if="!filter.trim()" class="root">
      <TreeNode
        v-for="node in tree"
        :key="node.key"
        :node="node"
        :selected="selectedPath"
        @select="onSelect"
      />
    </ul>
    <ul v-else class="root flat">
      <li v-if="!filtered.length" class="hint">No matches.</li>
      <li
        v-for="entry in filtered"
        :key="entry.projectedPath"
        class="flat-item"
        :class="{ selected: entry.projectedPath === selectedPath }"
        @click="onFlatSelect(entry)"
      >
        <span class="flat-name" v-html="highlightMatch(basename(entry.projectedPath))" />
        <span class="flat-path">{{ entry.projectedPath }}</span>
      </li>
    </ul>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ProjectionEntry, ProjectionResponse } from '../shared/types'
import { buildTree, type TreeNodeData } from '../shared/tree'
import { apiProjection } from '../shared/api'
import { useTeamFilter } from '../composables/useTeamFilter'
import { useViewerSettings } from '../composables/useViewerSettings'

export interface SelectedEntry {
  projectedPath: string
  sourcePath: string | null
  synthesized?: boolean
  note?: string
  /** The click landed on a bundle input, not a projected file. */
  isInput?: boolean
}

defineProps<{ selectedPath: string | null }>()
const emit = defineEmits<{ (e: 'select', entry: SelectedEntry): void }>()

const settings = useViewerSettings() // persisted platform selection
const entries = ref<ProjectionEntry[]>([])
const pending = ref(false)
const filter = ref('')
const error = ref('')
const { closure } = useTeamFilter() // global team filter

function basename(p: string): string {
  const i = p.lastIndexOf('/')
  return i === -1 ? p : p.slice(i + 1)
}

/** The closure only knows library files; platform sources are never in it. */
function inClosure(sourcePath: string): boolean {
  const c = closure.value
  if (!c) return true
  if (!/^(SKILLS|AGENTS|KNOWLEDGE)\//.test(sourcePath)) return true
  return c.has(basename(sourcePath).replace(/\.md$/, ''))
}

// Bundles always survive; their inputs are filtered instead (keepInput below).
const teamEntries = computed(() => {
  if (!closure.value) return entries.value
  return entries.value.filter((e) => !e.sourcePath || inClosure(e.sourcePath))
})

const filtered = computed(() => {
  const q = filter.value.trim().toLowerCase()
  if (!q) return []
  return teamEntries.value
    .filter((e) => basename(e.projectedPath).toLowerCase().includes(q))
    .sort((a, b) => basename(a.projectedPath).localeCompare(basename(b.projectedPath)))
})

function highlightMatch(name: string): string {
  const q = filter.value.trim()
  if (!q) return escapeHtml(name)
  const i = name.toLowerCase().indexOf(q.toLowerCase())
  if (i === -1) return escapeHtml(name)
  return escapeHtml(name.slice(0, i)) + '<mark>' + escapeHtml(name.slice(i, i + q.length)) + '</mark>' + escapeHtml(name.slice(i + q.length))
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

function onFlatSelect(entry: ProjectionEntry) {
  emit('select', {
    projectedPath: entry.projectedPath,
    sourcePath: entry.sourcePath,
    synthesized: entry.synthesized,
    note: entry.note
  })
}

// Bumped per platform switch, so a slow load cannot paint over a newer one.
let loadSeq = 0

async function load() {
  const seq = ++loadSeq
  pending.value = true
  error.value = ''
  try {
    const res = await $fetch<ProjectionResponse>(apiProjection(settings.platform))
    if (seq !== loadSeq) return
    entries.value = res.entries
  } catch {
    if (seq !== loadSeq) return
    entries.value = []
    error.value = `Could not project ${settings.platform}.`
  } finally {
    if (seq === loadSeq) pending.value = false
  }
}

watch(() => settings.platform, load, { immediate: true })

const tree = computed<TreeNodeData[]>(() =>
  buildTree(teamEntries.value, { keepInput: inClosure })
)

function onSelect(node: TreeNodeData) {
  if (node.kind === 'dir' || node.kind === 'bundle-input-group') return
  if (node.kind === 'bundle-input') {
    // An input is a library file, not a projected one.
    emit('select', { projectedPath: node.path, sourcePath: node.sourcePath, isInput: true })
    return
  }
  emit('select', {
    projectedPath: node.path,
    sourcePath: node.sourcePath,
    synthesized: node.synthesized,
    note: node.note
  })
}
</script>

<style scoped>
.tree {
  width: 320px;
  flex-shrink: 0;
  background: var(--r-surface);
  border-right: 1px solid var(--r-line);
  overflow-y: auto;
  padding: var(--r-3);
  font-size: 13px;
}
.picker {
  display: flex;
  gap: var(--r-2);
  align-items: center;
  margin-bottom: var(--r-3);
  padding-bottom: var(--r-3);
  border-bottom: 1px solid var(--r-line);
}
.picker label { color: var(--r-muted); font-size: 12px; }
.picker select {
  flex: 1;
  background: var(--r-surface-2);
  color: var(--r-ink);
  border: 1px solid var(--r-line);
  border-radius: var(--r-radius-sm);
  padding: 4px 8px;
  font-size: 12px;
}
.root { list-style: none; padding: 0; margin: 0; }
.hint { color: var(--r-muted); font-size: 12px; padding: 4px 0; }
.hint.err { color: var(--r-pine); }
.search {
  position: relative;
  margin-bottom: var(--r-3);
}
.search input {
  width: 100%;
  background: var(--r-surface-2);
  color: var(--r-ink);
  border: 1px solid var(--r-line);
  border-radius: var(--r-radius-sm);
  padding: 5px 24px 5px 10px;
  font-size: 12px;
  outline: none;
  transition: border-color var(--r-dur) var(--r-ease);
}
.search input:focus { border-color: var(--r-pine); }
.search .clear {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--r-muted);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 2px 6px;
}
.search .clear:hover { color: var(--r-ink); }
.flat-item {
  list-style: none;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: var(--r-radius-sm);
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.flat-item:hover { background: var(--r-surface-2); }
.flat-item.selected { background: var(--r-pine); }
.flat-item.selected .flat-name { color: #fff; }
.flat-item.selected .flat-path { color: var(--r-violet-soft); }
.flat-name { color: var(--r-ink); font-family: var(--r-mono); font-size: 12px; }
.flat-path { color: var(--r-muted); font-size: 10px; font-family: var(--r-mono); }
:deep(mark) { background: var(--r-violet); color: var(--r-ink); padding: 0 2px; border-radius: 2px; }
</style>
