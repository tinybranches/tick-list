const URL_RE = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi
const TRAILING_PUNCT_RE = /[),.!?:;]+$/
const FENCE_RE = /```([a-zA-Z0-9_+-]*)[ \t]*\r?\n?([\s\S]*?)```/g

const CODE_KEYWORDS =
  /\b(function|return|const|let|var|class|def|import|export|public|private|protected|static|async|await|preg_|mb_|namespace|using|package|printf|echo|select|from|where)\b/i

export function linkifyParts(text) {
  const source = String(text ?? '')
  if (!source) return []

  const parts = []
  let lastIndex = 0

  for (const match of source.matchAll(URL_RE)) {
    const raw = match[0]
    const start = match.index ?? 0
    if (start > lastIndex) {
      parts.push({ type: 'text', value: source.slice(lastIndex, start) })
    }

    let url = raw
    let trailing = ''
    const punct = url.match(TRAILING_PUNCT_RE)
    if (punct) {
      trailing = punct[0]
      url = url.slice(0, -trailing.length)
    }

    if (!url) {
      parts.push({ type: 'text', value: raw })
    } else {
      const href = /^https?:\/\//i.test(url) ? url : `https://${url}`
      parts.push({ type: 'link', value: url, href })
      if (trailing) parts.push({ type: 'text', value: trailing })
    }

    lastIndex = start + raw.length
  }

  if (lastIndex < source.length) {
    parts.push({ type: 'text', value: source.slice(lastIndex) })
  }

  return parts.length ? parts : [{ type: 'text', value: source }]
}

export function guessCodeLanguage(text) {
  const sample = String(text ?? '')
  if (/<\?php|\$\w+|preg_|mb_convert/i.test(sample)) return 'php'
  if (/\b(def |import |self\.|elif )\b/.test(sample)) return 'python'
  if (/\b(package |fmt\.|func )\b/.test(sample)) return 'go'
  if (/\b(fn |let mut |impl )\b/.test(sample)) return 'rust'
  if (/<\/?[a-z][\s\S]*>/i.test(sample) && !/function\s*\(/.test(sample)) return 'html'
  if (/\b(interface |type |export |const \w+ =)\b/.test(sample)) return 'ts'
  if (/\b(function|const|let|=>|console\.)\b/.test(sample)) return 'js'
  if (/\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\b/i.test(sample)) return 'sql'
  if (/\{[\s\S]*\}/.test(sample) && /"[^"]+"\s*:/.test(sample)) return 'json'
  return ''
}

export function looksLikeCode(text) {
  const source = String(text ?? '').replace(/\r\n/g, '\n').trim()
  if (!source || source.includes('```')) return false

  const lines = source.split('\n')
  let score = 0

  if (lines.length >= 2) score += 1
  if (lines.length >= 4) score += 1
  if (/[{}]/.test(source)) score += 2
  if (/;\s*$/m.test(source)) score += 2
  if (CODE_KEYWORDS.test(source)) score += 2
  if (/=>|::|->|\$\w+|<\/?[a-z]/i.test(source)) score += 2
  if (lines.some((line) => /^\s{2,}|\t/.test(line))) score += 1
  if (/^\s*(function|class|def|const|let|var|import|export|<\?php)\b/m.test(source)) {
    score += 2
  }

  if (lines.length === 1) return score >= 5 && source.length >= 24
  return score >= 4
}

export function wrapCodeIfNeeded(text) {
  const source = String(text ?? '').replace(/\r\n/g, '\n')
  const trimmed = source.trim()
  if (!trimmed || !looksLikeCode(trimmed)) return source

  const lang = guessCodeLanguage(trimmed)
  const body = trimmed.replace(/\n+$/, '')
  return `\`\`\`${lang}\n${body}\n\`\`\``
}

export function parseRichSegments(text) {
  const source = String(text ?? '').replace(/\r\n/g, '\n')
  if (!source) return []

  if (!source.includes('```') && looksLikeCode(source)) {
    return [
      {
        type: 'code',
        lang: guessCodeLanguage(source),
        value: source.trim(),
        start: 0,
        end: source.length,
        implicit: true,
      },
    ]
  }

  const segments = []
  let lastIndex = 0
  FENCE_RE.lastIndex = 0

  for (const match of source.matchAll(FENCE_RE)) {
    const full = match[0]
    const start = match.index ?? 0
    if (start > lastIndex) {
      segments.push({
        type: 'text',
        value: source.slice(lastIndex, start),
        start: lastIndex,
        end: start,
      })
    }

    segments.push({
      type: 'code',
      lang: String(match[1] || ''),
      value: String(match[2] || '').replace(/\n$/, ''),
      start,
      end: start + full.length,
      implicit: false,
    })
    lastIndex = start + full.length
  }

  if (lastIndex < source.length) {
    segments.push({
      type: 'text',
      value: source.slice(lastIndex),
      start: lastIndex,
      end: source.length,
    })
  }

  return segments.length ? segments : [{ type: 'text', value: source, start: 0, end: source.length }]
}

export function replaceCodeSegment(source, segment, nextCode) {
  const text = String(source ?? '').replace(/\r\n/g, '\n')
  const code = String(nextCode ?? '').replace(/\r\n/g, '\n').replace(/\n+$/, '')
  const lang = segment.lang || guessCodeLanguage(code)
  const block = `\`\`\`${lang}\n${code}\n\`\`\``

  if (segment.implicit) return block
  return `${text.slice(0, segment.start)}${block}${text.slice(segment.end)}`
}
