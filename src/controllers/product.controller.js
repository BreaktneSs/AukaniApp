import { productService } from "../services/product.service.js"

export const productController = {
  async getAll(req, reply) {
    const { page, limit, search, categoryId, minPrice, maxPrice, lowStock, active } = req.query
    const result = await productService.getAll({
      page: Number(page) || 1,
      limit: Number(limit) || 200,
      search: search || undefined,
      categoryId: categoryId || undefined,
      minPrice: minPrice || undefined,
      maxPrice: maxPrice || undefined,
      lowStock: lowStock || undefined,
      active: active === "false" ? false : true,
    })
    return reply.send(result)
  },

  async getById(req, reply) {
    const product = await productService.getById(Number(req.params.id))
    if (!product) return reply.status(404).send({ error: "Producto no encontrado" })
    return reply.send(product)
  },

  async getByBarcode(req, reply) {
    const product = await productService.getByBarcode(req.params.code)
    if (!product) return reply.status(404).send({ error: "Producto no encontrado" })
    return reply.send(product)
  },

  // /products/search?q= ahora también devuelve { products, total }
  async search(req, reply) {
    const { q } = req.query
    const result = await productService.getAll({ search: q || "", limit: 50 })
    return reply.send(result)
  },

  async create(req, reply) {
    const product = await productService.create(req.body)
    return reply.status(201).send(product)
  },

  async update(req, reply) {
    const product = await productService.update(Number(req.params.id), req.body)
    return reply.send(product)
  },

  async updateStock(req, reply) {
    const { quantity } = req.body
    const product = await productService.updateStock(Number(req.params.id), quantity)
    return reply.send(product)
  },

  async delete(req, reply) {
    await productService.delete(Number(req.params.id))
    return reply.status(204).send()
  },
}