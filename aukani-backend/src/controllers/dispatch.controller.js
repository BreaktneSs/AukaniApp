import { dispatchService } from "../services/dispatch.service.js"

export const dispatchController = {

  // Sub-turnos
  async getMySubShift(req, reply) {
    const sub = await dispatchService.getOpenSubShift(req.user.id)
    if (!sub) return reply.status(404).send({ error: "No tienes un turno de mesero abierto" })
    return reply.send(sub)
  },

  async openSubShift(req, reply) {
    const { parentShiftId } = req.body
    const sub = await dispatchService.openSubShift(req.user.id, parentShiftId)
    return reply.status(201).send(sub)
  },

  async closeSubShift(req, reply) {
    const sub = await dispatchService.closeSubShift(Number(req.params.id), req.user.id)
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

  // Pedidos
  async createDispatch(req, reply) {
    const { subShiftId, items, cashReceived } = req.body
    const dispatch = await dispatchService.createDispatch({ subShiftId, items, cashReceived })
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
    return reply.send(result)
  },

  async cancelDispatch(req, reply) {
    const result = await dispatchService.cancelDispatch(Number(req.params.id), req.user.id)
    return reply.send(result)
  },
}