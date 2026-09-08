<script setup>
import { computed } from 'vue'
import LinkedText from './LinkedText.vue'

const props = defineProps({
  card: { type: Object, required: true },
})

const emit = defineEmits(['done', 'pause', 'resume', 'restore', 'delete', 'open'])

const isPriority = computed(() => props.card.priority === 'high')
const status = computed(() => props.card.status || (props.card.done ? 'done' : 'open'))

const commentCount = computed(() =>
  Array.isArray(props.card.comments) ? props.card.comments.length : 0,
)

const media = computed(() => {
  if (Array.isArray(props.card.attachments) && props.card.attachments.length) {
    return props.card.attachments
  }
  return (props.card.images || []).map((dataUrl, index) => ({
    id: `${props.card.id}-img-${index}`,
    kind: 'image',
    dataUrl,
    name: `image-${index + 1}.jpg`,
    mime: 'image/jpeg',
  }))
})

const previewMedia = computed(() => media.value.slice(0, 3))
const extraMedia = computed(() => Math.max(0, media.value.length - 3))

function formatCardDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}
</script>

<template>
  <article class="card" :class="status">
    <div class="card-body-wrap">
      <button
        type="button"
        class="card-hit"
        :aria-label="`Open card: ${card.title}`"
        @click="emit('open')"
      >
        <div class="card-top">
          <div class="card-marks">
            <span v-if="isPriority" class="priority-mark">Priority</span>
            <span v-if="status === 'paused'" class="paused-mark">Paused</span>
          </div>
          <h3><LinkedText :text="card.title" /></h3>
          <p v-if="card.body" class="card-body"><LinkedText :text="card.body" /></p>
        </div>

        <div v-if="media.length" class="media-row" aria-hidden="true">
          <div
            v-for="(item, index) in previewMedia"
            :key="item.id || index"
            class="media-tile"
            :class="item.kind"
          >
            <img
              v-if="item.kind === 'image'"
              :src="item.dataUrl"
              alt=""
              loading="lazy"
            />
            <video
              v-else-if="item.kind === 'video'"
              :src="item.dataUrl"
              muted
              playsinline
              preload="metadata"
            />
            <span v-else class="file-tile">{{ item.name || 'File' }}</span>
            <span v-if="item.kind === 'video'" class="media-play" />
            <span class="media-kind">
              {{
                item.kind === 'video'
                  ? 'Video'
                  : item.kind === 'image'
                    ? 'Image'
                    : 'File'
              }}
            </span>
          </div>
          <div v-if="extraMedia" class="media-more">+{{ extraMedia }}</div>
        </div>

        <div class="card-meta">
          <span>{{ formatCardDate(card.createdAt) }}</span>
          <span v-if="commentCount">
            · {{ commentCount }} comment{{ commentCount === 1 ? '' : 's' }}
          </span>
          <span v-if="media.length"> · {{ media.length }} media</span>
        </div>
      </button>

      <div class="card-actions">
        <template v-if="status === 'open'">
          <button type="button" class="action pause" @click="emit('pause')">
            Pause
          </button>
          <button type="button" class="action done" @click="emit('done')">
            Done
          </button>
        </template>
        <template v-else-if="status === 'paused'">
          <button type="button" class="action resume" @click="emit('resume')">
            Resume
          </button>
          <button type="button" class="action done" @click="emit('done')">
            Done
          </button>
        </template>
        <button
          v-else
          type="button"
          class="action restore"
          @click="emit('restore')"
        >
          Restore
        </button>
        <button type="button" class="action delete" @click="emit('delete')">
          Delete
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.card {
  border: 1px solid var(--stroke);
  border-radius: 16px;
  background: var(--card);
  transition: border-color 0.18s ease, background 0.18s ease;
}

.card:hover {
  border-color: rgba(107, 149, 240, 0.28);
  background: var(--card-hover);
}

.card.done {
  opacity: 0.78;
}

.card.paused {
  border-color: rgba(240, 196, 113, 0.28);
}

.card-body-wrap {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: start;
  padding: 0.95rem 1rem;
}

