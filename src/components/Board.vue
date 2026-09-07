<script setup>
import { computed, nextTick, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useBoardStore, attachmentsFromClipboard } from '../stores/board'
import BoardCard from './BoardCard.vue'
import BoardConfirmDialog from './BoardConfirmDialog.vue'
import BoardComposerDialog from './BoardComposerDialog.vue'
import BoardCardDetail from './BoardCardDetail.vue'

const store = useBoardStore()
const {
  activeProjects,
  archivedProjects,
  activeProjectId,
  activeProject,
  openCards,
  priorityOpenCards,
  regularOpenCards,
  doneCards,
} = storeToRefs(store)

const composerOpen = ref(false)
const composerText = ref('')
const composerAttachments = ref([])
const pending = ref(null)
const activeCard = ref(null)
const detailOpen = ref(false)
const projectDraft = ref('')
const creatingProject = ref(false)
const projectInput = ref(null)
const showArchive = ref(false)
const boardView = ref('open') // 'open' | 'done'

const hasActiveProjects = computed(() => activeProjects.value.length > 0)
const hasAnyProjects = computed(
  () => activeProjects.value.length > 0 || archivedProjects.value.length > 0,
)

const dialogOpen = computed(() => Boolean(pending.value))
const dialogTitle = computed(() => {
  if (!pending.value) return ''
  if (pending.value.type === 'delete') return 'Delete card?'
  if (pending.value.type === 'done') return 'Mark as done?'
  if (pending.value.type === 'archive-project') return 'Archive project?'
  if (pending.value.type === 'delete-project') return 'Delete project?'
  if (pending.value.type === 'restore-project') return 'Restore project?'
  return 'Restore to Open?'
})
const dialogMessage = computed(() => {
  if (!pending.value) return ''
  if (pending.value.type === 'delete') {
    return 'will be permanently removed. This cannot be undone.'
  }
  if (pending.value.type === 'done') {
    return 'will move to Done. You can restore it later.'
  }
  if (pending.value.type === 'archive-project') {
    return 'will move to the project archive. You can restore it later.'
  }
  if (pending.value.type === 'delete-project') {
    return 'and all its cards will be permanently removed. This cannot be undone.'
  }
  if (pending.value.type === 'restore-project') {
    return 'will return to active projects.'
  }
  return 'will move back to Open.'
})
const dialogConfirmLabel = computed(() => {
  if (!pending.value) return 'Confirm'
  if (pending.value.type === 'delete') return 'Delete forever'
  if (pending.value.type === 'done') return 'Mark done'
  if (pending.value.type === 'archive-project') return 'Archive'
  if (pending.value.type === 'delete-project') return 'Delete forever'
  if (pending.value.type === 'restore-project') return 'Restore'
  return 'Restore'
})
const dialogVariant = computed(() =>
  pending.value?.type === 'delete' || pending.value?.type === 'delete-project'
    ? 'danger'
    : 'confirm',
)

const dialogSubject = computed(() => {
  if (!pending.value) return ''
  if (
    pending.value.type === 'delete-project' ||
    pending.value.type === 'archive-project' ||
    pending.value.type === 'restore-project'
  ) {
    return pending.value.project?.name || ''
  }
  return pending.value.card?.title || ''
})

function formatArchiveDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function startCreateProject() {
  showArchive.value = false
  creatingProject.value = true
  projectDraft.value = ''
  nextTick(() => projectInput.value?.focus())
}

function cancelCreateProject() {
  creatingProject.value = false
  projectDraft.value = ''
}

function submitProject() {
  const project = store.addProject(projectDraft.value)
  if (!project) return
  creatingProject.value = false
  projectDraft.value = ''
  showArchive.value = false
}

function openComposer(seed = {}) {
  if (!activeProject.value) return
  composerText.value = seed.text || ''
  composerAttachments.value = seed.attachments || []
  composerOpen.value = true
}

function closeComposer() {
  composerOpen.value = false
  composerText.value = ''
  composerAttachments.value = []
}

