import { reservationController } from "../controllers/reservation.controller.js"
import { allRoles } from "../middlewares/auth.js"

export async function reservationRoutes(fastify) {
  fastify.post("/reservations",                  { preHandler: allRoles }, reservationController.create)
  fastify.get("/reservations",                   { preHandler: allRoles }, reservationController.getAll)
  fastify.get("/reservations/:id",               { preHandler: allRoles }, reservationController.getById)
  fastify.patch("/reservations/:id/complete",    { preHandler: allRoles }, reservationController.complete)
  fastify.patch("/reservations/:id/cancel",      { preHandler: allRoles }, reservationController.cancel)
}
