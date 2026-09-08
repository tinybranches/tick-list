<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  attachmentFromFile,
  attachmentsFromClipboard,
} from '../stores/board'
import MediaLightbox from './MediaLightbox.vue'
import { looksLikeCode, wrapCodeIfNeeded } from '../utils/richText'

const props = defineProps({
  open: { type: Boolean, default: false },
  initialText: { type: String, default: '' },
  initialAttachments: { type: Array, default: () => [] },
})

const emit = defineEmits(['cancel', 'done'])

const draft = ref('')
const attachments = ref([])
const priority = ref('normal')
const attachError = ref('')
const fileInput = ref(null)
const textareaEl = ref(null)
const galleryOpen = ref(false)
const galleryIndex = ref(0)
const backdropArmed = ref(false)

const canSubmit = computed(
  () => draft.value.trim().length > 0 || attachments.value.length > 0,
)

function armBackdrop(event) {
  backdropArmed.value = event.target === event.currentTarget
}

function onBackdropClick(event) {
  if (backdropArmed.value && event.target === event.currentTarget) {
    emit('cancel')
  }
  backdropArmed.value = false
}

function reset() {
  draft.value = props.initialText || ''
  attachments.value = [...(props.initialAttachments || [])]
  priority.value = 'normal'
  attachError.value = ''
  galleryOpen.value = false
}

watch(
  () => props.open,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
    if (open) {
      reset()
      nextTick(() => textareaEl.value?.focus())
    }
  },
)

function onKeydown(event) {
  if (!props.open || galleryOpen.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('cancel')
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})

async function addFiles(fileList) {
  const files = [...(fileList || [])]
  if (!files.length) return
  attachError.value = ''
  for (const file of files) {
    const attachment = await attachmentFromFile(file)
    if (!attachment) {
      attachError.value =
        'Some files were skipped (too large or unsupported). Images/videos work best under a few MB.'
      continue
    }
    attachments.value.push(attachment)
  }
}

function onFilePick(event) {
  addFiles(event.target.files)
  event.target.value = ''
}

function removeAttachment(id) {
  attachments.value = attachments.value.filter((row) => row.id !== id)
}

function openGallery(index) {
  galleryIndex.value = index
  galleryOpen.value = true
}

async function onDialogPaste(event) {
  const text = event.clipboardData?.getData('text/plain') || ''
  const items = [...(event.clipboardData?.items || [])]
  const hasMedia = items.some(
    (item) =>
      item.type.startsWith('image/') ||
      item.type.startsWith('video/') ||
      (item.kind === 'file' && item.type && !item.type.startsWith('text/')),
  )

  if (hasMedia) {
    event.preventDefault()
    event.stopPropagation()
    attachError.value = ''
    const next = await attachmentsFromClipboard(items)
    if (!next.length) {
      attachError.value = 'Could not attach pasted media (file may be too large).'
      return
    }
    attachments.value.push(...next)
    return
  }

  if (text && looksLikeCode(text)) {
    event.preventDefault()
    event.stopPropagation()
    const wrapped = wrapCodeIfNeeded(text)
    const el = textareaEl.value
    if (!el) {
      draft.value = draft.value
        ? `${draft.value.replace(/\s+$/, '')}\n\n${wrapped}`
        : wrapped
      return
    }
    const start = el.selectionStart ?? draft.value.length
    const end = el.selectionEnd ?? draft.value.length
    const before = draft.value.slice(0, start)
    const after = draft.value.slice(end)
    const spacerBefore = before && !before.endsWith('\n') ? '\n\n' : before.endsWith('\n') && !before.endsWith('\n\n') ? '\n' : ''
    const spacerAfter = after && !after.startsWith('\n') ? '\n\n' : ''
    draft.value = `${before}${spacerBefore}${wrapped}${spacerAfter}${after}`
    nextTick(() => {
      const pos = (before + spacerBefore + wrapped).length
      el.setSelectionRange(pos, pos)
      el.focus()
    })
  }
}

function submit() {
  if (!canSubmit.value) return
  emit('done', {
    text: wrapCodeIfNeeded(draft.value.trim()),
    attachments: [...attachments.value],
    priority: priority.value,
  })
}

