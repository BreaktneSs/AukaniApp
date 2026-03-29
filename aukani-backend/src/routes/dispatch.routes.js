import { dispatchController } from "../controllers/dispatch.controller.js"
import { allRoles, adminOrJefe } from "../middlewares/auth.js"

export async function dispatchRoutes(fastify) {
  // Sub-turnos — cualquier rol puede abrir/cerrar
  fastify.get("/subshifts/mine",            { preHandler: allRoles }, dispatchController.getMySubShift)
  fastify.post("/subshifts/open",           { preHandler: allRoles }, dispatchController.openSubShift)
  fastify.patch("/subshifts/:id/close",     { preHandler: allRoles }, dispatchController.closeSubShift)

  // Cajas abiertas disponibles para vincular
  fastify.get("/subshifts/open-shifts",     { preHandler: allRoles }, dispatchController.getOpenShifts)

  // Sub-turnos activos de una caja (para que el cajero vea sus meseros)
  fastify.get("/subshifts/shift/:shiftId",  { preHandler: allRoles }, dispatchController.getActiveSubShifts)

  // Pedidos de despacho
  fastify.post("/dispatches",               { preHandler: allRoles }, dispatchController.createDispatch)
  fastify.get("/dispatches/pending/:shiftId",  { preHandler: allRoles }, dispatchController.getPendingDispatches)
  fastify.get("/dispatches/history/:shiftId",  { preHandler: allRoles }, dispatchController.getDispatchHistory)
  fastify.patch("/dispatches/:id/confirm",  { preHandler: allRoles }, dispatchController.confirmDispatch)
  fastify.patch("/dispatches/:id/cancel",   { preHandler: allRoles }, dispatchController.cancelDispatch)
}