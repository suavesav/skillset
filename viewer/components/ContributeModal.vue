<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="modal">
      <header class="modal-head">
        <div class="title">
          <span class="kind" :class="selection.item.kind.toLowerCase()">{{ selection.item.kind[0] }}</span>
          <span class="name">Submit for review — {{ selection.item.name }}</span>
        </div>
        <button class="ctrl" @click="$emit('close')">✕</button>
      </header>

      <div v-if="pending && !previewData" class="status">Preparing preview…</div>
      <div v-else-if="error && !previewData" class="status err">{{ error }}</div>

      <template v-else-if="result">
        <div class="status success">
          {{ result.existing ? 'A pull request for this is already open.' : 'Pull request created — a maintainer will review it.' }}
          <a :href="result.prUrl" target="_blank" rel="noopener">{{ result.prUrl }}</a>
        </div>
      </template>

      <template v-else-if="previewData">
        <div class="summary">
          <span v-if="previewData.isNew">
            This proposes a <strong>new {{ previewData.kind.toLowerCase() }}</strong> at
            <code>{{ previewData.targetPath }}</code>.
          </span>
          <span v-else>
            This proposes an <strong>update</strong> to <code>{{ previewData.targetPath }}</code>.
          </span>
          Your local version is converted to library format — this is the exact file that will be sent.
        </div>

        <div v-if="previewData.isNew && isSkill" class="editor">
          <label class="ed-label">Teams <span class="ed-hint">which bundles ship this skill</span></label>
          <div class="chips">
            <button
              v-for="t in [...knownTeams, 'all']"
              :key="t"
              type="button"
              class="chip"
              :class="{ on: overrides.teams.includes(t) }"
              @click="toggleTeam(t)"
            >{{ t }}</button>
            <input class="chip-add" placeholder="+ team" @keydown.enter.prevent="addTeam" />
          </div>
          <p v-if="!overrides.teams.length" class="ed-warn">No team selected — this skill won't ship in any bundle.</p>

          <label class="ed-label">Description</label>
          <textarea v-model="overrides.description" class="ed-input" rows="2" />

          <label class="ed-label">Triggers <span class="ed-hint">one phrase per line</span></label>
          <textarea v-model="overrides.triggers" class="ed-input" rows="3" placeholder="natural language trigger phrase" />
        </div>

        <div v-if="previewData.validationErrors.length" class="validation">
          <div class="validation-title">⚠ Fix before submitting</div>
          <ul>
            <li v-for="(err, i) in previewData.validationErrors" :key="i">{{ cleanError(err) }}</li>
          </ul>
          <div class="validation-hint">
            Adjust the fields above, or edit the file in your skills folder and re-pick it, then reopen.
          </div>
        </div>

        <div class="editor">
          <label class="ed-label" for="submitter">
            Your GitHub handle
            <span class="ed-hint">optional — the PR is opened by skillset[bot], so this is the only credit</span>
          </label>
          <input id="submitter" v-model="submitter" class="ed-input" placeholder="octocat" />
        </div>

        <pre class="preview">{{ previewData.converted }}</pre>

        <div v-if="error" class="status err pre-line">{{ error }}</div>

        <footer class="modal-foot">
          <button class="ctrl" @click="$emit('close')">Cancel</button>
          <button
            class="ctrl primary"
            :disabled="pending || previewData.validationErrors.length > 0"
            @click="onSubmit"
          >
            {{ pending ? 'Creating PR…' : 'Create pull request' }}
          </button>
        </footer>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import type { ContributePreviewResponse, ContributeSubmitResponse, ContributeRequest } from '../shared/types'
import type { DriftSelection } from './DriftList.vue'
import { useContribute } from '../composables/useContribute'
import { useLocalFolder } from '../composables/useLocalFolder'
import { useTeamFilter } from '../composables/useTeamFilter'

const props = defineProps<{ selection: DriftSelection }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'submitted', prUrl: string): void }>()

