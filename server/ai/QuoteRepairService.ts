import type { QuoteRepairResult } from '../../shared/types.js'
import { QuoteNormalizer } from './QuoteNormalizer.js'

export class QuoteRepairService {
  constructor(private readonly normalizer = new QuoteNormalizer()) {}

  repair(originalQuote: string, rawText: string): QuoteRepairResult {
    const exactStart = rawText.indexOf(originalQuote)
    if (exactStart >= 0) {
      return {
        originalQuote,
        repairedQuote: originalQuote,
        repairMethod: 'exact',
        quoteAutoRepaired: false,
        matchedStart: exactStart,
        matchedEnd: exactStart + originalQuote.length,
      }
    }
    const source = this.normalizer.normalize(rawText)
    const quote = this.normalizer.normalize(originalQuote).value
    if (!quote) return this.notFound(originalQuote)
    const matches: number[] = []
    let cursor = 0
    while (cursor <= source.value.length - quote.length) {
      const index = source.value.indexOf(quote, cursor)
      if (index < 0) break
      matches.push(index)
      cursor = index + 1
    }
    if (matches.length === 0) return this.notFound(originalQuote)
    if (matches.length > 1) {
      return {
        originalQuote,
        repairedQuote: null,
        repairMethod: 'normalized_multiple',
        quoteAutoRepaired: false,
        matchedStart: null,
        matchedEnd: null,
      }
    }
    const normalizedStart = matches[0]
    const start = source.tokens[normalizedStart]?.start ?? null
    const end = source.tokens[normalizedStart + quote.length - 1]?.end ?? null
    if (start === null || end === null) return this.notFound(originalQuote)
    return {
      originalQuote,
      repairedQuote: rawText.slice(start, end),
      repairMethod: 'normalized_unique',
      quoteAutoRepaired: true,
      matchedStart: start,
      matchedEnd: end,
    }
  }

  private notFound(originalQuote: string): QuoteRepairResult {
    return {
      originalQuote,
      repairedQuote: null,
      repairMethod: 'not_found',
      quoteAutoRepaired: false,
      matchedStart: null,
      matchedEnd: null,
    }
  }
}
