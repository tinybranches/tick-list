<script setup>
import { computed } from 'vue'
import { linkifyParts } from '../utils/linkify'

const props = defineProps({
  text: { type: [String, Number], default: '' },
  tag: { type: String, default: 'span' },
})

const parts = computed(() => linkifyParts(props.text))
</script>

<template>
  <component :is="tag" class="linked-text">
    <template v-for="(part, index) in parts" :key="index">
      <a
        v-if="part.type === 'link'"
        class="linked-url"
        :href="part.href"
        target="_blank"
        rel="noopener noreferrer"
        @click.stop
      >{{ part.value }}</a>
      <template v-else>{{ part.value }}</template>
    </template>
  </component>
</template>

<style scoped>
.linked-text {
  overflow-wrap: anywhere;
  word-break: break-word;
}

.linked-url {
  color: var(--accent-soft);
  text-decoration: underline;
  text-decoration-color: rgba(168, 192, 248, 0.45);
  text-underline-offset: 0.12em;
}

.linked-url:hover {
  color: #c5d5ff;
  text-decoration-color: rgba(197, 213, 255, 0.75);
}
</style>
