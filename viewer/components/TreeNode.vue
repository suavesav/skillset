<template>
  <li>
    <!-- Button semantics: the only keyboard path to a bundle's inputs. -->
    <div
      class="row"
      :class="rowClass"
      :role="expandable ? 'button' : undefined"
      :tabindex="interactive ? 0 : undefined"
      :aria-expanded="expandable ? String(expanded) : undefined"
      @click="onClick"
      @keydown.enter.prevent="onClick"
      @keydown.space.prevent="onClick"
    >
      <span class="icon">{{ icon }}</span>
      <span class="name">{{ node.name }}</span>
      <!-- Badge is the disclosure control; the name still opens the file. -->
      <button
        v-if="hasInputs"
        class="inputs-badge"
        :class="{ open: expanded }"
        :aria-expanded="String(expanded)"
        :title="expanded ? 'Hide inputs' : 'Show the files compiled into this'"
        @click.stop="expanded = !expanded"
        @keydown.stop
      >
        {{ expanded ? '▾' : '▸' }} inputs
      </button>
      <span v-if="node.note && !hasInputs" class="note">{{ node.note }}</span>
    </div>
    <ul v-if="expanded && node.children?.length" class="nested">
      <TreeNode
        v-for="c in node.children"
        :key="c.key"
        :node="c"
        :selected="selected"
        @select="$emit('select', $event)"
      />
    </ul>
  </li>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { TreeNodeData } from '../shared/tree'

const props = defineProps<{ node: TreeNodeData; selected: string | null }>()
const emit = defineEmits<{ (e: 'select', n: TreeNodeData): void }>()

// Real directories start open; the input list under a synthesized bundle starts
// closed, or a single codex row would dump 35 children into the tree on load.
const expanded = ref(props.node.kind !== 'bundle-input-group' && props.node.kind !== 'file')

const hasInputs = computed(() => props.node.kind === 'file' && !!props.node.inputCount)

/** Rows that toggle their own children on activation. */
const expandable = computed(
  () => props.node.kind === 'dir' || props.node.kind === 'bundle-input-group'
)
/** Rows that respond to Enter/Space at all — expandable ones, plus selectable files. */
const interactive = computed(() => expandable.value || !!props.node.path)

const icon = computed(() => {
  switch (props.node.kind) {
    case 'dir': return expanded.value ? '▾' : '▸'
    case 'bundle-input-group': return expanded.value ? '▾' : '▸'
    case 'bundle-input': return '↳'
    default: return props.node.synthesized ? '✦' : '•'
  }
})

const rowClass = computed(() => ({
  dir: props.node.kind === 'dir',
  group: props.node.kind === 'bundle-input-group',
  input: props.node.kind === 'bundle-input',
  file: props.node.kind === 'file',
  selected: !!props.node.path && props.selected === props.node.path && props.node.kind !== 'dir',
  synth: props.node.synthesized
}))

function onClick() {
  if (props.node.kind === 'dir' || props.node.kind === 'bundle-input-group') {
    expanded.value = !expanded.value
    return
  }
  emit('select', props.node)
}
</script>

<style scoped>
li { list-style: none; }
.row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: var(--r-radius-sm);
  cursor: pointer;
  user-select: none;
  color: var(--r-ink-2);
}
.row:hover { background: var(--r-surface-2); }
.row:focus-visible { outline: 2px solid var(--r-violet); outline-offset: -2px; }
.row.selected { background: var(--r-pine); color: #fff; }
.row.selected .note { color: var(--r-violet-soft); }
.row.selected .inputs-badge { background: var(--r-violet); color: var(--r-ink); border-color: transparent; }
.row.dir { color: var(--r-pine); font-weight: 600; }
.row.group { color: var(--r-ink-2); font-size: 11px; font-style: italic; }
.row.input .name { color: var(--r-ink-2); font-size: 11px; font-family: var(--r-mono); }
.row.synth .icon { color: var(--r-violet); }
.icon { width: 12px; text-align: center; font-size: 11px; flex-shrink: 0; }
.name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.note { font-size: 10px; color: var(--r-muted); flex-shrink: 0; }
.inputs-badge {
  flex-shrink: 0;
  font-size: 9px;
  font-family: var(--r-mono);
  line-height: 1;
  padding: 2px 5px;
  border-radius: 999px;
  border: 1px solid var(--r-line);
  background: var(--r-surface-3);
  color: var(--r-muted);
  cursor: pointer;
  transition: background var(--r-dur) var(--r-ease), color var(--r-dur) var(--r-ease);
}
.inputs-badge:hover, .inputs-badge.open { background: var(--r-violet); color: var(--r-ink); border-color: transparent; }
.inputs-badge:focus-visible { outline: 2px solid var(--r-violet); outline-offset: 2px; }
.nested { padding-left: 14px; margin: 0; }
</style>
