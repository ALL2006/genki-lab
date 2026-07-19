export function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function sceneClip({ id, start, duration, track = 1, content, className = '' }) {
  return `<section id="${id}" class="clip scene ${className}" data-start="${start}" data-duration="${duration}" data-track-index="${track}">${content}</section>`
}

export function fixed(value, digits = 2) {
  return Number(Number(value).toFixed(digits))
}

export function splitSlogan(value = '') {
  const comma = value.indexOf('，', Math.max(0, Math.floor(value.length / 3)))
  if (comma === -1) return [value]
  return [value.slice(0, comma + 1), value.slice(comma + 1)]
}
