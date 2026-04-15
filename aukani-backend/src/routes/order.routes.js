import { orderController } from "../controllers/order.controller.js"
import { allRoles, adminOrJefe } from "../middlewares/auth.js"

export async function orderRoutes(fastify) {
  fastify.post("/sale",                    { preHandler: allRoles },    orderController.createSale)
  fastify.patch("/orders/:id/cancel",      { preHandler: adminOrJefe }, orderController.cancel)
  fastify.get("/orders",                   { preHandler: allRoles },    orderController.getAll)
  fastify.get("/orders/summary/daily",      { preHandler: adminOrJefe }, orderController.getDailySummary)
  fastify.get("/orders/accounting",         { preHandler: adminOrJefe }, orderController.getAccountingReport)
  fastify.get("/orders/:id",               { preHandler: allRoles },    orderController.getById)
  fastify.patch("/orders/:id/refund",      { preHandler: allRoles },    orderController.refund)
}