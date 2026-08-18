<template>
  <div class="settings" ref="root">
    <button class="btn" :class="{ open }" @click="open = !open" title="Settings" aria-label="Settings">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </button>
    <div v-if="open" class="popover" @click.stop>
      <div class="header">Settings</div>
      <div class="section-label">Views</div>
      <label class="row">
        <input type="checkbox" v-model="settings.showGraph" />
        <span>Graph view</span>
      </label>
      <label class="row">
        <input type="checkbox" v-model="settings.showDiff" />
        <span>Diff view</span>
      </label>
      <div class="hint">Files view is always on.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useViewerSettings } from '../composables/useViewerSettings'

const settings = useViewerSettings()
const open = ref(false)
const root = ref<HTMLElement | null>(null)

function onDocClick(e: MouseEvent) {
  if (!open.value) return
  if (root.value && !root.value.contains(e.target as Node)) open.value = false
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}
onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.settings { position: relative; }
.btn {
  background: var(--r-surface-2);
  border: 1px solid var(--r-line);
  color: var(--r-ink-2);
  padding: 5px 8px;
  border-radius: var(--r-radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color var(--r-dur) var(--r-ease), border-color var(--r-dur) var(--r-ease);
}
.btn:hover, .btn.open { color: var(--r-pine); border-color: var(--r-pine); }
.popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 200px;
  background: var(--r-surface);
  border: 1px solid var(--r-line);
  border-radius: var(--r-radius);
  padding: var(--r-3) var(--r-4);
  box-shadow: var(--r-shadow-3);
  z-index: 100;
}
.header { font-size: 12px; font-weight: 600; color: var(--r-ink); margin-bottom: var(--r-2); }
.section-label { font-size: 10px; color: var(--r-pine); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; margin: 6px 0 4px; }
.row { display: flex; align-items: center; gap: var(--r-2); padding: 4px 0; font-size: 13px; color: var(--r-ink); cursor: pointer; }
.row input { cursor: pointer; accent-color: var(--r-pine); }
.hint { font-size: 11px; color: var(--r-muted); margin-top: var(--r-2); padding-top: var(--r-2); border-top: 1px solid var(--r-line); }
</style>
