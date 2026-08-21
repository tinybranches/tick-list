<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useTasksStore } from '../stores/tasks'
import { unlockAudio } from '../composables/useAlarm'
import WheelPicker from './WheelPicker.vue'

const store = useTasksStore()
const VIEW_KEY = 'tick-list-duration-view'

const PRESETS = [
  { label: '5m', hours: 0, minutes: 5 },
  { label: '15m', hours: 0, minutes: 15 },
  { label: '25m', hours: 0, minutes: 25 },
  { label: '45m', hours: 0, minutes: 45 },
  { label: '1h', hours: 1, minutes: 0 },
]

function loadView() {
  try {
    const saved = localStorage.getItem(VIEW_KEY)
    if (saved === 'slider') return 'slider'
    return 'default'
  } catch {
    return 'default'
  }
}

const durationView = ref(loadView()) // 'default' | 'slider'

watch(durationView, (value) => {
  try {
    localStorage.setItem(VIEW_KEY, value)
  } catch {
    /* ignore */
  }
})

const form = reactive({
  title: '',
  hours: 0,
  minutes: 0,
})

const hoursDraft = ref(null)
const minutesDraft = ref(null)

const canSubmit = computed(
  () => form.title.trim().length > 0 && (form.hours > 0 || form.minutes > 0),
)

const durationText = computed(
  () =>
    `${String(form.hours).padStart(2, '0')}:${String(form.minutes).padStart(2, '0')}`,
)

const hoursDisplay = computed(() =>
  hoursDraft.value !== null
    ? hoursDraft.value
    : String(form.hours).padStart(2, '0'),
)

const minutesDisplay = computed(() =>
  minutesDraft.value !== null
    ? minutesDraft.value
    : String(form.minutes).padStart(2, '0'),
)

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

function parseUnit(raw, max) {
  const digits = String(raw ?? '').replace(/\D/g, '')
  if (!digits || /^0+$/.test(digits)) return 0
  return clamp(Number.parseInt(digits.replace(/^0+/, ''), 10) || 0, 0, max)
}

function nudgeHours(delta) {
  hoursDraft.value = null
  form.hours = clamp(form.hours + delta, 0, 23)
}

function nudgeMinutes(delta) {
  minutesDraft.value = null
  form.minutes = clamp(form.minutes + delta, 0, 59)
}

function onHoursFocus(event) {
  hoursDraft.value = String(form.hours).padStart(2, '0')
  event.target.select()
}

function onHoursInput(event) {
  const raw = event.target.value.replace(/\D/g, '').slice(0, 2)
  hoursDraft.value = raw
  if (raw !== '') form.hours = parseUnit(raw, 23)
}

function onHoursBlur() {
  if (hoursDraft.value !== null) form.hours = parseUnit(hoursDraft.value, 23)
  hoursDraft.value = null
}

function onMinutesFocus(event) {
  minutesDraft.value = String(form.minutes).padStart(2, '0')
  event.target.select()
}

function onMinutesInput(event) {
  const raw = event.target.value.replace(/\D/g, '').slice(0, 2)
  minutesDraft.value = raw
  if (raw !== '') form.minutes = parseUnit(raw, 59)
}

function onMinutesBlur() {
  if (minutesDraft.value !== null) form.minutes = parseUnit(minutesDraft.value, 59)
  minutesDraft.value = null
}

function applyPreset(preset) {
  hoursDraft.value = null
  minutesDraft.value = null
  form.hours = preset.hours
  form.minutes = preset.minutes
}

function resetDuration() {
  hoursDraft.value = null
  minutesDraft.value = null
  form.hours = 0
  form.minutes = 0
}

function isPresetActive(preset) {
  return form.hours === preset.hours && form.minutes === preset.minutes
}

