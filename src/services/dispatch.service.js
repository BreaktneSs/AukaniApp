import prisma from "../config/prisma.js"

export const dispatchService = {

  // ── Sub-turnos ────────────────────────────────────────────

  async getOpenSubShift(userId) {
    return prisma.subShift.findFirst({
      where: { userId, status: "OPEN" },
      include: {
        user: { select: { id: true, name: true } },
        parentShift: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    })
  },

  async openSubShift(userId, parentShiftId) {
    // Validar que no tenga ya un sub-turno abierto
    const existing = await this.getOpenSubShift(userId)
    if (existing) throw { statusCode: 409, message: "Ya tienes un turno abierto" }

    // Validar que la caja principal esté abierta
    const parentShift = await prisma.shift.findUnique({ where: { id: parentShiftId } })
    if (!parentShift || parentShift.status !== "OPEN") {
      throw { statusCode: 400, message: "La caja principal no está abierta" }
    }

    return prisma.subShift.create({
      data: { userId, parentShiftId },
      include: {
        user: { select: { id: true, name: true } },
        parentShift: { include: { user: { select: { id: true, name: true } } } },
      },
    })
  },

  async closeSubShift(subShiftId, userId) {
    const sub = await prisma.subShift.findUnique({ where: { id: subShiftId } })
    if (!sub) throw { statusCode: 404, message: "Sub-turno no encontrado" }
    if (sub.userId !== userId) throw { statusCode: 403, message: "No puedes cerrar el turno de otro" }
    if (sub.status === "CLOSED") throw { statusCode: 409, message: "El turno ya está cerrado" }

    // Cancelar pedidos pendientes al cerrar
    await prisma.dispatchOrder.updateMany({
      where: { subShiftId, status: "PENDING" },
      data: { status: "CANCELLED" },
    })

    return prisma.subShift.update({
      where: { id: subShiftId },
      data: { status: "CLOSED", closedAt: new Date() },
    })
  },

  // ── Pedidos de despacho ───────────────────────────────────

  async createDispatch({ subShiftId, items, cashReceived }) {
    const subShift = await prisma.subShift.findUnique({
      where: { id: subShiftId },
      include: { parentShift: true },
    })
    if (!subShift || subShift.status !== "OPEN") {
      throw { statusCode: 400, message: "No tienes un turno de mesero abierto" }
    }

    // Calcular total y validar stock
    return prisma.$transaction(async (tx) => {
      let total = 0
      const dispatchItems = []

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } })
        if (!product || !product.active) throw { statusCode: 404, message: `Producto no encontrado: ${item.productId}` }
        if (product.stock < item.quantity) throw { statusCode: 409, message: `Stock insuficiente para "${product.name}"` }

        total += Number(product.price) * item.quantity
        dispatchItems.push({ productId: product.id, quantity: item.quantity, price: product.price })

        // Reservar stock inmediatamente
        await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: item.quantity } },
        })
      }

      const change = Number(cashReceived) - total
      if (change < 0) throw { statusCode: 400, message: `Dinero insuficiente. Total: $${total}, Recibido: $${cashReceived}` }

      const dispatch = await tx.dispatchOrder.create({
        data: {
          subShiftId,
          total,
          cashReceived,
          change,
          items: { create: dispatchItems },
        },
        include: {
          items: { include: { product: { select: { id: true, name: true, imageUrl: true } } } },
          subShift: { include: { user: { select: { id: true, name: true } } } },
        },
      })

      return dispatch
    })
  },

  async confirmDispatch(dispatchId, cashierId) {
    const dispatch = await prisma.dispatchOrder.findUnique({
      where: { id: dispatchId },
      include: {
        items: true,
        subShift: { include: { parentShift: true } },
      },
    })

    if (!dispatch) throw { statusCode: 404, message: "Pedido no encontrado" }
    if (dispatch.status !== "PENDING") throw { statusCode: 409, message: "El pedido ya fue procesado" }

    // Validar que el cajero sea dueño de la caja principal
    if (dispatch.subShift.parentShift.userId !== cashierId) {
      throw { statusCode: 403, message: "No tienes permiso para despachar este pedido" }
    }

    return prisma.$transaction(async (tx) => {
      // Crear la orden real en la caja principal
      const parentShiftId = dispatch.subShift.parentShiftId

      const order = await tx.order.create({
        data: {
          total: dispatch.total,
          userId: cashierId,
          shiftId: parentShiftId,
          items: {
            create: dispatch.items.map(i => ({
              productId: i.productId,
              quantity: i.quantity,
              price: i.price,
            })),
          },
          payments: {
            create: [{
              paymentMethodId: (await tx.paymentMethod.findFirst({ where: { name: "Efectivo", active: true } }))?.id || 1,
              amount: dispatch.total,
            }],
          },
        },
      })

      // Registrar movimientos de inventario
      for (const item of dispatch.items) {
        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            userId: cashierId,
            type: "SALE",
            quantity: item.quantity,
            reason: `Venta mesero - Despacho #${dispatchId}`,
          },
        })
      }

      // Marcar dispatch como despachado
      const updatedDispatch = await tx.dispatchOrder.update({
        where: { id: dispatchId },
        data: { status: "DISPATCHED", dispatchedAt: new Date() },
        include: {
          items: { include: { product: { select: { id: true, name: true } } } },
          subShift: { include: { user: { select: { id: true, name: true } } } },
        },
      })

      return { dispatch: updatedDispatch, order }
    })
  },

  async cancelDispatch(dispatchId, userId) {
    const dispatch = await prisma.dispatchOrder.findUnique({
      where: { id: dispatchId },
      include: { items: true, subShift: true },
    })
    if (!dispatch) throw { statusCode: 404, message: "Pedido no encontrado" }
    if (dispatch.status !== "PENDING") throw { statusCode: 409, message: "Solo se pueden cancelar pedidos pendientes" }

    return prisma.$transaction(async (tx) => {
      // Restaurar stock
      for (const item of dispatch.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        })
      }
      return tx.dispatchOrder.update({
        where: { id: dispatchId },
        data: { status: "CANCELLED" },
      })
    })
  },

  // Pedidos pendientes para una caja principal
  async getPendingDispatches(parentShiftId) {
    return prisma.dispatchOrder.findMany({
      where: {
        status: "PENDING",
        subShift: { parentShiftId },
      },
      orderBy: { createdAt: "asc" },
      include: {
        items: { include: { product: { select: { id: true, name: true, imageUrl: true } } } },
        subShift: { include: { user: { select: { id: true, name: true } } } },
      },
    })
  },

  // Historial de despachos de una caja
  async getDispatchHistory(parentShiftId, { limit = 30 } = {}) {
    return prisma.dispatchOrder.findMany({
      where: { subShift: { parentShiftId } },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        items: { include: { product: { select: { id: true, name: true } } } },
        subShift: { include: { user: { select: { id: true, name: true } } } },
      },
    })
  },

  // Cajas abiertas disponibles para vincular
  async getOpenShifts() {
    return prisma.shift.findMany({
      where: { status: "OPEN" },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { openedAt: "desc" },
    })
  },

  // Sub-turnos activos de una caja principal
  async getActiveSubShifts(parentShiftId) {
    return prisma.subShift.findMany({
      where: { parentShiftId, status: "OPEN" },
      include: {
        user: { select: { id: true, name: true } },
        dispatches: {
          where: { status: "PENDING" },
          select: { id: true },
        },
      },
    })
  },
}