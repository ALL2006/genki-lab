import { escapeHtml } from '../utils.js'
import { AssetFallback } from './AssetFallback.js'

export function ProductBottle({ id, asset, exists, className = '', conceptLabel = '' }) {
  const visual = exists
    ? `<img src="${escapeHtml(asset)}" alt="产品正面图" />`
    : `<div class="product-bottle__silhouette" aria-hidden="true"><i></i><span></span></div>${AssetFallback({ id: `${id}-fallback`, label: '产品正面 PNG', kind: '包装图', className: 'product-bottle__fallback' })}`

  return `<div id="${id}" class="product-bottle ${className}" data-product-asset="${escapeHtml(asset)}">
    <div class="product-bottle__aura" aria-hidden="true" data-layout-allow-overflow></div>
    <div class="product-bottle__media">${visual}</div>
    <div class="product-bottle__reflection" aria-hidden="true"></div>
    ${conceptLabel ? `<span class="product-bottle__concept">${escapeHtml(conceptLabel)}</span>` : ''}
  </div>`
}
