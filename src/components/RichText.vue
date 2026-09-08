<script setup>
import { computed } from 'vue'
import { linkifyParts, parseRichSegments, replaceCodeSegment } from '../utils/richText'
import CodeBlock from './CodeBlock.vue'

const props = defineProps({
  text: { type: [String, Number], default: '' },
  editable: { type: Boolean, default: false },
})

const emit = defineEmits(['update:text'])

const source = computed(() => String(props.text ?? ''))
const segments = computed(() => parseRichSegments(source.value))

function textParts(value) {
  return linkifyParts(value)
}

function onSaveCode(segment, nextCode) {
  if (!props.editable) return
  emit('update:text', replaceCodeSegment(source.value, segment, nextCode))
}
</script>

<template>
  <div class="rich-text">
    <template v-for="(segment, index) in segments" :key="`${segment.type}-${index}-${segment.start}`">
      <CodeBlock
        v-if="segment.type === 'code'"
        :code="segment.value"
        :lang="segment.lang"
        :editable="editable"
        @save="onSaveCode(segment, $event)"
      />
      <span v-else class="rich-copy">
        <template v-for="(part, partIndex) in textParts(segment.value)" :key="partIndex">
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
      </span>
    </template>
  </div>
</template>

<style scoped>
.rich-text {
  display: grid;
  gap: 0.35rem;
  overflow-wrap: anywhere;
  word-break: break-word;
  white-space: pre-wrap;
}

.rich-copy {
  min-width: 0;
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
