<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  attachmentFromFile,
  attachmentsFromClipboard,
  useBoardStore,
} from '../stores/board'
import MediaLightbox from './MediaLightbox.vue'
import LinkedText from './LinkedText.vue'
import RichText from './RichText.vue'
import BoardConfirmDialog from './BoardConfirmDialog.vue'
import { looksLikeCode, wrapCodeIfNeeded } from '../utils/richText'

const props = defineProps({
  open: { type: Boolean, default: false },
  card: { type: Object, default: null },
})

const emit = defineEmits(['close', 'closed'])

const store = useBoardStore()
const draft = ref('')
const draftAttachments = ref([])
const commentInput = ref(null)
const titleInput = ref(null)
const commentEditInput = ref(null)
const cardFileInput = ref(null)
const commentFileInput = ref(null)
const commentEditFileInput = ref(null)
const galleryOpen = ref(false)
const galleryIndex = ref(0)
const galleryItems = ref([])
const backdropArmed = ref(false)
const pendingDeleteComment = ref(null)
const editingCard = ref(false)
const editTitle = ref('')
const editBody = ref('')
const editAttachments = ref([])
const editingCommentId = ref(null)
const editCommentText = ref('')
const editCommentAttachments = ref([])
const attachError = ref('')

const liveCard = computed(() => {
  if (!props.card) return null
  return store.cards.find((row) => row.id === props.card.id) || props.card
})

function armBackdrop(event) {
  backdropArmed.value = event.target === event.currentTarget
}

function onBackdropClick(event) {
  if (pendingDeleteComment.value) return
  if (backdropArmed.value && event.target === event.currentTarget) {
    close()
  }
  backdropArmed.value = false
}

const media = computed(() => {
  const card = liveCard.value
  if (!card) return []
  if (Array.isArray(card.attachments) && card.attachments.length) {
    return card.attachments
  }
  return (card.images || []).map((dataUrl, index) => ({
    id: `${card.id}-img-${index}`,
    kind: 'image',
    dataUrl,
    name: `image-${index + 1}.jpg`,
    mime: 'image/jpeg',
  }))
})

const comments = computed(() =>
  Array.isArray(liveCard.value?.comments) ? liveCard.value.comments : [],
)

const deleteCommentPreview = computed(() => {
  const text = String(pendingDeleteComment.value?.text || '').trim()
  if (text) return text.length > 80 ? `${text.slice(0, 77)}…` : text
  const count = pendingDeleteComment.value?.attachments?.length || 0
  if (count) return `${count} attachment${count === 1 ? '' : 's'}`
  return ''
})

const canSaveCard = computed(() => Boolean(editTitle.value.trim()))
const canSaveComment = computed(
  () =>
    Boolean(editCommentText.value.trim()) ||
    editCommentAttachments.value.length > 0,
)
const canSubmitComment = computed(
  () => Boolean(draft.value.trim()) || draftAttachments.value.length > 0,
)

function formatStamp(ts) {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function resetEditors() {
  editingCard.value = false
  editTitle.value = ''
  editBody.value = ''
  editAttachments.value = []
  editingCommentId.value = null
  editCommentText.value = ''
  editCommentAttachments.value = []
  draftAttachments.value = []
  attachError.value = ''
}

function close() {
  if (pendingDeleteComment.value) return
  emit('close')
}

function onKeydown(event) {
  if (!props.open || galleryOpen.value || pendingDeleteComment.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    if (editingCommentId.value) {
      cancelEditComment()
      return
    }
    if (editingCard.value) {
      cancelEditCard()
      return
    }
    close()
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      document.body.style.overflow = 'hidden'
      draft.value = ''
      pendingDeleteComment.value = null
      resetEditors()
      nextTick(() => commentInput.value?.focus())
    }
  },
)

function onAfterLeave() {
  document.body.style.overflow = ''
  emit('closed')
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})

