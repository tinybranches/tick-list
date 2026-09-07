<script setup>
import { useId } from 'vue'

defineProps({
  title: {
    type: String,
    default: 'Tick List',
  },
})

const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
</script>

<template>
  <div class="brand-logo" :aria-label="title">
    <svg
      class="mark"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          :id="`shell-${uid}`"
          x1="8"
          y1="4"
          x2="56"
          y2="60"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#1a2740" />
          <stop offset="0.55" stop-color="#101826" />
          <stop offset="1" stop-color="#0a1018" />
        </linearGradient>
        <radialGradient
          :id="`bloom-${uid}`"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(40 14) rotate(110) scale(34 28)"
        >
          <stop stop-color="#6b95f0" stop-opacity="0.5" />
          <stop offset="1" stop-color="#6b95f0" stop-opacity="0" />
        </radialGradient>
        <linearGradient
          :id="`rim-${uid}`"
          x1="12"
          y1="10"
          x2="52"
          y2="54"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#e8efff" />
          <stop offset="0.45" stop-color="#9bb7f5" />
          <stop offset="1" stop-color="#5b8def" />
        </linearGradient>
        <linearGradient
          :id="`face-${uid}`"
          x1="20"
          y1="18"
          x2="46"
          y2="48"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#152033" />
          <stop offset="1" stop-color="#0c121c" />
        </linearGradient>
        <linearGradient
          :id="`tick-${uid}`"
          x1="20"
          y1="36"
          x2="46"
          y2="22"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#c5d7ff" />
          <stop offset="0.5" stop-color="#8eb0f5" />
          <stop offset="1" stop-color="#3ecf8e" />
        </linearGradient>
        <linearGradient
          :id="`hand-${uid}`"
          x1="32"
          y1="20"
          x2="32"
          y2="34"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#3ecf8e" />
          <stop offset="1" stop-color="#6b95f0" />
        </linearGradient>
      </defs>

      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="18"
        :fill="`url(#shell-${uid})`"
      />
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="18"
        :fill="`url(#bloom-${uid})`"
      />
      <rect
        x="2.75"
        y="2.75"
        width="58.5"
        height="58.5"
        rx="17.25"
        stroke="#9bb7f5"
        stroke-opacity="0.22"
      />

      <circle
        cx="32"
        cy="33"
        r="20.5"
        :stroke="`url(#rim-${uid})`"
        stroke-width="2.4"
      />
      <circle cx="32" cy="33" r="17.2" :fill="`url(#face-${uid})`" />
      <circle cx="32" cy="33" r="17.2" stroke="#6b95f0" stroke-opacity="0.2" />

      <g stroke="#9bb7f5" stroke-linecap="round" opacity="0.45">
        <path d="M32 15.4v2.6" stroke-width="1.8" />
        <path d="M32 48v2.6" stroke-width="1.4" />
        <path d="M46.8 33h2.6" stroke-width="1.4" />
        <path d="M14.6 33h2.6" stroke-width="1.4" />
      </g>

      <rect
        x="29.2"
        y="7.2"
        width="5.6"
        height="5"
        rx="1.4"
        fill="#9bb7f5"
        fill-opacity="0.9"
      />
      <rect x="30.2" y="5.2" width="3.6" height="2.4" rx="1" fill="#3ecf8e" />

      <path
        d="M32 33V21.5"
        :stroke="`url(#hand-${uid})`"
        stroke-width="2.2"
        stroke-linecap="round"
      />
      <circle cx="32" cy="33" r="2.1" fill="#3ecf8e" />

      <path
        d="M22.2 33.4 28.6 39.6 42.2 24.2"
        :stroke="`url(#tick-${uid})`"
        stroke-width="3.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>

    <div class="wordmark-wrap">
      <span class="wordmark">{{ title }}</span>
      <span class="tagline">focus · track · ship</span>
    </div>
  </div>
</template>

<style scoped>
.brand-logo {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  margin: 0;
}

.mark {
  width: 2.35rem;
  height: 2.35rem;
  flex-shrink: 0;
  filter: drop-shadow(0 8px 18px rgba(91, 141, 239, 0.28));
}

.wordmark-wrap {
  display: grid;
  gap: 0.08rem;
  min-width: 0;
}

.wordmark {
  font-family: var(--font-display);
  font-size: 1.02rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--text);
  line-height: 1.1;
}

.tagline {
  font-size: 0.62rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  opacity: 0.8;
}
</style>
