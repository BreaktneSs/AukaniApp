import prisma from "../config/prisma.js"

export const expenseService = {
  async create({ shiftId, userId, concept, amount, paymentMethodId }) {
    const shift = await prisma.shift.findUnique({ where: { id: shiftId } })
    if (!shift || shift.status !== "OPEN") {
      throw { statusCode: 400, message: "El turno no está abierto" }
    }
    const method = await prisma.paymentMethod.findUnique({ where: { id: paymentMethodId } })
    if (!method) throw { statusCode: 400, message: "Método de pago no encontrado" }

    return prisma.expense.create({
      data: { shiftId, userId, concept: concept.trim(), amount, paymentMethodId },
      include: {
        user: { select: { id: true, name: true } },
        paymentMethod: { select: { id: true, name: true } },
      },
    })
  },

  async getByShift(shiftId) {
    return prisma.expense.findMany({
      where: { shiftId },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true } },
        paymentMethod: { select: { id: true, name: true } },
      },
    })
  },

  async delete(expenseId) {
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: { shift: { select: { status: true } } },
    })
    if (!expense) throw { statusCode: 404, message: "Egreso no encontrado" }
    if (expense.shift.status !== "OPEN") throw { statusCode: 409, message: "No se puede eliminar un egreso de un turno cerrado" }
    return prisma.expense.delete({ where: { id: expenseId } })
  },
}