function submitComposer({ text, attachments, priority }) {
  store.addCard({ title: text, attachments, priority })
  closeComposer()
}

async function onBoardPaste(event) {
  if (
    !activeProject.value ||
    showArchive.value ||
    composerOpen.value ||
    detailOpen.value
  ) {
    return
  }
  const target = event.target
  if (target?.closest?.('input, textarea, [contenteditable="true"]')) return

  const text = event.clipboardData?.getData('text/plain') || ''
  const items = [...(event.clipboardData?.items || [])]
  const hasMedia = items.some(
    (item) =>
      item.type.startsWith('image/') ||
      item.type.startsWith('video/') ||
      (item.kind === 'file' && item.type && !item.type.startsWith('text/')),
  )
  if (!text.trim() && !hasMedia) return

  event.preventDefault()
  const attachments = hasMedia ? await attachmentsFromClipboard(items) : []
  openComposer({ text: text.trim(), attachments })
}

function askDone(card) {
  pending.value = { type: 'done', card }
}

function askRestore(card) {
  pending.value = { type: 'restore', card }
}

function askDelete(card) {
  pending.value = { type: 'delete', card }
}

function askArchiveProject(project) {
  pending.value = { type: 'archive-project', project }
}

function askRestoreProject(project) {
  pending.value = { type: 'restore-project', project }
}

function askDeleteProject(project) {
  pending.value = { type: 'delete-project', project }
}

function openCard(card) {
  activeCard.value = card
  detailOpen.value = true
}

function closeCard() {
  detailOpen.value = false
}

function onDetailClosed() {
  activeCard.value = null
}

function cancelPending() {
  pending.value = null
}

function confirmPending() {
  if (!pending.value) return
  const { type, card, project } = pending.value
  if (type === 'done') store.markDone(card.id)
  else if (type === 'restore') store.restore(card.id)
  else if (type === 'delete') {
    if (activeCard.value?.id === card.id) {
      detailOpen.value = false
      activeCard.value = null
    }
    store.remove(card.id)
  } else if (type === 'archive-project') {
    if (activeCard.value?.projectId === project.id) {
      detailOpen.value = false
      activeCard.value = null
    }
    store.archiveProject(project.id)
  } else if (type === 'restore-project') {
    store.restoreProject(project.id)
    showArchive.value = false
  } else if (type === 'delete-project') {
    if (activeCard.value?.projectId === project.id) {
      detailOpen.value = false
      activeCard.value = null
    }
    store.removeProject(project.id)
  }
  pending.value = null
}

function selectProject(id) {
  store.setActiveProject(id)
  showArchive.value = false
}

function openArchive() {
  creatingProject.value = false
  showArchive.value = true
}

function closeArchive() {
  showArchive.value = false
}

function formatArchiveMeta(project) {
  const count = store.cards.filter((card) => card.projectId === project.id).length
  const cardsLabel = `${count} ${count === 1 ? 'card' : 'cards'}`
  if (!project.archivedAt) return cardsLabel
  return `Closed ${formatArchiveDate(project.archivedAt)} · ${cardsLabel}`
}
</script>

