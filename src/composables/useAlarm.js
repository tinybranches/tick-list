import { watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useTasksStore } from '../stores/tasks'

let audioCtx = null
let oscillators = []
let gainNode = null
let pulseTimer = null
let watching = false

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  return audioCtx
}

function stopSound() {
  if (pulseTimer) {
    clearInterval(pulseTimer)
    pulseTimer = null
  }
  for (const osc of oscillators) {
    try {
      osc.stop()
      osc.disconnect()
    } catch {
      /* already stopped */
    }
  }
  oscillators = []
  if (gainNode) {
    try {
      gainNode.disconnect()
    } catch {
      /* noop */
    }
    gainNode = null
  }
}

function beepBurst() {
  const ctx = getCtx()
  if (ctx.state === 'suspended') ctx.resume()

  gainNode = ctx.createGain()
  gainNode.gain.value = 0.0001
  gainNode.connect(ctx.destination)

  const freqs = [880, 1100]
  const now = ctx.currentTime

  freqs.forEach((freq) => {
    const osc = ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.value = freq
    osc.connect(gainNode)
    osc.start(now)
    oscillators.push(osc)
  })

  gainNode.gain.setValueAtTime(0.0001, now)
  gainNode.gain.exponentialRampToValueAtTime(0.18, now + 0.05)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.35)
  gainNode.gain.exponentialRampToValueAtTime(0.16, now + 0.45)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.75)
  gainNode.gain.exponentialRampToValueAtTime(0.14, now + 0.85)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.15)

  window.setTimeout(() => {
    for (const osc of oscillators) {
      try {
        osc.stop()
        osc.disconnect()
      } catch {
        /* noop */
      }
    }
    oscillators = []
    if (gainNode) {
      try {
        gainNode.disconnect()
      } catch {
        /* noop */
      }
      gainNode = null
    }
  }, 1300)
}

function startLoop() {
  stopSound()
  beepBurst()
  pulseTimer = window.setInterval(beepBurst, 1600)
}

export function unlockAudio() {
  const ctx = getCtx()
  if (ctx.state === 'suspended') ctx.resume()
}

export function initAlarmWatcher() {
  if (watching) return
  watching = true
  const store = useTasksStore()
  const { alarmingTasks } = storeToRefs(store)

  watch(
    alarmingTasks,
    (list) => {
      if (list.length > 0) startLoop()
      else stopSound()
    },
    { deep: true },
  )
}

export function formatDuration(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
