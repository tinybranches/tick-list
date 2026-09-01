import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

const STORAGE_KEY = 'tick-list-stopwatch'
const REPORTS_STORAGE_KEY = 'tick-list-stopwatch-reports'
const MS_PER_HOUR = 3_600_000
const EOD_MINUTES = 23 * 60 + 59

export function localDateKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatReportDate(dateKey) {
  const [y, m, d] = String(dateKey).split('-').map(Number)
  if (!y || !m || !d) return dateKey
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function monthKeyFromDateKey(dateKey) {
  return String(dateKey).slice(0, 7)
}

export function formatMonthLabel(monthKey) {
  const [y, m] = String(monthKey).split('-').map(Number)
  if (!y || !m) return monthKey
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
  })
}

export function sumReportAmounts(reportList) {
  return reportList.reduce(
    (acc, report) => {
      if (!report.pricingEnabled) return acc
      acc.hasFull = true
      acc.earnedFull += Number(report.earnedFull) || 0
      if (report.netPricingEnabled) {
        acc.hasNet = true
        acc.earnedNet += Number(report.earnedNet) || 0
        acc.accumulatedDiff += Number(report.accumulatedDiff) || 0
      }
      return acc
    },
    {
      earnedFull: 0,
      earnedNet: 0,
      accumulatedDiff: 0,
      hasFull: false,
      hasNet: false,
    },
  )
}

