import prisma from "../config/prisma.js"

export const shiftService = {
  async getOpenShift(userId) {
    const shift = await prisma.shift.findFirst({
      where: { userId, status: "OPEN" },
      include: {
        user: { select: { id: true, name: true } },
        shiftPayments: { include: { paymentMethod: true } },
        _count: { select: { orders: true } },
        orders: {
          where: { status: { in: ["COMPLETED", "PARTIAL_REFUND", "REFUNDED"] } },
          select: {
            payments: {
              select: {
                amount: true,
                paymentMethod: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    })

    if (!shift) return null

    // Calcular shiftPayments en tiempo real desde las órdenes
    const livePaymentTotals = {}
    for (const order of shift.orders || []) {
      for (const payment of order.payments || []) {
        const id = payment.paymentMethod?.id
        if (!livePaymentTotals[id]) {
          livePaymentTotals[id] = { total: 0, paymentMethod: payment.paymentMethod }
        }
        livePaymentTotals[id].total += Number(payment.amount)
      }
    }

    const liveShiftPayments = Object.entries(livePaymentTotals).map(([id, data]) => ({
      id: `live-${id}`,
      paymentMethodId: Number(id),
      total: data.total,
      paymentMethod: data.paymentMethod,
    }))

    const { orders, ...rest } = shift
    return { ...rest, shiftPayments: liveShiftPayments }
  },

  async openShift(userId, openingCash) {
    const existing = await this.getOpenShift(userId)
    if (existing) throw { statusCode: 409, message: "Ya tienes un turno abierto" }
    return prisma.shift.create({ data: { userId, openingCash } })
  },

  async closeShift(shiftId, userId, { closingCash, notes }) {
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        orders: { where: { status: { in: ["COMPLETED", "PARTIAL_REFUND", "REFUNDED"] } }, include: { payments: true } },
        shiftPayments: true,
      },
    })

    if (!shift) throw { statusCode: 404, message: "Turno no encontrado" }
    if (shift.userId !== userId) throw { statusCode: 403, message: "No puedes cerrar el turno de otro cajero" }
    if (shift.status === "CLOSED") throw { statusCode: 409, message: "El turno ya está cerrado" }

    // Calcular totales por método de pago desde las órdenes reales
    const paymentTotals = {}
    for (const order of shift.orders) {
      for (const payment of order.payments) {
        paymentTotals[payment.paymentMethodId] = (paymentTotals[payment.paymentMethodId] || 0) + Number(payment.amount)
      }
    }

    // Total esperado en efectivo
    const cashMethod = await prisma.paymentMethod.findFirst({ where: { name: "Efectivo" } })
    const cashSales = paymentTotals[cashMethod?.id] || 0
    const expectedCash = Number(shift.openingCash) + cashSales
    const difference = Number(closingCash) - expectedCash

    const shiftPaymentData = Object.entries(paymentTotals).map(([methodId, total]) => ({
      shiftId,
      paymentMethodId: Number(methodId),
      total,
    }))

    // Cerrar sub-turnos (cajas remotas) asociados a esta caja
    const openSubShifts = await prisma.subShift.findMany({
      where: { parentShiftId: shiftId, status: "OPEN" },
      select: { id: true },
    })

    const [closedShift] = await prisma.$transaction([
      // Cerrar la caja principal
      prisma.shift.update({
        where: { id: shiftId },
        data: { status: "CLOSED", closingCash, expectedCash, difference, notes, closedAt: new Date() },
        include: {
          shiftPayments: { include: { paymentMethod: true } },
          user: { select: { id: true, name: true } },
        },
      }),
      // Cerrar todos los sub-turnos abiertos
      prisma.subShift.updateMany({
        where: { parentShiftId: shiftId, status: "OPEN" },
        data: { status: "CLOSED", closedAt: new Date() },
      }),
      // Cancelar pedidos pendientes de despacho de esas cajas remotas
      prisma.dispatchOrder.updateMany({
        where: {
          subShiftId: { in: openSubShifts.map(s => s.id) },
          status: "PENDING",
        },
        data: { status: "CANCELLED" },
      }),
      // Upsert shiftPayments
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
          // Para turnos abiertos: calcular ventas en tiempo real desde las órdenes
          orders: {
            where: { status: { in: ["COMPLETED", "PARTIAL_REFUND", "REFUNDED"] } },
            select: {
              payments: {
                select: {
                  amount: true,
                  paymentMethod: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      }),
      prisma.shift.count({ where }),
    ])

    // Enriquecer cada turno con totales calculados en tiempo real
    const enriched = shifts.map(shift => {
      // Si está cerrado, usar shiftPayments ya guardados
      if (shift.status === "CLOSED") {
        const { orders, ...rest } = shift
        return rest
      }

      // Si está abierto, calcular desde las órdenes actuales
      const livePaymentTotals = {}
      for (const order of shift.orders || []) {
        for (const payment of order.payments || []) {
          const key = payment.paymentMethod?.name || "Otro"
          const methodId = payment.paymentMethod?.id
          if (!livePaymentTotals[methodId]) {
            livePaymentTotals[methodId] = { total: 0, paymentMethod: payment.paymentMethod }
          }
          livePaymentTotals[methodId].total += Number(payment.amount)
        }
      }

      const liveShiftPayments = Object.entries(livePaymentTotals).map(([id, data]) => ({
        id: `live-${id}`,
        shiftId: shift.id,
        paymentMethodId: Number(id),
        total: data.total,
        paymentMethod: data.paymentMethod,
      }))

      const { orders, ...rest } = shift
      return { ...rest, shiftPayments: liveShiftPayments }
    })

    return { shifts: enriched, total, page, limit }
  },

  async getById(id) {
    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true } },
        shiftPayments: { include: { paymentMethod: true } },
        orders: {
          orderBy: { createdAt: "desc" },
          include: {
            items: { include: { product: { select: { name: true } } } },
            payments: { include: { paymentMethod: true } },
          },
        },
      },
    })

    if (!shift) return null

    // Si está abierto, calcular shiftPayments en tiempo real
    if (shift.status === "OPEN") {
      const livePaymentTotals = {}
      for (const order of shift.orders.filter(o => ["COMPLETED", "PARTIAL_REFUND", "REFUNDED"].includes(o.status))) {
        for (const payment of order.payments) {
          const id = payment.paymentMethod?.id
          if (!livePaymentTotals[id]) {
            livePaymentTotals[id] = { total: 0, paymentMethod: payment.paymentMethod }
          }
          livePaymentTotals[id].total += Number(payment.amount)
        }
      }
      shift.shiftPayments = Object.entries(livePaymentTotals).map(([id, data]) => ({
        id: `live-${id}`,
        paymentMethodId: Number(id),
        total: data.total,
        paymentMethod: data.paymentMethod,
      }))
    }

    return shift
  },
}