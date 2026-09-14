<template>
  <div class="app">
    <header class="topbar">
      <h1>skillset</h1>
      <nav>
        <NuxtLink to="/files">Files</NuxtLink>
        <NuxtLink v-if="settings.showGraph" to="/graph">Graph</NuxtLink>
      </nav>
      <div class="topbar-spacer" />
      <select v-if="teams.length" v-model="selectedTeam" class="team-select" title="Filter by team bundle" aria-label="Filter by team bundle">
        <option value="">All teams</option>
        <option v-for="t in teams" :key="t" :value="t">{{ t }}</option>
      </select>
      <button type="button" class="kbd-hint" title="Quick switcher" aria-label="Open quick switcher" @click="quickSwitcher?.open()">⌘K</button>
      <SettingsPopover />
      <a class="gh-link" href="https://github.com/suavesav/skillset" target="_blank" rel="noopener noreferrer">GitHub</a>
    </header>
    <main>
      <NuxtPage />
    </main>
    <QuickSwitcher ref="quickSwitcher" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useViewerSettings } from './composables/useViewerSettings'
import { useTeamFilter } from './composables/useTeamFilter'
const settings = useViewerSettings()
const { selected: selectedTeam, teams } = useTeamFilter()
const quickSwitcher = ref<{ open: () => void } | null>(null)
</script>

<style>
* { box-sizing: border-box; }
html { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
html, body, #__nuxt, .app { height: 100%; margin: 0; padding: 0; }
body {
  font-family: var(--r-font);
  background: var(--r-surface-2);
  color: var(--r-ink);
  line-height: 1.55;
}
.app { display: flex; flex-direction: column; }
.topbar {
  display: flex;
  align-items: center;
  gap: var(--r-5);
  padding: var(--r-3) var(--r-5);
  background: var(--r-surface);
  border-bottom: 1px solid var(--r-line);
  box-shadow: var(--r-shadow-1);
  flex-shrink: 0;
  position: relative;
  z-index: 20;
}
.topbar::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--r-pine), var(--r-pine-600) 60%, var(--r-violet));
}
.topbar h1 {
  font-size: 15px;
  font-weight: 700;
  margin: 0;
  color: var(--r-pine);
  letter-spacing: -0.01em;
}
.topbar nav { display: flex; gap: var(--r-2); }
.topbar a {
  color: var(--r-ink-2);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  padding: 6px 14px;
  border-radius: var(--r-radius-pill);
  transition: background var(--r-dur) var(--r-ease), color var(--r-dur) var(--r-ease);
}
.topbar a:hover { background: var(--r-surface-3); color: var(--r-ink); }
.topbar a.router-link-active { background: var(--r-pine); color: #fff; }
.topbar a.router-link-active:hover { background: var(--r-pine-600); }
.topbar-spacer { flex: 1; }
.kbd-hint {
  display: inline-block;
  padding: 3px 8px;
  font-family: var(--r-mono);
  font-size: 11px;
  color: var(--r-muted);
  background: var(--r-surface-2);
  border: 1px solid var(--r-line);
  border-radius: var(--r-radius-sm);
  cursor: pointer;
  transition: color var(--r-dur) var(--r-ease), border-color var(--r-dur) var(--r-ease);
}
.kbd-hint:hover { color: var(--r-pine); border-color: var(--r-pine); }
.team-select {
  background: var(--r-surface-2);
  color: var(--r-ink);
  border: 1px solid var(--r-line);
  border-radius: var(--r-radius-pill);
  padding: 5px 10px;
  font-size: 13px;
  cursor: pointer;
}
.team-select:hover { border-color: var(--r-pine); }
main { flex: 1; min-height: 0; display: flex; }
main > * { flex: 1; min-height: 0; }
</style>
