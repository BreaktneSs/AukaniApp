import { expenseService } from "../services/expense.service.js"
import { auditService } from "../services/audit.service.js"

const ip = (req) => req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip

export const expenseController = {
  async create(req, reply) {
    const { shiftId, concept, amount, paymentMethodId } = req.body
    if (!shiftId || !concept?.trim() || !amount || !paymentMethodId) {
      return reply.code(400).send({ error: "shiftId, concept, amount y paymentMethodId son requeridos" })
    }
    if (Number(amount) <= 0) {
      return reply.code(400).send({ error: "El monto debe ser mayor a 0" })
    }
    const expense = await expenseService.create({
      shiftId: Number(shiftId),
      userId: req.user.id,
      concept,
      amount: Number(amount),
      paymentMethodId: Number(paymentMethodId),
    })
    await auditService.log({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: "EXPENSE_CREATE", entity: "EXPENSE",
      entityId: expense.id, entityLabel: concept.trim(),
      newValues: { shiftId: Number(shiftId), amount: Number(amount), paymentMethod: expense.paymentMethod?.name },
      ip: ip(req),
    })
    reply.code(201).send(expense)
  },

  async getByShift(req, reply) {
    const expenses = await expenseService.getByShift(Number(req.params.shiftId))
    reply.send(expenses)
  },

  async delete(req, reply) {
    const expenseId = Number(req.params.id)
    const expense = await expenseService.delete(expenseId)
    await auditService.log({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: "EXPENSE_DELETE", entity: "EXPENSE",
      entityId: expenseId, entityLabel: expense.concept,
      newValues: { amount: Number(expense.amount) },
      ip: ip(req),
    })
    reply.code(204).send()
  },
}
