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
const { openReports, paidReports } = storeToRefs(store)
const open = ref(false)
const view = ref('open') // 'open' | 'paid'

const visibleReports = computed(() =>
  view.value === 'paid' ? paidReports.value : openReports.value,
)

function groupReports(list) {
  const monthMap = new Map()

  for (const report of list) {
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
}

const groupedArchive = computed(() => groupReports(visibleReports.value))

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
      <span class="count">{{ openReports.length }}</span>
      <span
        v-if="paidReports.length"
        class="count paid-count"
        :title="`${paidReports.length} paid`"
      >
        {{ paidReports.length }}
      </span>
      <span class="chevron" :class="{ open }" aria-hidden="true">›</span>
    </button>

    <div v-if="open" class="reports-panel">
      <div class="tabs" role="tablist" aria-label="Report lists">
        <button
          type="button"
          role="tab"
          class="tab"
          :class="{ active: view === 'open' }"
          :aria-selected="view === 'open'"
          @click="view = 'open'"
        >
          Open
          <span class="tab-count">{{ openReports.length }}</span>
        </button>
        <button
          type="button"
          role="tab"
          class="tab"
          :class="{ active: view === 'paid' }"
          :aria-selected="view === 'paid'"
          @click="view = 'paid'"
        >
          Paid
          <span class="tab-count">{{ paidReports.length }}</span>
        </button>
      </div>

      <p v-if="visibleReports.length === 0" class="empty">
        <template v-if="view === 'open'">
          Open reports appear here. Move paid ones to Paid so they stop summing with unpaid work.
        </template>
        <template v-else>
          Paid archive is empty. Press the archive button on an open report after the client pays.
        </template>
      </p>

      <section
        v-for="month in groupedArchive"
        :key="month.monthKey"
        class="month-group"
      >
        <div v-if="month.totals.hasFull" class="month-banner">
          <div class="month-banner-head">
            <span class="banner-badge">{{ view === 'paid' ? 'Paid month' : 'Month' }}</span>
            <span class="banner-date">{{ month.label }}</span>
          </div>
          <div class="banner-stats">
            <div class="stat-chip">
              <span class="chip-label">Full</span>
              <span class="chip-value">{{ formatMoney(month.totals.earnedFull) }}</span>
            </div>
            <template v-if="month.totals.hasNet">
              <div class="stat-chip">
                <span class="chip-label">Net</span>
                <span class="chip-value net">{{ formatMoney(month.totals.earnedNet) }}</span>
              </div>
              <div class="stat-chip diff">
                <span class="chip-label">Diff</span>
                <span class="chip-value">{{ formatMoney(month.totals.accumulatedDiff) }}</span>
              </div>
            </template>
          </div>
        </div>

        <div v-for="day in month.days" :key="day.dateKey" class="day-group">
          <div class="day-stack">
            <article
              v-for="report in day.reports"
              :key="report.id"
              class="report-card"
              :class="{ paid: report.archived }"
            >
              <header class="report-head">
                <div>
                  <h3>{{ formatReportDate(report.date) }}</h3>
                  <p class="report-meta">
                    {{ formatStopwatch(report.elapsedMs).text }}
                    <span v-if="report.manual">· manual</span>
                    <span v-else>· auto</span>
                    <span v-if="report.archived">· paid</span>
                  </p>
                </div>
                <div class="report-actions">
                  <button
                    v-if="!report.archived"
                    type="button"
                    class="action-btn archive-btn"
                    aria-label="Move to paid archive"
                    title="Move to paid"
                    @click="store.archiveReport(report.id)"
                  >
                    ↓
                  </button>
                  <button
                    v-else
                    type="button"
                    class="action-btn restore-btn"
                    aria-label="Restore to open reports"
                    title="Restore to open"
                    @click="store.restoreReport(report.id)"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    class="action-btn delete-btn"
                    aria-label="Delete report"
                    title="Delete"
                    @click="store.deleteReport(report.id)"
                  >
                    ×
                  </button>
                </div>
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
          </div>

          <div v-if="day.totals.hasFull" class="day-total">
            <span class="day-total-label">Day total</span>
            <div class="day-total-stats">
              <span class="day-stat">
                <span class="day-stat-key">Full</span>
                {{ formatMoney(day.totals.earnedFull) }}
              </span>
              <template v-if="day.totals.hasNet">
                <span class="day-stat-sep" aria-hidden="true">·</span>
                <span class="day-stat">
                  <span class="day-stat-key">Net</span>
                  {{ formatMoney(day.totals.earnedNet) }}
                </span>
                <span class="day-stat-sep" aria-hidden="true">·</span>
                <span class="day-stat diff">
                  <span class="day-stat-key">Diff</span>
                  {{ formatMoney(day.totals.accumulatedDiff) }}
                </span>
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

.paid-count {
  background: rgba(139, 227, 196, 0.18);
  color: var(--ok);
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

.tabs {
  display: flex;
  gap: 0.4rem;
  padding: 0.3rem;
  border: 1px solid var(--stroke);
  border-radius: 12px;
  background: rgba(18, 21, 28, 0.7);
  width: fit-content;
  max-width: 100%;
}

.tab {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border: none;
  border-radius: 9px;
  padding: 0.55rem 0.9rem;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.tab:hover {
  color: var(--text);
}

.tab.active {
  background: var(--accent-glow);
  color: var(--accent);
}

.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.2rem;
  height: 1.2rem;
  padding: 0 0.3rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  font-size: 0.72rem;
  font-weight: 700;
}

.month-group {
  display: grid;
  gap: 0.65rem;
}

.day-group {
  display: grid;
  gap: 0.45rem;
}

.day-stack {
  display: grid;
  gap: 0.65rem;
  padding-left: 0.55rem;
  border-left: 2px solid rgba(220, 190, 255, 0.14);
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

.month-banner {
  display: grid;
  gap: 0.65rem;
  padding: 0.7rem 0.85rem;
  border-radius: 10px;
  background: linear-gradient(
    90deg,
    rgba(139, 124, 247, 0.18) 0%,
    rgba(139, 124, 247, 0.06) 42%,
    transparent 100%
  );
  border: none;
  border-left: 3px solid rgba(168, 85, 247, 0.75);
}

.month-banner-head {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  flex-wrap: wrap;
}

.banner-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.18rem 0.5rem;
  border-radius: 999px;
  background: rgba(168, 85, 247, 0.28);
  color: #e8dcff;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.banner-date {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text);
}

.banner-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.stat-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 0.35rem;
  padding: 0.35rem 0.6rem;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.stat-chip.diff .chip-value {
  color: #ff9eaa;
}

.chip-label {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}

.chip-value {
  font-family: var(--font-mono);
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--ok);
}

.chip-value.net {
  color: var(--accent);
}

.day-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.45rem 0.65rem 0.45rem 0.75rem;
  border-radius: 8px;
  background: rgba(139, 227, 196, 0.07);
  border-top: 1px solid rgba(139, 227, 196, 0.22);
}

