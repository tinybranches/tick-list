<script setup>
import { computed, ref, watch } from 'vue'
import BrandLogo from './components/BrandLogo.vue'
import TaskForm from './components/TaskForm.vue'
import TaskList from './components/TaskList.vue'
import Board from './components/Board.vue'
import Stopwatch from './components/Stopwatch.vue'
import { useTasksStore } from './stores/tasks'
import { useBoardStore } from './stores/board'
import { useStopwatchStore } from './stores/stopwatch'
import { initAlarmWatcher } from './composables/useAlarm'
import { storeToRefs } from 'pinia'

const MODE_KEY = 'tick-list-mode'
const MODES = new Set(['tasks', 'board', 'stopwatch'])

function loadMode() {
  try {
    const saved = localStorage.getItem(MODE_KEY)
    return MODES.has(saved) ? saved : 'tasks'
  } catch {
    return 'tasks'
  }
}

const mode = ref(loadMode()) // 'tasks' | 'board' | 'stopwatch'
const store = useTasksStore()
const board = useBoardStore()
const stopwatch = useStopwatchStore()
const { activeCount } = storeToRefs(store)
const { openCount } = storeToRefs(board)
const { running: stopwatchRunning } = storeToRefs(stopwatch)

const heading = computed(() => {
  if (mode.value === 'stopwatch') return 'Stopwatch'
  if (mode.value === 'board') return 'Board'
  return 'Tasks'
})

const lead = computed(() => {
  if (mode.value === 'stopwatch') {
    return 'Track time, laps, and billing.'
  }
  if (mode.value === 'board') {
    return 'Paste client notes and images into cards.'
  }
  return 'Timers with alarms for focused work.'
})

watch(mode, (value) => {
  try {
    localStorage.setItem(MODE_KEY, value)
  } catch {
    /* ignore quota / private mode */
  }
})

initAlarmWatcher()

const year = new Date().getFullYear()
</script>

<template>
  <div class="dashboard">
    <aside class="sidebar" aria-label="Workspace">
      <div class="sidebar-brand">
        <BrandLogo />
      </div>

      <nav class="sidebar-nav" aria-label="Sections">
        <button
          type="button"
          class="nav-item"
          :class="{ active: mode === 'tasks', live: activeCount > 0 }"
          @click="mode = 'tasks'"
        >
          <span class="nav-dot" aria-hidden="true" />
          <span class="nav-label">Tasks</span>
          <span v-if="activeCount > 0" class="nav-badge">{{ activeCount }}</span>
        </button>
        <button
          type="button"
          class="nav-item"
          :class="{ active: mode === 'board', live: openCount > 0 }"
          @click="mode = 'board'"
        >
          <span class="nav-dot" aria-hidden="true" />
          <span class="nav-label">Board</span>
          <span v-if="openCount > 0" class="nav-badge">{{ openCount }}</span>
        </button>
        <button
          type="button"
          class="nav-item"
          :class="{ active: mode === 'stopwatch', live: stopwatchRunning }"
          @click="mode = 'stopwatch'"
        >
          <span class="nav-dot" aria-hidden="true" />
          <span class="nav-label">Stopwatch</span>
          <span v-if="stopwatchRunning" class="nav-badge live">live</span>
        </button>
      </nav>

      <p class="sidebar-foot">© {{ year }}</p>
    </aside>

    <div class="workspace">
      <header class="workspace-header">
        <div class="workspace-title">
          <p class="eyebrow">Workspace</p>
          <h1>{{ heading }}</h1>
          <p class="lead">{{ lead }}</p>
        </div>
      </header>

      <main class="workspace-main" :class="{ board: mode === 'board' }">
        <template v-if="mode === 'tasks'">
          <TaskForm v-if="store.view === 'active'" />
          <TaskList />
        </template>
        <Board v-else-if="mode === 'board'" />
        <Stopwatch v-else />
      </main>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  display: grid;
  grid-template-columns: 232px minmax(0, 1fr);
  min-height: 100vh;
  background: transparent;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
  padding: 1.25rem 0.95rem 1rem;
  border-right: 1px solid var(--stroke);
  background:
    linear-gradient(180deg, rgba(107, 149, 240, 0.05), transparent 28%),
    rgba(8, 10, 14, 0.88);
  backdrop-filter: blur(16px);
}