export function formatStopwatch(ms) {
  const total = Math.max(0, Math.floor(ms))
  const hours = Math.floor(total / 3_600_000)
  const minutes = Math.floor((total % 3_600_000) / 60_000)
  const seconds = Math.floor((total % 60_000) / 1000)
  const centis = Math.floor((total % 1000) / 10)
  const pad2 = (n) => String(n).padStart(2, '0')

  if (hours > 0) {
    return {
      hours: pad2(hours),
      minutes: pad2(minutes),
      seconds: pad2(seconds),
      centis: pad2(centis),
      hasHours: true,
      main: `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`,
      text: `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}.${pad2(centis)}`,
    }
  }

  return {
    hours: null,
    minutes: pad2(minutes),
    seconds: pad2(seconds),
    centis: pad2(centis),
    hasHours: false,
    main: `${pad2(minutes)}:${pad2(seconds)}`,
    text: `${pad2(minutes)}:${pad2(seconds)}.${pad2(centis)}`,
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

function loadReports() {
  try {
    const raw = localStorage.getItem(REPORTS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveReports(reports) {
  try {
    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports))
  } catch {
    /* quota / private mode */
  }
}

function shouldAutoReport(sessionDate, now = new Date()) {
  if (!sessionDate) return false
  const today = localDateKey(now)
  const minutes = now.getHours() * 60 + now.getMinutes()
  if (today > sessionDate) return true
  if (today === sessionDate && minutes >= EOD_MINUTES) return true
  return false
}

export const useStopwatchStore = defineStore('stopwatch', () => {
  const elapsedMs = ref(0)
  const running = ref(false)
  const laps = ref([])
  const pricingEnabled = ref(false)
  const hourlyRate = ref(0)
  const netPricingEnabled = ref(false)
  const netHourlyRate = ref(0)
  const sessionDate = ref(null)
  const reports = ref([])

  let baseElapsed = 0
  let runStartedAt = null
  let rafId = 0
  let persistTimer = null
  let ready = false
  let stoppedAt = null

  const display = computed(() => formatStopwatch(elapsedMs.value))

  const totalCost = computed(() =>
    pricingEnabled.value ? costForMs(elapsedMs.value, hourlyRate.value) : 0,
  )

  const netTotalCost = computed(() =>
    pricingEnabled.value && netPricingEnabled.value
      ? costForMs(elapsedMs.value, netHourlyRate.value)
      : 0,
  )

  const hourlyRateDiff = computed(() => {
    if (!pricingEnabled.value || !netPricingEnabled.value) return 0
    return Math.max(0, hourlyRate.value - netHourlyRate.value)
  })

  const accumulatedDiff = computed(() =>
    Math.max(0, totalCost.value - netTotalCost.value),
  )

  const canSaveDailyReport = computed(
    () => elapsedMs.value > 0 && !running.value,
  )

  function currentElapsed() {
    if (running.value && runStartedAt != null) {
      return baseElapsed + (Date.now() - runStartedAt)
    }
    return baseElapsed
  }

  function touchSessionDate() {
    if (elapsedMs.value > 0 && !sessionDate.value) {
      sessionDate.value = localDateKey()
    }
  }

  function persistReports() {
    saveReports(reports.value)
  }

  function persist() {
    if (!ready) return
    touchSessionDate()
    saveState({
      baseElapsed: running.value ? currentElapsed() : baseElapsed,
      runStartedAt: running.value ? Date.now() : null,
      running: running.value,
      laps: laps.value,
      pricingEnabled: pricingEnabled.value,
      hourlyRate: hourlyRate.value,
      netPricingEnabled: netPricingEnabled.value,
      netHourlyRate: netHourlyRate.value,
      sessionDate: sessionDate.value,
      stoppedAt,
    })
  }

  function persistClearedSession() {
    saveState({
      baseElapsed: 0,
      runStartedAt: null,
      running: false,
      laps: [],
      pricingEnabled: pricingEnabled.value,
      hourlyRate: hourlyRate.value,
      netPricingEnabled: netPricingEnabled.value,
      netHourlyRate: netHourlyRate.value,
      sessionDate: null,
      stoppedAt: null,
    })
  }

  function buildDailyReport({ dateKey, manual, ms = currentElapsed() }) {
    const full = pricingEnabled.value ? costForMs(ms, hourlyRate.value) : 0
    const net =
      pricingEnabled.value && netPricingEnabled.value
        ? costForMs(ms, netHourlyRate.value)
        : 0
    const rateDiff =
      pricingEnabled.value && netPricingEnabled.value
        ? Math.max(0, hourlyRate.value - netHourlyRate.value)
        : 0

    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: dateKey,
      createdAt: Date.now(),
      manual: Boolean(manual),
      elapsedMs: ms,
      pricingEnabled: pricingEnabled.value,
      hourlyRate: hourlyRate.value,
      netPricingEnabled: netPricingEnabled.value,
      netHourlyRate: netHourlyRate.value,
      earnedFull: full,
      earnedNet: net,
      rateDiff,
      accumulatedDiff: Math.max(0, full - net),
    }
  }

  function clearSession() {
    running.value = false
    stopTicker()
    runStartedAt = null
    baseElapsed = 0
    elapsedMs.value = 0
    laps.value = []
    sessionDate.value = null
    stoppedAt = null
    if (ready) persistClearedSession()
  }

  function archiveDailyReport({ manual = false, dateKey } = {}) {
    if (running.value) {
      baseElapsed = currentElapsed()
      elapsedMs.value = baseElapsed
      running.value = false
      stopTicker()
      runStartedAt = null
      stoppedAt = Date.now()
    }

    const ms = baseElapsed
    if (ms <= 0) return false

    const reportDate = dateKey || sessionDate.value || localDateKey()
    reports.value.unshift(buildDailyReport({ dateKey: reportDate, manual, ms }))
    persistReports()
    clearSession()
    return true
  }

  function saveDailyReport() {
    return archiveDailyReport({ manual: true })
  }

  function deleteReport(id) {
    const next = reports.value.filter((row) => row.id !== id)
    if (next.length === reports.value.length) return
    reports.value = next
    persistReports()
  }

  function checkAutoDailyReport() {
    if (!ready || !sessionDate.value) return false
    const ms = currentElapsed()
    if (ms <= 0) return false
    if (!shouldAutoReport(sessionDate.value)) return false
    return archiveDailyReport({
      manual: false,
      dateKey: sessionDate.value,
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
    if (elapsedMs.value === 0) {
      sessionDate.value = localDateKey()
      stoppedAt = null
    }
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
    stoppedAt = Date.now()
    touchSessionDate()
    stopTicker()
    persist()
  }

  function reset() {
    clearSession()
  }

  function lap() {
    const totalMs = currentElapsed()
    if (totalMs <= 0) return
    const prevTotal = laps.value[0]?.totalMs ?? 0
    if (totalMs <= prevTotal) return
    const lapMs = totalMs - prevTotal
    const rate = hourlyRate.value
    const netRate = netHourlyRate.value
    laps.value.unshift({
      id: `${Date.now()}-${laps.value.length + 1}`,
      index: laps.value.length + 1,
      lapMs,
      totalMs,
      lapCost: costForMs(lapMs, rate),
      totalCost: costForMs(totalMs, rate),
      lapNetCost: costForMs(lapMs, netRate),
      totalNetCost: costForMs(totalMs, netRate),
    })
    persist()
  }

  function setPricingEnabled(value) {
    pricingEnabled.value = Boolean(value)
    persist()
  }

  function setHourlyRate(value) {
    hourlyRate.value = normalizeHourlyRate(value)
    if (netHourlyRate.value > hourlyRate.value) {
      netHourlyRate.value = hourlyRate.value
    }
    persist()
  }

  function setNetPricingEnabled(value) {
    netPricingEnabled.value = Boolean(value)
    if (!netPricingEnabled.value) netHourlyRate.value = 0
    persist()
  }

  function setNetHourlyRate(value) {
    const next = normalizeHourlyRate(value)
    netHourlyRate.value =
      hourlyRate.value > 0 ? Math.min(next, hourlyRate.value) : next
    persist()
  }

  function hydrate() {
    reports.value = loadReports()

    const saved = loadState()
    if (!saved) return

    sessionDate.value =
      typeof saved.sessionDate === 'string' ? saved.sessionDate : null
    stoppedAt =
      typeof saved.stoppedAt === 'number' ? saved.stoppedAt : null

    if (!sessionDate.value && (Number(saved.baseElapsed) || 0) > 0) {
      const anchor = stoppedAt ?? saved.runStartedAt ?? Date.now()
      sessionDate.value = localDateKey(new Date(anchor))
    }

    pricingEnabled.value = Boolean(saved.pricingEnabled)
    hourlyRate.value = normalizeHourlyRate(saved.hourlyRate)
    netPricingEnabled.value = Boolean(saved.netPricingEnabled)
    netHourlyRate.value = normalizeHourlyRate(saved.netHourlyRate)
    if (netHourlyRate.value > hourlyRate.value) {
      netHourlyRate.value = hourlyRate.value
    }

    laps.value = Array.isArray(saved.laps)
      ? saved.laps.map((row) => ({
          ...row,
          lapCost:
            row.lapCost ?? costForMs(row.lapMs, hourlyRate.value),
          totalCost:
            row.totalCost ?? costForMs(row.totalMs, hourlyRate.value),
          lapNetCost:
            row.lapNetCost ?? costForMs(row.lapMs, netHourlyRate.value),
          totalNetCost:
            row.totalNetCost ?? costForMs(row.totalMs, netHourlyRate.value),
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
  checkAutoDailyReport()

  watch(laps, () => persist(), { deep: true })
  watch(pricingEnabled, () => persist())
  watch(hourlyRate, () => persist())
  watch(netPricingEnabled, () => persist())
  watch(netHourlyRate, () => persist())

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', persist)
    window.setInterval(() => checkAutoDailyReport(), 30_000)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkAutoDailyReport()
    })
  }

  return {
    elapsedMs,
    running,
    laps,
    pricingEnabled,
    hourlyRate,
    netPricingEnabled,
    netHourlyRate,
    sessionDate,
    reports,
    display,
    totalCost,
    netTotalCost,
    hourlyRateDiff,
    accumulatedDiff,
    canSaveDailyReport,
    start,
    stop,
    reset,
    lap,
    saveDailyReport,
    deleteReport,
    setPricingEnabled,
    setHourlyRate,
    setNetPricingEnabled,
    setNetHourlyRate,
  }
})
