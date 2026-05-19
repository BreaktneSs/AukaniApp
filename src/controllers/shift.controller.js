import { shiftService } from "../services/shift.service.js"
import { auditService } from "../services/audit.service.js"

const ip = (req) => req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip
const deviceId = (req) => req.headers["x-device-id"] || null
const deviceIp = (req) => ip(req)

export const shiftController = {
  async open(req, reply) {
    const shift = await shiftService.openShift(
      req.user.id,
      req.body.openingCash,
      deviceId(req),
      deviceIp(req),
    )
    auditService.log({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: "SHIFT_OPEN", entity: "SHIFT", entityId: shift.id,
      entityLabel: `Turno #${shift.id}`,
      newValues: { openingCash: shift.openingCash, deviceId: shift.deviceId },
      ip: ip(req),
    })
    return reply.status(201).send(shift)
  },

  async close(req, reply) {
    const shift = await shiftService.closeShift(
      Number(req.params.id),
      req.user.id,
      req.user.role,
      req.body,
    )
    auditService.log({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: "SHIFT_CLOSE", entity: "SHIFT", entityId: shift.id,
      entityLabel: `Turno #${shift.id}`,
      newValues: { closingCash: shift.closingCash, difference: shift.difference },
      ip: ip(req),
    })
    return reply.send(shift)
  },

  async getMine(req, reply) {
    const shift = await shiftService.getOpenShift(req.user.id)
    if (!shift) return reply.status(404).send({ error: "No tienes un turno abierto" })
    return reply.send(shift)
  },

  async getActive(req, reply) {
    const did = deviceId(req)
    if (!did) return reply.status(400).send({ error: "Dispositivo no identificado" })
    const shift = await shiftService.getActiveForDevice(req.user.id, did)
    if (!shift) return reply.status(404).send({ error: "No hay turno abierto en este dispositivo" })
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
