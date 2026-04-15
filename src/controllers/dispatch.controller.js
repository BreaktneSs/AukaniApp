import { dispatchService } from "../services/dispatch.service.js"
import { auditService } from "../services/audit.service.js"

const ip = (req) => req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip

export const dispatchController = {

  async getMySubShift(req, reply) {
    const sub = await dispatchService.getOpenSubShift(req.user.id)
    if (!sub) return reply.status(404).send({ error: "No tienes un turno de mesero abierto" })
    return reply.send(sub)
  },

  async openSubShift(req, reply) {
    const { parentShiftId } = req.body
    const sub = await dispatchService.openSubShift(req.user.id, parentShiftId)
    auditService.log({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: "SUBSHIFT_OPEN", entity: "SUBSHIFT", entityId: sub.id,
      entityLabel: `Caja remota #${sub.id}`,
      newValues: { parentShiftId },
      ip: ip(req),
    })
    return reply.status(201).send(sub)
  },

  async closeSubShift(req, reply) {
    const sub = await dispatchService.closeSubShift(Number(req.params.id), req.user.id)
    auditService.log({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: "SUBSHIFT_CLOSE", entity: "SUBSHIFT", entityId: sub.id,
      entityLabel: `Caja remota #${sub.id}`,
      ip: ip(req),
    })
    return reply.send(sub)
  },

  async getOpenShifts(req, reply) {
    const shifts = await dispatchService.getOpenShifts()
    return reply.send(shifts)
  },

  async getActiveSubShifts(req, reply) {
    const subs = await dispatchService.getActiveSubShifts(Number(req.params.shiftId))
    return reply.send(subs)
  },

  async createDispatch(req, reply) {
    const { subShiftId, items, payments, accountId } = req.body
    const dispatch = await dispatchService.createDispatch({ subShiftId, items, payments, accountId })
    auditService.log({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: "DISPATCH_CREATE", entity: "DISPATCH", entityId: dispatch.id,
      entityLabel: `Despacho #${dispatch.id}`,
      newValues: { total: dispatch.total, subShiftId, itemCount: items.length },
      ip: ip(req),
    })
    return reply.status(201).send(dispatch)
  },

  async getPendingDispatches(req, reply) {
    const { shiftId } = req.params
    const dispatches = await dispatchService.getPendingDispatches(Number(shiftId))
    return reply.send(dispatches)
  },

  async getDispatchHistory(req, reply) {
    const { shiftId } = req.params
    const history = await dispatchService.getDispatchHistory(Number(shiftId))
    return reply.send(history)
  },

  async confirmDispatch(req, reply) {
    const result = await dispatchService.confirmDispatch(Number(req.params.id), req.user.id)
    auditService.log({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: "DISPATCH_CONFIRM", entity: "DISPATCH", entityId: result.dispatch?.id,
      entityLabel: `Despacho #${result.dispatch?.id}`,
      newValues: { status: "DISPATCHED", orderId: result.order?.id },
      ip: ip(req),
    })
    return reply.send(result)
  },

  async cancelDispatch(req, reply) {
    const result = await dispatchService.cancelDispatch(Number(req.params.id), req.user.id)
    auditService.log({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: "DISPATCH_CANCEL", entity: "DISPATCH", entityId: result.id,
      entityLabel: `Despacho #${result.id}`,
      newValues: { status: "CANCELLED" },
      ip: ip(req),
    })
    return reply.send(result)
  },
}
