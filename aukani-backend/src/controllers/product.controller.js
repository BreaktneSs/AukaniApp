import { productService } from "../services/product.service.js"
import { auditService } from "../services/audit.service.js"

const ip = (req) => req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip

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

  async search(req, reply) {
    const { q } = req.query
    const result = await productService.getAll({ search: q || "", limit: 50 })
    return reply.send(result)
  },

  async create(req, reply) {
    const product = await productService.create(req.body)
    auditService.log({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: "PRODUCT_CREATE", entity: "PRODUCT", entityId: product.id,
      entityLabel: product.name,
      newValues: { name: product.name, price: product.price, stock: product.stock },
      ip: ip(req),
    })
    return reply.status(201).send(product)
  },

  async update(req, reply) {
    const before = await productService.getById(Number(req.params.id))
    const product = await productService.update(Number(req.params.id), req.body)
    auditService.log({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: "PRODUCT_UPDATE", entity: "PRODUCT", entityId: product.id,
      entityLabel: product.name,
      oldValues: { name: before.name, price: before.price, stock: before.stock, active: before.active },
      newValues: { name: product.name, price: product.price, stock: product.stock, active: product.active },
      ip: ip(req),
    })
    return reply.send(product)
  },

  async updateStock(req, reply) {
    const { quantity } = req.body
    const product = await productService.updateStock(Number(req.params.id), quantity)
    return reply.send(product)
  },

  async delete(req, reply) {
    const before = await productService.getById(Number(req.params.id))
    await productService.delete(Number(req.params.id))
    auditService.log({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: "PRODUCT_DELETE", entity: "PRODUCT", entityId: before?.id,
      entityLabel: before?.name,
      oldValues: { name: before?.name, price: before?.price },
      ip: ip(req),
    })
    return reply.status(204).send()
  },
}
