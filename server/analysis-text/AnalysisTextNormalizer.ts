import type {
  AnalysisTextSpan,
  AnalysisTextSpanMap,
  AnalysisTextTransformationType,
  AnalysisTextVersion,
} from '../../shared/types.js'

export const ANALYSIS_TEXT_VERSION: AnalysisTextVersion = 'v1'

interface RemovalRange {
  rawStart: number
  rawEnd: number
  transformationType: Extract<AnalysisTextTransformationType, 'footnote_marker_removed' | 'navigation_noise_removed' | 'footer_noise_removed'>
}

export interface AnalysisTextResult {
  analysisText: string
  analysisTextVersion: AnalysisTextVersion
  analysisTextSpanMap: AnalysisTextSpanMap
}

export interface QuoteSourceTrace {
  analysisMatchedStart: number | null
  analysisMatchedEnd: number | null
  rawMatchedStart: number | null
  rawMatchedEnd: number | null
  sourceTransformation: AnalysisTextTransformationType[]
  traceable: boolean
}

const allowedMetadataTransformations = new Set<RemovalRange['transformationType']>([
  'footnote_marker_removed',
  'navigation_noise_removed',
  'footer_noise_removed',
])

function metadataRemovalRanges(rawPayload?: Record<string, unknown>): RemovalRange[] {
  const value = rawPayload?.analysisTextRemoveRanges
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []
    const candidate = entry as Record<string, unknown>
    const rawStart = Number(candidate.rawStart)
    const rawEnd = Number(candidate.rawEnd)
    const transformationType = candidate.transformationType
    if (!Number.isInteger(rawStart) || !Number.isInteger(rawEnd) || rawStart < 0 || rawEnd <= rawStart) return []
    if (typeof transformationType !== 'string' || !allowedMetadataTransformations.has(transformationType as RemovalRange['transformationType'])) return []
    return [{ rawStart, rawEnd, transformationType: transformationType as RemovalRange['transformationType'] }]
  })
}

function highConfidenceFootnoteRanges(rawText: string): RemovalRange[] {
  const referenceMarkers = new Set<string>()
  // Extracted article text can concatenate a reference marker directly onto
  // the preceding date (for example `12-31-252 Source:`). The single digit
  // immediately followed by the literal reference heading is still a
  // high-confidence structural marker; ordinary product and year digits are
  // not followed by `Source:` and therefore remain untouched.
  const referencePattern = /([1-9])\s+Source\s*:/gi
  for (const match of rawText.matchAll(referencePattern)) {
    if ((match.index ?? 0) >= rawText.length * 0.6) referenceMarkers.add(match[1])
  }
  if (referenceMarkers.size === 0) return []

  const ranges: RemovalRange[] = []
  const addMatch = (match: RegExpExecArray, prefix: string, marker: string) => {
    if (!referenceMarkers.has(marker)) return
    const markerStart = match.index + prefix.length
    ranges.push({ rawStart: markerStart, rawEnd: markerStart + marker.length, transformationType: 'footnote_marker_removed' })
  }

  const wordMarker = /([A-Za-z]{3,})(\d{1,2})(?=[\s,.;:—–)])/g
  for (let match = wordMarker.exec(rawText); match; match = wordMarker.exec(rawText)) addMatch(match, match[1], match[2])

  // A five-digit token such as 20242 can be a four-digit year followed by
  // reference 2. A normal year (2026) and ordinary numbers remain untouched.
  const yearMarker = /((?:19|20)\d{2})(\d)(?=[\s,.;:—–)])/g
  for (let match = yearMarker.exec(rawText); match; match = yearMarker.exec(rawText)) addMatch(match, match[1], match[2])

  return ranges
}

function mergeRanges(ranges: RemovalRange[], rawLength: number) {
  return ranges
    .filter((range) => range.rawStart >= 0 && range.rawEnd <= rawLength)
    .sort((a, b) => a.rawStart - b.rawStart || a.rawEnd - b.rawEnd)
    .filter((range, index, ordered) => index === 0 || range.rawStart >= ordered[index - 1].rawEnd)
}

