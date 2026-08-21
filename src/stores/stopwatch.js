import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

const STORAGE_KEY = 'tick-list-stopwatch'
const MS_PER_HOUR = 3_600_000

export function formatStopwatch(ms) {
  const total = Math.max(0, Math.floor(ms))
  const minutes = Math.floor(total / 60000)
  const seconds = Math.floor((total % 60000) / 1000)
  const centis = Math.floor((total % 1000) / 10)
  return {
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
    centis: String(centis).padStart(2, '0'),
    text: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`,
  }
}

export function costForMs(ms, hourlyRate) {
  const rate = Number(hourlyRate)
  if (!Number.isFinite(rate) || rate <= 0 || ms <= 0) return 0
  return (ms / MS_PER_HOUR) * rate
}

/** Integer $/hr from 0 to 999. No leading-zero padding (0, 10, 100 OK; 000 / 007 → 0 / 7). */
export function normalizeHourlyRate(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (!digits || /^0+$/.test(digits)) return 0
  const n = Number.parseInt(digits.replace(/^0+/, ''), 10)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.min(999, n)
}

export function formatMoney(amount) {
  const n = Number(amount) || 0
  const abs = Math.abs(n)
  const formatted =
    abs >= 100
      ? abs.toFixed(0)
      : abs >= 10
        ? abs.toFixed(1)
        : abs.toFixed(2)
  return `$${formatted}`
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

export const useStopwatchStore = defineStore('stopwatch', () => {
  const elapsedMs = ref(0)
  const running = ref(false)
  const laps = ref([])
  const pricingEnabled = ref(false)
  const hourlyRate = ref(0)

  let baseElapsed = 0
  let runStartedAt = null
  let rafId = 0
  let persistTimer = null
  let ready = false

  const display = computed(() => formatStopwatch(elapsedMs.value))

  const totalCost = computed(() =>
    pricingEnabled.value ? costForMs(elapsedMs.value, hourlyRate.value) : 0,
  )

  function currentElapsed() {
    if (running.value && runStartedAt != null) {
      return baseElapsed + (Date.now() - runStartedAt)
    }
    return baseElapsed
  }

  function persist() {
    if (!ready) return
    saveState({
      baseElapsed: running.value ? currentElapsed() : baseElapsed,
      runStartedAt: running.value ? Date.now() : null,
      running: running.value,
      laps: laps.value,
      pricingEnabled: pricingEnabled.value,
      hourlyRate: hourlyRate.value,
    })
  }

  function frame() {
    if (!running.value) return
    elapsedMs.value = currentElapsed()
    rafId = requestAnimationFrame(frame)
  }

  function startTicker() {
    cancelAnimationFrame(rafId)
    rafId = requestAnimationFrame(frame)
    if (persistTimer) clearInterval(persistTimer)
    persistTimer = window.setInterval(persist, 1000)
  }

  function stopTicker() {
    cancelAnimationFrame(rafId)
    rafId = 0
    if (persistTimer) {
      clearInterval(persistTimer)
      persistTimer = null
    }
  }

  function start() {
    if (running.value) return
    baseElapsed = elapsedMs.value
    runStartedAt = Date.now()
    running.value = true
    startTicker()
    persist()
  }

  function stop() {
    if (!running.value) return
    baseElapsed = currentElapsed()
    elapsedMs.value = baseElapsed
    runStartedAt = null
    running.value = false
    stopTicker()
    persist()
  }

  function reset() {
    running.value = false
    stopTicker()
    runStartedAt = null
    baseElapsed = 0
    elapsedMs.value = 0
    laps.value = []
    persist()
  }

  function lap() {
    const totalMs = currentElapsed()
    if (totalMs <= 0) return
    const prevTotal = laps.value[0]?.totalMs ?? 0
    if (totalMs <= prevTotal) return
    const lapMs = totalMs - prevTotal
    const rate = hourlyRate.value
    laps.value.unshift({
      id: `${Date.now()}-${laps.value.length + 1}`,
      index: laps.value.length + 1,
      lapMs,
      totalMs,
      lapCost: costForMs(lapMs, rate),
      totalCost: costForMs(totalMs, rate),
    })
    persist()
  }

  function setPricingEnabled(value) {
    pricingEnabled.value = Boolean(value)
    persist()
  }

  function setHourlyRate(value) {
    hourlyRate.value = normalizeHourlyRate(value)
    persist()
  }

  function hydrate() {
    const saved = loadState()
    if (!saved) return

    pricingEnabled.value = Boolean(saved.pricingEnabled)
    hourlyRate.value = normalizeHourlyRate(saved.hourlyRate)

    laps.value = Array.isArray(saved.laps)
      ? saved.laps.map((row) => ({
          ...row,
          lapCost:
            row.lapCost ?? costForMs(row.lapMs, hourlyRate.value),
          totalCost:
            row.totalCost ?? costForMs(row.totalMs, hourlyRate.value),
        }))
      : []

    if (saved.running && typeof saved.runStartedAt === 'number') {
      const frozen = Number(saved.baseElapsed) || 0
      baseElapsed = frozen
      runStartedAt = saved.runStartedAt
      running.value = true
      elapsedMs.value = currentElapsed()
      baseElapsed = elapsedMs.value
      runStartedAt = Date.now()
      startTicker()
    } else {
      baseElapsed = Math.max(0, Number(saved.baseElapsed) || 0)
      elapsedMs.value = baseElapsed
      runStartedAt = null
      running.value = false
    }
  }

  hydrate()
  ready = true
  persist()

  watch(laps, () => persist(), { deep: true })
  watch(pricingEnabled, () => persist())
  watch(hourlyRate, () => persist())

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', persist)
  }

  return {
    elapsedMs,
    running,
    laps,
    pricingEnabled,
    hourlyRate,
    display,
    totalCost,
    start,
    stop,
    reset,
    lap,
    setPricingEnabled,
    setHourlyRate,
  }
})