function togglePriority() {
  priority.value = priority.value === 'high' ? 'normal' : 'high'
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="backdrop"
      role="presentation"
      @mousedown="armBackdrop"
      @click="onBackdropClick"
    >
      <div
        class="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="composer-title"
        @paste="onDialogPaste"
      >
        <header class="dialog-head">
          <h2 id="composer-title">New card</h2>
          <button
            type="button"
            class="icon-btn"
            aria-label="Close"
            @click="emit('cancel')"
          >
            ×
          </button>
        </header>

        <label class="composer-field">
          <span class="composer-hint">
            First line becomes the title · everything below is the description
          </span>
          <textarea
            ref="textareaEl"
            v-model="draft"
            class="composer-input"
            rows="6"
            placeholder="Paste a client message, or type a note…"
          />
        </label>

        <div class="priority-row">
          <button
            type="button"
            class="priority-badge"
            :class="{ on: priority === 'high' }"
            :aria-pressed="priority === 'high'"
            @click="togglePriority"
          >
            Priority
          </button>
          <span class="priority-hint">Pin important cards to the top</span>
        </div>

        <div class="attach-block">
          <div class="attach-toolbar">
            <button
              type="button"
              class="attach-btn"
              @click="fileInput?.click()"
            >
              + Attach files
            </button>
            <span class="attach-hint">or paste images / video</span>
            <input
              ref="fileInput"
              type="file"
              class="file-input"
              multiple
              accept="image/*,video/*,.pdf,.txt,.doc,.docx,.zip"
              @change="onFilePick"
            />
          </div>

          <div v-if="attachments.length" class="media-grid">
            <div
              v-for="(item, index) in attachments"
              :key="item.id"
              class="media-tile"
            >
              <button
                type="button"
                class="tile-open"
                :aria-label="`Open ${item.name}`"
                @click="openGallery(index)"
              >
                <img
                  v-if="item.kind === 'image'"
                  :src="item.dataUrl"
                  :alt="item.name"
                />
                <video
                  v-else-if="item.kind === 'video'"
                  :src="item.dataUrl"
                  muted
                  playsinline
                />
                <div v-else class="file-tile">
                  <span>{{ item.name }}</span>
                </div>
              </button>
              <button
                type="button"
                class="tile-remove"
                aria-label="Remove attachment"
                @click="removeAttachment(item.id)"
              >
                ×
              </button>
            </div>
          </div>

          <p v-if="attachError" class="attach-error">{{ attachError }}</p>
        </div>

        <footer class="dialog-foot">
          <button type="button" class="btn ghost" @click="emit('cancel')">
            Cancel
          </button>
          <button
            type="button"
            class="btn"
            :disabled="!canSubmit"
            @click="submit"
          >
            Done
          </button>
        </footer>
      </div>
    </div>

    <MediaLightbox
      :open="galleryOpen"
      :items="attachments"
      :index="galleryIndex"
      @close="galleryOpen = false"
      @update:index="galleryIndex = $event"
    />
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  background: rgba(8, 10, 14, 0.72);
  backdrop-filter: blur(8px);
}

.dialog {
  width: min(100%, 560px);
  max-height: min(90vh, 760px);
  overflow: auto;
  display: grid;
  gap: 0.85rem;
  padding: 1.1rem 1.1rem 1rem;
  border: 1px solid var(--stroke-strong);
  border-radius: 14px;
  background: linear-gradient(165deg, #1c222e 0%, #12161e 100%);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
}

.dialog-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.dialog-head h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.icon-btn {
  appearance: none;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--stroke);
  border-radius: 8px;
  background: transparent;
  color: var(--muted);
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
}

.composer-field {
  display: grid;
  gap: 0.4rem;
  min-width: 0;
}

.composer-hint {
  color: var(--muted);
  font-size: 0.74rem;
  line-height: 1.35;
}

.composer-input {
  width: 100%;
  resize: vertical;
  min-height: 8rem;
  border: 1px solid var(--stroke);
  border-radius: 10px;
  padding: 0.75rem 0.85rem;
  background: var(--input);
  color: var(--text);
  font: inherit;
  font-size: 0.92rem;
  line-height: 1.45;
  outline: none;
}

.composer-input:focus {
  border-color: rgba(91, 141, 239, 0.45);
}

.priority-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.priority-badge {
  appearance: none;
  display: inline-flex;
  align-items: center;
  min-height: 1.85rem;
  padding: 0 0.7rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  background: rgba(18, 22, 30, 0.88);
  color: var(--muted);
  font: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
}

.priority-badge.on {
  color: #ffb4bc;
  border-color: rgba(240, 113, 120, 0.55);
  background: rgba(240, 113, 120, 0.22);
}

.priority-hint {
  color: var(--muted);
  font-size: 0.78rem;
}

.attach-block {
  display: grid;
  gap: 0.65rem;
}

.attach-toolbar {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.attach-btn {
  appearance: none;
  border: 1px dashed var(--stroke-strong);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  color: var(--accent-soft);
  font: inherit;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
}

.attach-hint {
  color: var(--muted);
  font-size: 0.78rem;
}

.file-input {
  display: none;
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: 0.45rem;
}

.media-tile {
  position: relative;
  aspect-ratio: 1;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--stroke);
  background: rgba(0, 0, 0, 0.28);
}

.tile-open {
  appearance: none;
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.tile-open img,
.tile-open video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.file-tile {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  padding: 0.4rem;
  color: var(--muted);
  font-size: 0.62rem;
  text-align: center;
  word-break: break-word;
}

.tile-remove {
  appearance: none;
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  width: 1.35rem;
  height: 1.35rem;
  border: none;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  font-size: 0.95rem;
  line-height: 1;
  cursor: pointer;
}

.attach-error {
  margin: 0;
  color: var(--danger);
  font-size: 0.78rem;
  line-height: 1.4;
}

.dialog-foot {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding-top: 0.2rem;
}

.btn {
  appearance: none;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 0.55rem 0.95rem;
  background: var(--accent);
  color: #0b1020;
  font: inherit;
  font-size: 0.88rem;
  font-weight: 650;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn.ghost {
  background: transparent;
  border-color: var(--stroke);
  color: var(--muted);
}
</style>