function startEditCard() {
  if (!liveCard.value) return
  editingCommentId.value = null
  editCommentText.value = ''
  editCommentAttachments.value = []
  editingCard.value = true
  editTitle.value = liveCard.value.title || ''
  editBody.value = liveCard.value.body || ''
  editAttachments.value = [...media.value]
  attachError.value = ''
  nextTick(() => titleInput.value?.focus())
}

function cancelEditCard() {
  editingCard.value = false
  editTitle.value = ''
  editBody.value = ''
  editAttachments.value = []
  attachError.value = ''
}

function saveCard() {
  if (!liveCard.value || !canSaveCard.value) return
  store.updateCard(liveCard.value.id, {
    title: editTitle.value,
    body: wrapCodeIfNeeded(editBody.value),
    attachments: editAttachments.value,
  })
  cancelEditCard()
}

function startEditComment(comment) {
  editingCard.value = false
  editAttachments.value = []
  editingCommentId.value = comment.id
  editCommentText.value = comment.text || ''
  editCommentAttachments.value = [...(comment.attachments || [])]
  attachError.value = ''
  nextTick(() => commentEditInput.value?.focus())
}

function cancelEditComment() {
  editingCommentId.value = null
  editCommentText.value = ''
  editCommentAttachments.value = []
  attachError.value = ''
}

function saveComment() {
  if (!liveCard.value || !editingCommentId.value || !canSaveComment.value) return
  store.updateComment(
    liveCard.value.id,
    editingCommentId.value,
    wrapCodeIfNeeded(editCommentText.value),
    editCommentAttachments.value,
  )
  cancelEditComment()
}

function updateCardBody(next) {
  if (!liveCard.value) return
  store.updateCard(liveCard.value.id, { body: next })
}

function updateCommentText(commentId, next) {
  if (!liveCard.value) return
  store.updateComment(liveCard.value.id, commentId, next)
}

function submitComment() {
  if (!liveCard.value || editingCard.value || editingCommentId.value) return
  const text = wrapCodeIfNeeded(draft.value.trim())
  if (!text && !draftAttachments.value.length) return
  store.addComment(liveCard.value.id, text, draftAttachments.value)
  draft.value = ''
  draftAttachments.value = []
  attachError.value = ''
  nextTick(() => commentInput.value?.focus())
}

function clipboardHasMedia(items) {
  return items.some(
    (item) =>
      item.type.startsWith('image/') ||
      item.type.startsWith('video/') ||
      (item.kind === 'file' && item.type && !item.type.startsWith('text/')),
  )
}

async function takePastedMedia(event) {
  const items = [...(event.clipboardData?.items || [])]
  if (!clipboardHasMedia(items)) return null
  event.preventDefault()
  attachError.value = ''
  const next = await attachmentsFromClipboard(items)
  if (!next.length) {
    attachError.value = 'Could not attach pasted media (file may be too large).'
    return []
  }
  return next
}

async function onCardEditPaste(event) {
  const next = await takePastedMedia(event)
  if (!next) return
  if (next.length) editAttachments.value.push(...next)
}

async function onCommentPaste(event) {
  const next = await takePastedMedia(event)
  if (next) {
    if (next.length) draftAttachments.value.push(...next)
    return
  }
  const text = event.clipboardData?.getData('text/plain') || ''
  if (!draft.value.trim() && looksLikeCode(text)) {
    event.preventDefault()
    draft.value = wrapCodeIfNeeded(text)
  }
}

async function onCommentEditPaste(event) {
  const next = await takePastedMedia(event)
  if (!next) return
  if (next.length) editCommentAttachments.value.push(...next)
}

async function addFilesTo(targetRef, fileList) {
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
    targetRef.value.push(attachment)
  }
}

function onCardFilePick(event) {
  addFilesTo(editAttachments, event.target.files)
  event.target.value = ''
}

function onCommentFilePick(event) {
  addFilesTo(draftAttachments, event.target.files)
  event.target.value = ''
}

function onCommentEditFilePick(event) {
  addFilesTo(editCommentAttachments, event.target.files)
  event.target.value = ''
}

