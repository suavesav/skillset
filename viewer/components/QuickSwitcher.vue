<template>
  <div v-if="open" class="qs-backdrop" @click.self="close">
    <div class="qs-modal" role="dialog" aria-label="Quick switcher">
      <input
        ref="inputEl"
        v-model="q"
        type="text"
        placeholder="Search files by name or content…"
        @keydown.down.prevent="move(1)"
        @keydown.up.prevent="move(-1)"
        @keydown.enter.prevent="commit"
        @keydown.esc.prevent="close"
      />
      <div class="qs-list">
        <div v-if="pending && !matches.length" class="qs-hint">Searching…</div>
        <div v-else-if="!q" class="qs-hint">Type to search.  ↑↓ to navigate, Enter to open, Esc to close.</div>
        <div v-else-if="!matches.length" class="qs-hint">No matches.</div>
        <template v-else>
          <div v-if="nameMatches.length" class="qs-group">filenames</div>
          <div
            v-for="(m, i) in nameMatches"
            :key="'n' + m.path"
            class="qs-item"
            :class="{ active: i === highlight }"
            @mouseenter="highlight = i"
            @click="select(m)"
          >
            <span class="qs-kind" :class="m.kind.toLowerCase()">{{ m.kind[0] }}</span>
            <span class="qs-name" v-html="highlightTerm(m.name)" />
            <span class="qs-path">{{ m.path }}</span>
          </div>

          <div v-if="bodyMatches.length" class="qs-group">in content</div>
          <div
            v-for="(m, i) in bodyMatches"
            :key="'b' + m.path"
            class="qs-item"
            :class="{ active: nameMatches.length + i === highlight }"
            @mouseenter="highlight = nameMatches.length + i"
            @click="select(m)"
          >
            <span class="qs-kind" :class="m.kind.toLowerCase()">{{ m.kind[0] }}</span>
            <div class="qs-body">
              <div class="qs-name">{{ m.name }}</div>
              <div class="qs-excerpt" v-html="highlightTerm(m.excerpt || '')" />
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import type { SearchMatch, SearchResponse } from '../shared/types'

const router = useRouter()
const open = ref(false)
const q = ref('')
const matches = ref<SearchMatch[]>([])
const pending = ref(false)
const highlight = ref(0)
const inputEl = ref<HTMLInputElement | null>(null)

const nameMatches = computed(() => matches.value.filter((m) => m.matchType === 'name'))
const bodyMatches = computed(() => matches.value.filter((m) => m.matchType === 'body'))

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let reqSeq = 0

async function run(query: string) {
  const seq = ++reqSeq
  if (!query) {
    matches.value = []
    pending.value = false
    return
  }
  pending.value = true
  try {
    const res = await $fetch<SearchResponse>(`/api/search?q=${encodeURIComponent(query)}`)
    if (seq === reqSeq) {
      matches.value = res.matches
      highlight.value = 0
    }
  } finally {
    if (seq === reqSeq) pending.value = false
  }
}

watch(q, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => run(val.trim()), 80)
})

function move(delta: number) {
  if (!matches.value.length) return
  const n = matches.value.length
  highlight.value = (highlight.value + delta + n) % n
  nextTick(() => {
    const el = document.querySelector('.qs-item.active') as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  })
}

function commit() {
  const m = matches.value[highlight.value]
  if (m) select(m)
}

function select(m: SearchMatch) {
  router.push({ path: '/files', query: { path: m.path } })
  close()
}

function close() {
  open.value = false
  q.value = ''
  matches.value = []
  highlight.value = 0
}

function openModal() {
  open.value = true
  nextTick(() => inputEl.value?.focus())
}

function onKeydown(e: KeyboardEvent) {
  const k = e.key.toLowerCase()
  if ((e.metaKey || e.ctrlKey) && k === 'k') {
    e.preventDefault()
    open.value ? close() : openModal()
  }
}

function highlightTerm(text: string): string {
  if (!q.value) return escapeHtml(text)
  const idx = text.toLowerCase().indexOf(q.value.toLowerCase())
  if (idx === -1) return escapeHtml(text)
  const before = escapeHtml(text.slice(0, idx))
  const hit = escapeHtml(text.slice(idx, idx + q.value.length))
  const after = escapeHtml(text.slice(idx + q.value.length))
  return `${before}<mark>${hit}</mark>${after}`
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))

defineExpose({ open: openModal, close })
</script>

<style scoped>
.qs-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(25, 25, 25, 0.4);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 10vh;
  z-index: 1000;
}
.qs-modal {
  width: 640px;
  max-width: 92vw;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  background: var(--r-surface);
  border: 1px solid var(--r-line);
  border-radius: var(--r-radius);
  box-shadow: var(--r-shadow-3);
  overflow: hidden;
}
.qs-modal input {
  background: transparent;
  border: none;
  border-bottom: 2px solid var(--r-violet);
  padding: 14px 18px;
  color: var(--r-ink);
  font-size: 15px;
  font-family: var(--r-font);
  outline: none;
  flex-shrink: 0;
}
.qs-modal input::placeholder { color: var(--r-muted); }
.qs-list { overflow-y: auto; flex: 1; padding: 4px 0 8px; }
.qs-hint { color: var(--r-muted); padding: 16px 18px; font-size: 12px; }
.qs-group {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--r-pine);
  font-weight: 600;
  padding: 10px 18px 4px;
}
.qs-item {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px 18px;
  cursor: pointer;
  font-size: 13px;
}
.qs-item.active { background: var(--r-surface-3); }
.qs-kind {
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  text-align: center;
  font-size: 10px;
  font-weight: bold;
  color: #fff;
  line-height: 16px;
  flex-shrink: 0;
  font-family: var(--r-mono);
}
.qs-kind.skill { background: var(--r-pine); }
.qs-kind.agent { background: var(--r-violet); color: var(--r-ink); }
.qs-kind.knowledge { background: var(--r-ink-2); }
.qs-name { color: var(--r-ink); font-family: var(--r-mono); }
.qs-path { color: var(--r-muted); font-size: 11px; margin-left: auto; font-family: var(--r-mono); }
.qs-body { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.qs-excerpt {
  color: var(--r-ink-2);
  font-size: 11px;
  font-family: var(--r-mono);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
:deep(mark) {
  background: var(--r-violet);
  color: var(--r-ink);
  padding: 0 2px;
  border-radius: 2px;
}
</style>