async function submit() {
  unlockAudio()
  if (!canSubmit.value) return
  const task = store.addTask({ ...form, seconds: 0 })
  if (!task) return
  form.title = ''
  form.hours = 0
  form.minutes = 0
  hoursDraft.value = null
  minutesDraft.value = null

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
        <div class="duration-meta">
          <span class="duration-readout" aria-live="polite">{{ durationText }}</span>
          <button
            type="button"
            class="reset-chip reset-chip-mobile"
            aria-label="Reset duration to 00:00"
            @click="resetDuration"
          >
            Reset
          </button>
        </div>
      </div>

      <div class="view-switch" role="tablist" aria-label="Duration control style">
        <button
          type="button"
          role="tab"
          class="view-btn"
          :class="{ active: durationView === 'default' }"
          :aria-selected="durationView === 'default'"
          @click="durationView = 'default'"
        >
          Default
        </button>
        <button
          type="button"
          role="tab"
          class="view-btn"
          :class="{ active: durationView === 'slider' }"
          :aria-selected="durationView === 'slider'"
          @click="durationView = 'slider'"
        >
          Slider
        </button>
      </div>

      <div
        v-if="durationView === 'default'"
        class="duration"
        role="tabpanel"
        aria-labelledby="duration-label"
      >
        <div class="stepper">
          <span class="step-label">Hours</span>
          <div class="step-controls">
            <button
              type="button"
              class="step-btn"
              aria-label="Decrease hours"
              :disabled="form.hours <= 0"
              @click="nudgeHours(-1)"
            >
              −
            </button>
            <input
              class="step-value"
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="2"
              autocomplete="off"
              aria-label="Hours"
              :value="hoursDisplay"
              @focus="onHoursFocus"
              @input="onHoursInput"
              @blur="onHoursBlur"
            />
            <button
              type="button"
              class="step-btn"
              aria-label="Increase hours"
              :disabled="form.hours >= 23"
              @click="nudgeHours(1)"
            >
              +
            </button>
          </div>
        </div>

        <div class="stepper">
          <span class="step-label">Minutes</span>
          <div class="step-controls">
            <button
              type="button"
              class="step-btn"
              aria-label="Decrease minutes"
              :disabled="form.minutes <= 0"
              @click="nudgeMinutes(-1)"
            >
              −
            </button>
            <input
              class="step-value"
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="2"
              autocomplete="off"
              aria-label="Minutes"
              :value="minutesDisplay"
              @focus="onMinutesFocus"
              @input="onMinutesInput"
              @blur="onMinutesBlur"
            />
            <button
              type="button"
              class="step-btn"
              aria-label="Increase minutes"
              :disabled="form.minutes >= 59"
              @click="nudgeMinutes(1)"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div
        v-else
        class="duration duration-slider"
        role="tabpanel"
        aria-labelledby="duration-label"
      >
        <div class="stepper">
          <span class="step-label">Hours</span>
          <WheelPicker v-model="form.hours" :min="0" :max="23" />
        </div>
        <div class="stepper">
          <span class="step-label">Minutes</span>
          <WheelPicker v-model="form.minutes" :min="0" :max="59" />
        </div>
      </div>

      <div class="presets-row">
        <div class="presets" role="group" aria-label="Duration presets">
          <button
            v-for="preset in PRESETS"
            :key="preset.label"
            type="button"
            class="preset"
            :class="{ active: isPresetActive(preset) }"
            @click="applyPreset(preset)"
          >
            {{ preset.label }}
          </button>
        </div>

        <button
          type="button"
          class="reset-chip reset-chip-desktop"
          aria-label="Reset duration to 00:00"
          @click="resetDuration"
        >
          Reset
        </button>
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
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.duration-meta {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
}

.duration-readout {
  font-family: var(--font-mono);
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--accent);
}

.view-switch {
  display: flex;
  gap: 0.3rem;
  width: fit-content;
  padding: 0.22rem;
  border: 1px solid var(--stroke);
  border-radius: 10px;
  background: rgba(10, 7, 16, 0.45);
}

.view-btn {
  appearance: none;
  border: none;
  border-radius: 8px;
  padding: 0.4rem 0.75rem;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.view-btn:hover {
  color: var(--text);
}

.view-btn.active {
  background: var(--accent-glow);
  color: var(--accent);
}

.field > input {
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

.field > input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.duration {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

@media (max-width: 420px) {
  .duration {
    grid-template-columns: 1fr;
  }

  .duration-head {
    flex-wrap: wrap;
    row-gap: 0.45rem;
  }

  .duration-meta {
    width: 100%;
    justify-content: space-between;
  }

  .step-controls {
    grid-template-columns: 48px 1fr 48px;
    gap: 0.5rem;
  }

  .step-btn {
    width: 48px;
    height: 44px;
  }

  .step-value {
    height: 44px;
  }
}

.duration-slider .stepper {
  min-height: 100%;
}

.stepper {
  display: grid;
  gap: 0.45rem;
  padding: 0.75rem 0.7rem 0.85rem;
  border: 1px solid var(--stroke);
  border-radius: 14px;
  background: rgba(10, 7, 16, 0.55);
}

.step-label {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  text-align: center;
}

.step-controls {
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  align-items: center;
  gap: 0.35rem;
}

.step-btn {
  appearance: none;
  width: 40px;
  height: 40px;
  border: 1px solid rgba(201, 160, 255, 0.28);
  border-radius: 11px;
  background: rgba(201, 160, 255, 0.08);
  color: var(--accent);
  font-size: 1.35rem;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, opacity 0.15s;
}

.step-btn:hover:not(:disabled) {
  background: rgba(201, 160, 255, 0.16);
  border-color: rgba(201, 160, 255, 0.45);
}

.step-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.step-value {
  display: block;
  width: 100%;
  min-width: 0;
  height: 40px;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--text);
  font-family: var(--font-mono);
  font-size: clamp(1.55rem, 5vw, 1.9rem);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  text-align: center;
  outline: none;
  box-shadow: none;
  cursor: text;
  caret-color: var(--accent);
}

.step-value:focus {
  color: var(--accent);
}

.presets-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  min-width: 0;
}

.preset {
  appearance: none;
  height: 34px;
  padding: 0 0.8rem;
  border: 1px solid var(--stroke);
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.preset:hover {
  color: var(--text);
  border-color: rgba(201, 160, 255, 0.35);
}

.preset.active {
  background: var(--accent-glow);
  border-color: rgba(201, 160, 255, 0.45);
  color: var(--accent);
}

.reset-chip {
  appearance: none;
  flex: 0 0 auto;
  height: 34px;
  padding: 0 1rem;
  border: 1px solid rgba(255, 122, 138, 0.22);
  border-radius: 12px;
  background: rgba(255, 122, 138, 0.1);
  color: #d9929c;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s, transform 0.15s;
}

.reset-chip:hover {
  background: rgba(255, 122, 138, 0.16);
  border-color: rgba(255, 122, 138, 0.35);
  color: #e8a8b0;
}

.reset-chip:active {
  transform: scale(0.98);
}

.reset-chip-mobile {
  display: none;
  height: 30px;
  padding: 0 0.75rem;
  font-size: 0.75rem;
}

@media (max-width: 560px) {
  .reset-chip-mobile {
    display: inline-flex;
    align-items: center;
  }

  .reset-chip-desktop {
    display: none;
  }

  .presets-row {
    display: block;
  }
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