.day-total-label {
  flex: 0 0 auto;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ok);
  opacity: 0.85;
}

.day-total-stats {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.35rem 0.5rem;
  margin-left: auto;
}

.day-stat {
  font-family: var(--font-mono);
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--ok);
}

.day-stat.diff {
  color: #ff9eaa;
}

.day-stat-key {
  margin-right: 0.3rem;
  font-family: inherit;
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.day-stat-sep {
  color: rgba(255, 255, 255, 0.18);
  font-weight: 700;
}

.report-card {
  display: grid;
  gap: 0.65rem;
  padding: 0.85rem 1rem;
  border: 1px solid var(--stroke);
  border-radius: 14px;
  background: rgba(10, 7, 16, 0.45);
}

.report-card.paid {
  border-color: rgba(139, 227, 196, 0.22);
  background: rgba(10, 18, 16, 0.4);
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

.report-actions {
  display: flex;
  gap: 0.35rem;
  flex: 0 0 auto;
}

.action-btn {
  appearance: none;
  flex: 0 0 auto;
  width: 1.75rem;
  height: 1.75rem;
  border: 1px solid var(--stroke);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--muted);
  font-size: 1.05rem;
  line-height: 1;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
}

.archive-btn:hover {
  color: var(--ok);
  border-color: rgba(139, 227, 196, 0.45);
  background: rgba(139, 227, 196, 0.12);
}

.restore-btn:hover {
  color: #d4ceff;
  border-color: rgba(139, 124, 247, 0.45);
  background: rgba(139, 124, 247, 0.16);
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
