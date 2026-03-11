import { shiftController } from "../controllers/shift.controller.js"
import { allRoles, adminOrJefe } from "../middlewares/auth.js"

export async function shiftRoutes(fastify) {
  fastify.post("/shifts/open",      { preHandler: allRoles },    shiftController.open)
  fastify.patch("/shifts/:id/close",{ preHandler: allRoles },    shiftController.close)
  fastify.get("/shifts/mine",       { preHandler: allRoles },    shiftController.getMine)
  fastify.get("/shifts",            { preHandler: adminOrJefe }, shiftController.getAll)
  fastify.get("/shifts/:id",        { preHandler: adminOrJefe }, shiftController.getById)
}