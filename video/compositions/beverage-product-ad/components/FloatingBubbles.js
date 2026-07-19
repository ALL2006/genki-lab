export function FloatingBubbles({ id, count = 18, className = '', large = false }) {
  const bubbles = Array.from({ length: count }, (_, index) => {
    const size = (large ? 22 : 12) + ((index * 17) % (large ? 54 : 34))
    const left = 5 + ((index * 37) % 91)
    const delay = ((index * 13) % 18) / 10
    const travel = 1180 + ((index * 83) % 760)
    return `<i class="floating-bubble" data-i="${index}" data-layout-allow-overflow style="--bubble-size:${size}px;--bubble-left:${left}%;--bubble-delay:${delay}s;--bubble-travel:${travel}px"></i>`
  }).join('')

  return `<div id="${id}" class="floating-bubbles ${className}" aria-hidden="true">${bubbles}</div>`
}
