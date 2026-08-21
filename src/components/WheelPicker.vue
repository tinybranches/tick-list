<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Number, required: true },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 59 },
})

const emit = defineEmits(['update:modelValue'])

const ITEM = 40
const VISIBLE = 3
const scroller = ref(null)
const dragging = ref(false)

let scrollEndTimer = null
let syncing = false
let dragPointerId = null
let dragStartY = 0
let dragStartScroll = 0
let lastY = 0
let lastT = 0
let velocity = 0
let animRaf = 0

const values = computed(() => {
  const list = []
  for (let i = props.min; i <= props.max; i += 1) list.push(i)
  return list
})

const pad = computed(() => ((VISIBLE - 1) / 2) * ITEM)
const wheelHeight = computed(() => VISIBLE * ITEM)

function clamp(n) {
  return Math.min(props.max, Math.max(props.min, Math.round(n)))
}

function maxScroll() {
  return (props.max - props.min) * ITEM
}

function tone(n) {
  const d = Math.abs(n - props.modelValue)
  if (d === 0) return 'is-0'
  if (d === 1) return 'is-1'
  return 'is-far'
}

function stopAnim() {
  if (animRaf) {
    cancelAnimationFrame(animRaf)
    animRaf = 0
  }
}

function emitLive(scrollTop) {
  const next = readValue(scrollTop)
  if (next !== props.modelValue) emit('update:modelValue', next)
}

function readValue(scrollTop = scroller.value?.scrollTop ?? 0) {
  const index = Math.round(scrollTop / ITEM)
  return clamp(props.min + index)
}

function easeOutQuint(t) {
  return 1 - (1 - t) ** 5
}

function animateTo(targetTop, duration = 520) {
  const el = scroller.value
  if (!el) return

  stopAnim()
  const start = el.scrollTop
  const delta = targetTop - start
  if (Math.abs(delta) < 0.5) {
    el.scrollTop = targetTop
    emitLive(targetTop)
    syncing = false
    return
  }

  const ms = Math.min(780, Math.max(duration, 320 + Math.abs(delta) * 3.2))
  syncing = true
  const t0 = performance.now()

  const step = (now) => {
    const t = Math.min(1, (now - t0) / ms)
    el.scrollTop = start + delta * easeOutQuint(t)
    emitLive(el.scrollTop)

    if (t < 1) {
      animRaf = requestAnimationFrame(step)
      return
    }

    el.scrollTop = targetTop
    emitLive(targetTop)
    syncing = false
    animRaf = 0
  }

  animRaf = requestAnimationFrame(step)
}

function scrollToValue(value, smooth) {
  const top = (clamp(value) - props.min) * ITEM
  if (smooth) animateTo(top, 560)
  else {
    const el = scroller.value
    if (!el) return
    stopAnim()
    el.scrollTop = top
  }
}

function commitValue() {
  const el = scroller.value
  if (!el) return
  const next = readValue(el.scrollTop)
  animateTo((next - props.min) * ITEM, 560)
}

function onScroll() {
  if (syncing || dragging.value || animRaf) return
  emitLive(scroller.value?.scrollTop ?? 0)
  clearTimeout(scrollEndTimer)
  scrollEndTimer = window.setTimeout(() => commitValue(), 160)
}

function runMomentum() {
  const el = scroller.value
  if (!el) return

  stopAnim()
  syncing = true

  const tick = () => {
    velocity *= 0.78
    if (Math.abs(velocity) < 0.2) {
      animRaf = 0
      syncing = false
      commitValue()
      return
    }

    el.scrollTop = Math.min(maxScroll(), Math.max(0, el.scrollTop - velocity))
    emitLive(el.scrollTop)
    animRaf = requestAnimationFrame(tick)
  }

  animRaf = requestAnimationFrame(tick)
}

function onWheel(event) {
  event.preventDefault()
  const el = scroller.value
  if (!el || dragging.value || animRaf) return

  stopAnim()
  clearTimeout(scrollEndTimer)
  // Tiny steps — one notch ≈ a fraction of a tick
  const step = Math.sign(event.deltaY) * Math.min(10, Math.max(3, Math.abs(event.deltaY) * 0.08))
  el.scrollTop = Math.min(maxScroll(), Math.max(0, el.scrollTop + step))
  emitLive(el.scrollTop)
  scrollEndTimer = window.setTimeout(() => commitValue(), 180)
}

