<script setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import {
  formatMoney,
  formatMonthLabel,
  formatReportDate,
  formatStopwatch,
  monthKeyFromDateKey,
  sumReportAmounts,
  useStopwatchStore,
} from '../stores/stopwatch'

const store = useStopwatchStore()
const { reports } = storeToRefs(store)
const open = ref(false)

const groupedArchive = computed(() => {
  const monthMap = new Map()

  for (const report of reports.value) {
    const monthKey = monthKeyFromDateKey(report.date)
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, { monthKey, days: new Map() })
    }

    const month = monthMap.get(monthKey)
    if (!month.days.has(report.date)) {
      month.days.set(report.date, { dateKey: report.date, reports: [] })
    }
    month.days.get(report.date).reports.push(report)
  }

  return [...monthMap.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([monthKey, month]) => {
      const days = [...month.days.values()]
        .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
        .map((day) => ({
          ...day,
          totals: sumReportAmounts(day.reports),
        }))
      const monthReports = days.flatMap((day) => day.reports)

      return {
        monthKey,
        label: formatMonthLabel(monthKey),
        totals: sumReportAmounts(monthReports),
        days,
      }
    })
})

function toggle() {
  open.value = !open.value
}
</script>

<template>
  <section class="reports-wrap">
    <button
      type="button"
      class="reports-toggle"
      :aria-expanded="open"
      @click="toggle"
    >
      <span>Report archive</span>
      <span class="count">{{ reports.length }}</span>
      <span class="chevron" :class="{ open }" aria-hidden="true">›</span>
    </button>

    <div v-if="open" class="reports-panel">
      <p v-if="reports.length === 0" class="empty">
        Saved daily reports will appear here.
      </p>

      <section
        v-for="month in groupedArchive"
        :key="month.monthKey"
        class="month-group"
      >
        <div v-if="month.totals.hasFull" class="summary-card monthly">
          <p class="summary-title">Month total · {{ month.label }}</p>
          <div class="summary-rows">
            <div class="summary-row">
              <span>Earned (full)</span>
              <span>{{ formatMoney(month.totals.earnedFull) }}</span>
            </div>
            <template v-if="month.totals.hasNet">
              <div class="summary-row">
                <span>Earned (net)</span>
                <span class="net">{{ formatMoney(month.totals.earnedNet) }}</span>
              </div>
              <div class="summary-row subtle">
                <span>Accumulated diff</span>
                <span>{{ formatMoney(month.totals.accumulatedDiff) }}</span>
              </div>
            </template>
          </div>
        </div>

        <div v-for="day in month.days" :key="day.dateKey" class="day-group">
          <article
            v-for="report in day.reports"
            :key="report.id"
            class="report-card"
          >
            <header class="report-head">
              <div>
                <h3>{{ formatReportDate(report.date) }}</h3>
                <p class="report-meta">
                  {{ formatStopwatch(report.elapsedMs).text }}
                  <span v-if="report.manual">· manual</span>
                  <span v-else>· auto</span>
                </p>
              </div>
              <button
                type="button"
                class="delete-btn"
                aria-label="Delete report"
                @click="store.deleteReport(report.id)"
              >
                ×
              </button>
            </header>

            <div v-if="report.pricingEnabled" class="report-rows">
              <div class="report-row">
                <span>Earned (full)</span>
                <span>{{ formatMoney(report.earnedFull) }}</span>
              </div>
              <template v-if="report.netPricingEnabled">
                <div class="report-row">
                  <span>Earned (net)</span>
                  <span class="net">{{ formatMoney(report.earnedNet) }}</span>
                </div>
                <div class="report-row subtle">
                  <span>Rate diff</span>
                  <span>{{ formatMoney(report.rateDiff) }}/hr</span>
                </div>
                <div class="report-row subtle">
                  <span>Accumulated diff</span>
                  <span>{{ formatMoney(report.accumulatedDiff) }}</span>
                </div>
              </template>
            </div>
            <p v-else class="report-note">Price calculator was off for this session.</p>
          </article>

          <div v-if="day.totals.hasFull" class="summary-card daily">
            <p class="summary-title">Day total · {{ formatReportDate(day.dateKey) }}</p>
            <div class="summary-rows">
              <div class="summary-row">
                <span>Earned (full)</span>
                <span>{{ formatMoney(day.totals.earnedFull) }}</span>
              </div>
              <template v-if="day.totals.hasNet">
                <div class="summary-row">
                  <span>Earned (net)</span>
                  <span class="net">{{ formatMoney(day.totals.earnedNet) }}</span>
                </div>
                <div class="summary-row subtle">
                  <span>Accumulated diff</span>
                  <span>{{ formatMoney(day.totals.accumulatedDiff) }}</span>
                </div>
              </template>
            </div>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.reports-wrap {
  width: min(100%, 560px);
  display: grid;
  gap: 0.65rem;
}

