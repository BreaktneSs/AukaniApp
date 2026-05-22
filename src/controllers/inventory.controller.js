import { inventoryService } from "../services/inventory.service.js"
import { auditService } from "../services/audit.service.js"

const ip = (req) => req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip

export const inventoryController = {
  async entry(req, reply) {
    const result = await inventoryService.entry({ ...req.body, userId: req.user.id })
    auditService.log({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: "INVENTORY_ENTRY", entity: "INVENTORY", entityId: result.id,
      entityLabel: `Entrada - Producto #${req.body.productId}`,
      newValues: { productId: req.body.productId, quantity: req.body.quantity, reason: req.body.reason },
      ip: ip(req),
    })
    return reply.status(201).send(result)
  },

  async exit(req, reply) {
    const result = await inventoryService.exit({ ...req.body, userId: req.user.id })
    auditService.log({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: "INVENTORY_EXIT", entity: "INVENTORY", entityId: result.id,
      entityLabel: `Salida - Producto #${req.body.productId}`,
      newValues: { productId: req.body.productId, quantity: req.body.quantity, reason: req.body.reason },
      ip: ip(req),
    })
    return reply.status(201).send(result)
  },

  async getMovements(req, reply) {
    const { page, limit, productId, type, from, to } = req.query
    return reply.send(await inventoryService.getMovements({ page: Number(page) || 1, limit: Number(limit) || 30, productId: productId ? Number(productId) : undefined, type, from, to }))
  },

  async getLowStock(req, reply) {
    return reply.send(await inventoryService.getLowStockProducts())
  },

  async getSnapshot(req, reply) {
    const { date } = req.query
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return reply.status(400).send({ error: "Parámetro 'date' requerido en formato YYYY-MM-DD" })
    }
    return reply.send(await inventoryService.getSnapshot(date))
  },
}
