<template>
  <div />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()
// Files is home: it is where deep links land and where the platform selector
// lives. Graph is one click away in the topbar.
onMounted(() => {
  router.replace('/files')
})
</script>