<template>
  <section
    class="board"
    tabindex="0"
    aria-label="Board"
    @paste="onBoardPaste"
  >
    <div v-if="!hasAnyProjects" class="empty-projects">
      <h2>Create a project</h2>
      <p>Projects are folders for your cards. Add one, then create cards inside it.</p>
      <form class="project-form" @submit.prevent="submitProject">
        <input
          ref="projectInput"
          v-model="projectDraft"
          type="text"
          maxlength="60"
          placeholder="Project name"
          autofocus
        />
        <button type="submit" class="btn" :disabled="!projectDraft.trim()">
          Create project
        </button>
      </form>
    </div>

    <template v-else>
      <template v-if="showArchive">
        <div class="archive-bar">
          <div class="archive-bar-copy">
            <p class="archive-kicker">Closed projects</p>
            <h2>Archive</h2>
          </div>
          <button
            type="button"
            class="btn ghost back-btn"
            aria-label="Back to board"
            @click="closeArchive"
          >
            <span class="back-arrow" aria-hidden="true">←</span>
            Back
          </button>
        </div>

        <div class="archive-panel">
          <p v-if="archivedProjects.length === 0" class="archive-empty">
            No archived projects yet. Close an active project to park it here.
          </p>

          <ul v-else class="archive-list">
            <li
              v-for="project in archivedProjects"
              :key="project.id"
              class="archive-row"
            >
              <div class="archive-meta">
                <strong>{{ project.name }}</strong>
                <span>{{ formatArchiveMeta(project) }}</span>
              </div>
              <div class="archive-actions">
                <button
                  type="button"
                  class="btn soft"
                  @click="askRestoreProject(project)"
                >
                  Restore
                </button>
                <button
                  type="button"
                  class="btn danger-ghost"
                  @click="askDeleteProject(project)"
                >
                  Delete
                </button>
              </div>
            </li>
          </ul>
        </div>
      </template>

      <template v-else>
        <div class="projects-bar">
          <div class="project-tabs" role="tablist" aria-label="Projects">
            <button
              v-for="project in activeProjects"
              :key="project.id"
              type="button"
              role="tab"
              class="project-tab"
              :class="{ active: project.id === activeProjectId }"
              :aria-selected="project.id === activeProjectId"
              @click="selectProject(project.id)"
            >
              {{ project.name }}
            </button>
          </div>

          <div class="projects-actions">
            <button
              v-if="!creatingProject"
              type="button"
              class="btn ghost"
              @click="startCreateProject"
            >
              + Project
            </button>
            <button
              type="button"
              class="btn ghost archive-btn"
              @click="openArchive"
            >
              Archive
              <span
                v-if="archivedProjects.length"
                class="archive-badge"
              >
                {{ archivedProjects.length }}
              </span>
            </button>
            <button
              v-if="activeProject"
              type="button"
              class="btn ghost"
              title="Archive project"
              @click="askArchiveProject(activeProject)"
            >
              Close
            </button>
          </div>
        </div>

        <form
          v-if="creatingProject"
          class="project-inline"
          @submit.prevent="submitProject"
        >
          <input
            ref="projectInput"
            v-model="projectDraft"
            type="text"
            maxlength="60"
            placeholder="New project name"
            @keydown.escape.prevent="cancelCreateProject"
          />
          <button type="submit" class="btn" :disabled="!projectDraft.trim()">
            Create
          </button>
          <button type="button" class="btn ghost" @click="cancelCreateProject">
            Cancel
          </button>
        </form>

        <template v-if="hasActiveProjects && activeProject">
          <div class="feed-bar">
            <div class="view-switch" role="tablist" aria-label="Card status">
              <button
                type="button"
                role="tab"
                class="view-tab"
                :class="{ active: boardView === 'open' }"
                :aria-selected="boardView === 'open'"
                @click="boardView = 'open'"
              >
                Open
                <span class="view-count">{{ openCards.length }}</span>
              </button>
              <button
                type="button"
                role="tab"
                class="view-tab"
                :class="{ active: boardView === 'done' }"
                :aria-selected="boardView === 'done'"
                @click="boardView = 'done'"
              >
                Done
                <span class="view-count">{{ doneCards.length }}</span>
              </button>
            </div>

            <button
              v-if="boardView === 'open'"
              type="button"
              class="btn soft add-inline"
              @click="openComposer()"
            >
              + Add card
            </button>
          </div>

          <div class="feed" :aria-label="boardView === 'open' ? 'Open cards' : 'Done cards'">
            <template v-if="boardView === 'open'">
              <p v-if="openCards.length === 0" class="feed-empty">
                No open cards yet. Add one or paste notes here.
              </p>

              <section v-if="priorityOpenCards.length" class="feed-group">
                <h3 class="feed-label">Priority</h3>
                <div class="feed-list">
                  <BoardCard
                    v-for="card in priorityOpenCards"
                    :key="card.id"
                    :card="card"
                    @open="openCard(card)"
                    @done="askDone(card)"
                    @delete="askDelete(card)"
                  />
                </div>
              </section>

              <section v-if="regularOpenCards.length" class="feed-group">
                <h3
                  v-if="priorityOpenCards.length"
                  class="feed-label"
                >
                  General
                </h3>
                <div class="feed-list">
                  <BoardCard
                    v-for="card in regularOpenCards"
                    :key="card.id"
                    :card="card"
                    @open="openCard(card)"
                    @done="askDone(card)"
                    @delete="askDelete(card)"
                  />
                </div>
              </section>
            </template>

            <template v-else>
              <p v-if="doneCards.length === 0" class="feed-empty">
                Completed cards will show up here.
              </p>
              <div v-else class="feed-list">
                <BoardCard
                  v-for="card in doneCards"
                  :key="card.id"
                  :card="card"
                  @open="openCard(card)"
                  @restore="askRestore(card)"
                  @delete="askDelete(card)"
                />
              </div>
            </template>
          </div>
        </template>

        <div v-else class="empty-projects soft">
          <h2>No active projects</h2>
          <p>
            All projects are archived. Restore one from Archive, or create a new
            project.
          </p>
          <div class="project-form">
            <button type="button" class="btn ghost" @click="openArchive">
              Open archive
            </button>
            <button type="button" class="btn" @click="startCreateProject">
              + Project
            </button>
          </div>
        </div>
      </template>
    </template>

    <BoardComposerDialog
      :open="composerOpen"
      :initial-text="composerText"
      :initial-attachments="composerAttachments"
      @cancel="closeComposer"
      @done="submitComposer"
    />

    <BoardCardDetail
      :open="detailOpen"
      :card="activeCard"
      @close="closeCard"
      @closed="onDetailClosed"
    />

    <BoardConfirmDialog
      :open="dialogOpen"
      :title="dialogTitle"
      :card-title="dialogSubject"
      :message="dialogMessage"
      :confirm-label="dialogConfirmLabel"
      :variant="dialogVariant"
      @cancel="cancelPending"
      @confirm="confirmPending"
    />
  </section>
