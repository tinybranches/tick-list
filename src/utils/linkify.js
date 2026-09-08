const URL_RE = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi

const TRAILING_PUNCT_RE = /[),.!?:;]+$/

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