function removeFrom(targetRef, id) {
  targetRef.value = targetRef.value.filter((row) => row.id !== id)
}

function openGallery(items, index = 0) {
  galleryItems.value = Array.isArray(items) ? items : []
  galleryIndex.value = index
  galleryOpen.value = true
}

function commentMedia(comment) {
  return Array.isArray(comment?.attachments) ? comment.attachments : []
}

function askDeleteComment(comment) {
  if (editingCommentId.value === comment.id) cancelEditComment()
  pendingDeleteComment.value = comment
}

function cancelDeleteComment() {
  pendingDeleteComment.value = null
  if (props.open) document.body.style.overflow = 'hidden'
}

function confirmDeleteComment() {
  if (!liveCard.value || !pendingDeleteComment.value) return
  store.removeComment(liveCard.value.id, pendingDeleteComment.value.id)
  pendingDeleteComment.value = null
  if (props.open) document.body.style.overflow = 'hidden'
}
</script>

<template>
  <Teleport to="body">
    <Transition name="card-modal" appear @after-leave="onAfterLeave">
      <div
        v-if="open"
        key="card-detail"
        class="backdrop"
        role="presentation"
        @mousedown="armBackdrop"
        @click="onBackdropClick"
      >
        <div
          v-if="liveCard"
          class="dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="card-detail-title"
        >
          <header class="dialog-head">
            <div class="head-copy">
              <template v-if="!editingCard">
                <h2 id="card-detail-title"><LinkedText :text="liveCard.title" /></h2>
                <p class="meta">
                  {{ formatStamp(liveCard.createdAt) }}
                  <span v-if="liveCard.done"> · done</span>
                  <span v-else-if="liveCard.paused"> · paused</span>
                </p>
              </template>
              <p v-else class="meta">Editing card</p>
            </div>
            <div class="head-actions">
              <button
                v-if="!editingCard"
                type="button"
                class="text-btn"
                @click="startEditCard"
              >
                Edit
              </button>
              <button
                type="button"
                class="priority-badge"
                :class="{ on: liveCard.priority === 'high' }"
                :aria-pressed="liveCard.priority === 'high'"
                @click="
                  store.setPriority(
                    liveCard.id,
                    liveCard.priority === 'high' ? 'normal' : 'high',
                  )
                "
              >
                Priority
              </button>
              <button type="button" class="icon-btn" aria-label="Close" @click="close">
                ×
              </button>
            </div>
          </header>

          <form
            v-if="editingCard"
            class="edit-card-form"
            @submit.prevent="saveCard"
            @paste="onCardEditPaste"
          >
            <label class="field">
              <span>Title</span>
              <input
                ref="titleInput"
                v-model="editTitle"
                type="text"
                maxlength="200"
                required
              />
            </label>
            <label class="field">
              <span>Details</span>
              <textarea v-model="editBody" rows="5" placeholder="Optional details…" />
            </label>

            <div class="attach-block">
              <div class="attach-toolbar">
                <button
                  type="button"
                  class="attach-btn"
                  @click="cardFileInput?.click()"
                >
                  + Attach files
                </button>
                <span class="attach-hint">or paste images / video</span>
                <input
                  ref="cardFileInput"
                  type="file"
                  class="file-input"
                  multiple
                  accept="image/*,video/*,.pdf,.txt,.doc,.docx,.zip"
                  @change="onCardFilePick"
                />
              </div>
              <div v-if="editAttachments.length" class="attach-grid">
                <div
                  v-for="(item, index) in editAttachments"
                  :key="item.id"
                  class="attach-tile"
                >
                  <button
                    type="button"
                    class="attach-open"
                    :aria-label="`Open ${item.name}`"
                    @click="openGallery(editAttachments, index)"
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
                    <span v-else class="attach-file">{{ item.name }}</span>
                  </button>
                  <button
                    type="button"
                    class="attach-remove"
                    aria-label="Remove attachment"
                    @click="removeFrom(editAttachments, item.id)"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            <div class="edit-actions">
              <button type="button" class="btn ghost" @click="cancelEditCard">
                Cancel
              </button>
              <button type="submit" class="btn" :disabled="!canSaveCard">
                Save
              </button>
            </div>
            <p v-if="attachError" class="attach-error">{{ attachError }}</p>
          </form>

          <p v-else-if="liveCard.body" class="body">
            <RichText
              :text="liveCard.body"
              editable
              @update:text="updateCardBody"
            />
          </p>

          <div v-if="!editingCard && media.length" class="media-grid">
            <button
              v-for="(item, index) in media"
              :key="item.id || index"
              type="button"
              class="media-tile"
              :class="item.kind || 'file'"
              :aria-label="`Open ${item.kind || 'attachment'}: ${item.name || ''}`"
              @click="openGallery(media, index)"
            >
              <img
                v-if="item.kind === 'image'"
                class="media-preview"
                :src="item.dataUrl"
                :alt="item.name"
              />
              <video
                v-else-if="item.kind === 'video'"
                class="media-preview"
                :src="item.dataUrl"
                muted
                playsinline
                preload="metadata"
              />
              <span v-else class="file-tile">{{ item.name }}</span>

              <span class="media-shade" aria-hidden="true" />
              <span v-if="item.kind === 'video'" class="media-play" aria-hidden="true" />
              <span class="media-kind">
                {{
                  item.kind === 'video'
                    ? 'Video'
                    : item.kind === 'image'
                      ? 'Image'
                      : 'File'
                }}
              </span>
            </button>
          </div>

          <section class="comments">
            <h3>Comments · {{ comments.length }}</h3>

            <div v-if="comments.length === 0" class="empty">
              No comments yet. Add the first note below.
            </div>

            <ul v-else class="comment-list">
              <li v-for="comment in comments" :key="comment.id" class="comment">
                <div class="comment-top">
                  <time>
                    {{ formatStamp(comment.createdAt) }}
                    <span v-if="comment.updatedAt"> · edited</span>
                  </time>
                  <div class="comment-actions">
                    <button
                      v-if="editingCommentId !== comment.id"
                      type="button"
                      class="comment-edit"
                      aria-label="Edit comment"
                      @click="startEditComment(comment)"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      class="comment-delete"
                      aria-label="Delete comment"
                      @click="askDeleteComment(comment)"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <form
                  v-if="editingCommentId === comment.id"
                  class="comment-edit-form"
                  @submit.prevent="saveComment"
                  @paste="onCommentEditPaste"
                >
                  <textarea
                    ref="commentEditInput"
                    v-model="editCommentText"
                    rows="3"
                    @keydown.meta.enter.prevent="saveComment"
                    @keydown.ctrl.enter.prevent="saveComment"
                    @keydown.escape.prevent="cancelEditComment"
                  />
                  <div class="attach-block compact">
                    <div class="attach-toolbar">
                      <button
                        type="button"
                        class="attach-btn"
                        @click="commentEditFileInput?.click()"
                      >
                        + Attach
                      </button>
                      <span class="attach-hint">or paste media</span>
                      <input
                        ref="commentEditFileInput"
                        type="file"
                        class="file-input"
                        multiple
                        accept="image/*,video/*,.pdf,.txt,.doc,.docx,.zip"
                        @change="onCommentEditFilePick"
                      />
                    </div>
                    <div v-if="editCommentAttachments.length" class="attach-grid">
                      <div
                        v-for="(item, index) in editCommentAttachments"
                        :key="item.id"
                        class="attach-tile"
                      >
                        <button
                          type="button"
                          class="attach-open"
                          :aria-label="`Open ${item.name}`"
                          @click="openGallery(editCommentAttachments, index)"
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
                          <span v-else class="attach-file">{{ item.name }}</span>
                        </button>
                        <button
                          type="button"
                          class="attach-remove"
                          aria-label="Remove attachment"
                          @click="removeFrom(editCommentAttachments, item.id)"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                  <div class="edit-actions">
                    <button type="button" class="btn ghost" @click="cancelEditComment">
                      Cancel
                    </button>
                    <button type="submit" class="btn" :disabled="!canSaveComment">
                      Save
                    </button>
                  </div>
                </form>
                <template v-else>
                  <p v-if="comment.text">
                    <RichText
                      :text="comment.text"
                      editable
                      @update:text="updateCommentText(comment.id, $event)"
                    />
                  </p>
                  <div v-if="commentMedia(comment).length" class="comment-media">
                    <button
                      v-for="(item, index) in commentMedia(comment)"
                      :key="item.id || index"
                      type="button"
                      class="media-tile"
                      :class="item.kind || 'file'"
                      :aria-label="`Open ${item.name || 'attachment'}`"
                      @click="openGallery(commentMedia(comment), index)"
                    >
                      <img
                        v-if="item.kind === 'image'"
                        class="media-preview"
                        :src="item.dataUrl"
                        :alt="item.name"
                      />
                      <video
                        v-else-if="item.kind === 'video'"
                        class="media-preview"
                        :src="item.dataUrl"
                        muted
                        playsinline
                        preload="metadata"
                      />
                      <span v-else class="file-tile">{{ item.name }}</span>
                      <span class="media-shade" aria-hidden="true" />
                      <span
                        v-if="item.kind === 'video'"
                        class="media-play"
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </template>
              </li>
            </ul>

            <form
              v-if="!editingCard && !editingCommentId"
              class="comment-form"
              @submit.prevent="submitComment"
              @paste="onCommentPaste"
            >
              <textarea
                ref="commentInput"
                v-model="draft"
                rows="3"
                placeholder="Write a comment…"
                @keydown.meta.enter.prevent="submitComment"
                @keydown.ctrl.enter.prevent="submitComment"
              />
              <div class="attach-block compact">
                <div class="attach-toolbar">
                  <button
                    type="button"
                    class="attach-btn"
                    @click="commentFileInput?.click()"
                  >
                    + Attach
                  </button>
                  <span class="attach-hint">or paste media</span>
                  <input
                    ref="commentFileInput"
                    type="file"
                    class="file-input"
                    multiple
                    accept="image/*,video/*,.pdf,.txt,.doc,.docx,.zip"
                    @change="onCommentFilePick"
                  />
                </div>
                <div v-if="draftAttachments.length" class="attach-grid">
                  <div
                    v-for="(item, index) in draftAttachments"
                    :key="item.id"
                    class="attach-tile"
                  >
                    <button
                      type="button"
                      class="attach-open"
                      :aria-label="`Open ${item.name}`"
                      @click="openGallery(draftAttachments, index)"
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
                      <span v-else class="attach-file">{{ item.name }}</span>
                    </button>
                    <button
                      type="button"
                      class="attach-remove"
                      aria-label="Remove attachment"
                      @click="removeFrom(draftAttachments, item.id)"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
              <p v-if="attachError" class="attach-error">{{ attachError }}</p>
              <button type="submit" class="btn" :disabled="!canSubmitComment">
                Add comment
              </button>
            </form>
          </section>
        </div>
      </div>
    </Transition>

    <MediaLightbox
      :open="galleryOpen"
      :items="galleryItems"
      :index="galleryIndex"
      @close="galleryOpen = false"
      @update:index="galleryIndex = $event"
    />

    <BoardConfirmDialog
      :open="Boolean(pendingDeleteComment)"
      title="Delete comment?"
      :card-title="deleteCommentPreview"
      message="will be permanently removed. This cannot be undone."
      confirm-label="Delete forever"
      variant="danger"
      @cancel="cancelDeleteComment"
      @confirm="confirmDeleteComment"
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
  max-height: min(90vh, 820px);
  overflow: auto;
  display: grid;
  gap: 0.9rem;
  padding: 1.1rem 1.1rem 1.15rem;
  border: 1px solid var(--stroke-strong);
  border-radius: 14px;
  background: linear-gradient(165deg, #1c222e 0%, #12161e 100%);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
}

