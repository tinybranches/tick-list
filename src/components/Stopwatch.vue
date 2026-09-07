<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import {
  formatMoney,
  formatStopwatch,
  useStopwatchStore,
} from '../stores/stopwatch'
import StopwatchReports from './StopwatchReports.vue'

const store = useStopwatchStore()
const {
  running,
  laps,
  display,
  elapsedMs,
  pricingEnabled,
  hourlyRate,
  netPricingEnabled,
  netHourlyRate,
  totalCost,
  netTotalCost,
  hourlyRateDiff,
  accumulatedDiff,
  canSaveDailyReport,
} = storeToRefs(store)

const canLap = computed(() => {
  if (elapsedMs.value <= 0) return false
  const prevTotal = laps.value[0]?.totalMs ?? 0
  return elapsedMs.value > prevTotal
})

const canReset = computed(() => elapsedMs.value > 0 || laps.value.length > 0)

function formatParts(ms) {
  return formatStopwatch(ms)
}

function onRateInput(event) {
  const input = event.target
  const raw = input.value.replace(/\D/g, '').slice(0, 3)
  let next = 0
  if (raw && !/^0+$/.test(raw)) {
    next = Math.min(999, Number.parseInt(raw.replace(/^0+/, ''), 10) || 0)
  }
  store.setHourlyRate(next)
  input.value = String(next)
}

function onNetRateInput(event) {
  const input = event.target
  const raw = input.value.replace(/\D/g, '').slice(0, 3)
  let next = 0
  if (raw && !/^0+$/.test(raw)) {
    next = Math.min(999, Number.parseInt(raw.replace(/^0+/, ''), 10) || 0)
  }
  store.setNetHourlyRate(next)
  input.value = String(next)
}
</script>

<template>
  <section class="stopwatch-page" :class="{ priced: pricingEnabled }">
    <div class="stopwatch">
      <div class="pricing-bar" :class="{ on: pricingEnabled }">
        <div class="pricing-top">
          <div class="pricing-meta">
            <span class="pricing-title">Price calculator</span>
            <span class="pricing-sub">{{ pricingEnabled ? 'Billing per hour' : 'Off' }}</span>
          </div>

          <button
            type="button"
            class="switch"
            role="switch"
            :aria-checked="pricingEnabled"
            aria-label="Toggle price calculator"
            @click="store.setPricingEnabled(!pricingEnabled)"
          >
            <span class="switch-track">
              <span class="switch-thumb" />
            </span>
          </button>
        </div>

        <div v-if="pricingEnabled" class="pricing-fields">
          <label class="rate-field">
            <span class="rate-label">Full rate</span>
            <span class="rate-control">
              <span class="rate-prefix">$</span>
              <input
                class="rate-input"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="3"
                autocomplete="off"
                :value="hourlyRate"
                aria-label="Full hourly rate"
                @input="onRateInput"
              />
              <span class="rate-suffix">/hr</span>
            </span>
          </label>

          <div class="net-row">
            <button
              type="button"
              class="net-toggle"
              role="switch"
              :aria-checked="netPricingEnabled"
              aria-label="Toggle net rate"
              @click="store.setNetPricingEnabled(!netPricingEnabled)"
            >
              <span class="net-toggle-track">
                <span class="net-toggle-thumb" />
              </span>
              <span>Net rate</span>
            </button>

            <label v-if="netPricingEnabled" class="rate-field rate-field-net">
              <span class="rate-control">
                <span class="rate-prefix">$</span>
                <input
                  class="rate-input"
                  type="text"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  maxlength="3"
                  autocomplete="off"
                  :value="netHourlyRate"
                  aria-label="Net hourly rate"
                  @input="onNetRateInput"
                />
                <span class="rate-suffix">/hr</span>
              </span>
            </label>
          </div>
        </div>
      </div>

      <div class="face" aria-live="polite">
        <span class="main">{{ display.main }}</span>
        <span class="centis">.{{ display.centis }}</span>
      </div>

      <div v-if="pricingEnabled" class="cost-panel" aria-live="polite">
        <div class="cost-row">
          <span class="cost-label">Earned (full)</span>
          <span class="cost-value">{{ formatMoney(totalCost) }}</span>
        </div>

        <template v-if="netPricingEnabled">
          <div class="cost-row">
            <span class="cost-label">Earned (net)</span>
            <span class="cost-value net">{{ formatMoney(netTotalCost) }}</span>
          </div>
          <div class="cost-row subtle">
            <span class="cost-label">Rate diff</span>
            <span class="cost-diff">{{ formatMoney(hourlyRateDiff) }}/hr</span>
          </div>
          <div class="cost-row subtle">
            <span class="cost-label">Accumulated diff</span>
            <span class="cost-diff">{{ formatMoney(accumulatedDiff) }}</span>
          </div>
        </template>

        <button
          type="button"
          class="btn report"
          :disabled="!canSaveDailyReport"
          @click="store.saveDailyReport()"
        >
          Daily report
        </button>
        <p class="report-hint">
          Saves this session to the archive and resets the stopwatch. If you leave
          it until 23:59 without resetting, it archives automatically with that
          day’s date.
        </p>
      </div>

      <div class="controls">
        <button
          type="button"
          class="btn lap"
          :disabled="!canLap"
          @click="store.lap"
        >
          Lap
        </button>

        <button
          v-if="running"
          type="button"
          class="btn stop"
          @click="store.stop"
        >
          Stop
        </button>
        <template v-else>
          <button
            type="button"
            class="btn reset"
            :disabled="!canReset"
            @click="store.reset"
          >
            Reset
          </button>
          <button type="button" class="btn start" @click="store.start">Start</button>
        </template>
      </div>

      <div v-if="laps.length" class="laps" :class="{ priced: pricingEnabled }">
        <div class="laps-head">
          <span>LAP</span>
          <span>TIME</span>
          <span>TOTAL</span>
          <span v-if="pricingEnabled">LAP $</span>
          <span v-if="pricingEnabled">TOTAL $</span>
        </div>
        <div v-for="row in laps" :key="row.id" class="laps-row">
          <span>{{ row.index }}</span>
          <span>{{ formatParts(row.lapMs).text }}</span>
          <span>{{ formatParts(row.totalMs).text }}</span>
          <span v-if="pricingEnabled">{{ formatMoney(row.lapCost) }}</span>
          <span v-if="pricingEnabled">{{ formatMoney(row.totalCost) }}</span>
        </div>
      </div>
    </div>

    <StopwatchReports v-if="pricingEnabled" class="reports-slot" />
  </section>