function onPointerDown(event) {
  const el = scroller.value
  if (!el || (event.button != null && event.button !== 0)) return

  stopAnim()
  clearTimeout(scrollEndTimer)
  syncing = false
  dragging.value = true
  dragPointerId = event.pointerId
  dragStartY = event.clientY
  dragStartScroll = el.scrollTop
  lastY = event.clientY
  lastT = performance.now()
  velocity = 0
  el.setPointerCapture?.(event.pointerId)
}

function onPointerMove(event) {
  if (!dragging.value || event.pointerId !== dragPointerId) return
  const el = scroller.value
  if (!el) return

  event.preventDefault()
  const now = performance.now()
  // Heavy dial: ~1/3 of finger travel
  const dy = (event.clientY - dragStartY) * 0.3
  el.scrollTop = Math.min(maxScroll(), Math.max(0, dragStartScroll - dy))

  const dt = Math.max(14, now - lastT)
  const instant = (((event.clientY - lastY) * 0.3) / dt) * 16
  velocity = velocity * 0.85 + instant * 0.15
  lastY = event.clientY
  lastT = now
  emitLive(el.scrollTop)
}

function onPointerUp(event) {
  if (!dragging.value || event.pointerId !== dragPointerId) return
  const el = scroller.value
  dragging.value = false
  dragPointerId = null
  el?.releasePointerCapture?.(event.pointerId)

  const moved = Math.abs(event.clientY - dragStartY)
  if (el && moved < 5) {
    const rect = el.getBoundingClientRect()
    const localY = event.clientY - rect.top + el.scrollTop - pad.value
    const next = clamp(props.min + Math.round(localY / ITEM))
    scrollToValue(next, true)
    return
  }

  velocity *= 0.22
  velocity = Math.max(-2.8, Math.min(2.8, velocity))
  if (Math.abs(velocity) > 0.4) runMomentum()
  else commitValue()
}

watch(
  () => props.modelValue,
  async (value) => {
    if (dragging.value || animRaf || syncing) return
    await nextTick()
    if (readValue() !== clamp(value)) scrollToValue(value, true)
  },
)

onMounted(async () => {
  await nextTick()
  scrollToValue(props.modelValue, false)
})

onBeforeUnmount(() => {
  clearTimeout(scrollEndTimer)
  stopAnim()
})
</script>

<template>
  <div
    class="wheel"
    :class="{ dragging }"
    :style="{ height: wheelHeight + 'px' }"
  >
    <div
      ref="scroller"
      class="scroller"
      @scroll.passive="onScroll"
      @wheel.prevent="onWheel"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <div class="spacer" :style="{ height: pad + 'px' }" />
      <div
        v-for="n in values"
        :key="n"
        class="item"
        :class="tone(n)"
        :style="{ height: ITEM + 'px' }"
      >
        {{ String(n).padStart(2, '0') }}
      </div>
      <div class="spacer" :style="{ height: pad + 'px' }" />
    </div>
  </div>
</template>

<style scoped>
.wheel {
  position: relative;
  width: 100%;
  overflow: hidden;
  touch-action: none;
  mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    #000 22%,
    #000 78%,
    transparent 100%
  );
}

.scroller {
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.dragging .scroller {
  cursor: grabbing;
}

.scroller::-webkit-scrollbar {
  display: none;
}

.spacer {
  pointer-events: none;
}

.item {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  line-height: 1;
  user-select: none;
  pointer-events: none;
  transition: color 0.28s ease, opacity 0.28s ease, transform 0.28s ease, font-size 0.28s ease;
}

.item.is-0 {
  color: var(--text);
  opacity: 1;
  font-size: clamp(1.45rem, 4.5vw, 1.85rem);
  font-weight: 600;
}

.item.is-1 {
  color: var(--muted);
  opacity: 0.42;
  font-size: 1rem;
  font-weight: 500;
  transform: scale(0.94);
}

.item.is-far {
  color: var(--muted);
  opacity: 0.14;
  font-size: 0.85rem;
  transform: scale(0.86);
}

@media (prefers-reduced-motion: reduce) {
  .item {
    transition: none;
  }
}
</style>
