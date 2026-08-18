<template>
  <div class="files-page">
    <FileTree :selected-path="selectedProjectedPath" @select="onSelect" />
    <div class="right">
      <FileViewer
        :path="loadPath"
        :source-hint="sourceHint"
        :synthesized-path="synthesizedPath"
        :synthesized-note="synthesizedNote"
        @navigate="onNavigate"
      />
      <div v-if="focusName" class="minimap">
        <div class="minimap-label">links · {{ focusName }}</div>
        <GraphView compact :focus-name="focusName" @select="onMinimapSelect" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const selectedProjectedPath = ref<string | null>(null)
const loadPath = ref<string | null>(null)
const sourceHint = ref<string | null>(null)
const synthesizedPath = ref<string | null>(null)
const synthesizedNote = ref<string | null>(null)
const namesToPath = ref<Record<string, string>>({})

const focusName = computed(() => {
  if (!loadPath.value) return null
  const m = loadPath.value.match(/\/([^/]+)\.md$/)
  return m ? m[1] : null
})

async function loadNameIndex() {
  const { files } = await $fetch<{ files: { name: string; path: string }[] }>('/api/files')
  const map: Record<string, string> = {}
  for (const f of files) map[f.name] = f.path
  namesToPath.value = map
}

function onSelect(entry: { projectedPath: string; sourcePath: string | null; synthesized?: boolean; note?: string }) {
  selectedProjectedPath.value = entry.projectedPath
  loadPath.value = entry.sourcePath
  sourceHint.value = entry.sourcePath && entry.sourcePath !== entry.projectedPath ? entry.sourcePath : null
  synthesizedPath.value = !entry.sourcePath ? entry.projectedPath : null
  synthesizedNote.value = !entry.sourcePath ? (entry.note || null) : null
  router.replace({ query: { path: entry.sourcePath || entry.projectedPath } })
}

function onNavigate(name: string) {
  const p = namesToPath.value[name]
  if (p) {
    loadPath.value = p
    selectedProjectedPath.value = p
    sourceHint.value = null
    synthesizedPath.value = null
    synthesizedNote.value = null
    router.replace({ query: { path: p } })
  }
}

function onMinimapSelect(path: string) {
  loadPath.value = path
  selectedProjectedPath.value = path
  sourceHint.value = null
  synthesizedPath.value = null
  synthesizedNote.value = null
  router.replace({ query: { path } })
}

onMounted(async () => {
  await loadNameIndex()
  const q = route.query.path
  if (typeof q === 'string' && q) {
    loadPath.value = q
    selectedProjectedPath.value = q
  }
})

watch(() => route.query.path, (q) => {
  if (typeof q === 'string' && q && q !== loadPath.value) {
    loadPath.value = q
    selectedProjectedPath.value = q
  }
})
</script>

<style scoped>
.files-page { display: flex; width: 100%; height: 100%; }
.right { flex: 1; min-width: 0; position: relative; display: flex; }
.minimap {
  position: absolute;
  top: var(--r-4);
  right: var(--r-4);
  width: 280px;
  height: 220px;
  background: var(--r-surface);
  border: 1px solid var(--r-line);
  border-radius: var(--r-radius-sm);
  overflow: hidden;
  z-index: 5;
  box-shadow: var(--r-shadow-2);
  display: flex;
  flex-direction: column;
}
.minimap-label {
  font-size: 10px;
  color: var(--r-pine);
  font-weight: 600;
  padding: 6px 10px;
  border-bottom: 1px solid var(--r-line);
  background: var(--r-surface-3);
  font-family: var(--r-mono);
  flex-shrink: 0;
}
.minimap > :last-child { flex: 1; min-height: 0; }
</style>