.dialog-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.head-copy {
  min-width: 0;
  flex: 1 1 auto;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex: 0 0 auto;
}

.text-btn {
  appearance: none;
  border: 1px solid var(--stroke);
  border-radius: 8px;
  min-height: 2rem;
  padding: 0 0.7rem;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 0.72rem;
  font-weight: 650;
  cursor: pointer;
}

.text-btn:hover {
  color: var(--text);
  border-color: var(--stroke-strong);
}

.priority-badge {
  appearance: none;
  display: inline-flex;
  align-items: center;
  min-height: 2rem;
  padding: 0 0.7rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: rgba(18, 22, 30, 0.88);
  color: var(--muted);
  font: inherit;
  font-size: 0.7rem;
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

.dialog-head h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  word-break: break-word;
}

.meta {
  margin: 0.25rem 0 0;
  color: var(--muted);
  font-size: 0.75rem;
}

.icon-btn {
  appearance: none;
  flex: 0 0 auto;
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

.body {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--muted);
  font-size: 0.9rem;
  line-height: 1.5;
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
  gap: 0.5rem;
}

.media-tile {
  appearance: none;
  position: relative;
  aspect-ratio: 1;
  padding: 0;
  border: 1px solid var(--stroke);
  border-radius: 10px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.28);
  cursor: pointer;
}

