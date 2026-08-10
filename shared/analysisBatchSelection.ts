export function toggleSelectedId(current: ReadonlySet<string>, itemId: string) {
  const next = new Set(current)
  if (next.has(itemId)) next.delete(itemId)
  else next.add(itemId)
  return next
}

export function getCreateBatchLabel(selectedCount: number) {
  return `创建批次 · ${selectedCount}条`
}

export type PilotSelectionRole = 'consumer_candidate' | 'market_candidate' | 'background_candidate' | 'unknown' | 'excluded'
export type PilotRoleHint = Exclude<PilotSelectionRole, 'excluded'>

export interface PilotSelectionCandidate {
  itemId: string
  source: string
  dataType: 'public_material' | 'consumer_comment'
  dataset: 'development' | 'holdout' | null
  roleHint?: PilotRoleHint | null
  selectionRole: PilotSelectionRole | null
  selectable: boolean
}

export const selectionRoleLabels: Record<PilotSelectionRole, string> = {
  consumer_candidate: '消费者证据候选',
  market_candidate: '市场证据候选',
  background_candidate: '背景资料候选',
  unknown: '待判断',
  excluded: '不纳入本批',
}

export const selectionRoleOptions = (Object.keys(selectionRoleLabels) as PilotSelectionRole[]).map((value) => ({
  value,
  label: selectionRoleLabels[value],
}))

const marketSourceIds = new Set([
  'source-brand-coca-media',
  'source-brand-pepsico-prebiotic-cola',
  'source-brand-kdp-innovation-2026',
])

const backgroundSourceIds = new Set([
  'source-rss-fsa-research',
  'source-industry-qj-statistics',
])

export function getRoleHint(candidate: PilotSelectionCandidate): PilotRoleHint {
  if (candidate.roleHint) return candidate.roleHint
  if (candidate.dataType === 'consumer_comment') return 'consumer_candidate'
  if (marketSourceIds.has(candidate.source)) return 'market_candidate'
  if (backgroundSourceIds.has(candidate.source)) return 'background_candidate'
  return 'unknown'
}

export function getEffectiveSelectionRole(
  candidate: PilotSelectionCandidate,
  overrides: Readonly<Record<string, PilotSelectionRole>>,
): PilotSelectionRole {
  return overrides[candidate.itemId] ?? candidate.selectionRole ?? getRoleHint(candidate)
}

export interface PilotRoleCounts {
  consumer_candidate: number
  market_candidate: number
  background_candidate: number
  unknown: number
  excluded: number
}

export function countPilotRoles(
  candidates: PilotSelectionCandidate[],
  selectedIds: ReadonlySet<string>,
  overrides: Readonly<Record<string, PilotSelectionRole>>,
): PilotRoleCounts {
  const counts: PilotRoleCounts = {
    consumer_candidate: 0,
    market_candidate: 0,
    background_candidate: 0,
    unknown: 0,
    excluded: 0,
  }
  for (const candidate of candidates) {
    if (!selectedIds.has(candidate.itemId)) continue
    counts[getEffectiveSelectionRole(candidate, overrides)] += 1
  }
  return counts
}

export function isB2PilotDistribution(counts: PilotRoleCounts) {
  return counts.consumer_candidate === 2
    && counts.market_candidate === 2
    && counts.background_candidate === 2
    && counts.unknown === 0
    && counts.excluded === 0
}

export function buildB2PilotSelection(candidates: PilotSelectionCandidate[]) {
  const available = candidates.filter((item) => item.selectable)
  const comments = available
    .filter((item) => item.dataType === 'consumer_comment' && item.dataset === 'development')
    .slice(0, 2)
  const cocaCola = available.find((item) => item.source === 'source-brand-coca-media')
  const pepsicoOrFallback = available.find((item) => item.source === 'source-brand-pepsico-prebiotic-cola')
    ?? available.find((item) => item.source === 'source-brand-kdp-innovation-2026')
  const backgrounds = available
    .filter((item) => item.source === 'source-rss-fsa-research' && getEffectiveSelectionRole(item, {}) === 'background_candidate')
    .slice(0, 2)
  const selected = [...comments, ...(cocaCola ? [cocaCola] : []), ...(pepsicoOrFallback ? [pepsicoOrFallback] : []), ...backgrounds]
  return selected.length === 6 ? selected.map((item) => item.itemId) : []
}
