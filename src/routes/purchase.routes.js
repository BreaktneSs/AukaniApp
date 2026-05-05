import { purchaseController } from "../controllers/purchase.controller.js"
import { allRoles, adminOrJefe } from "../middlewares/auth.js"

export async function purchaseRoutes(fastify) {
  fastify.post("/purchases",             { preHandler: allRoles },    purchaseController.create)
  fastify.post("/purchases/:id/returns", { preHandler: adminOrJefe }, purchaseController.createReturn)
  fastify.get("/purchases",              { preHandler: adminOrJefe }, purchaseController.getAll)
}
