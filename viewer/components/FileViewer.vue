<template>
  <section class="viewer">
    <div v-if="!path && !projectedPath" class="empty">Select a file from the tree or click a node in the graph.</div>
    <div v-else class="content">
      <header class="head">
        <h2>{{ headline }}</h2>
        <div v-if="sourceHint" class="src-hint">← {{ sourceHint }}</div>

        <div v-if="canCompile" class="tabs">
          <button
            :class="{ active: mode === 'source' }"
            :disabled="!path && !inputCount"
            @click="mode = 'source'"
          >
            {{ inputCount ? `Inputs (${inputCount})` : 'Source' }}
          </button>
          <button :class="{ active: mode === 'compiled' }" @click="mode = 'compiled'">
            Compiled output
          </button>
          <span v-if="mode === 'compiled' && compiledBytes != null" class="tab-meta">
            {{ formatBytes(compiledBytes) }} · {{ platform }}
          </span>
        </div>
      </header>

      <!-- Compiled view -->
      <template v-if="mode === 'compiled'">
        <div v-if="compiledPending" class="empty">Compiling…</div>
        <pre v-else-if="compiledError" class="compile-err">{{ compiledError }}</pre>
        <pre v-else class="compiled">{{ compiled }}</pre>
      </template>

      <!-- Keying on `!path` labelled the tab "Inputs (2)" then showed source. -->
      <div v-else-if="inputs.length" class="inputs">
        <p class="lede">
          Built at compile time from <b>{{ inputs.length }}</b> library files, concatenated in this order.
          <span v-if="note">{{ note }}.</span>
        </p>
        <ol class="input-list">
          <li v-for="(inp, i) in inputs" :key="inp">
            <span class="idx">{{ i + 1 }}</span>
            <a href="#" @click.prevent="$emit('open-source', inp)">{{ inp }}</a>
          </li>
        </ol>
      </div>

      <div v-else-if="!path" class="synth-body">
        <p><strong>Synthesized at build time.</strong> This file has no source in the library.</p>
        <p v-if="note" class="note">{{ note }}</p>
      </div>

      <div v-else-if="pending" class="empty">Loading…</div>
      <article v-else class="body" v-html="rendered" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import MarkdownIt from 'markdown-it'
import type { ProjectedFileResponse, Platform } from '../shared/types'
import { formatBytes } from '../shared/tree'

const props = defineProps<{
  /** Library file to render as markdown. Null for pure bundles. */
  path: string | null
  sourceHint?: string | null
  /** Set when the selection came from a compiled platform view. */
  projectedPath?: string | null
  platform?: Platform
  synthesized?: boolean
  note?: string | null
  /** Library sources compiled into this file, in build order. */
  inputs?: string[]
}>()
const emit = defineEmits<{
  (e: 'navigate', name: string): void
  (e: 'open-source', path: string): void
}>()

const md = new MarkdownIt({ html: false, linkify: true, breaks: false })
const pending = ref(false)
const rendered = ref('')

const mode = ref<'source' | 'compiled'>('source')
const compiled = ref('')
const compiledBytes = ref<number | null>(null)
const compiledPending = ref(false)
const compiledError = ref('')

const inputs = computed(() => props.inputs ?? [])
const inputCount = computed(() => inputs.value.length)
const note = computed(() => props.note || null)
const sourceHint = computed(() => props.sourceHint || null)
const headline = computed(() => props.projectedPath || props.path || '')

/** Only a compiled platform has a post-build form. */
const canCompile = computed(
  () => !!props.projectedPath && !!props.platform && props.platform !== 'raw'
)

// Bumped per load, checked before every write: A must not overwrite B.
let sourceSeq = 0

async function loadSource(p: string) {
  const seq = ++sourceSeq
  pending.value = true
  try {
    // Non-library sources are readable only via a projection that names them.
    const res = await $fetch<{ content: string }>('/api/file', {
      query: { path: p, ...(props.platform && props.platform !== 'raw' ? { platform: props.platform } : {}) }
    })
    if (seq !== sourceSeq) return
    rendered.value = renderMd(res.content)
  } catch {
    if (seq !== sourceSeq) return
    rendered.value = '<p class="err">Could not load file.</p>'
  } finally {
    if (seq === sourceSeq) pending.value = false
  }
}

