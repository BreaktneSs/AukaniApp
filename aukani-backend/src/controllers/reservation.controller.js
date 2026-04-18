import { reservationService } from "../services/reservation.service.js"
import { auditService } from "../services/audit.service.js"

const ip = (req) => req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip

export const reservationController = {
  async create(req, reply) {
    const { clientName, clientPhone, notes, scheduledAt, items, depositAmount, depositMethodId } = req.body
    if (!clientName?.trim() || !scheduledAt || !items?.length || depositAmount === undefined || !depositMethodId) {
      return reply.code(400).send({ error: "clientName, scheduledAt, items, depositAmount y depositMethodId son requeridos" })
    }
    const reservation = await reservationService.create({
      clientName, clientPhone, notes, scheduledAt,
      items,
      depositAmount: Number(depositAmount),
      depositMethodId: Number(depositMethodId),
      createdByUserId: req.user.id,
    })
    await auditService.log({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: "RESERVATION_CREATE", entity: "RESERVATION",
      entityId: reservation.id, entityLabel: clientName.trim(),
      newValues: { totalAmount: Number(reservation.totalAmount), depositAmount: Number(depositAmount), scheduledAt, items: items.length },
      ip: ip(req),
    })
    reply.code(201).send(reservation)
  },

  async getAll(req, reply) {
    const { status, page, limit } = req.query
    reply.send(await reservationService.getAll({ status, page: Number(page) || 1, limit: Number(limit) || 20 }))
  },

  async getById(req, reply) {
    reply.send(await reservationService.getById(Number(req.params.id)))
  },

  async complete(req, reply) {
    const { shiftId, remainingMethodId } = req.body
    if (!shiftId || !remainingMethodId) {
      return reply.code(400).send({ error: "shiftId y remainingMethodId son requeridos" })
    }
    const reservation = await reservationService.complete({
      reservationId: Number(req.params.id),
      shiftId: Number(shiftId),
      remainingMethodId: Number(remainingMethodId),
      completedByUserId: req.user.id,
    })
    await auditService.log({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: "RESERVATION_COMPLETE", entity: "RESERVATION",
      entityId: reservation.id, entityLabel: reservation.clientName,
      newValues: { remainingAmount: Number(reservation.remainingAmount), shiftId: Number(shiftId) },
      ip: ip(req),
    })
    reply.send(reservation)
  },

  async cancel(req, reply) {
    const { shiftId, refundPct, refundMethodId } = req.body
    if (!shiftId || refundPct === undefined) {
      return reply.code(400).send({ error: "shiftId y refundPct son requeridos" })
    }
    const reservation = await reservationService.cancel({
      reservationId: Number(req.params.id),
      shiftId: Number(shiftId),
      refundPct: Number(refundPct),
      refundMethodId: Number(refundMethodId),
      cancelledByUserId: req.user.id,
    })
    await auditService.log({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: "RESERVATION_CANCEL", entity: "RESERVATION",
      entityId: reservation.id, entityLabel: reservation.clientName,
      newValues: { refundPct: Number(refundPct), refundAmount: Number(reservation.refundAmount), shiftId: Number(shiftId) },
      ip: ip(req),
    })
    reply.send(reservation)
  },
}
