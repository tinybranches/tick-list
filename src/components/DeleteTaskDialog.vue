<script setup>
import { onBeforeUnmount, onMounted, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  offerArchive: { type: Boolean, default: true },
})

const emit = defineEmits(['cancel', 'archive', 'delete'])

function onKeydown(event) {
  if (!props.open) return
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('cancel')
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
      v-if="open"
      class="backdrop"
      role="presentation"
      @click.self="emit('cancel')"
    >
      <div
        class="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-desc"
      >
        <h2 id="delete-dialog-title">Delete task?</h2>
        <p id="delete-dialog-desc">
          <strong>{{ title }}</strong> will be permanently removed. This cannot be undone.
          <template v-if="offerArchive">
            If you might need it later, move it to Archive instead.
          </template>
        </p>

        <div class="actions">
          <button type="button" class="btn ghost" @click="emit('cancel')">
            Cancel
          </button>
          <button
            v-if="offerArchive"
            type="button"
            class="btn"
            @click="emit('archive')"
          >
            Archive
          </button>
          <button type="button" class="btn danger" @click="emit('delete')">
            Delete forever
          </button>
        </div>
      </div>
    </div>
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
  background: rgba(6, 4, 12, 0.72);
  backdrop-filter: blur(8px);
  animation: fade-in 0.18s ease;
}

.dialog {
  width: min(100%, 420px);
  padding: 1.35rem 1.25rem 1.25rem;
  border: 1px solid rgba(255, 122, 138, 0.22);
  border-radius: 16px;
  background: linear-gradient(160deg, #22182f 0%, #120b1a 100%);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
  animation: rise 0.22s ease;
}

.dialog h2 {
  margin: 0 0 0.55rem;
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.dialog p {
  margin: 0 0 1.25rem;
  color: var(--muted);
  line-height: 1.55;
  font-size: 0.95rem;
}

.dialog strong {
  color: var(--text);
  font-weight: 600;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
}

.btn {
  appearance: none;
  border: 1px solid var(--stroke);
  border-radius: 10px;
  padding: 0.6rem 0.9rem;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.15s;
}

.btn:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.18);
}

.btn:active {
  transform: scale(0.98);
}

.btn.ghost {
  background: transparent;
  color: var(--muted);
}

.btn.ghost:hover {
  color: var(--text);
}

.btn:not(.ghost):not(.danger) {
  background: var(--accent-glow);
  border-color: rgba(201, 160, 255, 0.4);
  color: var(--accent);
}

.btn.danger {
  border-color: rgba(255, 122, 138, 0.35);
  background: rgba(255, 122, 138, 0.14);
  color: #ff9eaa;
}

.btn.danger:hover {
  background: rgba(255, 122, 138, 0.22);
  border-color: rgba(255, 122, 138, 0.5);
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .backdrop,
  .dialog {
    animation: none;
  }
}
</style>
