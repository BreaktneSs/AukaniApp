import { orderController } from "../controllers/order.controller.js"

export async function orderRoutes(fastify) {
  fastify.post("/sale", orderController.createSale)
  fastify.get("/orders", orderController.getAll)
  fastify.get("/orders/summary/daily", orderController.getDailySummary)
  fastify.get("/orders/:id", orderController.getById)
}