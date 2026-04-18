import prisma from "../config/prisma.js"

const RESERVATION_INCLUDE = {
  createdBy:      { select: { id: true, name: true } },
  completedBy:    { select: { id: true, name: true } },
  cancelledBy:    { select: { id: true, name: true } },
  depositMethod:  { select: { id: true, name: true } },
  remainingMethod:{ select: { id: true, name: true } },
  refundMethod:   { select: { id: true, name: true } },
  items: {
    include: { product: { select: { id: true, name: true } } },
    orderBy: { id: "asc" },
  },
}

export const reservationService = {
  async create({ clientName, clientPhone, notes, scheduledAt, items, depositAmount, depositMethodId, createdByUserId }) {
    if (!Array.isArray(items) || items.length === 0) {
      throw { statusCode: 400, message: "Debes agregar al menos un servicio" }
    }

    // Validate all products exist and are SERVICE type
    const productIds = items.map(i => Number(i.productId))
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, active: true },
      select: { id: true, name: true, price: true, type: true },
    })
    if (products.length !== productIds.length) {
      throw { statusCode: 400, message: "Uno o más productos no encontrados" }
    }
    const nonService = products.filter(p => p.type !== "SERVICE")
    if (nonService.length > 0) {
      throw { statusCode: 400, message: `Solo se permiten productos de tipo servicio: ${nonService.map(p => p.name).join(", ")}` }
    }

    const productMap = Object.fromEntries(products.map(p => [p.id, p]))
    const totalAmount = items.reduce((sum, i) => sum + Number(productMap[Number(i.productId)].price) * Number(i.quantity), 0)

    if (Number(depositAmount) > totalAmount) {
      throw { statusCode: 400, message: "El abono no puede superar el total" }
    }

    const method = await prisma.paymentMethod.findUnique({ where: { id: depositMethodId } })
    if (!method) throw { statusCode: 400, message: "Método de pago no encontrado" }

    return prisma.reservation.create({
      data: {
        clientName: clientName.trim(),
        clientPhone: clientPhone?.trim() || null,
        notes: notes?.trim() || null,
        scheduledAt: new Date(scheduledAt),
        totalAmount,
        depositAmount: Number(depositAmount),
        depositMethodId,
        createdByUserId,
        items: {
          create: items.map(i => ({
            productId: Number(i.productId),
            quantity: Number(i.quantity),
            price: Number(productMap[Number(i.productId)].price),
          })),
        },
      },
      include: RESERVATION_INCLUDE,
    })
  },

  async getAll({ status, page = 1, limit = 20 } = {}) {
    const where = status ? { status } : {}
    const skip = (page - 1) * limit
    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: "asc" },
        include: RESERVATION_INCLUDE,
      }),
      prisma.reservation.count({ where }),
    ])
    return { reservations, total, page, limit }
  },

  async getById(id) {
    const r = await prisma.reservation.findUnique({ where: { id }, include: RESERVATION_INCLUDE })
    if (!r) throw { statusCode: 404, message: "Reserva no encontrada" }
    return r
  },

  // Completar reserva — requiere turno abierto
  async complete({ reservationId, shiftId, remainingMethodId, completedByUserId }) {
    const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } })
    if (!reservation) throw { statusCode: 404, message: "Reserva no encontrada" }
    if (reservation.status !== "PENDING") throw { statusCode: 409, message: "La reserva no está pendiente" }

    const shift = await prisma.shift.findUnique({ where: { id: shiftId } })
    if (!shift || shift.status !== "OPEN") throw { statusCode: 400, message: "Debe haber un turno abierto para completar la reserva" }

    const method = await prisma.paymentMethod.findUnique({ where: { id: remainingMethodId } })
    if (!method) throw { statusCode: 400, message: "Método de pago no encontrado" }

    const remainingAmount = Number(reservation.totalAmount) - Number(reservation.depositAmount)

    return prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        completedShiftId: shiftId,
        remainingAmount,
        remainingMethodId,
        completedByUserId,
      },
      include: RESERVATION_INCLUDE,
    })
  },

  // Cancelar reserva — requiere turno abierto
  // El abono NUNCA estuvo en caja, por eso:
  //   · La retención (lo que el negocio conserva) → ingreso al turno vía depositMethodId
  //   · El reembolso al cliente → sale del fondo del abono, NO afecta la caja
  // El shift.service calcula la retención automáticamente desde cancelledShiftId + refundPct
  async cancel({ reservationId, shiftId, refundPct, refundMethodId, cancelledByUserId }) {
    const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } })
    if (!reservation) throw { statusCode: 404, message: "Reserva no encontrada" }
    if (reservation.status !== "PENDING") throw { statusCode: 409, message: "La reserva no está pendiente" }

    const shift = await prisma.shift.findUnique({ where: { id: shiftId } })
    if (!shift || shift.status !== "OPEN") throw { statusCode: 400, message: "Debe haber un turno abierto para cancelar la reserva" }

    const pct = Math.min(100, Math.max(0, Number(refundPct) || 0))
    const refundAmount = Math.round(Number(reservation.depositAmount) * pct) / 100

    // refundMethodId puede ser null si el reembolso es 0%
    if (refundAmount > 0) {
      const method = await prisma.paymentMethod.findUnique({ where: { id: refundMethodId } })
      if (!method) throw { statusCode: 400, message: "Método de pago de devolución no encontrado" }
    }

    return prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledShiftId: shiftId,
        refundPct: pct,
        refundAmount,
        refundMethodId: refundAmount > 0 ? refundMethodId : null,
        cancelledByUserId,
      },
      include: RESERVATION_INCLUDE,
    })
  },
}
