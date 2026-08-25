import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

const STORAGE_KEY = 'tick-list-tasks'
const MIN_SUBTRACT_MS = 5 * 60_000
const MAX_REMAINING_MS = 22 * 60 * 60 * 1000

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveState(payload) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* quota / private mode */
  }
}

function serializeTask(task) {
  return {
    id: task.id,
    title: task.title,
    durationMs: task.durationMs,
    remainingMs: task.remainingMs,
    status: task.status,
    enabled: task.enabled,
    alarming: task.alarming,
    archived: task.archived,
    archivedAt: task.archivedAt,
    runStartedAt:
      !task.archived && task.enabled && task.status === 'running'
        ? Date.now()
        : null,
  }
}

function normalizeTasks(list) {
  const now = Date.now()
  if (!Array.isArray(list)) return []

  return list.map((raw) => {
    const task = {
      id: String(raw.id ?? uid()),
      title: String(raw.title ?? ''),
      durationMs: Math.max(0, Number(raw.durationMs) || 0),
      remainingMs: Math.max(0, Number(raw.remainingMs) || 0),
      status: raw.status || 'idle',
      enabled: raw.enabled !== false,
      alarming: Boolean(raw.alarming),
      archived: Boolean(raw.archived),
      archivedAt: raw.archivedAt ?? null,
    }

    if (
      !task.archived &&
      task.enabled &&
      task.status === 'running' &&
      typeof raw.runStartedAt === 'number'
    ) {
      const passed = Math.max(0, now - raw.runStartedAt)
      task.remainingMs = Math.max(0, task.remainingMs - passed)
      if (task.remainingMs <= 0) {
        task.remainingMs = 0
        task.status = 'finished'
        task.alarming = true
      }
    } else if (task.archived && task.status === 'running') {
      task.status = 'paused'
      task.alarming = false
    }

    return task
  })
}

