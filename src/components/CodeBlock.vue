<script setup>
import { nextTick, ref, watch } from 'vue'

const props = defineProps({
  code: { type: String, default: '' },
  lang: { type: String, default: '' },
  editable: { type: Boolean, default: true },
})

const emit = defineEmits(['save'])

const editing = ref(false)
const draft = ref('')
const copied = ref(false)
const editor = ref(null)
let copyTimer = null

watch(
  () => props.code,
  (value) => {
    if (!editing.value) draft.value = value
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

    <pre v-else class="code-pre"><code>{{ code }}</code></pre>
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
  border-radius: 999px;
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

.code-pre code {
  font: inherit;
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
