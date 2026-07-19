import { products } from '../data/products'

export const productService = {
  getAll: async () => products,
  getById: async (id: string) => products.find((product) => product.id === id),
}

// Extension point: replace local reads with a real database repository.
