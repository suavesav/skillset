<template>
  <div class="graph-page">
    <Transition name="slide">
      <FileTree v-if="sidebarOpen" :selected-path="null" @select="onFileSelect" class="graph-sidebar" />
    </Transition>
    <div class="graph-main">
      <div class="graph-toolbar">
        <button class="tb-btn" @click="sidebarOpen = !sidebarOpen" :title="sidebarOpen ? 'Hide sidebar' : 'Show sidebar'">
          <span v-if="sidebarOpen">◀ Hide files</span>
          <span v-else>Show files ▶</span>
        </button>
        <div class="tb-search">
          <input
            v-model="graphQuery"
            type="text"
            placeholder="Highlight by name or content…"
          />
          <button v-if="graphQuery" class="clear" @click="graphQuery = ''">×</button>
        </div>
        <span v-if="matchedNames && matchedNames.size > 0" class="match-count">
          {{ matchedNames.size }} match{{ matchedNames.size === 1 ? '' : 'es' }}
        </span>
        <span v-else-if="matchedNames && matchedNames.size === 0" class="match-count empty">no matches</span>
      </div>
      <GraphView :matched-names="matchedNames" @select="onSelect" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { SearchResponse } from '../shared/types'

const router = useRouter()
const sidebarOpen = ref(false)
const graphQuery = ref('')
const matchedNames = ref<Set<string> | null>(null)

let debounce: ReturnType<typeof setTimeout> | null = null
let reqSeq = 0

watch(graphQuery, (val) => {
  if (debounce) clearTimeout(debounce)
  const seq = ++reqSeq
  const q = val.trim()
  if (!q) {
    matchedNames.value = null
    return
  }
  debounce = setTimeout(async () => {
    const res = await $fetch<SearchResponse>(`/api/search?q=${encodeURIComponent(q)}`)
    if (seq === reqSeq) {
      matchedNames.value = new Set(res.matches.map((m) => m.name))
    }
  }, 100)
})

function onSelect(path: string) {
  router.push({ path: '/files', query: { path } })
}

function onFileSelect(entry: { projectedPath: string; sourcePath: string | null }) {
  router.push({ path: '/files', query: { path: entry.sourcePath || entry.projectedPath } })
}
</script>

<style scoped>
.graph-page { display: flex; width: 100%; height: 100%; min-height: 0; }
.graph-sidebar { flex-shrink: 0; }
.graph-main { flex: 1; min-width: 0; display: flex; flex-direction: column; position: relative; }
.graph-toolbar {
  display: flex;
  align-items: center;
  gap: var(--r-3);
  padding: var(--r-2) 14px;
  background: var(--r-surface);
  border-bottom: 1px solid var(--r-line);
  flex-shrink: 0;
}
.tb-btn {
  background: var(--r-surface-2);
  color: var(--r-ink-2);
  border: 1px solid var(--r-line);
  border-radius: var(--r-radius-pill);
  padding: 5px 14px;
  cursor: pointer;
  font-size: 12px;
  font-family: var(--r-font);
  transition: background var(--r-dur) var(--r-ease), color var(--r-dur) var(--r-ease);
}
.tb-btn:hover { background: var(--r-pine); color: #fff; border-color: var(--r-pine); }
.tb-search { position: relative; flex: 1; max-width: 360px; }
.tb-search input {
  width: 100%;
  background: var(--r-surface-2);
  color: var(--r-ink);
  border: 1px solid var(--r-line);
  border-radius: var(--r-radius-pill);
  padding: 5px 24px 5px 12px;
  font-size: 12px;
  font-family: var(--r-font);
  outline: none;
  transition: border-color var(--r-dur) var(--r-ease);
}
.tb-search input:focus { border-color: var(--r-pine); }
.tb-search .clear {
  position: absolute;
  right: 6px;
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
.tb-search .clear:hover { color: var(--r-ink); }
.match-count { font-size: 11px; color: var(--r-pine); font-family: var(--r-mono); font-weight: 600; }
.match-count.empty { color: var(--r-muted); }
.graph-main > :last-child { flex: 1; min-height: 0; }

.slide-enter-active, .slide-leave-active {
  transition: transform 200ms ease, opacity 200ms ease;
}
.slide-enter-from, .slide-leave-to {
  transform: translateX(-12px);
  opacity: 0;
}
</style>
