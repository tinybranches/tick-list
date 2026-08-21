<script setup>
import { computed } from 'vue'
import { useTasksStore } from '../stores/tasks'
import { formatDuration, unlockAudio } from '../composables/useAlarm'

const props = defineProps({
  task: { type: Object, required: true },
})

const store = useTasksStore()

const progress = computed(() => {
  if (!props.task.durationMs) return 0
  return Math.min(
    100,
    ((props.task.durationMs - props.task.remainingMs) / props.task.durationMs) * 100,
  )
})

const statusLabel = computed(() => {
  if (props.task.archived) return 'archived'
  if (!props.task.enabled) return 'disabled'
  if (props.task.alarming) return 'alarm'
  if (props.task.status === 'running') return 'running'
  if (props.task.status === 'paused') return 'paused'
  if (props.task.status === 'finished') return 'done'
  return 'idle'
})

function onToggleRun() {
  unlockAudio()
  store.toggleRun(props.task.id)
}

function onAdd(ms) {
  unlockAudio()
  store.addTime(props.task.id, ms)
}
</script>

<template>
  <article
    :id="`task-${task.id}`"
    class="task"
    :class="{
      running: !task.archived && task.status === 'running' && task.enabled,
      alarming: task.alarming,
      disabled: !task.enabled || task.archived,
      archived: task.archived,
    }"
  >
    <div v-if="!task.archived" class="progress" :style="{ '--p': progress + '%' }" />

    <div class="top">
      <div class="meta">
        <h3>{{ task.title }}</h3>
        <span class="status">{{ statusLabel }}</span>
      </div>
      <div class="timer" :class="{ pulse: task.alarming }">
        {{ formatDuration(task.remainingMs) }}
      </div>
    </div>

    <div class="controls">
      <template v-if="!task.archived">
        <button
          type="button"
          class="btn"
          :disabled="!task.enabled"
          @click="onToggleRun"
        >
          {{ task.status === 'running' ? 'Pause' : 'Start' }}
        </button>

        <button type="button" class="btn ghost" :disabled="!task.enabled" @click="onAdd(60_000)">
          +1 min
        </button>
        <button type="button" class="btn ghost" :disabled="!task.enabled" @click="onAdd(300_000)">
          +5 min
        </button>

        <button
          type="button"
          class="btn ghost"
          :class="{ on: task.enabled }"
          @click="store.toggleEnabled(task.id)"
        >
          {{ task.enabled ? 'On' : 'Off' }}
        </button>

        <button
          v-if="task.alarming"
          type="button"
          class="btn warn"
          @click="store.dismissAlarm(task.id)"
        >
          Stop alarm
        </button>

        <button type="button" class="btn ghost" @click="store.resetTask(task.id)">Reset</button>

        <button type="button" class="btn ghost" @click="store.archiveTask(task.id)">Archive</button>

        <button type="button" class="btn danger" @click="store.removeTask(task.id)">Delete</button>
      </template>

      <template v-else>
        <button type="button" class="btn" @click="store.restoreTask(task.id)">Restore</button>
        <button type="button" class="btn danger" @click="store.removeTask(task.id)">Delete</button>
      </template>
    </div>
  </article>
</template>

<style scoped>
.task {
  position: relative;
  overflow: hidden;
  padding: 1.15rem 1.25rem 1.2rem;
  border: 1px solid var(--stroke);
  border-radius: 16px;
  background: linear-gradient(145deg, rgba(28, 32, 40, 0.95), rgba(18, 21, 28, 0.98));
  transition: border-color 0.25s, transform 0.25s ease, box-shadow 0.25s;
  animation: rise 0.35s ease both;
}

.task:hover {
  border-color: rgba(201, 160, 255, 0.4);
}

.task.running {
  border-color: rgba(139, 227, 196, 0.45);
  box-shadow: 0 0 0 1px rgba(139, 227, 196, 0.12), 0 12px 28px rgba(0, 0, 0, 0.25);
}

.task.alarming {
  border-color: rgba(255, 122, 138, 0.7);
  box-shadow: 0 0 0 1px rgba(255, 122, 138, 0.2), 0 0 32px rgba(255, 122, 138, 0.18);
  animation: shake 0.45s ease-in-out infinite alternate;
}

.task.disabled {
  opacity: 0.55;
}

.task.archived {
  opacity: 0.72;
}

.progress {
  position: absolute;
  inset: 0 auto 0 0;
  width: var(--p);
  background: linear-gradient(90deg, rgba(168, 85, 247, 0.16), rgba(139, 227, 196, 0.08));
  pointer-events: none;
  transition: width 0.2s linear;
}

.top {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.meta h3 {
  margin: 0 0 0.35rem;
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.status {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.timer {
  font-family: var(--font-mono);
  font-size: clamp(1.5rem, 4vw, 1.9rem);
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.timer.pulse {
  color: var(--danger);
  animation: blink 0.8s ease-in-out infinite;
}

.controls {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.btn {
  appearance: none;
  border: 1px solid var(--stroke);
  border-radius: 9px;
  padding: 0.55rem 0.8rem;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 550;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, transform 0.15s, opacity 0.2s;
}

.btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.18);
}

.btn:active:not(:disabled) {
  transform: scale(0.97);
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn.ghost.on {
  border-color: rgba(139, 227, 196, 0.45);
  color: var(--ok);
}

.btn.warn {
  background: var(--danger-soft);
  border-color: rgba(255, 122, 138, 0.55);
  color: #ffc0c8;
}

.btn.danger {
  border-color: rgba(255, 122, 138, 0.35);
  color: #ff9eaa;
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes blink {
  from {
    opacity: 1;
  }
  to {
    opacity: 0.45;
  }
}

@keyframes shake {
  from {
    transform: translateX(-1px);
  }
  to {
    transform: translateX(1px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .task,
  .task.alarming,
  .timer.pulse {
    animation: none;
  }
}
</style>
