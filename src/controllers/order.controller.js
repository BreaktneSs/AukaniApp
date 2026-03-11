import { orderService } from "../services/order.service.js"

export const orderController = {
  async createSale(req, reply) {
    const { items, payments, shiftId } = req.body
    const order = await orderService.createSale({ items, payments, userId: req.user.id, shiftId })
    return reply.status(201).send(order)
  },
  async cancel(req, reply) {
    return reply.send(await orderService.cancel(Number(req.params.id), req.user.id))
  },
  async getAll(req, reply) {
    const { page, limit, from, to, userId, shiftId } = req.query
    return reply.send(await orderService.getAll({ page: Number(page) || 1, limit: Number(limit) || 20, from, to, userId: userId ? Number(userId) : undefined, shiftId: shiftId ? Number(shiftId) : undefined }))
  },
  async getById(req, reply) {
    const order = await orderService.getById(Number(req.params.id))
    if (!order) return reply.status(404).send({ error: "Venta no encontrada" })
    return reply.send(order)
  },
  async getDailySummary(req, reply) {
    return reply.send(await orderService.getDailySummary())
  },
}