</template>

<style scoped>
.board {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  height: 100%;
  min-height: 28rem;
  outline: none;
}

.empty-projects {
  display: grid;
  gap: 0.75rem;
  align-content: start;
  max-width: 420px;
  margin: 2rem auto 0;
  padding: 1.25rem;
  border: 1px solid var(--stroke);
  border-radius: 12px;
  background: var(--card);
}

.empty-projects.soft {
  margin: 1rem 0 0;
  max-width: none;
}

.empty-projects h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.2rem;
}

.empty-projects p {
  margin: 0;
  color: var(--muted);
  font-size: 0.9rem;
  line-height: 1.45;
}

.project-form,
.project-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.project-form input,
.project-inline input {
  flex: 1 1 180px;
  min-width: 0;
  border: 1px solid var(--stroke);
  border-radius: 8px;
  padding: 0.55rem 0.7rem;
  background: var(--input);
  color: var(--text);
  font: inherit;
  outline: none;
}

.project-form input:focus,
.project-inline input:focus {
  border-color: rgba(91, 141, 239, 0.45);
}

.btn {
  appearance: none;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 0.5rem 0.8rem;
  background: var(--accent);
  color: #0b1020;
  font: inherit;
  font-size: 0.84rem;
  font-weight: 650;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn.ghost {
  background: transparent;
  border-color: var(--stroke);
  color: var(--muted);
}

.btn.soft {
  background: var(--accent-glow);
  border-color: rgba(91, 141, 239, 0.35);
  color: var(--accent-soft);
}

.btn.danger-ghost {
  background: transparent;
  border-color: rgba(240, 113, 120, 0.35);
  color: var(--danger);
}

.projects-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.project-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  min-width: 0;
}