.card-hit {
  appearance: none;
  display: grid;
  gap: 0.7rem;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.card-top {
  display: grid;
  gap: 0.4rem;
}

.card-marks {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.priority-mark {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 1.3rem;
  padding: 0 0.5rem;
  border-radius: 999px;
  background: rgba(240, 113, 120, 0.12);
  color: #ffb4bc;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.paused-mark {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 1.3rem;
  padding: 0 0.5rem;
  border-radius: 999px;
  background: rgba(240, 196, 113, 0.12);
  color: #f0c471;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.card h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 650;
  line-height: 1.35;
  letter-spacing: -0.02em;
  color: var(--text);
  word-break: break-word;
}

.card-body {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--muted);
  font-size: 0.84rem;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.media-row {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.media-tile,
.media-more {
  position: relative;
  width: 4.75rem;
  height: 4.75rem;
  flex: 0 0 auto;
  border-radius: 12px;
  border: 1px solid var(--stroke);
  overflow: hidden;
  background: rgba(0, 0, 0, 0.28);
}

.media-tile img,
.media-tile video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-tile.video::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(8, 10, 16, 0.25);
}

.media-play {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 1;
  width: 1.35rem;
  height: 1.35rem;
  margin: -0.675rem 0 0 -0.675rem;
  border-radius: 999px;
  background: rgba(12, 16, 24, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.media-play::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 53%;
  border-style: solid;
  border-width: 0.28rem 0 0.28rem 0.42rem;
  border-color: transparent transparent transparent #fff;
  transform: translate(-40%, -50%);
}

.media-kind {
  position: absolute;
  left: 0.28rem;
  bottom: 0.28rem;
  z-index: 1;
  padding: 0.16rem 0.34rem;
  border-radius: 5px;
  background: rgba(8, 12, 20, 0.9);
  color: #fff;
  font-size: 0.56rem;
  font-weight: 750;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  line-height: 1;
}

.media-more {
  display: grid;
  place-items: center;
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 650;
  background: rgba(255, 255, 255, 0.04);
}

.file-tile {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  padding: 0.3rem;
  color: var(--muted);
  font-size: 0.55rem;
  text-align: center;
  word-break: break-word;
}

.card-meta {
  color: var(--muted);
  font-size: 0.72rem;
}

.card-actions {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex: 0 0 auto;
  padding-top: 0.05rem;
}

.action {
  appearance: none;
  min-width: 5.2rem;
  border: 1px solid var(--stroke);
  border-radius: 10px;
  padding: 0.48rem 0.7rem;
  background: rgba(255, 255, 255, 0.03);
  color: var(--muted);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 650;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease,
    transform 0.15s ease;
}

.action:hover {
  transform: translateY(-1px);
}

.action.done {
  border-color: rgba(62, 207, 142, 0.28);
  background: rgba(62, 207, 142, 0.08);
  color: var(--ok);
}

.action.done:hover {
  border-color: rgba(62, 207, 142, 0.5);
  background: rgba(62, 207, 142, 0.18);
}

.action.pause {
  border-color: rgba(240, 196, 113, 0.3);
  background: rgba(240, 196, 113, 0.08);
  color: #f0c471;
}

.action.pause:hover {
  border-color: rgba(240, 196, 113, 0.5);
  background: rgba(240, 196, 113, 0.16);
}

.action.resume,
.action.restore {
  border-color: rgba(107, 149, 240, 0.28);
  background: rgba(107, 149, 240, 0.08);
  color: var(--accent-soft);
}

.action.resume:hover,
.action.restore:hover {
  border-color: rgba(107, 149, 240, 0.5);
  background: rgba(107, 149, 240, 0.18);
}

.action.delete:hover {
  border-color: rgba(240, 113, 120, 0.45);
  background: rgba(240, 113, 120, 0.14);
  color: var(--danger);
}

@media (max-width: 640px) {
  .card-body-wrap {
    grid-template-columns: 1fr;
  }

  .card-actions {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .action {
    min-width: 0;
    flex: 1 1 auto;
  }
}
</style>
