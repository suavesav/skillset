<template>
  <aside class="drift-list">
    <div class="controls">
      <div class="folder">
        <button
          class="folder-btn"
          @click="pickFolder"
          :title="supportsFsAccess ? 'Grant read access to your local skills folder' : 'Pick your local skills folder'"
        >
          <span class="folder-icon">📁</span>
          <span class="folder-label">{{ folderName || 'Choose skills folder…' }}</span>
        </button>
        <span v-if="localFiles.length" class="folder-meta">
          {{ localFiles.length }} md
          <button class="folder-clear" @click="clearFolder" title="Clear">×</button>
        </span>
      </div>
      <div v-if="folderError" class="folder-err">{{ folderError }}</div>
      <div v-if="!folderName" class="folder-hint">
        Pick <code>~/.claude/skills</code>. macOS hides it — in the dialog press <kbd>⌘⇧G</kbd> and type the path.
      </div>
      <input v-model="filter" type="text" placeholder="Filter…" class="filter" />
      <label class="show-all">
        <input v-model="settings.driftShowAll" type="checkbox" />
        show synced/unchanged
      </label>
    </div>
    <div v-if="pending" class="hint">Loading drift…</div>
    <div v-else-if="!visibleItems.length" class="hint">Nothing to show. {{ items.length ? 'Toggle "show synced" to see in-sync files.' : '' }}</div>
    <template v-else>
      <div v-for="group in groups" :key="group.status" class="group">
        <button
          type="button"
          class="group-label"
          :class="{ collapsed: isCollapsed(group.status) }"
          @click="toggle(group.status)"
        >
          <span class="chevron">{{ isCollapsed(group.status) ? '▸' : '▾' }}</span>
          <span class="badge" :class="group.status">{{ statusLabel(group.status) }}</span>
          <span class="count">{{ group.items.length }}</span>
        </button>
        <ul v-if="!isCollapsed(group.status)">
          <li
            v-for="entry in group.items"
            :key="entry.key"
            class="item"
            :class="{ active: entry.key === selectedKey }"
            @click="$emit('select', entry)"
          >
            <span class="kind" :class="entry.item.kind.toLowerCase()">{{ entry.item.kind[0] }}</span>
            <span class="name">{{ entry.item.name }}</span>
            <span
              v-if="entry.location?.isSymlink"
              class="link-hint"
              title="Shortcut — this links to another folder on your computer, not a copy stored here"
            >🔗</span>
            <span class="loc" v-if="entry.location?.owningSkill">in {{ entry.location.owningSkill }}</span>
            <span class="loc" v-else-if="entry.location && entry.item.kind === 'AGENT'">top-level</span>
          </li>
        </ul>
      </div>
    </template>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { DriftItem, DriftResponse, DriftStatus, LocalLocation } from '../shared/types'
import { useLocalFolder } from '../composables/useLocalFolder'
import { useTeamFilter } from '../composables/useTeamFilter'
import { useViewerSettings } from '../composables/useViewerSettings'

// Local install source for the diff (browser-read; server never touches disk).
// Phase 1: pick + enumerate. Phase 2 feeds these contents into the drift APIs.
const {
  files: localFiles,
  folderName,
  error: folderError,
  supportsFsAccess,
  pick: pickFolder,
  clear: clearFolder
} = useLocalFolder()

export interface DriftSelection {
  key: string
  item: DriftItem
  location: LocalLocation | null
}

defineEmits<{ (e: 'select', sel: DriftSelection): void }>()

const props = defineProps<{ selectedKey: string | null }>()

const items = ref<DriftItem[]>([])
const pending = ref(false)
const filter = ref('')
const settings = useViewerSettings() // persisted "show synced/unchanged"
const { inTeam } = useTeamFilter() // global team filter (dropdown lives in the topbar)

const DEFAULT_COLLAPSED: DriftStatus[] = ['local-only', 'library-only']
const collapsed = ref<Set<DriftStatus>>(new Set(DEFAULT_COLLAPSED))
function isCollapsed(s: DriftStatus) { return collapsed.value.has(s) }
function toggle(s: DriftStatus) {
  const next = new Set(collapsed.value)
  if (next.has(s)) next.delete(s)
  else next.add(s)
  collapsed.value = next
}

async function load() {
  pending.value = true
  try {
    let res: DriftResponse
    if (localFiles.value.length) {
      // Folder picked: diff the browser-read files (works in the hosted app).
      const files = await Promise.all(
        localFiles.value.map(async (f) => ({ path: f.path, content: await f.read() }))
      )
      res = await $fetch<DriftResponse>('/api/drift', { method: 'POST', body: { files } })
    } else {
      // No folder: fall back to the server's own ~/.claude (local dev).
      res = await $fetch<DriftResponse>('/api/drift')
    }
    items.value = res.items
  } finally {
    pending.value = false
  }
}
onMounted(load)
// Re-run drift whenever the picked folder changes (or is cleared).
watch(localFiles, load)
defineExpose({ reload: load })

// Flatten items: each item with N locations becomes N entries when there are
// multiple locations to diff, plus one library-only/local-only entry when there
// are no locations.
const flattened = computed<DriftSelection[]>(() => {
  const out: DriftSelection[] = []
  for (const item of items.value) {
    if (item.locations.length === 0) {
      out.push({ key: `${item.kind}:${item.name}::lib-only`, item, location: null })
    } else {
      for (const loc of item.locations) {
        out.push({
          key: `${item.kind}:${item.name}::${loc.localPath}`,
          item,
          location: loc
        })
      }
    }
  }
  return out
})

