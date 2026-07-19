import { escapeHtml } from '../utils.js'
import { AssetFallback } from './AssetFallback.js'

export function FloatingIngredients({ id, items, assetExists, className = '', decorative = false }) {
  const content = items.map((item, index) => {
    const exists = assetExists(item.asset)
    return `<div id="${id}-item-${index}" class="floating-ingredient floating-ingredient--${index % 4}" data-i="${index}">
      ${exists
        ? `<img src="${escapeHtml(item.asset)}" alt="${escapeHtml(item.name)}" />`
        : decorative
          ? `<span class="ingredient-symbol ingredient-symbol--${item.kind ?? 'botanical'}" aria-hidden="true"></span>`
          : AssetFallback({ id: `${id}-fallback-${index}`, label: item.name, kind: '原料素材', className: 'floating-ingredient__fallback' })}
    </div>`
  }).join('')
  return `<div id="${id}" class="floating-ingredients ${className}">${content}</div>`
}
