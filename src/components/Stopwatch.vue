<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import {
  formatMoney,
  formatStopwatch,
  useStopwatchStore,
} from '../stores/stopwatch'

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
  <section class="stopwatch">
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
  </section>
</template>

<style scoped>
.stopwatch {
  display: grid;
  gap: 1.2rem;
  justify-items: center;
  padding: 1.35rem 1.25rem 1.6rem;
  border: 1px solid var(--stroke);
  border-radius: 16px;
  background: linear-gradient(160deg, var(--panel) 0%, var(--panel-dim) 100%);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.28);
}

.pricing-bar {
  display: grid;
  gap: 0.75rem;
  width: min(100%, 420px);
  padding: 0.75rem 0.85rem;
  border: 1px solid var(--stroke);
  border-radius: 14px;
  background:
    radial-gradient(120% 100% at 0% 0%, rgba(168, 85, 247, 0.1), transparent 55%),
    rgba(16, 10, 24, 0.55);
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
  gap: 0.65rem;
  padding-top: 0.55rem;
  border-top: 1px solid rgba(220, 190, 255, 0.08);
}

.pricing-fields .rate-field {
  animation: rate-in 0.22s ease;
}

.net-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem;
}

.net-toggle {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  border: none;
  padding: 0;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
}

.net-toggle[aria-checked='true'] {
  color: var(--ok);
}

.net-toggle-track {
  position: relative;
  display: block;
  width: 36px;
  height: 22px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--stroke);
  transition: background 0.2s, border-color 0.2s;
}

.net-toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: linear-gradient(180deg, #f3ecff, #c9b8e0);
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
  gap: 0.35rem;
}

.rate-field-net {
  flex: 1 1 auto;
  min-width: 0;
}

.rate-label {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}

.rate-control {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  height: 36px;
  padding: 0 0.65rem;
  border: 1px solid rgba(201, 160, 255, 0.28);
  border-radius: 10px;
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
    rgba(16, 10, 24, 0.55);
}

.pricing-meta {
  display: grid;
  gap: 0.1rem;
  min-width: 0;
  flex: 1 1 auto;
}

.pricing-title {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text);
  letter-spacing: -0.01em;
}

.pricing-sub {
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  color: var(--muted);
}

.pricing-bar.on .pricing-sub {
  color: var(--ok);
}

.rate-prefix,
.rate-suffix {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--muted);
}

.rate-input {
  width: 3.2rem;
  border: none;
  background: transparent;
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 0.95rem;
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
  width: 48px;
  height: 28px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--stroke);
  transition: background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}

.switch-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(180deg, #f3ecff, #c9b8e0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), background 0.25s;
}

.pricing-bar.on .switch-track {
  background: rgba(139, 227, 196, 0.28);
  border-color: rgba(139, 227, 196, 0.55);
  box-shadow: inset 0 0 12px rgba(139, 227, 196, 0.12);
}

.pricing-bar.on .switch-thumb {
  transform: translateX(20px);
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
  padding: 0.15rem 0 0;
  color: var(--accent);
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  line-height: 1;
}

.main {
  font-size: clamp(2.8rem, 11vw, 4.4rem);
  font-weight: 500;
}

.centis {
  font-size: clamp(1.35rem, 5.5vw, 2rem);
  margin-left: 0.05em;
  color: var(--muted);
  transform: translateY(-0.12em);
}

.cost-panel {
  display: grid;
  gap: 0.45rem;
  width: min(100%, 420px);
  padding: 0.85rem 1rem;
  border: 1px solid var(--stroke);
  border-radius: 14px;
  background: rgba(10, 7, 16, 0.45);
}

.cost-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.cost-row.subtle .cost-label,
.cost-row.subtle .cost-diff {
  font-size: 0.82rem;
}

.cost-label {
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}

.cost-value {
  font-family: var(--font-mono);
  font-size: clamp(1.25rem, 4.5vw, 1.65rem);
  font-weight: 600;
  color: var(--ok);
  letter-spacing: 0.02em;
}

.cost-value.net {
  color: var(--accent);
}

.cost-diff {
  font-family: var(--font-mono);
  font-size: 0.95rem;
  font-weight: 600;
  color: #ff9eaa;
  letter-spacing: 0.02em;
}

.controls {
  display: flex;
  gap: 0.65rem;
  width: min(100%, 420px);
}

.btn {
  flex: 1;
  appearance: none;
  border: 1px solid var(--stroke);
  border-radius: 10px;
  padding: 0.8rem 1rem;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  font-size: 0.95rem;
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
  background: rgba(139, 124, 247, 0.22);
  border-color: rgba(139, 124, 247, 0.45);
  color: #d4ceff;
}

.btn.stop {
  background: var(--danger-soft);
  border-color: rgba(255, 122, 138, 0.45);
  color: #ffc0c8;
}

.btn.start {
  background: rgba(168, 85, 247, 0.28);
  border-color: rgba(201, 160, 255, 0.45);
  color: #f0e4ff;
}

.btn.reset {
  background: rgba(255, 255, 255, 0.04);
  color: var(--muted);
}

.btn:hover:not(:disabled) {
  filter: brightness(1.08);
  border-color: rgba(220, 190, 255, 0.28);
}

.laps {
  width: min(100%, 560px);
  display: grid;
  gap: 0.45rem;
  font-family: var(--font-mono);
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.laps-head,
.laps-row {
  display: grid;
  grid-template-columns: 0.55fr 1.15fr 1.15fr;
  gap: 0.55rem;
  align-items: baseline;
}

.laps.priced .laps-head,
.laps.priced .laps-row {
  grid-template-columns: 0.45fr 1fr 1fr 0.75fr 0.85fr;
}

.laps-head {
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  padding-bottom: 0.35rem;
  border-bottom: 1px solid var(--stroke);
}

.laps-row {
  font-size: 0.9rem;
  color: var(--accent);
}

.laps-row span:first-child {
  color: var(--muted);
}

.laps.priced .laps-row span:nth-child(4),
.laps.priced .laps-row span:nth-child(5) {
  color: var(--ok);
}
</style>