const { pending, error, preview, submit } = useContribute()
const { files: localFiles } = useLocalFolder()
const { teams: knownTeams } = useTeamFilter()
const previewData = ref<ContributePreviewResponse | null>(null)
const result = ref<ContributeSubmitResponse | null>(null)

const isSkill = props.selection.item.kind === 'SKILL'
// Editable frontmatter for NEW skills — teams (so it lands in a bundle), plus
// description / triggers. Seeded from the first preview, re-previewed on edit.
const overrides = reactive<{ teams: string[]; description: string; triggers: string }>({
  teams: [], description: '', triggers: ''
})
let seeded = false
let debounce: ReturnType<typeof setTimeout> | null = null

// Self-reported submitter handle. PRs are authored by the neutral skillset[bot],
// so without this the human behind a submission is invisible to the reviewer.
// Remembered locally so it's typed once, not on every submission.
const SUBMITTER_KEY = 'skillset:submitter'
const submitter = ref(
  typeof window === 'undefined' ? '' : window.localStorage.getItem(SUBMITTER_KEY) ?? ''
)
watch(submitter, (v) => {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(SUBMITTER_KEY, v) } catch {}
})

/** Strip the validator's leading "ERROR" token for a cleaner message. */
function cleanError(e: string): string {
  return e.replace(/^\s*ERROR\s+/, '')
}

function buildOverrides() {
  return {
    teams: overrides.teams,
    description: overrides.description.trim() || undefined,
    triggers: overrides.triggers.split('\n').map((t) => t.trim()).filter(Boolean)
  }
}

async function request(): Promise<ContributeRequest> {
  const localPath = props.selection.location!.localPath
  // Send the browser-read content when a folder is picked (hosted app).
  const local = localFiles.value.find((f) => f.path === localPath)
  const localContent = local ? await local.read() : undefined
  const req: ContributeRequest = {
    name: props.selection.item.name, kind: props.selection.item.kind, localPath, localContent
  }
  if (previewData.value?.isNew && seeded) req.overrides = buildOverrides()
  if (submitter.value.trim()) req.submitter = submitter.value.trim()
  return req
}

async function runPreview() {
  const pd = await preview(await request())
  if (pd) previewData.value = pd
  if (pd?.isNew && !seeded) {
    overrides.description = pd.description ?? ''
    seeded = true
  }
}

onMounted(runPreview)

function toggleTeam(t: string) {
  const i = overrides.teams.indexOf(t)
  if (i >= 0) overrides.teams.splice(i, 1)
  else overrides.teams.push(t)
  runPreview()
}

function addTeam(e: Event) {
  const input = e.target as HTMLInputElement
  const v = input.value.trim()
  if (v && !overrides.teams.includes(v)) {
    overrides.teams.push(v)
    runPreview()
  }
  input.value = ''
}

watch(() => [overrides.description, overrides.triggers], () => {
  if (!seeded) return
  if (debounce) clearTimeout(debounce)
  debounce = setTimeout(runPreview, 400)
})

