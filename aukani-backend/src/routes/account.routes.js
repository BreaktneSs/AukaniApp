import { accountController } from "../controllers/account.controller.js"
import { allRoles } from "../middlewares/auth.js"

export async function accountRoutes(fastify) {
  fastify.post("/accounts",                    { preHandler: allRoles }, accountController.create)
  fastify.get("/accounts/shift/:shiftId",      { preHandler: allRoles }, accountController.getByShift)
  fastify.patch("/accounts/:id/close",         { preHandler: allRoles }, accountController.close)
}
