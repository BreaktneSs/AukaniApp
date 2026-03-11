import { orderService } from "../services/order.service.js"

export const orderController = {
  async createSale(req, reply) {
    const { items } = req.body
    const order = await orderService.createSale(items)
    return reply.status(201).send(order)
  },

  async getAll(req, reply) {
    const { page, limit, from, to } = req.query
    const result = await orderService.getAll({
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      from,
      to,
    })
    return reply.send(result)
  },

  async getById(req, reply) {
    const order = await orderService.getById(Number(req.params.id))
    if (!order) return reply.status(404).send({ error: "Venta no encontrada" })
    return reply.send(order)
  },

  async getDailySummary(req, reply) {
    const summary = await orderService.getDailySummary()
    return reply.send(summary)
  },
}