// Bumped per selection. Checked before every write, including in catch and
// finally — a 404 for the previous file must not surface on the current one.
let compileSeq = 0

async function loadCompiled() {
  if (!canCompile.value) return
  const seq = ++compileSeq
  compiledPending.value = true
  compiledError.value = ''
  try {
    const res = await $fetch<ProjectedFileResponse>('/api/projected-file', {
      query: { platform: props.platform, path: props.projectedPath }
    })
    if (seq !== compileSeq) return
    compiled.value = res.content
    compiledBytes.value = res.bytes
  } catch (err: any) {
    if (seq !== compileSeq) return
    compiledError.value = err?.data?.statusMessage || 'Could not compile this file.'
    compiledBytes.value = null
  } finally {
    if (seq === compileSeq) compiledPending.value = false
  }
}

function renderMd(src: string): string {
  // Split optional YAML frontmatter so we render it as a styled block, body as markdown
  let frontmatter = ''
  let body = src
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/)
  if (m) {
    frontmatter = m[1]
    body = src.slice(m[0].length)
  }
  let html = md.render(body)
  // Post-process the rendered HTML so wikilinks survive markdown-it's HTML escaping
  html = html.replace(/\[\[([a-z0-9-]+)\]\]/g, (_, name) =>
    `<a href="#" data-wikilink="${name}" class="wikilink">[[${name}]]</a>`
  )
  // Also linkify YAML-style "[[name]]" inside the frontmatter block (it's already escaped to &#91;&#91;)
  const fmHtml = frontmatter
    ? `<pre class="frontmatter">${linkifyFrontmatter(escapeHtml(frontmatter))}</pre>`
    : ''
  return fmHtml + html
}

