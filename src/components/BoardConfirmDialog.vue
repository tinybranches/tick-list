<script setup>
import { onBeforeUnmount, onMounted, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  cardTitle: { type: String, default: '' },
  message: { type: String, required: true },
  confirmLabel: { type: String, default: 'Confirm' },
  variant: {
    type: String,
    default: 'confirm', // 'confirm' | 'danger'
  },
})

const emit = defineEmits(['cancel', 'confirm'])

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
        :class="variant"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="board-confirm-title"
        aria-describedby="board-confirm-desc"
      >
        <h2 id="board-confirm-title">{{ title }}</h2>
        <p id="board-confirm-desc">
          <strong v-if="cardTitle">{{ cardTitle }}</strong>
          {{ message }}
        </p>

        <div class="actions">
          <button type="button" class="btn ghost" @click="emit('cancel')">
            Cancel
          </button>
          <button
            type="button"
            class="btn"
            :class="variant"
            @click="emit('confirm')"
          >
            {{ confirmLabel }}
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
  background: rgba(8, 10, 14, 0.72);
  backdrop-filter: blur(8px);
  animation: fade-in 0.18s ease;
}

.dialog {
  width: min(100%, 420px);
  padding: 1.35rem 1.25rem 1.25rem;
  border: 1px solid var(--stroke-strong);
  border-radius: 14px;
  background: linear-gradient(165deg, #1c222e 0%, #12161e 100%);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
  animation: rise 0.22s ease;
}

.dialog.danger {
  border-color: rgba(240, 113, 120, 0.28);
}

.dialog.confirm {
  border-color: rgba(62, 207, 142, 0.28);
}

.dialog h2 {
  margin: 0 0 0.55rem;
  font-family: var(--font-display);
  font-size: 1.2rem;
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
  display: inline;
  color: var(--text);
  font-weight: 600;
}

.dialog strong::after {
  content: ' ';
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

.btn.confirm {
  border-color: rgba(62, 207, 142, 0.4);
  background: rgba(62, 207, 142, 0.14);
  color: var(--ok);
}

.btn.confirm:hover {
  background: rgba(62, 207, 142, 0.22);
}

.btn.danger {
  border-color: rgba(240, 113, 120, 0.4);
  background: rgba(240, 113, 120, 0.14);
  color: var(--danger);
}

.btn.danger:hover {
  background: rgba(240, 113, 120, 0.22);
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