</template>

<style scoped>
.stopwatch-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 100%;
}

.stopwatch-page.priced {
  align-items: stretch;
}

.stopwatch {
  display: grid;
  gap: 1rem;
  width: 100%;
  max-width: 24rem;
  margin: 0 auto;
  padding: 1.1rem 1rem 1.2rem;
  border: 1px solid var(--stroke);
  border-radius: 14px;
  background: linear-gradient(160deg, var(--panel) 0%, var(--panel-dim) 100%);
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.24);
}

.reports-slot {
  width: 100%;
  max-width: 40rem;
  margin: 0 auto;
}

.pricing-bar {
  display: grid;
  gap: 0.65rem;
  width: 100%;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--stroke);
  border-radius: 12px;
  background:
    radial-gradient(120% 100% at 0% 0%, var(--accent-glow), transparent 55%),
    rgba(12, 16, 24, 0.55);
  transition: border-color 0.25s, box-shadow 0.25s, background 0.25s;
}

.pricing-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.pricing-fields {
  display: grid;
  gap: 0.55rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--stroke);
}

.pricing-fields .rate-field {
  animation: rate-in 0.22s ease;
}

.net-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.55rem;
}

.net-toggle {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: none;
  padding: 0;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.net-toggle[aria-checked='true'] {
  color: var(--ok);
}

.net-toggle-track {
  position: relative;
  display: block;
  width: 34px;
  height: 20px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--stroke);
  transition: background 0.2s, border-color 0.2s;
}

.net-toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: linear-gradient(180deg, #e8eefc, #9bb0d4);
  transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.net-toggle[aria-checked='true'] .net-toggle-track {
  background: rgba(139, 227, 196, 0.22);
  border-color: rgba(139, 227, 196, 0.45);
}

.net-toggle[aria-checked='true'] .net-toggle-thumb {
  transform: translateX(14px);
  background: linear-gradient(180deg, #d8fff0, #8be3c4);
}

.rate-field {
  display: grid;
  gap: 0.3rem;
}

.rate-field-net {
  flex: 1 1 auto;
  min-width: 0;
}

.rate-label {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}

.rate-control {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  height: 34px;
  padding: 0 0.6rem;
  border: 1px solid rgba(91, 141, 239, 0.28);
  border-radius: 9px;
  background: var(--input);
}

.rate-field-net .rate-control {
  width: 100%;
}

.pricing-bar.on {
  border-color: rgba(139, 227, 196, 0.35);
  box-shadow: 0 0 0 1px rgba(139, 227, 196, 0.08);
  background:
    radial-gradient(120% 100% at 0% 0%, rgba(139, 227, 196, 0.12), transparent 55%),
    rgba(12, 16, 24, 0.55);
}

.pricing-meta {
  display: grid;
  gap: 0.1rem;
  min-width: 0;
  flex: 1 1 auto;
}

.pricing-title {
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--text);
  letter-spacing: -0.01em;
}

.pricing-sub {
  font-size: 0.7rem;
  letter-spacing: 0.04em;
  color: var(--muted);
}

.pricing-bar.on .pricing-sub {
  color: var(--ok);
}

.rate-prefix,
.rate-suffix {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--muted);
}

.rate-input {
  width: 3rem;
  border: none;
  background: transparent;
  color: var(--accent-soft);
  font-family: var(--font-mono);
  font-size: 0.9rem;
  font-weight: 600;
  outline: none;
  text-align: center;
}

.switch {
  appearance: none;
  flex: 0 0 auto;
  border: none;
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.switch-track {
  position: relative;
  display: block;
  width: 44px;
  height: 26px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--stroke);
  transition: background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}

