import type { CSSProperties } from 'react'
import type { ProductConcept } from '../../shared/types'

export interface ProductTheme {
  productAccent: string
  productAccentSoft: string
  productTextColor: string
  productImage: string | null
}

export const defaultProductTheme: ProductTheme = {
  productAccent: '#60758a',
  productAccentSoft: '#e8edf2',
  productTextColor: '#2c333a',
  productImage: null,
}

const qingtiJasmineTheme: ProductTheme = {
  productAccent: '#6d9473',
  productAccentSoft: '#edf4ee',
  productTextColor: '#294232',
  productImage: null,
}

/**
 * Presentation-only mapping. Product styling stays outside the shared data model
 * until product-theme fields become part of the repository contract.
 */
export const productThemeByConcept: Record<string, ProductTheme> = {
  '青提茉莉气泡茶': qingtiJasmineTheme,
  '元气森林青提茉莉气泡茶': qingtiJasmineTheme,
  '青提茉莉轻气泡茶': qingtiJasmineTheme,
}

export function resolveProductTheme(product: Pick<ProductConcept, 'id' | 'productName'>): ProductTheme {
  return productThemeByConcept[product.id]
    ?? productThemeByConcept[product.productName]
    ?? defaultProductTheme
}

export function productThemeStyle(theme: ProductTheme): CSSProperties {
  return {
    '--product-accent': theme.productAccent,
    '--product-accent-soft': theme.productAccentSoft,
    '--product-text-color': theme.productTextColor,
    '--product-image': theme.productImage ? `url("${theme.productImage}")` : 'none',
  } as CSSProperties
}