export const useTasksStore = defineStore('tasks', () => {
  const saved = loadState()
  const tasks = ref(normalizeTasks(saved?.tasks))
  const view = ref(
    saved?.view === 'archive' || saved?.view === 'active' ? saved.view : 'active',
  )
  let tickTimer = null
  let lastTick = 0
  let ready = false
  let persistTimer = null

  const activeTasks = computed(() => tasks.value.filter((t) => !t.archived))
  const archivedTasks = computed(() => tasks.value.filter((t) => t.archived))

  const visibleTasks = computed(() =>
    view.value === 'archive' ? archivedTasks.value : activeTasks.value,
  )

  const activeCount = computed(
    () =>
      activeTasks.value.filter((t) => t.enabled && t.status === 'running').length,
  )

  const runningTaskId = computed(() => {
    const running = tasks.value.find(
      (t) => !t.archived && t.enabled && t.status === 'running',
    )
    return running?.id ?? null
  })

  const alarmingTasks = computed(() =>
    tasks.value.filter((t) => !t.archived && t.alarming),
  )

  function persist() {
    if (!ready) return
    // Save every task: active + archived. Only removeTask() drops an entry.
    saveState({
      view: view.value,
      tasks: tasks.value.map(serializeTask),
    })
  }

  function ensurePersistLoop() {
    if (persistTimer) return
    persistTimer = window.setInterval(persist, 1000)
  }

  function stopPersistLoopIfIdle() {
    const anyRunning = tasks.value.some(
      (t) => !t.archived && t.enabled && t.status === 'running',
    )
    if (anyRunning) return
    if (persistTimer) {
      clearInterval(persistTimer)
      persistTimer = null
    }
  }

  function ensureTicker() {
    if (tickTimer) return
    lastTick = performance.now()
    tickTimer = window.setInterval(() => {
      const now = performance.now()
      const delta = now - lastTick
      lastTick = now
      tick(delta)
    }, 200)
    ensurePersistLoop()
  }

  function stopTickerIfIdle() {
    if (
      tasks.value.some(
        (t) => !t.archived && t.enabled && t.status === 'running',
      )
    )
      return
    if (tickTimer) {
      clearInterval(tickTimer)
      tickTimer = null
    }
    stopPersistLoopIfIdle()
  }

  function tick(deltaMs) {
    let anyFinished = false
    for (const task of tasks.value) {
      if (task.archived || !task.enabled || task.status !== 'running') continue
      task.remainingMs = Math.max(0, task.remainingMs - deltaMs)
      if (task.remainingMs <= 0) {
        task.remainingMs = 0
        task.status = 'finished'
        task.alarming = true
        anyFinished = true
      }
    }
    if (anyFinished) stopTickerIfIdle()
  }

  function addTask({ title, hours = 0, minutes = 0, seconds = 0 }) {
    const durationMs =
      (Math.max(0, Number(hours) || 0) * 3600 +
        Math.max(0, Number(minutes) || 0) * 60 +
        Math.max(0, Number(seconds) || 0)) *
      1000

    if (!title?.trim() || durationMs <= 0) return null

    const task = {
      id: uid(),
      title: title.trim(),
      durationMs,
      remainingMs: durationMs,
      status: 'idle',
      enabled: true,
      alarming: false,
      archived: false,
      archivedAt: null,
    }
    tasks.value.unshift(task)
    view.value = 'active'
    persist()
    return task
  }

  function removeTask(id) {
    const task = tasks.value.find((t) => t.id === id)
    if (task?.alarming) task.alarming = false
    tasks.value = tasks.value.filter((t) => t.id !== id)
    stopTickerIfIdle()
    persist()
  }

  function archiveTask(id) {
    const task = tasks.value.find((t) => t.id === id)
    if (!task || task.archived) return
    if (task.status === 'running') task.status = 'paused'
    task.alarming = false
    task.archived = true
    task.archivedAt = Date.now()
    stopTickerIfIdle()
    persist()
  }

  function restoreTask(id) {
    const task = tasks.value.find((t) => t.id === id)
    if (!task || !task.archived) return
    task.archived = false
    task.archivedAt = null
    view.value = 'active'
    persist()
  }

  function setView(next) {
    if (next === 'active' || next === 'archive') {
      view.value = next
      persist()
    }
  }

  function startTask(id) {
    const task = tasks.value.find((t) => t.id === id)
    if (!task || task.archived || !task.enabled) return
    if (task.durationMs <= 0) return
    const otherRunning = tasks.value.some(
      (t) =>
        t.id !== id && !t.archived && t.enabled && t.status === 'running',
    )
    if (otherRunning) return
    if (task.remainingMs <= 0) {
      task.remainingMs = task.durationMs
    }
    task.alarming = false
    task.status = 'running'
    ensureTicker()
    persist()
  }

  function pauseTask(id) {
    const task = tasks.value.find((t) => t.id === id)
    if (!task || task.status !== 'running') return
    task.status = 'paused'
    stopTickerIfIdle()
    persist()
  }

  function toggleRun(id) {
    const task = tasks.value.find((t) => t.id === id)
    if (!task || task.archived) return
    if (task.status === 'running') pauseTask(id)
    else startTask(id)
  }

  function addTime(id, ms) {
    const task = tasks.value.find((t) => t.id === id)
    if (!task || task.archived || !ms) return

    const delta = Number(ms) || 0
    if (!delta) return

    if (delta > 0) {
      if (task.remainingMs >= MAX_REMAINING_MS) return
      const room = MAX_REMAINING_MS - task.remainingMs
      const add = Math.min(delta, room)
      if (add <= 0) return
      task.remainingMs += add
      task.durationMs += add
      if (task.status === 'finished') {
        task.status = 'paused'
        task.alarming = false
      }
    } else {
      if (task.remainingMs < MIN_SUBTRACT_MS) return
      const nextRemaining = Math.max(0, task.remainingMs + delta)
      const cut = task.remainingMs - nextRemaining
      task.remainingMs = nextRemaining
      task.durationMs = Math.max(nextRemaining, task.durationMs - cut)
      if (task.remainingMs <= 0) {
        task.remainingMs = 0
        if (task.status === 'running') {
          task.status = 'finished'
          task.alarming = true
          stopTickerIfIdle()
        }
      }
    }
    persist()
  }

  function setEnabled(id, enabled) {
    const task = tasks.value.find((t) => t.id === id)
    if (!task || task.archived) return
    task.enabled = enabled
    if (!enabled) {
      if (task.status === 'running') task.status = 'paused'
      task.alarming = false
      stopTickerIfIdle()
    }
    persist()
  }

  function toggleEnabled(id) {
    const task = tasks.value.find((t) => t.id === id)
    if (!task || task.archived) return
    setEnabled(id, !task.enabled)
  }

  function dismissAlarm(id) {
    const task = tasks.value.find((t) => t.id === id)
    if (!task) return
    task.alarming = false
    persist()
  }

  function resetTask(id) {
    const task = tasks.value.find((t) => t.id === id)
    if (!task || task.archived) return
    task.remainingMs = task.durationMs
    task.status = 'idle'
    task.alarming = false
    stopTickerIfIdle()
    persist()
  }

  function hydrateRunning() {
    const running = tasks.value.filter(
      (t) => !t.archived && t.enabled && t.status === 'running',
    )
    if (running.length > 1) {
      for (let i = 1; i < running.length; i += 1) {
        running[i].status = 'paused'
      }
    }
    if (running.length > 0) ensureTicker()
  }

  hydrateRunning()
  ready = true
  persist()

  watch(
    tasks,
    () => persist(),
    { deep: true },
  )
  watch(view, () => persist())

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', persist)
    window.addEventListener('pagehide', persist)
  }

  return {
    tasks,
    view,
    activeTasks,
    archivedTasks,
    visibleTasks,
    activeCount,
    runningTaskId,
    alarmingTasks,
    addTask,
    removeTask,
    archiveTask,
    restoreTask,
    setView,
    startTask,
    pauseTask,
    toggleRun,
    addTime,
    setEnabled,
    toggleEnabled,
    dismissAlarm,
    resetTask,
  }
})