export class AnalysisTextNormalizer {
  normalize(rawText: string, rawPayload?: Record<string, unknown>): AnalysisTextResult {
    const removals = mergeRanges([
      ...metadataRemovalRanges(rawPayload),
      ...highConfidenceFootnoteRanges(rawText),
    ], rawText.length)
    const spans: AnalysisTextSpan[] = []
    let analysisText = ''
    let rawOffset = 0
    let removalIndex = 0

    const append = (value: string, rawStart: number, rawEnd: number, transformationType: AnalysisTextTransformationType) => {
      const analysisStart = analysisText.length
      analysisText += value
      const span: AnalysisTextSpan = { analysisStart, analysisEnd: analysisText.length, rawStart, rawEnd, transformationType }
      const previous = spans.at(-1)
      if (previous
        && previous.transformationType === span.transformationType
        && previous.analysisEnd === span.analysisStart
        && previous.rawEnd === span.rawStart
        && previous.analysisStart !== previous.analysisEnd
        && span.analysisStart !== span.analysisEnd) {
        previous.analysisEnd = span.analysisEnd
        previous.rawEnd = span.rawEnd
      } else spans.push(span)
    }

    while (rawOffset < rawText.length) {
      const removal = removals[removalIndex]
      if (removal && rawOffset === removal.rawStart) {
        append('', removal.rawStart, removal.rawEnd, removal.transformationType)
        rawOffset = removal.rawEnd
        removalIndex += 1
        continue
      }

      const character = String.fromCodePoint(rawText.codePointAt(rawOffset)!)
      const characterEnd = rawOffset + character.length
      if (/\s/u.test(character) || character === '\u00a0') {
        const whitespaceStart = rawOffset
        rawOffset = characterEnd
        while (rawOffset < rawText.length) {
          const nextRemoval = removals[removalIndex]
          if (nextRemoval && rawOffset === nextRemoval.rawStart) break
          const next = String.fromCodePoint(rawText.codePointAt(rawOffset)!)
          if (!/\s/u.test(next) && next !== '\u00a0') break
          rawOffset += next.length
        }
        if (analysisText.length > 0 && !analysisText.endsWith(' ')) append(' ', whitespaceStart, rawOffset, 'whitespace_normalized')
        continue
      }

      const normalized = character.normalize('NFKC')
      append(normalized, rawOffset, characterEnd, normalized === character ? 'identity' : 'unicode_normalized')
      rawOffset = characterEnd
    }

    if (analysisText.endsWith(' ')) {
      analysisText = analysisText.slice(0, -1)
      const final = spans.at(-1)
      if (final?.transformationType === 'whitespace_normalized') final.analysisEnd = Math.max(final.analysisStart, final.analysisEnd - 1)
    }

    return { analysisText, analysisTextVersion: ANALYSIS_TEXT_VERSION, analysisTextSpanMap: spans }
  }

  traceQuote(analysisStart: number, analysisEnd: number, spanMap: AnalysisTextSpanMap): QuoteSourceTrace {
    if (!Number.isInteger(analysisStart) || !Number.isInteger(analysisEnd) || analysisStart < 0 || analysisEnd <= analysisStart) {
      return this.untraceable(analysisStart, analysisEnd)
    }
    const textSpans = spanMap.filter((span) => span.analysisEnd > span.analysisStart
      && span.analysisEnd > analysisStart && span.analysisStart < analysisEnd)
    let cursor = analysisStart
    for (const span of textSpans) {
      if (span.analysisStart > cursor) return this.untraceable(analysisStart, analysisEnd)
      cursor = Math.max(cursor, Math.min(span.analysisEnd, analysisEnd))
      if (cursor >= analysisEnd) break
    }
    if (cursor < analysisEnd || textSpans.length === 0) return this.untraceable(analysisStart, analysisEnd)

    const removedInside = spanMap.filter((span) => span.analysisStart === span.analysisEnd
      && span.analysisStart > analysisStart && span.analysisStart < analysisEnd)
    const relevant = [...textSpans, ...removedInside].sort((a, b) => a.rawStart - b.rawStart)
    const transformations = [...new Set(relevant
      .map((span) => span.transformationType)
      .filter((type) => type !== 'identity'))]
    return {
      analysisMatchedStart: analysisStart,
      analysisMatchedEnd: analysisEnd,
      rawMatchedStart: Math.min(...relevant.map((span) => span.rawStart)),
      rawMatchedEnd: Math.max(...relevant.map((span) => span.rawEnd)),
      sourceTransformation: transformations,
      traceable: true,
    }
  }

  private untraceable(analysisStart: number, analysisEnd: number): QuoteSourceTrace {
    return {
      analysisMatchedStart: Number.isInteger(analysisStart) ? analysisStart : null,
      analysisMatchedEnd: Number.isInteger(analysisEnd) ? analysisEnd : null,
      rawMatchedStart: null,
      rawMatchedEnd: null,
      sourceTransformation: [],
      traceable: false,
    }
  }
}