.sidebar-brand {
  padding: 0.15rem 0.35rem 0.35rem;
}

.sidebar-nav {
  display: grid;
  gap: 0.3rem;
}

.nav-item {
  appearance: none;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  border: 1px solid transparent;
  border-radius: 12px;
  padding: 0.68rem 0.75rem;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 560;
  text-align: left;
  cursor: pointer;
  transition: background 0.18s, color 0.18s, border-color 0.18s;
}

.nav-dot {
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  transition: background 0.18s, box-shadow 0.18s;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.035);
  color: var(--text);
  border-color: var(--stroke);
}

.nav-item.active {
  background: var(--accent-glow);
  border-color: rgba(107, 149, 240, 0.28);
  color: var(--accent-soft);
}

.nav-item.active .nav-dot {
  background: var(--accent);
  box-shadow: 0 0 0 3px rgba(107, 149, 240, 0.18);
}

.nav-item.live:not(.active) {
  color: var(--ok);
}

.nav-item.live:not(.active) .nav-dot {
  background: var(--ok);
  box-shadow: 0 0 0 3px rgba(62, 207, 142, 0.16);
}

.nav-badge {
  min-width: 1.25rem;
  padding: 0.12rem 0.4rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
  color: inherit;
  font-family: var(--font-mono);
  font-size: 0.66rem;
  font-weight: 600;
  text-align: center;
}

.nav-badge.live,
.nav-item.active .nav-badge {
  background: rgba(107, 149, 240, 0.22);
}

.nav-item.live:not(.active) .nav-badge {
  background: var(--ok-soft);
  color: var(--ok);
}

.sidebar-foot {
  margin: auto 0 0;
  padding: 0.55rem 0.75rem;
  color: var(--muted);
  font-size: 0.66rem;
  letter-spacing: 0.08em;
  opacity: 0.55;
}

.workspace {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-width: 0;
  min-height: 100vh;
}

.workspace-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.35rem 1.6rem 1.1rem;
  border-bottom: 1px solid transparent;
  background:
    linear-gradient(180deg, rgba(10, 12, 16, 0.72), rgba(10, 12, 16, 0.28));
  backdrop-filter: blur(14px);
  position: sticky;
  top: 0;
  z-index: 5;
}

.workspace-title {
  display: grid;
  gap: 0.2rem;
}

.eyebrow {
  margin: 0;
  color: var(--accent-soft);
  font-size: 0.68rem;
  font-weight: 650;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.85;
}

.workspace-header h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1.45rem, 2vw, 1.75rem);
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1.1;
}

.lead {
  margin: 0;
  color: var(--muted);
  font-size: 0.9rem;
}

.workspace-main {
  padding: 1.25rem 1.6rem 2rem;
  display: grid;
  gap: 1.1rem;
  align-content: start;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.workspace-main.board {
  height: calc(100vh - 96px);
  padding-bottom: 1rem;
  overflow: hidden;
}

@media (max-width: 860px) {
  .dashboard {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr);
  }

  .sidebar {
    border-right: none;
    border-bottom: 1px solid var(--stroke);
    padding: 0.8rem;
    gap: 0.75rem;
  }

  .sidebar-brand {
    display: none;
  }

  .sidebar-nav {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.35rem;
  }

  .nav-item {
    grid-template-columns: 1fr;
    justify-items: center;
    gap: 0.25rem;
    padding: 0.55rem 0.35rem;
    font-size: 0.78rem;
    text-align: center;
  }

  .nav-dot {
    display: none;
  }

  .sidebar-foot {
    display: none;
  }

  .workspace {
    min-height: 0;
  }

  .workspace-header {
    position: static;
    padding: 1rem;
  }

  .workspace-main {
    padding: 1rem;
  }

  .workspace-main.board {
    height: auto;
    min-height: 70vh;
    overflow: visible;
  }
}
</style>
