interface NormalizedToken {
  value: string
  start: number
  end: number
}

const singleQuotes = new Set(["'", '’', '‘', '‛', '＇'])
const doubleQuotes = new Set(['"', '“', '”', '„', '‟', '＂'])

export interface NormalizedText {
  value: string
  tokens: NormalizedToken[]
}

export class QuoteNormalizer {
  normalize(value: string): NormalizedText {
    const tokens: NormalizedToken[] = []
    let offset = 0
    for (const character of value) {
      const start = offset
      offset += character.length
      const compatibilityNormalized = character.normalize('NFKC')
      const normalized = /\s/u.test(character) || character === '\u00a0'
        ? ' '
        : singleQuotes.has(character)
          ? "'"
          : doubleQuotes.has(character)
            ? '"'
            // NFKC is safe for compatibility letters/digits, but changing a
            // Chinese punctuation mark into an ASCII mark would relax the
            // quote contract beyond the allowed typography equivalences.
            : /\p{P}/u.test(character) || /\p{P}/u.test(compatibilityNormalized)
              ? character
              : compatibilityNormalized
      for (const output of normalized) {
        if (output === ' ' && tokens.at(-1)?.value === ' ') continue
        tokens.push({ value: output, start, end: offset })
      }
    }
    while (tokens[0]?.value === ' ') tokens.shift()
    while (tokens.at(-1)?.value === ' ') tokens.pop()
    return { value: tokens.map((token) => token.value).join(''), tokens }
  }
}
