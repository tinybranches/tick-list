<script setup>
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  items: { type: Array, default: () => [] },
  index: { type: Number, default: 0 },
})

const emit = defineEmits(['close', 'update:index'])

const current = computed(() => props.items[props.index] || null)

function close() {
  emit('close')
}

function prev() {
  if (!props.items.length) return
  const next = (props.index - 1 + props.items.length) % props.items.length
  emit('update:index', next)
}

function next() {
  if (!props.items.length) return
  emit('update:index', (props.index + 1) % props.items.length)
}

function onKeydown(event) {
  if (!props.open) return
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    prev()
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    next()
  }
}

watch(
  () => props.open,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
  },
)

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open && current"
      class="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Media gallery"
      @click.self="close"
    >
      <button type="button" class="close" aria-label="Close" @click="close">
        ×
      </button>

      <button
        v-if="items.length > 1"
        type="button"
        class="nav prev"
        aria-label="Previous"
        @click="prev"
      >
        ‹
      </button>

      <div class="stage">
        <img
          v-if="current.kind === 'image'"
          :src="current.dataUrl"
          :alt="current.name"
        />
        <video
          v-else-if="current.kind === 'video'"
          :src="current.dataUrl"
          controls
          autoplay
        />
        <div v-else class="file-preview">
          <p>{{ current.name }}</p>
          <a :href="current.dataUrl" :download="current.name">Download</a>
        </div>
        <p class="caption">
          {{ current.name }}
          <span v-if="items.length > 1">
            · {{ index + 1 }} / {{ items.length }}
          </span>
        </p>
      </div>

      <button
        v-if="items.length > 1"
        type="button"
        class="nav next"
        aria-label="Next"
        @click="next"
      >
        ›
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: 2rem 4rem;
  background: rgba(4, 6, 10, 0.88);
  backdrop-filter: blur(10px);
}

.close {
  appearance: none;
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 2.4rem;
  height: 2.4rem;
  border: 1px solid var(--stroke);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text);
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
}

.nav {
  appearance: none;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 2.6rem;
  height: 2.6rem;
  border: 1px solid var(--stroke);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text);
  font-size: 1.6rem;
  line-height: 1;
  cursor: pointer;
}

.nav.prev {
  left: 1rem;
}

.nav.next {
  right: 1rem;
}

.stage {
  display: grid;
  gap: 0.75rem;
  justify-items: center;
  max-width: min(96vw, 1100px);
  max-height: 90vh;
}

.stage img,
.stage video {
  max-width: 100%;
  max-height: 78vh;
  border-radius: 10px;
  background: #000;
}

.file-preview {
  display: grid;
  gap: 0.75rem;
  justify-items: center;
  padding: 2rem;
  border-radius: 12px;
  background: var(--panel);
  border: 1px solid var(--stroke);
}

.file-preview a {
  color: var(--accent-soft);
}

.caption {
  margin: 0;
  color: var(--muted);
  font-size: 0.82rem;
}
</style>
