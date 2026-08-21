<script setup>
import { storeToRefs } from 'pinia'
import { useTasksStore } from '../stores/tasks'
import TaskItem from './TaskItem.vue'

const store = useTasksStore()
const { view, visibleTasks, activeTasks, archivedTasks } = storeToRefs(store)
</script>

<template>
  <section class="list-wrap">
    <div class="tabs" role="tablist" aria-label="Task lists">
      <button
        type="button"
        role="tab"
        class="tab"
        :class="{ active: view === 'active' }"
        :aria-selected="view === 'active'"
        @click="store.setView('active')"
      >
        Active
        <span class="count">{{ activeTasks.length }}</span>
      </button>
      <button
        type="button"
        role="tab"
        class="tab"
        :class="{ active: view === 'archive' }"
        :aria-selected="view === 'archive'"
        @click="store.setView('archive')"
      >
        Archive
        <span class="count">{{ archivedTasks.length }}</span>
      </button>
    </div>

    <div class="list">
      <div v-if="visibleTasks.length === 0" class="empty">
        <p v-if="view === 'active'">
          No tasks yet. Add one above — set a duration and the timer will count down.
        </p>
        <p v-else>Archive is empty. Press “Archive” on a task to move it here.</p>
      </div>
      <TaskItem v-for="task in visibleTasks" :key="task.id" :task="task" />
    </div>
  </section>
</template>

<style scoped>
.list-wrap {
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

.count {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  font-weight: 500;
  opacity: 0.85;
}

.list {
  display: grid;
  gap: 0.85rem;
}

.empty {
  padding: 2rem 1.25rem;
  border: 1px dashed var(--stroke);
  border-radius: 16px;
  color: var(--muted);
  text-align: center;
  line-height: 1.55;
}

.empty p {
  margin: 0;
  max-width: 28rem;
  margin-inline: auto;
}
</style>
