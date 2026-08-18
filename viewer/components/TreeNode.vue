<template>
  <li>
    <div
      class="row"
      :class="{ dir: node.isDir, file: !node.isDir, selected: !node.isDir && selected === node.path, synth: node.synthesized }"
      @click="onClick"
    >
      <span class="icon">{{ node.isDir ? (expanded ? '▾' : '▸') : node.synthesized ? '✦' : '•' }}</span>
      <span class="name">{{ node.name }}</span>
      <span v-if="node.note" class="note">{{ node.note }}</span>
    </div>
    <ul v-if="node.isDir && expanded" class="nested">
      <TreeNode
        v-for="c in node.children || []"
        :key="c.path"
        :node="c"
        :selected="selected"
        @select="$emit('select', $event)"
      />
    </ul>
  </li>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface TreeNode {
  name: string
  path: string
  sourcePath: string | null
  synthesized?: boolean
  note?: string
  isDir: boolean
  children?: TreeNode[]
}

const props = defineProps<{ node: TreeNode; selected: string | null }>()
const emit = defineEmits<{ (e: 'select', n: TreeNode): void }>()
const expanded = ref(true)

function onClick() {
  if (props.node.isDir) expanded.value = !expanded.value
  else emit('select', props.node)
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
.row.selected { background: var(--r-pine); color: #fff; }
.row.selected .note { color: var(--r-violet-soft); }
.row.dir { color: var(--r-pine); font-weight: 600; }
.row.synth .icon { color: var(--r-violet); }
.icon { width: 12px; text-align: center; font-size: 11px; flex-shrink: 0; }
.name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.note { font-size: 10px; color: var(--r-muted); flex-shrink: 0; }
.nested { padding-left: 14px; margin: 0; }
</style>
