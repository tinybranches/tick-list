<script setup>
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import {
  formatMoney,
  formatReportDate,
  formatStopwatch,
  useStopwatchStore,
} from '../stores/stopwatch'

const store = useStopwatchStore()
const { reports } = storeToRefs(store)
const open = ref(false)

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

      <article v-for="report in reports" :key="report.id" class="report-card">
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
