<script setup>
import { computed, nextTick, reactive } from 'vue'
import { useTasksStore } from '../stores/tasks'
import { unlockAudio } from '../composables/useAlarm'
import WheelPicker from './WheelPicker.vue'

const store = useTasksStore()

const form = reactive({
  title: '',
  hours: 0,
  minutes: 25,
})

const canSubmit = computed(
  () => form.title.trim().length > 0 && (form.hours > 0 || form.minutes > 0),
)

async function submit() {
  unlockAudio()
  if (!canSubmit.value) return
  const task = store.addTask({ ...form, seconds: 0 })
  if (!task) return
  form.title = ''
  form.hours = 0
  form.minutes = 25

  await nextTick()
  requestAnimationFrame(() => {
    document
      .getElementById(`task-${task.id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}
</script>

<template>
  <form class="task-form" @submit.prevent="submit">
    <div class="field">
      <label for="task-title">Task</label>
      <input
        id="task-title"
        v-model="form.title"
        type="text"
        placeholder="e.g. write a report"
        maxlength="120"
        autocomplete="off"
        required
      />
    </div>

    <div class="field">
      <div class="duration-head">
        <span class="section-label" id="duration-label">Duration</span>
        <span class="duration-hint" aria-hidden="true">hrs · min</span>
      </div>

      <div class="face" role="group" aria-labelledby="duration-label">
        <WheelPicker v-model="form.hours" :min="0" :max="23" />
        <div class="colon" aria-hidden="true">:</div>
        <WheelPicker v-model="form.minutes" :min="0" :max="59" />
      </div>
    </div>

    <button type="submit" class="btn btn-primary" :disabled="!canSubmit">
      Add task
    </button>
  </form>
</template>

<style scoped>
.task-form {
  display: grid;
  gap: 1.1rem;
  padding: 1.35rem 1.25rem 1.4rem;
  border: 1px solid var(--stroke);
  border-radius: 16px;
  background: linear-gradient(160deg, var(--panel) 0%, var(--panel-dim) 100%);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.28);
}

.field {
  display: grid;
  gap: 0.5rem;
}

.field label,
.section-label {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.duration-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
}

.duration-hint {
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  color: rgba(155, 143, 179, 0.75);
}

.field input {
  width: 100%;
  height: 48px;
  padding: 0 0.95rem;
  border: 1px solid var(--stroke);
  border-radius: 12px;
  background: var(--input);
  color: var(--text);
  font: inherit;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.field input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.face {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.15rem;
  width: min(100%, 420px);
  margin-inline: auto;
  padding: 0.15rem 0;
}

.colon {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 64px;
  margin-top: 0;
  font-family: var(--font-mono);
  font-size: clamp(1.8rem, 7vw, 2.6rem);
  font-weight: 500;
  color: var(--accent);
  line-height: 1;
  user-select: none;
}

.btn {
  appearance: none;
  border: none;
  border-radius: 12px;
  height: 48px;
  padding: 0 1.1rem;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, filter 0.2s, opacity 0.2s;
}

.btn:active {
  transform: scale(0.98);
}

.btn-primary {
  background: var(--accent);
  color: #1a1024;
}

.btn-primary:hover:not(:disabled) {
  filter: brightness(1.06);
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  filter: none;
}
</style>
