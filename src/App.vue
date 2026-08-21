<script setup>
import { ref } from 'vue'
import TaskForm from './components/TaskForm.vue'
import TaskList from './components/TaskList.vue'
import Stopwatch from './components/Stopwatch.vue'
import { useTasksStore } from './stores/tasks'
import { useStopwatchStore } from './stores/stopwatch'
import { initAlarmWatcher } from './composables/useAlarm'
import { storeToRefs } from 'pinia'

const mode = ref('tasks') // 'tasks' | 'stopwatch'
const store = useTasksStore()
const stopwatch = useStopwatchStore()
const { activeCount } = storeToRefs(store)
const { running: stopwatchRunning } = storeToRefs(stopwatch)
initAlarmWatcher()
</script>

<template>
  <div class="app-shell">
    <header class="header">
      <div>
        <p class="brand">Tick List</p>
        <h1>{{ mode === 'stopwatch' ? 'Stopwatch' : 'Task timer tracker' }}</h1>
        <p class="lead">
          <template v-if="mode === 'stopwatch'">
            Start the clock, mark laps, and reset the stopwatch.
          </template>
          <template v-else>
            Add a task, set a duration — when time is up, the alarm goes off.
          </template>
        </p>
      </div>
    </header>

    <nav class="mode-switch" aria-label="Mode">
      <button
        type="button"
        class="mode-btn"
        :class="{ active: mode === 'tasks', live: activeCount > 0 }"
        :aria-label="activeCount > 0 ? `Tasks, running: ${activeCount}` : 'Tasks'"
        @click="mode = 'tasks'"
      >
        <span v-if="activeCount > 0" class="live-dot" aria-hidden="true" />
        Tasks
        <span v-if="activeCount > 0" class="live-badge">{{ activeCount }}</span>
      </button>
      <button
        type="button"
        class="mode-btn"
        :class="{ active: mode === 'stopwatch', live: stopwatchRunning }"
        :aria-label="stopwatchRunning ? 'Stopwatch running' : 'Stopwatch'"
        @click="mode = 'stopwatch'"
      >
        <span v-if="stopwatchRunning" class="live-dot" aria-hidden="true" />
        Stopwatch
        <span v-if="stopwatchRunning" class="live-badge">live</span>
      </button>
    </nav>

    <main class="main">
      <template v-if="mode === 'tasks'">
        <TaskForm v-if="store.view === 'active'" />
        <TaskList />
      </template>
      <Stopwatch v-else />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  position: relative;
  min-height: 100vh;
  padding: 2rem 1.25rem 3rem;
  overflow-x: hidden;
}

.app-shell::before,
.app-shell::after {
  content: '';
  position: fixed;
  border-radius: 50%;
  filter: blur(70px);
  pointer-events: none;
  opacity: 0.45;
  z-index: 0;
}

.app-shell::before {
  width: 420px;
  height: 420px;
  top: -140px;
  right: -80px;
  background: radial-gradient(circle, rgba(168, 85, 247, 0.4), transparent 70%);
  animation: drift 14s ease-in-out infinite alternate;
}

.app-shell::after {
  width: 380px;
  height: 380px;
  bottom: -120px;
  left: -100px;
  background: radial-gradient(circle, rgba(192, 132, 252, 0.25), transparent 70%);
  animation: drift 18s ease-in-out infinite alternate-reverse;
}

.header {
  position: relative;
  z-index: 1;
  max-width: 880px;
  margin: 0 auto 1.25rem;
}

.brand {
  margin: 0 0 0.35rem;
  font-family: var(--font-display);
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent);
}

.header h1 {
  margin: 0 0 0.5rem;
  font-family: var(--font-display);
  font-size: clamp(1.7rem, 4vw, 2.35rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.15;
}

.lead {
  margin: 0;
  max-width: 34rem;
  color: var(--muted);
  line-height: 1.55;
}

.mode-switch {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 0.4rem;
  padding: 0.3rem;
  border: 1px solid var(--stroke);
  border-radius: 12px;
  background: rgba(18, 21, 28, 0.7);
  width: fit-content;
  max-width: 880px;
  margin: 0 auto 1.25rem;
  box-sizing: border-box;
}

.mode-btn {
  appearance: none;
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border: none;
  border-radius: 9px;
  padding: 0.55rem 1rem;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, box-shadow 0.2s;
}

.mode-btn:hover {
  color: var(--text);
}

.mode-btn.active {
  background: var(--accent-glow);
  color: var(--accent);
}

.mode-btn.live:not(.active) {
  color: var(--ok);
  box-shadow: inset 0 0 0 1px rgba(139, 227, 196, 0.28);
}

.live-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--ok);
  box-shadow: 0 0 0 0 rgba(139, 227, 196, 0.55);
  animation: live-pulse 1.4s ease-out infinite;
}

.live-badge {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  padding: 0.12rem 0.4rem;
  border-radius: 999px;
  background: rgba(139, 227, 196, 0.16);
  color: var(--ok);
}

.mode-btn.active .live-badge {
  background: rgba(201, 160, 255, 0.18);
  color: var(--accent);
}

.mode-btn.active .live-dot {
  background: var(--accent);
  box-shadow: 0 0 0 0 rgba(201, 160, 255, 0.5);
}

.main {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 1.25rem;
  max-width: 880px;
  margin: 0 auto;
}

@keyframes drift {
  from {
    transform: translate(0, 0);
  }
  to {
    transform: translate(-24px, 18px);
  }
}

@keyframes live-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(139, 227, 196, 0.55);
  }
  70% {
    box-shadow: 0 0 0 8px rgba(139, 227, 196, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(139, 227, 196, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-shell::before,
  .app-shell::after,
  .live-dot {
    animation: none;
  }
}
</style>
