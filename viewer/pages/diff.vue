<template>
  <div class="diff-page">
    <DriftList :selected-key="selectedKey" @select="onSelect" />
    <DiffView :selection="selected" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { DriftSelection } from '../components/DriftList.vue'

const selected = ref<DriftSelection | null>(null)
const selectedKey = computed(() => selected.value?.key ?? null)

function onSelect(sel: DriftSelection) {
  selected.value = sel
}
</script>

<style scoped>
.diff-page { display: flex; width: 100%; height: 100%; min-height: 0; }
</style>
