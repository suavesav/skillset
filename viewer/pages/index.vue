<template>
  <div />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useViewerSettings } from '../composables/useViewerSettings'
const router = useRouter()
const settings = useViewerSettings()
onMounted(() => {
  if (settings.showGraph) router.replace('/graph')
  else router.replace('/files')
})
</script>
