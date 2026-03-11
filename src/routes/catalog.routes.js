import { categoryController, paymentMethodController } from "../controllers/catalog.controller.js"
import { allRoles, adminOrJefe } from "../middlewares/auth.js"

export async function catalogRoutes(fastify) {
  // Categorías
  fastify.get("/categories",        { preHandler: allRoles },    categoryController.getAll)
  fastify.post("/categories",       { preHandler: adminOrJefe }, categoryController.create)
  fastify.put("/categories/:id",    { preHandler: adminOrJefe }, categoryController.update)
  fastify.delete("/categories/:id", { preHandler: adminOrJefe }, categoryController.delete)

  // Métodos de pago
  fastify.get("/payment-methods",        { preHandler: allRoles },    paymentMethodController.getAll)
  fastify.post("/payment-methods",       { preHandler: adminOrJefe }, paymentMethodController.create)
  fastify.put("/payment-methods/:id",    { preHandler: adminOrJefe }, paymentMethodController.update)
  fastify.delete("/payment-methods/:id", { preHandler: adminOrJefe }, paymentMethodController.delete)
}