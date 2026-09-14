<template>
  <div class="files-page">
    <FileTree :selected-path="selectedProjectedPath" @select="onSelect" />
    <div class="right">
      <FileViewer
        :path="loadPath"
        :source-hint="sourceHint"
        :projected-path="projectedPath"
        :platform="settings.platform"
        :synthesized="synthesized"
        :note="note"
        :inputs="inputs"
        @navigate="onNavigate"
        @open-source="onOpenSource"
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
import type { Platform, ProjectionEntry, ProjectionResponse } from '../shared/types'
import { apiFiles, apiProjection } from '../shared/api'
import type { SelectedEntry } from '../components/FileTree.vue'
import { useViewerSettings } from '../composables/useViewerSettings'

const route = useRoute()
const router = useRouter()
const settings = useViewerSettings()

const selectedProjectedPath = ref<string | null>(null)
const loadPath = ref<string | null>(null)
const sourceHint = ref<string | null>(null)
const projectedPath = ref<string | null>(null)
const synthesized = ref(false)
const note = ref<string | null>(null)
const inputs = ref<string[]>([])
const namesToPath = ref<Record<string, string>>({})
// Keyed by projected path: supplies bundle inputs and resolves ?path= links.
const entriesByPath = ref<Record<string, ProjectionEntry>>({})

const focusName = computed(() => {
  if (!loadPath.value) return null
  const m = loadPath.value.match(/\/([^/]+)\.md$/)
  return m ? m[1] : null
})

async function loadNameIndex() {
  const { files } = await $fetch<{ files: { name: string; path: string }[] }>(apiFiles())
  const map: Record<string, string> = {}
  for (const f of files) map[f.name] = f.path
  namesToPath.value = map
}

// Bumped on every platform switch, so a slow projection cannot install itself
// after a later one already has.
let indexSeq = 0

/** Index the active platform's projection by projected path. */
async function loadProjectionIndex(platform: Platform) {
  const seq = ++indexSeq
  entriesByPath.value = {}
  if (platform === 'raw') return
  try {
    const res = await $fetch<ProjectionResponse>(apiProjection(platform))
    if (seq !== indexSeq) return
    const map: Record<string, ProjectionEntry> = {}
    for (const e of res.entries) map[e.projectedPath] = e
    entriesByPath.value = map
  } catch {
    if (seq === indexSeq) entriesByPath.value = {}
  }
}

/** Paths the file API will serve. */
function isLibraryPath(p: string): boolean {
  return /^(SKILLS|AGENTS|KNOWLEDGE|platforms)\//.test(p)
}

/** Resolve a URL path through the projection before treating it as a library file. */
function applyPath(p: string) {
  const entry = entriesByPath.value[p]
  if (entry) {
    onSelect({
      projectedPath: entry.projectedPath,
      sourcePath: entry.sourcePath,
      synthesized: entry.synthesized,
      note: entry.note
    })
    return
  }
  if (isLibraryPath(p)) {
    loadPath.value = p
    selectedProjectedPath.value = p
    clearProjection()
    return
  }
  // Unknown to both — select without reading.
  selectedProjectedPath.value = p
}

/** Reset projection state when navigating to a library file. */
function clearProjection() {
  sourceHint.value = null
  projectedPath.value = null
  synthesized.value = false
  note.value = null
  inputs.value = []
}

function onSelect(entry: SelectedEntry) {
  selectedProjectedPath.value = entry.projectedPath

  if (entry.isInput) {
    // A bundle input is a library file.
    loadPath.value = entry.sourcePath
    clearProjection()
    router.replace({ query: { path: entry.sourcePath || entry.projectedPath } })
    return
  }

  loadPath.value = entry.sourcePath
  projectedPath.value = entry.projectedPath
  synthesized.value = !!entry.synthesized
  note.value = entry.note || null
  inputs.value = entriesByPath.value[entry.projectedPath]?.inputs || []
  sourceHint.value =
    entry.sourcePath && entry.sourcePath !== entry.projectedPath ? entry.sourcePath : null
  // Not the source path — a refresh would reopen it as a plain library file.
  router.replace({ query: { path: entry.projectedPath } })
}

/** Open a library file directly (wikilink, or an entry in the input list). */
function openLibraryFile(path: string) {
  loadPath.value = path
  selectedProjectedPath.value = path
  clearProjection()
  router.replace({ query: { path } })
}

function onNavigate(name: string) {
  const p = namesToPath.value[name]
  if (p) openLibraryFile(p)
}

function onOpenSource(path: string) {
  openLibraryFile(path)
}

function onMinimapSelect(path: string) {
  openLibraryFile(path)
}

onMounted(async () => {
  // Index before applying the URL path, or a projected path won't resolve.
  await Promise.all([loadNameIndex(), loadProjectionIndex(settings.platform)])
  const q = route.query.path
  if (typeof q === 'string' && q) applyPath(q)
})

watch(() => settings.platform, async (p) => {
  clearProjection()
  await loadProjectionIndex(p)
})

watch(() => route.query.path, (q) => {
  if (typeof q === 'string' && q && q !== loadPath.value) applyPath(q)
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
