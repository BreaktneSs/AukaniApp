import { inventoryService } from "../services/inventory.service.js"

export const inventoryController = {
  async entry(req, reply) {
    const result = await inventoryService.entry({ ...req.body, userId: req.user.id })
    return reply.status(201).send(result)
  },
  async exit(req, reply) {
    const result = await inventoryService.exit({ ...req.body, userId: req.user.id })
    return reply.status(201).send(result)
  },
  async getMovements(req, reply) {
    const { page, limit, productId, type, from, to } = req.query
    return reply.send(await inventoryService.getMovements({ page: Number(page) || 1, limit: Number(limit) || 30, productId: productId ? Number(productId) : undefined, type, from, to }))
  },
  async getLowStock(req, reply) {
    return reply.send(await inventoryService.getLowStockProducts())
  },
}