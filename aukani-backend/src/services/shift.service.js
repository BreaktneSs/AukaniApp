import prisma from "../config/prisma.js"

export const shiftService = {
  async getOpenShift(userId) {
    return prisma.shift.findFirst({
      where: { userId, status: "OPEN" },
      include: {
        user: { select: { id: true, name: true } },
        shiftPayments: { include: { paymentMethod: true } },
        _count: { select: { orders: true } },
      },
    })
  },

  async openShift(userId, openingCash) {
    const existing = await this.getOpenShift(userId)
    if (existing) throw { statusCode: 409, message: "Ya tienes un turno abierto" }

    return prisma.shift.create({
      data: { userId, openingCash },
    })
  },

  async closeShift(shiftId, userId, { closingCash, notes }) {
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        orders: {
          where: { status: "COMPLETED" },
          include: { payments: true },
        },
        shiftPayments: true,
      },
    })

    if (!shift) throw { statusCode: 404, message: "Turno no encontrado" }
    if (shift.userId !== userId) throw { statusCode: 403, message: "No puedes cerrar el turno de otro cajero" }
    if (shift.status === "CLOSED") throw { statusCode: 409, message: "El turno ya está cerrado" }

    // Calcular totales por método de pago
    const paymentTotals = {}
    for (const order of shift.orders) {
      for (const payment of order.payments) {
        paymentTotals[payment.paymentMethodId] = (paymentTotals[payment.paymentMethodId] || 0) + Number(payment.amount)
      }
    }

    // Total esperado en efectivo
    const cashMethodId = await prisma.paymentMethod.findFirst({ where: { name: "Efectivo" } })
    const expectedCash = Number(shift.openingCash) + (paymentTotals[cashMethodId?.id] || 0)
    const difference = Number(closingCash) - expectedCash

    // Guardar resumen por método de pago en el turno
    const shiftPaymentData = Object.entries(paymentTotals).map(([methodId, total]) => ({
      shiftId,
      paymentMethodId: Number(methodId),
      total,
    }))

    const [closedShift] = await prisma.$transaction([
      prisma.shift.update({
        where: { id: shiftId },
        data: {
          status: "CLOSED",
          closingCash,
          expectedCash,
          difference,
          notes,
          closedAt: new Date(),
        },
        include: { shiftPayments: { include: { paymentMethod: true } }, user: { select: { name: true } } },
      }),
      ...shiftPaymentData.map((sp) =>
        prisma.shiftPayment.upsert({
          where: { shiftId_paymentMethodId: { shiftId: sp.shiftId, paymentMethodId: sp.paymentMethodId } },
          update: { total: sp.total },
          create: sp,
        })
      ),
    ])

    return closedShift
  },

  async getAll({ page = 1, limit = 20, userId } = {}) {
    const skip = (page - 1) * limit
    const where = userId ? { userId } : {}

    const [shifts, total] = await Promise.all([
      prisma.shift.findMany({
        where,
        skip,
        take: limit,
        orderBy: { openedAt: "desc" },
        include: {
          user: { select: { id: true, name: true } },
          shiftPayments: { include: { paymentMethod: true } },
          _count: { select: { orders: true } },
        },
      }),
      prisma.shift.count({ where }),
    ])

    return { shifts, total, page, limit }
  },

  async getById(id) {
    return prisma.shift.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true } },
        shiftPayments: { include: { paymentMethod: true } },
        orders: {
          include: { items: { include: { product: { select: { name: true } } } }, payments: { include: { paymentMethod: true } } },
        },
      },
    })
  },
}