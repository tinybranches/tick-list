import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

const STORAGE_KEY = 'tick-list-board'
const MAX_IMAGE_EDGE = 1280
const JPEG_QUALITY = 0.78
const MAX_VIDEO_BYTES = 4 * 1024 * 1024
const MAX_FILE_BYTES = 2 * 1024 * 1024

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveState(payload) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* quota / private mode */
  }
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function titleFromText(text) {
  const lines = String(text ?? '')
    .replace(/\r\n/g, '\n')
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  if (!lines.length) return 'Untitled card'
  const first = lines[0]
  return first.length > 80 ? `${first.slice(0, 77)}…` : first
}

export function bodyFromText(text) {
  const normalized = String(text ?? '').replace(/\r\n/g, '\n').trim()
  if (!normalized) return ''
  const lines = normalized.split('\n')
  if (lines.length <= 1) return ''
  return lines.slice(1).join('\n').trim()
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export async function compressImageFile(file) {
  if (!file || !file.type.startsWith('image/')) return null

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return null
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
}

export async function attachmentFromFile(file) {
  if (!file) return null

  if (file.type.startsWith('image/')) {
    const dataUrl = await compressImageFile(file)
    if (!dataUrl) return null
    return {
      id: uid(),
      kind: 'image',
      dataUrl,
      name: file.name || 'image.jpg',
      mime: 'image/jpeg',
    }
  }

  if (file.type.startsWith('video/')) {
    if (file.size > MAX_VIDEO_BYTES) return null
    const dataUrl = await readAsDataURL(file)
    return {
      id: uid(),
      kind: 'video',
      dataUrl,
      name: file.name || 'video.mp4',
      mime: file.type,
    }
  }

  if (file.size > MAX_FILE_BYTES) return null
  const dataUrl = await readAsDataURL(file)
  return {
    id: uid(),
    kind: 'file',
    dataUrl,
    name: file.name || 'file',
    mime: file.type || 'application/octet-stream',
  }
}

export async function attachmentsFromClipboard(items) {
  const files = []
  const seen = new Set()

  for (const item of items) {
    if (!item?.type) continue
    const isMedia =
      item.type.startsWith('image/') ||
      item.type.startsWith('video/') ||
      (item.kind === 'file' && !item.type.startsWith('text/'))
    if (!isMedia) continue

    const file = item.getAsFile?.()
    if (!file) continue

    const key = `${file.type}:${file.size}:${file.name || ''}`
    if (seen.has(key)) continue
    seen.add(key)
    files.push(file)
  }

  const attachments = []
  for (const file of files) {
    const attachment = await attachmentFromFile(file)
    if (attachment) attachments.push(attachment)
  }
  return attachments
}

export async function imagesFromClipboard(items) {
  const attachments = await attachmentsFromClipboard(items)
  return attachments
    .filter((row) => row.kind === 'image')
    .map((row) => row.dataUrl)
}

function normalizeAttachment(raw) {
  if (typeof raw === 'string' && raw.startsWith('data:image/')) {
    return {
      id: uid(),
      kind: 'image',
      dataUrl: raw,
      name: 'image.jpg',
      mime: 'image/jpeg',
    }
  }
  if (!raw || typeof raw !== 'object' || !raw.dataUrl) return null
  const kind =
    raw.kind === 'video' || raw.kind === 'file' || raw.kind === 'image'
      ? raw.kind
      : String(raw.mime || '').startsWith('video/')
        ? 'video'
        : String(raw.mime || '').startsWith('image/')
          ? 'image'
          : 'file'
  return {
    id: String(raw.id || uid()),
    kind,
    dataUrl: String(raw.dataUrl),
    name: String(raw.name || 'file'),
    mime: String(raw.mime || 'application/octet-stream'),
  }
}

function normalizeComment(raw) {
  const text = String(raw?.text ?? '').trim()
  if (!text) return null
  return {
    id: String(raw.id || uid()),
    text,
    createdAt: Number(raw.createdAt) || Date.now(),
  }
}

function normalizeProject(raw) {
  const name = String(raw?.name ?? '').trim()
  if (!name) return null
  const archived = Boolean(raw?.archived)
  return {
    id: String(raw.id || uid()),
    name,
    archived,
    createdAt: Number(raw.createdAt) || Date.now(),
    archivedAt: archived
      ? Number(raw.archivedAt) || Date.now()
      : raw.archivedAt == null
        ? null
        : Number(raw.archivedAt) || null,
  }
}

function normalizeCard(raw, fallbackProjectId = null) {
  const fromAttachments = Array.isArray(raw.attachments)
    ? raw.attachments.map(normalizeAttachment).filter(Boolean)
    : []
  const fromImages = Array.isArray(raw.images)
    ? raw.images.map(normalizeAttachment).filter(Boolean)
    : []
  const attachments = fromAttachments.length ? fromAttachments : fromImages
  const comments = Array.isArray(raw.comments)
    ? raw.comments.map(normalizeComment).filter(Boolean)
    : []

  return {
    id: String(raw.id || uid()),
    projectId: raw.projectId ? String(raw.projectId) : fallbackProjectId,
    title: String(raw.title || 'Untitled card'),
    body: String(raw.body || ''),
    attachments,
    comments,
    priority: raw.priority === 'high' ? 'high' : 'normal',
    images: attachments
      .filter((row) => row.kind === 'image')
      .map((row) => row.dataUrl),
    done: Boolean(raw.done),
    createdAt: Number(raw.createdAt) || Date.now(),
    doneAt: raw.doneAt == null ? null : Number(raw.doneAt) || null,
  }
}

export const useBoardStore = defineStore('board', () => {
  const projects = ref([])
  const activeProjectId = ref(null)
  const cards = ref([])
  let ready = false

  const activeProjects = computed(() =>
    projects.value
      .filter((row) => !row.archived)
      .sort((a, b) => b.createdAt - a.createdAt),
  )

  const archivedProjects = computed(() =>
    projects.value
      .filter((row) => row.archived)
      .sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0)),
  )

  const activeProject = computed(() => {
    const project =
      projects.value.find((row) => row.id === activeProjectId.value) || null
    if (!project || project.archived) return null
    return project
  })

  const projectCards = computed(() => {
    if (!activeProject.value) return []
    return cards.value.filter((card) => card.projectId === activeProject.value.id)
  })

  const openCards = computed(() =>
    projectCards.value
      .filter((card) => !card.done)
      .sort((a, b) => b.createdAt - a.createdAt),
  )

  const priorityOpenCards = computed(() =>
    openCards.value.filter((card) => card.priority === 'high'),
  )

  const regularOpenCards = computed(() =>
    openCards.value.filter((card) => card.priority !== 'high'),
  )

  const doneCards = computed(() =>
    projectCards.value
      .filter((card) => card.done)
      .sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)),
  )

  const activeProjectIds = computed(
    () => new Set(activeProjects.value.map((row) => row.id)),
  )

  const openCount = computed(
    () =>
      cards.value.filter(
        (card) => !card.done && activeProjectIds.value.has(card.projectId),
      ).length,
  )

  function persist() {
    if (!ready) return
    saveState({
      projects: projects.value,
      activeProjectId: activeProjectId.value,
      cards: cards.value.map((card) => ({
        id: card.id,
        projectId: card.projectId,
        title: card.title,
        body: card.body,
        attachments: card.attachments,
        comments: card.comments,
        priority: card.priority,
        done: card.done,
        createdAt: card.createdAt,
        doneAt: card.doneAt,
      })),
    })
  }

  function pickActiveProject(preferredId = null) {
    if (
      preferredId &&
      activeProjects.value.some((row) => row.id === preferredId)
    ) {
      activeProjectId.value = preferredId
      return
    }
    activeProjectId.value = activeProjects.value[0]?.id ?? null
  }

  function setActiveProject(id) {
    if (!activeProjects.value.some((row) => row.id === id)) return
    activeProjectId.value = id
    persist()
  }

  function addProject(name) {
    const clean = String(name ?? '').trim()
    if (!clean) return null
    const project = normalizeProject({
      id: uid(),
      name: clean,
      archived: false,
      createdAt: Date.now(),
      archivedAt: null,
    })
    if (!project) return null
    projects.value.unshift(project)
    activeProjectId.value = project.id
    persist()
    return project
  }

  function renameProject(id, name) {
    const project = projects.value.find((row) => row.id === id)
    if (!project || project.archived) return
    const clean = String(name ?? '').trim()
    if (!clean) return
    project.name = clean
    persist()
  }

  function archiveProject(id) {
    const project = projects.value.find((row) => row.id === id)
    if (!project || project.archived) return
    project.archived = true
    project.archivedAt = Date.now()
    if (activeProjectId.value === id) {
      pickActiveProject()
    }
    persist()
  }

  function restoreProject(id) {
    const project = projects.value.find((row) => row.id === id)
    if (!project || !project.archived) return
    project.archived = false
    project.archivedAt = null
    activeProjectId.value = project.id
    persist()
  }

  function removeProject(id) {
    const nextProjects = projects.value.filter((row) => row.id !== id)
    if (nextProjects.length === projects.value.length) return
    projects.value = nextProjects
    cards.value = cards.value.filter((card) => card.projectId !== id)
    if (activeProjectId.value === id) {
      pickActiveProject()
    }
    persist()
  }

  function addCard({
    title = '',
    body = '',
    images = [],
    attachments = [],
    priority = 'normal',
    projectId = activeProjectId.value,
  } = {}) {
    const project = projects.value.find((row) => row.id === projectId)
    if (!project || project.archived) return null

    const rawTitle = String(title ?? '')
    const rawBody = String(body ?? '').trim()
    const media = [
      ...(Array.isArray(attachments) ? attachments : []),
      ...(Array.isArray(images)
        ? images.map((src) => normalizeAttachment(src)).filter(Boolean)
        : []),
    ]
    const hasMedia = media.length > 0

    let finalTitle
    let finalBody

    if (rawBody) {
      finalTitle = titleFromText(rawTitle) || (hasMedia ? 'Media note' : 'Untitled card')
      finalBody = rawBody
    } else if (rawTitle.includes('\n')) {
      finalTitle = titleFromText(rawTitle)
      finalBody = bodyFromText(rawTitle)
    } else {
      finalTitle =
        rawTitle.trim() || (hasMedia ? 'Media note' : 'Untitled card')
      finalBody = ''
    }

    const card = normalizeCard({
      id: uid(),
      projectId,
      title: finalTitle,
      body: finalBody,
      attachments: media,
      priority: priority === 'high' ? 'high' : 'normal',
      done: false,
      createdAt: Date.now(),
      doneAt: null,
    })

    cards.value.unshift(card)
    persist()
    return card
  }

  function markDone(id) {
    const card = cards.value.find((row) => row.id === id)
    if (!card || card.done) return
    card.done = true
    card.doneAt = Date.now()
    persist()
  }

  function restore(id) {
    const card = cards.value.find((row) => row.id === id)
    if (!card || !card.done) return
    card.done = false
    card.doneAt = null
    persist()
  }

  function remove(id) {
    const next = cards.value.filter((row) => row.id !== id)
    if (next.length === cards.value.length) return
    cards.value = next
    persist()
  }

  function addComment(cardId, text) {
    const card = cards.value.find((row) => row.id === cardId)
    if (!card) return null
    const comment = normalizeComment({
      id: uid(),
      text,
      createdAt: Date.now(),
    })
    if (!comment) return null
    if (!Array.isArray(card.comments)) card.comments = []
    card.comments.push(comment)
    persist()
    return comment
  }

  function removeComment(cardId, commentId) {
    const card = cards.value.find((row) => row.id === cardId)
    if (!card || !Array.isArray(card.comments)) return
    const next = card.comments.filter((row) => row.id !== commentId)
    if (next.length === card.comments.length) return
    card.comments = next
    persist()
  }

  function setPriority(cardId, priority) {
    const card = cards.value.find((row) => row.id === cardId)
    if (!card) return
    const next = priority === 'high' ? 'high' : 'normal'
    if (card.priority === next) return
    card.priority = next
    persist()
  }

  function hydrate() {
    const saved = loadState()
    let nextProjects = Array.isArray(saved?.projects)
      ? saved.projects.map(normalizeProject).filter(Boolean)
      : []

    let nextCards = Array.isArray(saved?.cards) ? saved.cards : []

    // Migrate older cards that had no projects.
    if (!nextProjects.length && nextCards.length) {
      const migrated = normalizeProject({
        id: uid(),
        name: 'General',
        archived: false,
        createdAt: Date.now(),
        archivedAt: null,
      })
      nextProjects = [migrated]
      nextCards = nextCards.map((card) =>
        normalizeCard(card, migrated.id),
      )
    } else {
      const fallbackId =
        nextProjects.find((row) => !row.archived)?.id ??
        nextProjects[0]?.id ??
        null
      nextCards = nextCards.map((card) => normalizeCard(card, fallbackId))
    }

    projects.value = nextProjects
    cards.value = nextCards

    const savedActive = saved?.activeProjectId
    const openIds = nextProjects.filter((row) => !row.archived).map((row) => row.id)
    activeProjectId.value =
      typeof savedActive === 'string' && openIds.includes(savedActive)
        ? savedActive
        : openIds[0] ?? null
  }

  hydrate()
  ready = true
  persist()

  watch([projects, cards, activeProjectId], () => persist(), { deep: true })

  return {
    projects,
    activeProjects,
    archivedProjects,
    activeProjectId,
    activeProject,
    cards,
    openCards,
    priorityOpenCards,
    regularOpenCards,
    doneCards,
    openCount,
    setActiveProject,
    addProject,
    renameProject,
    archiveProject,
    restoreProject,
    removeProject,
    addCard,
    markDone,
    restore,
    remove,
    addComment,
    removeComment,
    setPriority,
  }
})