.reports-toggle {
  appearance: none;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  border: 1px solid var(--stroke);
  border-radius: 12px;
  padding: 0.7rem 0.9rem;
  background: rgba(18, 21, 28, 0.7);
  color: var(--text);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}

.reports-toggle:hover {
  border-color: rgba(220, 190, 255, 0.28);
  background: rgba(24, 28, 38, 0.85);
}

.count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.35rem;
  height: 1.35rem;
  padding: 0 0.35rem;
  border-radius: 999px;
  background: rgba(139, 124, 247, 0.22);
  color: #d4ceff;
  font-size: 0.72rem;
  font-weight: 700;
}

.chevron {
  margin-left: auto;
  color: var(--muted);
  font-size: 1.1rem;
  line-height: 1;
  transform: rotate(90deg);
  transition: transform 0.2s;
}

.chevron.open {
  transform: rotate(-90deg);
}

.reports-panel {
  display: grid;
  gap: 0.85rem;
}

.month-group {
  display: grid;
  gap: 0.65rem;
}

.day-group {
  display: grid;
  gap: 0.65rem;
}

.empty {
  margin: 0;
  padding: 0.85rem 1rem;
  border: 1px dashed var(--stroke);
  border-radius: 12px;
  color: var(--muted);
  font-size: 0.88rem;
  text-align: center;
}

.summary-card {
  display: grid;
  gap: 0.5rem;
  padding: 0.8rem 1rem;
  border: 1px solid var(--stroke);
  border-radius: 14px;
  background: rgba(10, 7, 16, 0.55);
}

.summary-card.monthly {
  border-color: rgba(139, 124, 247, 0.35);
  background:
    radial-gradient(120% 100% at 0% 0%, rgba(139, 124, 247, 0.12), transparent 55%),
    rgba(10, 7, 16, 0.55);
}

.summary-card.daily {
  border-style: dashed;
  border-color: rgba(139, 227, 196, 0.28);
}

.summary-title {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}

.summary-rows {
  display: grid;
  gap: 0.35rem;
}

.summary-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.summary-row span:first-child {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.summary-row span:last-child {
  font-family: var(--font-mono);
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--ok);
}

.summary-row.subtle span:last-child {
  font-size: 0.86rem;
  color: #ff9eaa;
}

.summary-row .net {
  color: var(--accent);
}

.report-card {
  display: grid;
  gap: 0.65rem;
  padding: 0.85rem 1rem;
  border: 1px solid var(--stroke);
  border-radius: 14px;
  background: rgba(10, 7, 16, 0.45);
}

.report-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.report-head h3 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text);
}

.report-meta {
  margin: 0.2rem 0 0;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--muted);
}

.delete-btn {
  appearance: none;
  flex: 0 0 auto;
  width: 1.75rem;
  height: 1.75rem;
  border: 1px solid var(--stroke);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--muted);
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
}

.delete-btn:hover {
  color: #ffc0c8;
  border-color: rgba(255, 122, 138, 0.45);
  background: var(--danger-soft);
}

.report-rows {
  display: grid;
  gap: 0.4rem;
}

.report-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.84rem;
}

.report-row span:first-child {
  color: var(--muted);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.report-row span:last-child {
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--ok);
}

.report-row.subtle span:last-child {
  font-size: 0.82rem;
  color: #ff9eaa;
}

.report-row .net {
  color: var(--accent);
}

.report-note {
  margin: 0;
  font-size: 0.82rem;
  color: var(--muted);
}
</style>
