import { shiftService } from "../services/shift.service.js"

export const shiftController = {
  async open(req, reply) {
    const shift = await shiftService.openShift(req.user.id, req.body.openingCash)
    return reply.status(201).send(shift)
  },

  async close(req, reply) {
    const shift = await shiftService.closeShift(Number(req.params.id), req.user.id, req.body)
    return reply.send(shift)
  },

  async getMine(req, reply) {
    const shift = await shiftService.getOpenShift(req.user.id)
    if (!shift) return reply.status(404).send({ error: "No tienes un turno abierto" })
    return reply.send(shift)
  },

  async getAll(req, reply) {
    const { page, limit, userId } = req.query
    return reply.send(await shiftService.getAll({ page: Number(page) || 1, limit: Number(limit) || 20, userId: userId ? Number(userId) : undefined }))
  },

  async getById(req, reply) {
    const shift = await shiftService.getById(Number(req.params.id))
    if (!shift) return reply.status(404).send({ error: "Turno no encontrado" })
    return reply.send(shift)
  },
}