.switch-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: linear-gradient(180deg, #e8eefc, #9bb0d4);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), background 0.25s;
}

.pricing-bar.on .switch-track {
  background: rgba(139, 227, 196, 0.28);
  border-color: rgba(139, 227, 196, 0.55);
  box-shadow: inset 0 0 12px rgba(139, 227, 196, 0.12);
}

.pricing-bar.on .switch-thumb {
  transform: translateX(18px);
  background: linear-gradient(180deg, #d8fff0, #8be3c4);
}

.switch:focus-visible .switch-track {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

@keyframes rate-in {
  from {
    opacity: 0;
    transform: translateX(6px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .rate-field,
  .switch-thumb,
  .switch-track {
    transition: none;
    animation: none;
  }
}

.face {
  display: flex;
  align-items: baseline;
  justify-content: center;
  padding: 0.1rem 0 0;
  color: var(--accent-soft);
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  line-height: 1;
}

.main {
  font-size: 2.75rem;
  font-weight: 500;
}

.centis {
  font-size: 1.25rem;
  margin-left: 0.05em;
  color: var(--muted);
  transform: translateY(-0.12em);
}

.cost-panel {
  display: grid;
  gap: 0.4rem;
  width: 100%;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--stroke);
  border-radius: 12px;
  background: rgba(8, 10, 16, 0.45);
}

.cost-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.cost-row.subtle .cost-label,
.cost-row.subtle .cost-diff {
  font-size: 0.78rem;
}

.cost-label {
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}

.cost-value {
  font-family: var(--font-mono);
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--ok);
  letter-spacing: 0.02em;
}

.cost-value.net {
  color: var(--accent-soft);
}

.cost-diff {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  font-weight: 600;
  color: #ff9eaa;
  letter-spacing: 0.02em;
}

.btn.report {
  width: 100%;
  margin-top: 0.25rem;
  appearance: none;
  border: 1px solid rgba(139, 227, 196, 0.35);
  border-radius: 9px;
  padding: 0.62rem 0.9rem;
  background: rgba(139, 227, 196, 0.12);
  color: var(--ok);
  font: inherit;
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, opacity 0.2s;
}

.btn.report:hover:not(:disabled) {
  background: rgba(139, 227, 196, 0.2);
  border-color: rgba(139, 227, 196, 0.5);
}

.btn.report:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.report-hint {
  margin: 0;
  font-size: 0.68rem;
  line-height: 1.4;
  color: var(--muted);
}

.controls {
  display: flex;
  gap: 0.5rem;
  width: 100%;
}

.btn {
  flex: 1;
  appearance: none;
  border: 1px solid var(--stroke);
  border-radius: 9px;
  padding: 0.68rem 0.85rem;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, transform 0.15s, opacity 0.2s, filter 0.15s;
}

.btn:active:not(:disabled) {
  transform: scale(0.98);
}

.btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.btn.lap {
  background: var(--accent-glow);
  border-color: rgba(91, 141, 239, 0.4);
  color: var(--accent-soft);
}

.btn.stop {
  background: var(--danger-soft);
  border-color: rgba(255, 122, 138, 0.45);
  color: #ffc0c8;
}

.btn.start {
  background: rgba(91, 141, 239, 0.22);
  border-color: rgba(91, 141, 239, 0.45);
  color: var(--accent-soft);
}

.btn.reset {
  background: rgba(255, 255, 255, 0.04);
  color: var(--muted);
}

.btn:hover:not(:disabled) {
  filter: brightness(1.08);
  border-color: var(--stroke-strong);
}

.laps {
  width: 100%;
  display: grid;
  gap: 0.4rem;
  font-family: var(--font-mono);
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.laps-head,
.laps-row {
  display: grid;
  grid-template-columns: 0.55fr 1.15fr 1.15fr;
  gap: 0.45rem;
  align-items: baseline;
}

.laps.priced .laps-head,
.laps.priced .laps-row {
  grid-template-columns: 0.45fr 1fr 1fr 0.75fr 0.85fr;
}

.laps-head {
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  padding-bottom: 0.3rem;
  border-bottom: 1px solid var(--stroke);
}

.laps-row {
  font-size: 0.82rem;
  color: var(--accent-soft);
}

.laps-row span:first-child {
  color: var(--muted);
}

.laps.priced .laps-row span:nth-child(4),
.laps.priced .laps-row span:nth-child(5) {
  color: var(--ok);
}

@media (min-width: 900px) {
  .stopwatch-page.priced {
    display: grid;
    grid-template-columns: 24rem minmax(0, 1fr);
    align-items: start;
    gap: 1.15rem;
    max-width: 56rem;
    margin: 0 auto;
  }

  .stopwatch-page.priced .stopwatch {
    margin: 0;
  }

  .stopwatch-page.priced .reports-slot {
    max-width: none;
    margin: 0;
  }
}

@media (max-width: 420px) {
  .main {
    font-size: 2.35rem;
  }

  .centis {
    font-size: 1.05rem;
  }
}
</style>