.project-tab {
  appearance: none;
  border: 1px solid var(--stroke);
  border-radius: 999px;
  padding: 0.4rem 0.75rem;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
}

.project-tab:hover {
  color: var(--text);
  border-color: var(--stroke-strong);
}

.project-tab.active {
  background: var(--accent-glow);
  border-color: rgba(91, 141, 239, 0.4);
  color: var(--accent-soft);
}

.projects-actions {
  display: flex;
  gap: 0.4rem;
  flex: 0 0 auto;
  flex-wrap: wrap;
  align-items: center;
}

.archive-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.archive-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.35rem;
  border-radius: 999px;
  background: var(--accent);
  color: #0b1020;
  font-size: 0.68rem;
  font-weight: 750;
  line-height: 1;
}

.archive-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.archive-bar-copy {
  display: grid;
  gap: 0.15rem;
  min-width: 0;
}

.archive-kicker {
  margin: 0;
  color: var(--muted);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.archive-bar h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.back-arrow {
  font-size: 0.95rem;
  line-height: 1;
  opacity: 0.85;
}

.archive-panel {
  display: grid;
  gap: 0.65rem;
  align-content: start;
  min-height: 0;
  flex: 1;
  overflow-y: auto;
}

.archive-empty {
  margin: 0;
  padding: 1.5rem 1rem;
  border: 1px dashed var(--stroke);
  border-radius: 12px;
  color: var(--muted);
  font-size: 0.86rem;
  text-align: center;
  line-height: 1.45;
}

.archive-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.55rem;
  max-width: 40rem;
}

.archive-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
  flex-wrap: wrap;
  padding: 0.85rem 0.95rem;
  border: 1px solid var(--stroke);
  border-radius: 12px;
  background: var(--card);
}

.archive-meta {
  display: grid;
  gap: 0.25rem;
  min-width: 0;
}

.archive-meta strong {
  font-size: 0.95rem;
  font-weight: 650;
  word-break: break-word;
}

.archive-meta span {
  color: var(--muted);
  font-size: 0.74rem;
}

.archive-actions {
  display: flex;
  gap: 0.4rem;
  flex: 0 0 auto;
}

.feed-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.view-switch {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.2rem;
  border: 1px solid var(--stroke);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.02);
}

.view-tab {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: none;
  border-radius: 999px;
  padding: 0.42rem 0.75rem;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 0.82rem;
  font-weight: 620;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.view-tab:hover {
  color: var(--text);
}

.view-tab.active {
  background: rgba(107, 149, 240, 0.16);
  color: var(--accent-soft);
}

.view-count {
  min-width: 1.15rem;
  height: 1.15rem;
  padding: 0 0.3rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  font-family: var(--font-mono);
  font-size: 0.66rem;
  font-weight: 650;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.view-tab.active .view-count {
  background: rgba(107, 149, 240, 0.22);
}

.add-inline {
  flex: 0 0 auto;
}

.feed {
  display: grid;
  gap: 1rem;
  align-content: start;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 0.15rem;
}

.feed-group {
  display: grid;
  gap: 0.55rem;
}

.feed-label {
  margin: 0;
  color: var(--muted);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.feed-list {
  display: grid;
  gap: 0.65rem;
  max-width: 46rem;
}

.feed-empty {
  margin: 0;
  max-width: 46rem;
  padding: 1.4rem 1rem;
  border: 1px dashed var(--stroke);
  border-radius: 14px;
  color: var(--muted);
  font-size: 0.88rem;
  text-align: center;
  line-height: 1.45;
}

.empty {
  margin: 0;
  padding: 0.85rem 0.35rem;
  color: var(--muted);
  font-size: 0.82rem;
  text-align: center;
}

@media (max-width: 760px) {
  .board {
    height: auto;
  }

  .feed {
    overflow: visible;
  }
}
</style>