function linkifyFrontmatter(escaped: string): string {
  // Both "[[name]]" and "&quot;[[name]]&quot;" forms — match the inner name
  return escaped.replace(/\[\[([a-z0-9-]+)\]\]/g, (_, name) =>
    `<a href="#" data-wikilink="${name}" class="wikilink">[[${name}]]</a>`
  )
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

watch(() => props.path, (p) => {
  sourceSeq++            // abandon any load still in flight
  if (p) loadSource(p)
  else rendered.value = ''
}, { immediate: true })

// Bundles have no source file, so they open on the compiled bytes.
watch(() => props.projectedPath, () => {
  compileSeq++            // abandon any compile still in flight
  compiled.value = ''
  compiledBytes.value = null
  compiledError.value = ''
  mode.value = !props.path && canCompile.value ? 'compiled' : 'source'
  if (mode.value === 'compiled') loadCompiled()
})

watch(mode, (m) => {
  if (m === 'compiled' && !compiled.value && !compiledPending.value) loadCompiled()
})

// Intercept wikilink clicks
function handleClick(e: MouseEvent) {
  const t = (e.target as HTMLElement).closest('a.wikilink') as HTMLElement | null
  if (!t) return
  e.preventDefault()
  const name = t.getAttribute('data-wikilink')
  if (name) emit('navigate', name)
}

onMounted(() => document.addEventListener('click', handleClick))
onBeforeUnmount(() => document.removeEventListener('click', handleClick))
</script>

<style scoped>
.viewer { flex: 1; min-width: 0; overflow-y: auto; padding: var(--r-5) var(--r-6); background: var(--r-surface-2); }
.empty { color: var(--r-muted); padding: var(--r-7); text-align: center; }
.synth-body { line-height: 1.6; color: var(--r-ink-2); max-width: 820px; }
.synth-body strong { color: var(--r-pine); }
.synth-body .note { margin-top: var(--r-3); font-size: 12px; font-family: var(--r-mono); color: var(--r-muted); }
.head { margin-bottom: var(--r-4); padding-bottom: var(--r-3); border-bottom: 2px solid var(--r-violet); }
.head h2 { margin: 0; font-size: 14px; font-family: var(--r-mono); color: var(--r-pine); font-weight: 600; word-break: break-all; }
.src-hint { font-size: 12px; color: var(--r-muted); margin-top: 4px; font-family: var(--r-mono); }
.tabs { display: flex; align-items: center; gap: var(--r-2); margin-top: var(--r-3); }
.tabs button {
  background: var(--r-surface);
  border: 1px solid var(--r-line);
  color: var(--r-ink-2);
  border-radius: var(--r-radius-sm);
  padding: 3px 10px;
  font-size: 11px;
  font-family: var(--r-mono);
  cursor: pointer;
  transition: background var(--r-dur) var(--r-ease), color var(--r-dur) var(--r-ease);
}
.tabs button:hover:not(:disabled) { background: var(--r-surface-3); }
.tabs button.active { background: var(--r-pine); color: #fff; border-color: transparent; }
.tabs button:disabled { opacity: 0.4; cursor: default; }
.tab-meta { font-size: 10px; font-family: var(--r-mono); color: var(--r-muted); margin-left: auto; }
.compiled, .compile-err {
  background: var(--r-surface);
  border: 1px solid var(--r-line);
  border-left: 3px solid var(--r-violet);
  border-radius: var(--r-radius-sm);
  padding: var(--r-4);
  font-family: var(--r-mono);
  font-size: 11.5px;
  line-height: 1.55;
  color: var(--r-ink);
  white-space: pre-wrap;
  word-break: break-word;
  box-shadow: var(--r-shadow-1);
}
.compile-err { border-left-color: var(--r-pine); color: var(--r-pine); }
.inputs { max-width: 820px; }
.inputs .lede { color: var(--r-ink-2); line-height: 1.6; margin: 0 0 var(--r-4); }
.inputs .lede b { color: var(--r-pine); }
.input-list { list-style: none; padding: 0; margin: 0; }
.input-list li { display: flex; align-items: center; gap: var(--r-3); padding: 3px 0; }
.input-list .idx {
  min-width: 22px;
  text-align: right;
  font-family: var(--r-mono);
  font-size: 10px;
  color: var(--r-muted);
}
.input-list a { color: var(--r-pine); font-family: var(--r-mono); font-size: 12px; text-decoration: none; }
.input-list a:hover { text-decoration: underline; }
.body { max-width: 820px; line-height: 1.6; color: var(--r-ink); }
</style>

<style>
.viewer .frontmatter {
  background: var(--r-surface);
  border: 1px solid var(--r-line);
  border-left: 3px solid var(--r-violet);
  padding: var(--r-3) var(--r-4);
  border-radius: var(--r-radius-sm);
  font-family: var(--r-mono);
  font-size: 12px;
  color: var(--r-ink-2);
  white-space: pre-wrap;
  margin-bottom: var(--r-5);
  box-shadow: var(--r-shadow-1);
}
.viewer .body h1 { font-size: 22px; margin-top: var(--r-5); color: var(--r-ink); letter-spacing: -0.01em; }
.viewer .body h2 { font-size: 18px; margin-top: 22px; color: var(--r-pine); }
.viewer .body h3 { font-size: 15px; margin-top: 18px; color: var(--r-ink-2); }
.viewer .body p { margin: 10px 0; }
.viewer .body code {
  background: var(--r-surface-3);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
  font-family: var(--r-mono);
}
.viewer .body pre {
  background: var(--r-surface);
  border: 1px solid var(--r-line);
  padding: var(--r-3);
  border-radius: var(--r-radius-sm);
  overflow-x: auto;
  font-size: 12px;
  box-shadow: var(--r-shadow-1);
}
.viewer .body pre code { background: transparent; padding: 0; }
.viewer .body a { color: var(--r-pine); text-decoration: none; font-weight: 500; }
.viewer .body a:hover { text-decoration: underline; }
.viewer .body a.wikilink {
  color: var(--r-pine-700);
  background: var(--r-violet-soft);
  padding: 1px 6px;
  border-radius: 3px;
  font-family: var(--r-mono);
  font-size: 12px;
  font-weight: 500;
}
.viewer .body a.wikilink:hover { background: var(--r-violet); text-decoration: none; }
.viewer .body ul, .viewer .body ol { padding-left: 22px; }
.viewer .body blockquote { border-left: 3px solid var(--r-violet); padding-left: var(--r-3); color: var(--r-ink-2); }
.viewer .body table { border-collapse: collapse; margin: var(--r-3) 0; background: var(--r-surface); }
.viewer .body th, .viewer .body td { border: 1px solid var(--r-line); padding: 6px 10px; }
.viewer .body th { background: var(--r-surface-3); color: var(--r-pine-700); }
</style>