async function onSubmit() {
  const res = await submit(await request(), props.selection.key)
  if (res) {
    result.value = res
    emit('submitted', res.prUrl)
  }
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(25, 25, 25, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal {
  width: min(760px, 92vw);
  max-height: 86vh;
  display: flex;
  flex-direction: column;
  background: var(--r-surface);
  border: 1px solid var(--r-line);
  border-radius: var(--r-radius);
  box-shadow: var(--r-shadow-3);
  overflow: hidden;
}
.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--r-3) var(--r-4);
  border-bottom: 1px solid var(--r-line);
}
.title { display: flex; align-items: center; gap: 10px; }
.kind { width: 16px; height: 16px; border-radius: 3px; text-align: center; font-size: 10px; font-weight: bold; line-height: 16px; flex-shrink: 0; }
.kind.skill { background: var(--r-pine); color: #fff; }
.kind.agent { background: var(--r-violet); color: var(--r-ink); }
.name { font-size: 13px; color: var(--r-ink); font-family: var(--r-mono); }
.summary { padding: var(--r-3) var(--r-4); font-size: 12.5px; color: var(--r-ink-2); line-height: 1.5; }
.summary code { color: var(--r-ink); background: var(--r-surface-3); padding: 1px 5px; border-radius: 3px; font-size: 11.5px; font-family: var(--r-mono); }
.editor { padding: 0 var(--r-4) var(--r-3); display: flex; flex-direction: column; gap: 4px; }
.ed-label { font-size: 11px; font-weight: 600; color: var(--r-pine); text-transform: uppercase; letter-spacing: 0.04em; margin-top: var(--r-2); }
.ed-hint { font-weight: 400; text-transform: none; letter-spacing: 0; color: var(--r-muted); }
.chips { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.chip {
  background: var(--r-surface-2);
  color: var(--r-ink-2);
  border: 1px solid var(--r-line);
  border-radius: var(--r-radius-pill);
  padding: 3px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: all var(--r-dur) var(--r-ease);
}
.chip.on { background: var(--r-pine); color: #fff; border-color: var(--r-pine); }
.chip-add {
  background: transparent;
  border: 1px dashed var(--r-line);
  border-radius: var(--r-radius-pill);
  padding: 3px 10px;
  font-size: 12px;
  width: 80px;
  color: var(--r-ink);
  outline: none;
}
.ed-warn { font-size: 11px; color: var(--r-chg); margin: 2px 0 0; }
.ed-input {
  background: var(--r-surface-2);
  color: var(--r-ink);
  border: 1px solid var(--r-line);
  border-radius: var(--r-radius-sm);
  padding: 6px 8px;
  font-size: 12px;
  font-family: var(--r-mono);
  resize: vertical;
  outline: none;
}
.ed-input:focus { border-color: var(--r-pine); }
.validation {
  margin: 0 var(--r-4) 10px;
  padding: 10px 12px;
  background: var(--r-del-bg);
  border: 1px solid var(--r-del);
  border-radius: var(--r-radius-sm);
  font-size: 12px;
  color: var(--r-del);
}
.validation-title { font-weight: 600; margin-bottom: 4px; }
.validation ul { margin: 0; padding-left: 18px; }
.validation-hint { margin-top: 6px; color: var(--r-ink-2); font-size: 11px; }
.preview {
  flex: 1;
  overflow: auto;
  margin: 0 var(--r-4) var(--r-3);
  padding: var(--r-3);
  background: var(--r-surface-2);
  border: 1px solid var(--r-line);
  border-radius: var(--r-radius-sm);
  font-family: var(--r-mono);
  font-size: 12px;
  line-height: 1.55;
  color: var(--r-ink);
  white-space: pre-wrap;
  word-break: break-word;
}
.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: var(--r-2);
  padding: var(--r-3) var(--r-4);
  border-top: 1px solid var(--r-line);
}
.ctrl {
  background: var(--r-surface);
  color: var(--r-ink-2);
  border: 1px solid var(--r-line);
  border-radius: var(--r-radius-sm);
  padding: 5px 12px;
  font-size: 12px;
  cursor: pointer;
  font-family: var(--r-font);
  transition: border-color var(--r-dur) var(--r-ease);
}
.ctrl:hover:not(:disabled) { border-color: var(--r-pine); }
.ctrl.primary { background: var(--r-pine); color: #fff; border-color: var(--r-pine); font-weight: 600; }
.ctrl.primary:hover:not(:disabled) { background: var(--r-pine-600); }
.ctrl:disabled { opacity: 0.5; cursor: not-allowed; }
.status { padding: var(--r-5) var(--r-4); color: var(--r-ink-2); font-size: 13px; }
.status.err { color: var(--r-del); }
.status.success { color: var(--r-add); }
.status.success a { color: var(--r-pine); display: block; margin-top: 6px; word-break: break-all; }
.pre-line { white-space: pre-line; padding: 0 var(--r-4) 10px; }
</style>
