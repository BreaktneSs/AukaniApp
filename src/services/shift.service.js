import prisma from "../config/prisma.js"

const SHIFT_INCLUDE = {
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
  expenses: {
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true } },
      paymentMethod: { select: { id: true, name: true } },
    },
  },
  completedReservations: {
    where: { status: "COMPLETED" },
    select: {
      id: true,
      depositAmount: true,
      depositMethodId: true,
      depositMethod:  { select: { id: true, name: true } },
      remainingAmount: true,
      remainingMethodId: true,
      remainingMethod: { select: { id: true, name: true } },
    },
  },
  cancelledReservations: {
    where: { status: "CANCELLED" },
    select: {
      id: true,
      depositAmount: true,
      depositMethodId: true,
      depositMethod:  { select: { id: true, name: true } },
      refundPct: true,
    },
  },
}

function enrichOpenShift(shift) {
  if (!shift) return null

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

  for (const res of shift.completedReservations || []) {
    if (res.depositMethodId && res.depositAmount) {
      const id = res.depositMethodId
      if (!livePaymentTotals[id]) livePaymentTotals[id] = { total: 0, paymentMethod: res.depositMethod }
      livePaymentTotals[id].total += Number(res.depositAmount)
    }
    if (res.remainingMethodId && res.remainingAmount) {
      const id = res.remainingMethodId
      if (!livePaymentTotals[id]) livePaymentTotals[id] = { total: 0, paymentMethod: res.remainingMethod }
      livePaymentTotals[id].total += Number(res.remainingAmount)
    }
  }

  for (const res of shift.cancelledReservations || []) {
    const retentionPct = 100 - (res.refundPct ?? 0)
    const retentionAmount = Math.round(Number(res.depositAmount) * retentionPct) / 100
    if (retentionAmount > 0 && res.depositMethodId) {
      const id = res.depositMethodId
      if (!livePaymentTotals[id]) livePaymentTotals[id] = { total: 0, paymentMethod: res.depositMethod }
      livePaymentTotals[id].total += retentionAmount
    }
  }

  const liveShiftPayments = Object.entries(livePaymentTotals).map(([id, data]) => ({
    id: `live-${id}`,
    paymentMethodId: Number(id),
    total: data.total,
    paymentMethod: data.paymentMethod,
  }))

  const { orders, expenses, completedReservations, cancelledReservations, ...rest } = shift
  return { ...rest, shiftPayments: liveShiftPayments, expenses: expenses || [] }
}

export const shiftService = {
  async getOpenShift(userId) {
    const shift = await prisma.shift.findFirst({
      where: { userId, status: "OPEN" },
      include: SHIFT_INCLUDE,
    })
    return enrichOpenShift(shift)
  },

  async getOpenByDevice(deviceId) {
    const shift = await prisma.shift.findFirst({
      where: { deviceId, status: "OPEN" },
      include: SHIFT_INCLUDE,
    })
    return enrichOpenShift(shift)
  },

  async openShift(userId, openingCash, deviceId, deviceIp) {
    if (deviceId) {
      const existing = await this.getOpenByDevice(deviceId)
      if (existing) throw { statusCode: 409, message: "Ya hay un turno abierto en este dispositivo" }
    }
    return prisma.shift.create({ data: { userId, openingCash, deviceId: deviceId || null, deviceIp: deviceIp || null } })
  },

  async closeShift(shiftId, userId, role, { closingCash, notes }) {
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        orders: { where: { status: { in: ["COMPLETED", "PARTIAL_REFUND", "REFUNDED"] } }, include: { payments: true } },
        shiftPayments: true,
      },
    })

    if (!shift) throw { statusCode: 404, message: "Turno no encontrado" }
    if (shift.status === "CLOSED") throw { statusCode: 409, message: "El turno ya está cerrado" }

    const isAdmin = role === "ADMIN" || role === "JEFE"
    if (!isAdmin && shift.userId !== userId) {
      throw { statusCode: 403, message: "No puedes cerrar el turno de otro cajero" }
    }

    const paymentTotals = {}
    for (const order of shift.orders) {
      for (const payment of order.payments) {
        paymentTotals[payment.paymentMethodId] = (paymentTotals[payment.paymentMethodId] || 0) + Number(payment.amount)
      }
    }

    const completedReservations = await prisma.reservation.findMany({
      where: { completedShiftId: shiftId, status: "COMPLETED" },
      select: { depositAmount: true, depositMethodId: true, remainingAmount: true, remainingMethodId: true },
    })
    for (const res of completedReservations) {
      if (res.depositMethodId && res.depositAmount) {
        paymentTotals[res.depositMethodId] = (paymentTotals[res.depositMethodId] || 0) + Number(res.depositAmount)
      }
      if (res.remainingMethodId && res.remainingAmount) {
        paymentTotals[res.remainingMethodId] = (paymentTotals[res.remainingMethodId] || 0) + Number(res.remainingAmount)
      }
    }

    const cancelledReservations = await prisma.reservation.findMany({
      where: { cancelledShiftId: shiftId, status: "CANCELLED" },
      select: { depositAmount: true, depositMethodId: true, refundPct: true },
    })
    for (const res of cancelledReservations) {
      const retentionPct = 100 - (res.refundPct ?? 0)
      const retentionAmount = Math.round(Number(res.depositAmount) * retentionPct) / 100
      if (retentionAmount > 0 && res.depositMethodId) {
        paymentTotals[res.depositMethodId] = (paymentTotals[res.depositMethodId] || 0) + retentionAmount
      }
    }

    const expenses = await prisma.expense.findMany({ where: { shiftId } })
    const cashMethod = await prisma.paymentMethod.findFirst({ where: { name: "Efectivo" } })
    const cashSales = paymentTotals[cashMethod?.id] || 0
    const cashExpenses = expenses
      .filter(e => e.paymentMethodId === cashMethod?.id)
      .reduce((s, e) => s + Number(e.amount), 0)
    const expectedCash = Number(shift.openingCash) + cashSales - cashExpenses
    const difference = Number(closingCash) - expectedCash

    const shiftPaymentData = Object.entries(paymentTotals).map(([methodId, total]) => ({
      shiftId,
      paymentMethodId: Number(methodId),
      total,
    }))

    const openSubShifts = await prisma.subShift.findMany({
      where: { parentShiftId: shiftId, status: "OPEN" },
      select: { id: true },
    })

    const [closedShift] = await prisma.$transaction([
      prisma.shift.update({
        where: { id: shiftId },
        data: { status: "CLOSED", closingCash, expectedCash, difference, notes, closedAt: new Date() },
        include: {
          shiftPayments: { include: { paymentMethod: true } },
          user: { select: { id: true, name: true } },
        },
      }),
      prisma.subShift.updateMany({
        where: { parentShiftId: shiftId, status: "OPEN" },
        data: { status: "CLOSED", closedAt: new Date() },
      }),
      prisma.dispatchOrder.updateMany({
        where: {
          subShiftId: { in: openSubShifts.map(s => s.id) },
          status: "PENDING",
        },
        data: { status: "CANCELLED" },
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

    const enriched = shifts.map(shift => {
      if (shift.status === "CLOSED") {
        const { orders, ...rest } = shift
        return rest
      }

      const livePaymentTotals = {}
      for (const order of shift.orders || []) {
        for (const payment of order.payments || []) {
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
        expenses: {
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { id: true, name: true } },
            paymentMethod: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!shift) return null

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