.media-preview {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  z-index: 0;
}

.media-shade {
  position: absolute;
  inset: auto 0 0;
  z-index: 1;
  height: 42%;
  background: linear-gradient(to top, rgba(8, 10, 16, 0.82), transparent);
  pointer-events: none;
}

.media-tile.video .media-shade {
  inset: 0;
  height: auto;
  background: rgba(8, 10, 16, 0.28);
}

.media-play {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 2;
  width: 1.7rem;
  height: 1.7rem;
  margin: -0.85rem 0 0 -0.85rem;
  border-radius: 999px;
  background: rgba(12, 16, 24, 0.86);
  border: 1px solid rgba(255, 255, 255, 0.28);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
  pointer-events: none;
}

.media-play::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 52%;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 0.34rem 0 0.34rem 0.55rem;
  border-color: transparent transparent transparent #fff;
  transform: translate(-30%, -50%);
}

.media-kind {
  position: absolute;
  left: 0.35rem;
  bottom: 0.35rem;
  z-index: 3;
  padding: 0.22rem 0.42rem;
  border-radius: 5px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(8, 12, 20, 0.92);
  color: #fff;
  font-size: 0.62rem;
  font-weight: 750;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  line-height: 1;
  pointer-events: none;
}

.media-tile.video .media-kind {
  color: #d7e6ff;
  border-color: rgba(91, 141, 239, 0.45);
  background: rgba(20, 36, 68, 0.95);
}

