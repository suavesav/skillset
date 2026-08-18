<template>
  <aside class="tree">
    <div class="picker">
      <label>View:</label>
      <select v-model="settings.platform">
        <option value="raw">raw (repo)</option>
        <option value="claude-code">claude-code</option>
        <option value="claude-plugin">claude-plugin</option>
        <option value="codex">codex</option>
        <option value="claude-desktop">claude-desktop</option>
      </select>
    </div>
    <div class="search">
      <input v-model="filter" type="text" placeholder="Filter by name…" />
      <button v-if="filter" class="clear" @click="filter = ''" title="Clear">×</button>
    </div>
    <div v-if="pending" class="hint">Loading…</div>
    <ul v-else-if="!filter.trim()" class="root">
      <TreeNode
        v-for="node in tree"
        :key="node.path"
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
import type { ProjectionEntry, ProjectionResponse, Platform } from '../shared/types'
import { useTeamFilter } from '../composables/useTeamFilter'
import { useViewerSettings } from '../composables/useViewerSettings'

interface TreeNode {
  name: string
  path: string                // full projected path
  sourcePath: string | null
  synthesized?: boolean
  note?: string
  children?: TreeNode[]
  isDir: boolean
}

const props = defineProps<{ selectedPath: string | null }>()
const emit = defineEmits<{
  (e: 'select', entry: { projectedPath: string; sourcePath: string | null; synthesized?: boolean; note?: string }): void
}>()

const settings = useViewerSettings() // persisted platform selection
const entries = ref<ProjectionEntry[]>([])
const pending = ref(false)
const filter = ref('')
const { closure } = useTeamFilter() // global team filter

// Entries surviving the team filter: keep a projected file when its library
// source is in the selected team's closure; synthesized manifests always stay.
const teamEntries = computed(() => {
  const c = closure.value
  if (!c) return entries.value
  return entries.value.filter((e) => {
    if (!e.sourcePath) return true
    return c.has(basename(e.sourcePath).replace(/\.md$/, ''))
  })
})

const filtered = computed(() => {
  const q = filter.value.trim().toLowerCase()
  if (!q) return []
  return teamEntries.value
    .filter((e) => basename(e.projectedPath).toLowerCase().includes(q))
    .sort((a, b) => basename(a.projectedPath).localeCompare(basename(b.projectedPath)))
})

function basename(p: string): string {
  const i = p.lastIndexOf('/')
  return i === -1 ? p : p.slice(i + 1)
}

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

async function load() {
  pending.value = true
  try {
    const res = await $fetch<ProjectionResponse>(`/api/projection?platform=${settings.platform}`)
    entries.value = res.entries
  } finally {
    pending.value = false
  }
}

watch(() => settings.platform, load, { immediate: true })

const tree = computed<TreeNode[]>(() => buildTree(teamEntries.value))

function buildTree(list: ProjectionEntry[]): TreeNode[] {
  const root: TreeNode = { name: '', path: '', sourcePath: null, isDir: true, children: [] }
  for (const e of list) {
    const parts = e.projectedPath.split('/')
    let cur = root
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i]
      const isLeaf = i === parts.length - 1
      cur.children = cur.children || []
      let next = cur.children.find((c) => c.name === name)
      if (!next) {
        next = {
          name,
          path: parts.slice(0, i + 1).join('/'),
          sourcePath: isLeaf ? e.sourcePath : null,
          synthesized: isLeaf ? e.synthesized : undefined,
          note: isLeaf ? e.note : undefined,
          isDir: !isLeaf,
          children: isLeaf ? undefined : []
        }
        cur.children.push(next)
      }
      cur = next
    }
  }
  sortTree(root)
  return root.children || []
}

// Category folders sort by intent (skills → agents → knowledge), not
// alphabetically; everything else falls back to alphabetical after them.
const CATEGORY_RANK: Record<string, number> = {
  skills: 0, agents: 1, knowledge: 2, references: 2
}
function categoryRank(name: string): number {
  return CATEGORY_RANK[name.toLowerCase()] ?? 99
}

function sortTree(node: TreeNode) {
  if (!node.children) return
  node.children.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
    const ra = categoryRank(a.name)
    const rb = categoryRank(b.name)
    if (ra !== rb) return ra - rb
    return a.name.localeCompare(b.name)
  })
  for (const c of node.children) sortTree(c)
}

function onSelect(node: TreeNode) {
  if (node.isDir) return
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
