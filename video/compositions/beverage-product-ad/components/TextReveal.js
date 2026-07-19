import { escapeHtml } from '../utils.js'

export function TextReveal({ id, eyebrow = '', title, description = '', className = '', align = 'left' }) {
  return `<div id="${id}" class="text-reveal text-reveal--${align} ${className}">
    ${eyebrow ? `<span class="text-reveal__eyebrow">${escapeHtml(eyebrow)}</span>` : ''}
    <h2>${escapeHtml(title)}</h2>
    ${description ? `<p>${escapeHtml(description)}</p>` : ''}
  </div>`
}