const visibleItems = computed(() => {
  const q = filter.value.trim().toLowerCase()
  return flattened.value.filter((entry) => {
    const s = entry.location?.status ?? entry.item.status
    if (!settings.driftShowAll && (s === 'synced' || s === 'unchanged')) return false
    if (!inTeam(entry.item.name)) return false
    if (!q) return true
    return entry.item.name.toLowerCase().includes(q) ||
      (entry.location?.owningSkill?.toLowerCase().includes(q) ?? false)
  })
})

interface Group { status: DriftStatus; items: DriftSelection[] }

const STATUS_ORDER: DriftStatus[] = ['conflict', 'drift', 'local-only', 'library-only', 'unchanged', 'synced']

const groups = computed<Group[]>(() => {
  const buckets = new Map<DriftStatus, DriftSelection[]>()
  for (const entry of visibleItems.value) {
    const s = entry.location?.status ?? entry.item.status
    const arr = buckets.get(s) ?? []
    arr.push(entry)
    buckets.set(s, arr)
  }
  return STATUS_ORDER
    .filter((s) => buckets.has(s))
    .map((status) => ({ status, items: buckets.get(status)! }))
})

function statusLabel(s: DriftStatus): string {
  return ({
    drift: 'drift',
    conflict: 'conflict',
    'local-only': 'local-only',
    'library-only': 'library-only',
    unchanged: 'unchanged',
    synced: 'synced'
  } as Record<DriftStatus, string>)[s]
}
</script>

<style scoped>
.drift-list {
  width: 340px;
  flex-shrink: 0;
  background: var(--r-surface);
  border-right: 1px solid var(--r-line);
  overflow-y: auto;
  padding: var(--r-3);
  font-size: 13px;
}
.controls { display: flex; flex-direction: column; gap: 6px; margin-bottom: var(--r-3); padding-bottom: var(--r-3); border-bottom: 1px solid var(--r-line); }
.folder { display: flex; align-items: center; gap: 6px; }
.folder-btn {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--r-surface-2);
  color: var(--r-ink);
  border: 1px solid var(--r-line);
  border-radius: var(--r-radius-sm);
  padding: 5px 8px;
  font-size: 12px;
  cursor: pointer;
  text-align: left;
  transition: border-color var(--r-dur) var(--r-ease);
}
.folder-btn:hover { border-color: var(--r-pine); }
.folder-icon { flex-shrink: 0; }
.folder-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--r-mono); }
.folder-meta { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--r-muted); flex-shrink: 0; }
.folder-clear { background: none; border: none; color: var(--r-muted); cursor: pointer; font-size: 14px; line-height: 1; padding: 0 2px; }
.folder-clear:hover { color: var(--r-ink); }
.folder-err { font-size: 11px; color: var(--r-del); }
.folder-hint { font-size: 11px; color: var(--r-muted); line-height: 1.5; }
.folder-hint code { font-family: var(--r-mono); background: var(--r-surface-3); padding: 0 4px; border-radius: 3px; color: var(--r-ink-2); }
.folder-hint kbd {
  font-family: var(--r-mono);
  background: var(--r-surface-3);
  border: 1px solid var(--r-line);
  border-radius: 3px;
  padding: 0 4px;
  color: var(--r-ink);
}
.filter {
  background: var(--r-surface-2);
  color: var(--r-ink);
  border: 1px solid var(--r-line);
  border-radius: var(--r-radius-sm);
  padding: 5px 8px;
  font-size: 12px;
  outline: none;
  transition: border-color var(--r-dur) var(--r-ease);
}
.filter:focus { border-color: var(--r-pine); }
.show-all { color: var(--r-muted); font-size: 11px; display: flex; align-items: center; gap: 6px; cursor: pointer; }
.show-all input { accent-color: var(--r-pine); }
.hint { color: var(--r-muted); font-size: 12px; padding: var(--r-2) 0; }
.group { margin-bottom: var(--r-3); }
.group-label {
  display: flex;
  align-items: center;
  gap: var(--r-2);
  margin: var(--r-2) 0 4px;
  background: none;
  border: none;
  padding: 2px 0;
  width: 100%;
  cursor: pointer;
  text-align: left;
  color: inherit;
  font: inherit;
}
.group-label:hover .badge { filter: brightness(1.05); }
.chevron {
  color: var(--r-muted);
  font-size: 10px;
  width: 10px;
  display: inline-block;
}
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--r-radius-pill);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.badge.drift { background: var(--r-violet); color: var(--r-ink); }
.badge.conflict { background: var(--r-del); color: #fff; }
.badge.local-only { background: var(--r-ink-2); color: #fff; }
.badge.library-only { background: var(--r-pine); color: #fff; }
.badge.unchanged { background: var(--r-surface-3); color: var(--r-ink-2); }
.badge.synced { background: var(--r-surface-3); color: var(--r-muted); }
.count { color: var(--r-muted); font-size: 11px; }
ul { list-style: none; padding: 0; margin: 0; }
.item {
  display: flex;
  align-items: center;
  gap: var(--r-2);
  padding: 5px 8px;
  cursor: pointer;
  border-radius: var(--r-radius-sm);
  font-family: var(--r-mono);
}
.item:hover { background: var(--r-surface-2); }
.item.active { background: var(--r-pine); }
.item.active .name { color: #fff; }
.item.active .loc { color: var(--r-violet-soft); }
.kind {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  text-align: center;
  font-size: 10px;
  font-weight: bold;
  line-height: 16px;
  flex-shrink: 0;
}
.kind.skill { background: var(--r-pine); color: #fff; }
.kind.agent { background: var(--r-violet); color: var(--r-ink); }
.name { color: var(--r-ink); font-size: 12px; }
.link-hint { font-size: 10px; flex-shrink: 0; line-height: 1; opacity: 0.75; cursor: help; }
.loc { color: var(--r-muted); font-size: 11px; margin-left: auto; }
</style>
