import { escapeHtml } from '../utils.js'

export function Disclaimer({ id, text }) {
  return `<p id="${id}" class="disclaimer">${escapeHtml(text)}</p>`
}