.file-tile {
  position: relative;
  z-index: 0;
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  padding: 0.35rem;
  color: var(--muted);
  font-size: 0.62rem;
  text-align: center;
  word-break: break-word;
}

.attach-block {
  display: grid;
  gap: 0.55rem;
}

.attach-block.compact {
  gap: 0.4rem;
}

.attach-toolbar {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  flex-wrap: wrap;
}

.attach-btn {
  appearance: none;
  border: 1px dashed var(--stroke-strong);
  border-radius: 8px;
  padding: 0.4rem 0.65rem;
  background: rgba(255, 255, 255, 0.03);
  color: var(--accent-soft);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}

.attach-hint {
  color: var(--muted);
  font-size: 0.74rem;
}

.file-input {
  display: none;
}

.attach-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: 0.4rem;
}

.attach-tile {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--stroke);
  background: rgba(0, 0, 0, 0.28);
}

.attach-open {
  appearance: none;
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.attach-open img,
.attach-open video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.attach-file {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  padding: 0.3rem;
  color: var(--muted);
  font-size: 0.58rem;
  text-align: center;
  word-break: break-word;
}

.attach-remove {
  appearance: none;
  position: absolute;
  top: 0.2rem;
  right: 0.2rem;
  width: 1.2rem;
  height: 1.2rem;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 6px;
  background: rgba(8, 12, 20, 0.88);
  color: #fff;
  font-size: 0.9rem;
  line-height: 1;
  cursor: pointer;
}

.attach-error {
  margin: 0;
  color: var(--danger);
  font-size: 0.78rem;
}

.comment-media {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: 0.4rem;
  margin-top: 0.45rem;
}

.comment-media .media-tile {
  min-height: 0;
}

.comments {
  display: grid;
  gap: 0.65rem;
  padding-top: 0.35rem;
  border-top: 1px solid var(--stroke);
}

.comments h3 {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.empty {
  margin: 0;
  color: var(--muted);
  font-size: 0.84rem;
}

.comment-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.5rem;
}

.comment {
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--stroke);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.18);
}

