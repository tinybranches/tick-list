<script setup>
import { computed, nextTick, ref, watch } from 'vue'

const PREVIEW_LINES = 4

const props = defineProps({
  code: { type: String, default: '' },
  lang: { type: String, default: '' },
  editable: { type: Boolean, default: true },
})

const emit = defineEmits(['save'])

const editing = ref(false)
const draft = ref('')
const copied = ref(false)
const expanded = ref(false)
const editor = ref(null)
let copyTimer = null

const lineCount = computed(() => {
  const source = String(props.code ?? '')
  if (!source) return 0
  return source.replace(/\n$/, '').split('\n').length
})

const needsCollapse = computed(() => lineCount.value > PREVIEW_LINES)

const previewCode = computed(() => {
  if (!needsCollapse.value || expanded.value) return props.code
  return String(props.code ?? '')
    .replace(/\n$/, '')
    .split('\n')
    .slice(0, PREVIEW_LINES)
    .join('\n')
})

watch(
  () => props.code,
  (value) => {
    if (!editing.value) draft.value = value
    expanded.value = false
  },
  { immediate: true },
)

async function copyCode() {
  const value = props.code || ''
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    const area = document.createElement('textarea')
    area.value = value
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.left = '-9999px'
    document.body.appendChild(area)
    area.select()
    document.execCommand('copy')
    document.body.removeChild(area)
  }
  copied.value = true
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => {
    copied.value = false
  }, 1400)
}

function startEdit() {
  if (!props.editable) return
  draft.value = props.code || ''
  editing.value = true
  expanded.value = true
  nextTick(() => editor.value?.focus())
}

function cancelEdit() {
  editing.value = false
  draft.value = props.code || ''
}

function saveEdit() {
  emit('save', draft.value)
  editing.value = false
}

function toggleExpand() {
  expanded.value = !expanded.value
}
</script>

<template>
  <div class="code-block" @click.stop>
    <div class="code-toolbar">
      <span class="code-lang">{{ lang || 'code' }}</span>
      <div class="code-actions">
        <button
          v-if="editable && !editing"
          type="button"
          class="code-btn"
          @click="startEdit"
        >
          Edit
        </button>
        <button type="button" class="code-btn" @click="copyCode">
          {{ copied ? 'Copied' : 'Copy' }}
        </button>
      </div>
    </div>

    <form v-if="editing" class="code-edit" @submit.prevent="saveEdit">
      <textarea
        ref="editor"
        v-model="draft"
        spellcheck="false"
        @keydown.escape.prevent="cancelEdit"
        @keydown.meta.enter.prevent="saveEdit"
        @keydown.ctrl.enter.prevent="saveEdit"
      />
      <div class="code-edit-actions">
        <button type="button" class="code-btn ghost" @click="cancelEdit">
          Cancel
        </button>
        <button type="submit" class="code-btn primary">Save</button>
      </div>
    </form>

    <div v-else class="code-view">
      <pre
        class="code-pre"
        :class="{ collapsed: needsCollapse && !expanded }"
      ><code>{{ previewCode }}</code></pre>
      <button
        v-if="needsCollapse"
        type="button"
        class="code-more"
        @click="toggleExpand"
      >
        {{ expanded ? 'Show less' : `Show more · ${lineCount} lines` }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.code-block {
  margin: 0.35rem 0;
  border: 1px solid rgba(107, 149, 240, 0.22);
  border-radius: 12px;
  overflow: hidden;
  background: #0b1018;
}

.code-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.45rem 0.65rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
}

.code-lang {
  color: var(--muted);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.code-actions,
.code-edit-actions {
  display: flex;
  gap: 0.35rem;
}

.code-btn {
  appearance: none;
  border: 1px solid var(--stroke);
  border-radius: 8px;
  padding: 0.22rem 0.55rem;
  background: rgba(255, 255, 255, 0.04);
  color: var(--muted);
  font: inherit;
  font-size: 0.7rem;
  font-weight: 650;
  cursor: pointer;
}

.code-btn:hover {
  color: var(--text);
  border-color: var(--stroke-strong);
}

.code-btn.primary {
  background: var(--accent);
  border-color: transparent;
  color: #0b1020;
}

.code-btn.ghost {
  background: transparent;
}

.code-view {
  position: relative;
}

.code-pre {
  margin: 0;
  padding: 0.8rem 0.85rem;
  overflow-x: auto;
  color: #d7e0f2;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  line-height: 1.5;
  white-space: pre;
}

.code-pre.collapsed {
  padding-bottom: 0.35rem;
}

.code-pre.collapsed::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 2.1rem;
  height: 2.4rem;
  pointer-events: none;
  background: linear-gradient(to bottom, transparent, #0b1018);
}

.code-pre code {
  font: inherit;
}

.code-more {
  appearance: none;
  display: block;
  width: 100%;
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding: 0.5rem 0.85rem;
  background: rgba(255, 255, 255, 0.03);
  color: var(--accent-soft);
  font: inherit;
  font-size: 0.72rem;
  font-weight: 650;
  text-align: left;
  cursor: pointer;
}

.code-more:hover {
  background: rgba(107, 149, 240, 0.1);
  color: #c5d5ff;
}

.code-edit {
  display: grid;
  gap: 0.45rem;
  padding: 0.65rem;
}

.code-edit textarea {
  width: 100%;
  min-height: 10rem;
  resize: vertical;
  border: 1px solid var(--stroke);
  border-radius: 8px;
  padding: 0.7rem 0.75rem;
  background: #080c14;
  color: #d7e0f2;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  line-height: 1.5;
  outline: none;
}

.code-edit textarea:focus {
  border-color: rgba(91, 141, 239, 0.45);
}

.code-edit-actions {
  justify-content: flex-end;
}
</style>
