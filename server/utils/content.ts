import { createHash } from 'node:crypto'

const trackingParameters = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
  'ref', 'fbclid', 'gclid', 'mc_cid', 'mc_eid',
])

export function normalizeUrl(value: string): string {
  const url = new URL(value)
  url.hash = ''
  url.hostname = url.hostname.toLowerCase()
  for (const parameter of [...url.searchParams.keys()]) {
    if (trackingParameters.has(parameter.toLowerCase())) url.searchParams.delete(parameter)
  }
  url.searchParams.sort()
  url.pathname = url.pathname.replace(/\/+$/, '') || '/'
  return url.toString()
}

export function createContentHash(value: string): string {
  return createHash('sha256').update(value.trim().replace(/\s+/g, ' ')).digest('hex')
}