.comment-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.3rem;
}

.comment-actions {
  display: flex;
  align-items: center;
  gap: 0.15rem;
}

.comment time {
  color: var(--muted);
  font-size: 0.7rem;
}

.comment p {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.88rem;
  line-height: 1.45;
}

.comment-edit,
.comment-delete {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  height: 1.5rem;
  margin: 0;
  border: none;
  border-radius: 6px;
  padding: 0;
  background: transparent;
  color: var(--muted);
  font: inherit;
  line-height: 1;
  cursor: pointer;
}

.comment-edit {
  padding: 0 0.45rem;
  font-size: 0.7rem;
  font-weight: 650;
}

.comment-edit:hover {
  color: var(--accent-soft);
  background: var(--accent-glow);
}

.comment-delete {
  width: 1.5rem;
  font-size: 1rem;
  font-weight: 500;
}

.comment-delete:hover {
  color: var(--danger);
  background: var(--danger-soft);
}

.edit-card-form,
.comment-edit-form,
.comment-form {
  display: grid;
  gap: 0.5rem;
}

.field {
  display: grid;
  gap: 0.3rem;
}

.field span {
  color: var(--muted);
  font-size: 0.68rem;
  font-weight: 650;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.edit-card-form input,
.edit-card-form textarea,
.comment-edit-form textarea,
.comment-form textarea {
  width: 100%;
  border: 1px solid var(--stroke);
  border-radius: 10px;
  padding: 0.7rem 0.8rem;
  background: var(--input);
  color: var(--text);
  font: inherit;
  font-size: 0.9rem;
  outline: none;
}

.edit-card-form textarea,
.comment-edit-form textarea,
.comment-form textarea {
  resize: vertical;
  min-height: 4.5rem;
}

.edit-card-form input:focus,
.edit-card-form textarea:focus,
.comment-edit-form textarea:focus,
.comment-form textarea:focus {
  border-color: rgba(91, 141, 239, 0.45);
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.4rem;
}

.btn {
  appearance: none;
  justify-self: end;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 0.55rem 0.9rem;
  background: var(--accent);
  color: #0b1020;
  font: inherit;
  font-size: 0.86rem;
  font-weight: 650;
  cursor: pointer;
}

.btn.ghost {
  background: transparent;
  border-color: var(--stroke);
  color: var(--muted);
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>

<style>
.card-modal-enter-active,
.card-modal-leave-active {
  transition: opacity 0.28s ease;
}

.card-modal-enter-active .dialog,
.card-modal-leave-active .dialog {
  transition:
    transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.28s ease;
}

.card-modal-enter-from,
.card-modal-leave-to {
  opacity: 0;
}

.card-modal-enter-from .dialog,
.card-modal-leave-to .dialog {
  opacity: 0;
  transform: translateY(18px) scale(0.96);
}

@media (prefers-reduced-motion: reduce) {
  .card-modal-enter-active,
  .card-modal-leave-active,
  .card-modal-enter-active .dialog,
  .card-modal-leave-active .dialog {
    transition: none;
  }
}
</style>
