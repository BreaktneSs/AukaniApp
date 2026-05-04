import { accountController } from "../controllers/account.controller.js"
import { allRoles } from "../middlewares/auth.js"

export async function accountRoutes(fastify) {
  fastify.post("/accounts",                    { preHandler: allRoles }, accountController.create)
  fastify.get("/accounts/shift/:shiftId",      { preHandler: allRoles }, accountController.getByShift)
  fastify.patch("/accounts/:id/close",         { preHandler: allRoles }, accountController.close)
  fastify.post("/accounts/:id/items",           { preHandler: allRoles }, accountController.addCashierItem)
  fastify.patch("/accounts/:id/items/:itemId",  { preHandler: allRoles }, accountController.updateItem)
  fastify.delete("/accounts/:id/items/:itemId", { preHandler: allRoles }, accountController.removeItem)
}
