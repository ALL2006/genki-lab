import { escapeHtml } from '../utils.js'

export function AssetFallback({ id, label, kind = '素材', className = '' }) {
  return `<div id="${id}" class="asset-fallback ${className}" data-asset-fallback="true" data-layout-allow-occlusion data-layout-allow-overlap>
    <span class="asset-fallback__mark" aria-hidden="true"></span>
    <strong>${escapeHtml(label)}</strong>
    <small>${escapeHtml(kind)}待替换 · 开发占位</small>
  </div>`
}
