<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useBoardStore } from '../stores/board'
import MediaLightbox from './MediaLightbox.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  card: { type: Object, default: null },
})

const emit = defineEmits(['close', 'closed'])

const store = useBoardStore()
const draft = ref('')
const commentInput = ref(null)
const galleryOpen = ref(false)
const galleryIndex = ref(0)
const backdropArmed = ref(false)

const liveCard = computed(() => {
  if (!props.card) return null
  return store.cards.find((row) => row.id === props.card.id) || props.card
})

function armBackdrop(event) {
  backdropArmed.value = event.target === event.currentTarget
}

function onBackdropClick(event) {
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

function formatStamp(ts) {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function close() {
  emit('close')
}

function onKeydown(event) {
  if (!props.open || galleryOpen.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      document.body.style.overflow = 'hidden'
      draft.value = ''
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

function submitComment() {
  if (!liveCard.value) return
  const text = draft.value.trim()
  if (!text) return
  store.addComment(liveCard.value.id, text)
  draft.value = ''
  nextTick(() => commentInput.value?.focus())
}

function openGallery(index) {
  galleryIndex.value = index
  galleryOpen.value = true
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
            <div>
              <h2 id="card-detail-title">{{ liveCard.title }}</h2>
              <p class="meta">
                {{ formatStamp(liveCard.createdAt) }}
                <span v-if="liveCard.done"> · done</span>
              </p>
            </div>
            <div class="head-actions">
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

          <p v-if="liveCard.body" class="body">{{ liveCard.body }}</p>

          <div v-if="media.length" class="media-grid">
            <button
              v-for="(item, index) in media"
              :key="item.id || index"
              type="button"
              class="media-tile"
              :class="item.kind || 'file'"
              :aria-label="`Open ${item.kind || 'attachment'}: ${item.name || ''}`"
              @click="openGallery(index)"
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
                  <time>{{ formatStamp(comment.createdAt) }}</time>
                  <button
                    type="button"
                    class="comment-delete"
                    aria-label="Delete comment"
                    @click="store.removeComment(liveCard.id, comment.id)"
                  >
                    ×
                  </button>
                </div>
                <p>{{ comment.text }}</p>
              </li>
            </ul>

            <form class="comment-form" @submit.prevent="submitComment">
              <textarea
                ref="commentInput"
                v-model="draft"
                rows="3"
                placeholder="Write a comment…"
                @keydown.meta.enter.prevent="submitComment"
                @keydown.ctrl.enter.prevent="submitComment"
              />
              <button type="submit" class="btn" :disabled="!draft.trim()">
                Add comment
              </button>
            </form>
          </section>
        </div>
      </div>
    </Transition>

    <MediaLightbox
      :open="galleryOpen"
      :items="media"
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

.head-actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex: 0 0 auto;
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

.comment-delete {
  appearance: none;
  width: 1.35rem;
  height: 1.35rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
}

.comment-delete:hover {
  color: var(--danger);
  background: var(--danger-soft);
}

.comment-form {
  display: grid;
  gap: 0.5rem;
}

.comment-form textarea {
  width: 100%;
  resize: vertical;
  min-height: 4.5rem;
  border: 1px solid var(--stroke);
  border-radius: 10px;
  padding: 0.7rem 0.8rem;
  background: var(--input);
  color: var(--text);
  font: inherit;
  font-size: 0.9rem;
  outline: none;
}

.comment-form textarea:focus {
  border-color: rgba(91, 141, 239, 0.45);
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
