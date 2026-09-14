<template>
  <div class="graph-wrap" :class="{ compact, ready }">
    <div v-if="!compact" class="legend">
      <span class="dot" style="background:#15803d" /> Skill
      <span class="dot" style="background:#7c3aed" /> Agent
      <span class="dot" style="background:#4a4a4a" /> Knowledge
      <span class="dot" style="background:#c8d2c8" /> Missing
    </div>
    <div ref="container" class="graph" />
    <div v-if="error" class="loading error">{{ error }}</div>
    <div v-else-if="!ready" class="loading">Laying out…</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { DataSet } from 'vis-data/peer'
import { Network } from 'vis-network/peer'
import 'vis-network/styles/vis-network.css'
import type { FilesResponse } from '../shared/types'
import { apiFiles } from '../shared/api'
import { useTeamFilter } from '../composables/useTeamFilter'

const props = defineProps<{
  compact?: boolean
  focusName?: string | null
  matchedNames?: Set<string> | null
}>()
const emit = defineEmits<{ (e: 'select', path: string): void }>()
const { closure } = useTeamFilter() // global team filter

const container = ref<HTMLDivElement | null>(null)
const ready = ref(false)
const error = ref<string | null>(null)
let network: Network | null = null
let nodes: DataSet<any> | null = null
let edges: DataSet<any> | null = null

const COLORS: Record<string, { bg: string; text: string }> = {
  SKILL: { bg: '#15803d', text: '#ffffff' },
  AGENT: { bg: '#7c3aed', text: '#ffffff' },
  KNOWLEDGE: { bg: '#4a4a4a', text: '#ffffff' },
  MISSING: { bg: '#c8d2c8', text: '#6b6b6b' }
}

function nodeStyle(kind: string) {
  const c = COLORS[kind] || COLORS.MISSING
  return {
    color: { background: c.bg, border: '#ffffff', highlight: { background: c.bg, border: '#7c3aed' } },
    font: { color: c.text, size: props.compact ? 10 : 13, face: 'ui-monospace, monospace' },
    shape: 'box' as const,
    margin: props.compact ? 4 : 8,
    widthConstraint: { maximum: props.compact ? 100 : 180 }
  }
}

async function build() {
  try {
    await buildGraph()
  } catch (err) {
    console.error('[GraphView] failed to build graph', err)
    error.value = 'Failed to load graph'
  }
}

async function buildGraph() {
  const { files } = await $fetch<FilesResponse>(apiFiles())

  nodes = new DataSet<any>(
    files.map((f) => ({
      id: f.name,
      label: f.name,
      ...nodeStyle(f.kind),
      title: f.description || f.path,
      _path: f.path
    }))
  )

  // Stub nodes for any links pointing to nonexistent files
  const known = new Set(files.map((f) => f.name))
  const missing = new Set<string>()
  for (const f of files) for (const l of f.links) if (!known.has(l.name)) missing.add(l.name)
  for (const m of missing) {
    nodes.add({ id: m, label: m, ...nodeStyle('MISSING'), title: 'unresolved link', _path: null })
  }

  edges = new DataSet<any>(
    files.flatMap((f) =>
      f.links.map((l, i) => ({
        id: `${f.name}->${l.name}#${i}`,
        from: f.name,
        to: l.name,
        arrows: { to: { enabled: true, scaleFactor: props.compact ? 0.4 : 0.7 } },
        color: { color: '#aebbae', opacity: 0.85, highlight: '#15803d' },
        width: 1
      }))
    )
  )

  network = new Network(
    container.value!,
    { nodes, edges },
    {
      autoResize: true,
      physics: {
        stabilization: { enabled: true, iterations: 600, updateInterval: 600, fit: true },
        barnesHut: {
          gravitationalConstant: -7000,
          centralGravity: 0.25,
          springLength: 130,
          springConstant: 0.04,
          damping: 0.4
        }
      },
      interaction: {
        hover: true,
        navigationButtons: false,
        tooltipDelay: 200,
        zoomView: true,
        dragView: true,
        dragNodes: !props.compact,
        zoomSpeed: props.compact ? 0.6 : 1
      },
      edges: { smooth: { enabled: true, type: 'continuous', roundness: 0.3 } }
    }
  )

  network.once('stabilizationIterationsDone', () => {
    // Freeze the layout so nothing drifts after reveal.
    network!.setOptions({ physics: { enabled: false } })
    applyFocus()
    applyDim()
    ready.value = true
  })

  network.on('click', (params) => {
    if (params.nodes.length === 0) return
    const node = nodes!.get(params.nodes[0]) as any
    if (node?._path) emit('select', node._path)
  })
}

function applyFocus() {
  if (!network || !props.focusName) return
  try {
    network.focus(props.focusName, { scale: props.compact ? 1.4 : 1.1, animation: false })
  } catch {
    /* node not in graph */
  }
}

function applyDim() {
  if (!nodes || !edges) return
  const matches = props.matchedNames
  const team = closure.value
  const ids = nodes.getIds() as string[]
  // A node is lit when it passes both the search filter and the team filter.
  const isLit = (id: string) => (!matches || matches.has(id)) && (!team || team.has(id))
  if (!matches && !team) {
    nodes.update(ids.map((id) => ({ id, opacity: 1 })))
    edges.update(edges.getIds().map((id) => ({ id, color: { color: '#aebbae', opacity: 0.85, highlight: '#15803d' } })))
    return
  }
  nodes.update(ids.map((id) => ({ id, opacity: isLit(id) ? 1 : 0.15 })))
  edges.update(
    (edges.get() as any[]).map((e) => {
      const lit = isLit(e.from) && isLit(e.to)
      return { id: e.id, color: { color: '#aebbae', opacity: lit ? 0.85 : 0.08, highlight: '#15803d' } }
    })
  )
}

watch(() => props.focusName, () => {
  if (ready.value) applyFocus()
})

watch(() => props.matchedNames, () => {
  if (ready.value) applyDim()
}, { deep: false })

watch(closure, () => {
  if (ready.value) applyDim()
})

onMounted(build)
onBeforeUnmount(() => {
  network?.destroy()
  network = null
  nodes = null
  edges = null
})
</script>

<style scoped>
.graph-wrap { position: relative; width: 100%; height: 100%; }
.graph {
  width: 100%;
  height: 100%;
  background: var(--r-surface-2);
  opacity: 0;
  transition: opacity 240ms ease-out;
}
.graph-wrap.ready .graph { opacity: 1; }
.graph-wrap.compact .graph { background: var(--r-surface); }
.loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--r-muted);
  font-size: 12px;
  pointer-events: none;
}
.loading.error { color: var(--r-del); }
.legend {
  position: absolute;
  top: var(--r-3);
  left: var(--r-3);
  display: flex;
  gap: 14px;
  align-items: center;
  background: rgba(255, 255, 255, 0.9);
  padding: var(--r-2) var(--r-3);
  border-radius: var(--r-radius-sm);
  font-size: 12px;
  z-index: 10;
  border: 1px solid var(--r-line);
  box-shadow: var(--r-shadow-1);
  color: var(--r-ink-2);
}
.dot { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 4px; }
</style>
