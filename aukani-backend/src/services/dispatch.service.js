import prisma from "../config/prisma.js"
import { accountService } from "./account.service.js"

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

  async createDispatch({ subShiftId, items, payments = [], accountId = null }) {
    const subShift = await prisma.subShift.findUnique({
      where: { id: subShiftId },
      include: { parentShift: true },
    })
    if (!subShift || subShift.status !== "OPEN") {
      throw { statusCode: 400, message: "No tienes un turno de mesero abierto" }
    }

    // Validar que la cuenta pertenezca a la caja principal vinculada
    if (accountId) {
      const account = await prisma.account.findUnique({ where: { id: accountId } })
      if (!account || account.status !== "OPEN" || account.shiftId !== subShift.parentShiftId) {
        throw { statusCode: 400, message: "Cuenta no válida o cerrada" }
      }
    }

    return prisma.$transaction(async (tx) => {
      let total = 0
      const dispatchItems = []

      // 1 — Validar productos y calcular total (sin tocar stock aún)
      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } })
        if (!product || !product.active) throw { statusCode: 404, message: `Producto no encontrado: ${item.productId}` }

        const isService = product.type === "SERVICE"
        if (!isService && product.stock < item.quantity) throw { statusCode: 409, message: `Stock insuficiente para "${product.name}"` }

        total += Number(product.price) * item.quantity
        dispatchItems.push({ productId: product.id, quantity: item.quantity, price: product.price, isService })
      }

      // 2 — Validar pago ANTES de descontar stock
      let cashReceived = 0
      let change = 0
      let netPayments = []

      if (!accountId) {
        const totalReceived = payments.reduce((s, p) => s + Number(p.amount), 0)
        if (totalReceived < total) throw { statusCode: 400, message: `Pago insuficiente. Total: $${total}, Recibido: $${totalReceived}` }

        const cashMethod = await tx.paymentMethod.findFirst({ where: { name: "Efectivo", active: true } })
        const cashPayment = payments.find(p => p.paymentMethodId === cashMethod?.id)
        const cashAmount = Number(cashPayment?.amount || 0)

        netPayments = payments.map((p, idx, arr) => {
          if (arr.length === 1) return { paymentMethodId: p.paymentMethodId, amount: total }
          if (idx === arr.length - 1) {
            const prev = arr.slice(0, idx).reduce((s, x) => s + Number(x.amount), 0)
            return { paymentMethodId: p.paymentMethodId, amount: Math.max(0, total - prev) }
          }
          return { paymentMethodId: p.paymentMethodId, amount: Number(p.amount) }
        }).filter(p => p.amount > 0)

        const netCash = netPayments.find(p => p.paymentMethodId === cashMethod?.id)?.amount || 0
        cashReceived = totalReceived
        change = Math.max(0, cashAmount - netCash)
      }

      // 3 — Descontar stock solo después de validar todo
      for (const item of dispatchItems) {
        if (!item.isService) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          })
        }
      }

      const dispatch = await tx.dispatchOrder.create({
        data: {
          subShiftId,
          accountId: accountId || null,
          total,
          cashReceived,
          change,
          items: { create: dispatchItems.map(({ productId, quantity, price }) => ({ productId, quantity, price })) },
          ...(netPayments.length > 0 && { payments: { create: netPayments } }),
        },
        include: {
          items: { include: { product: { select: { id: true, name: true, imageUrl: true } } } },
          payments: { include: { paymentMethod: true } },
          subShift: { include: { user: { select: { id: true, name: true } } } },
          account: { select: { id: true, name: true } },
        },
      })

      return dispatch
    })
  },

  async confirmDispatch(dispatchId, cashierId) {
    const dispatch = await prisma.dispatchOrder.findUnique({
      where: { id: dispatchId },
      include: {
        items: { include: { product: true } },
        payments: { include: { paymentMethod: true } },
        subShift: { include: { parentShift: true } },
        account: { select: { id: true, name: true } },
      },
    })

    if (!dispatch) throw { statusCode: 404, message: "Pedido no encontrado" }
    if (dispatch.status !== "PENDING") throw { statusCode: 409, message: "El pedido ya fue procesado" }

    if (dispatch.subShift.parentShift.userId !== cashierId) {
      throw { statusCode: 403, message: "No tienes permiso para despachar este pedido" }
    }

    // ── Despacho a cuenta ──────────────────────────────────
    if (dispatch.accountId) {
      return prisma.$transaction(async (tx) => {
        // Registrar movimientos de inventario
        for (const item of dispatch.items) {
          if (item.product.type !== "SERVICE") {
            await tx.inventoryMovement.create({
              data: {
                productId: item.productId,
                userId: cashierId,
                type: "SALE",
                quantity: item.quantity,
                reason: `Cuenta "${dispatch.account.name}" - Despacho #${dispatchId}`,
              },
            })
          }
        }

        // Agregar items a la cuenta (upsert)
        await accountService.addItems(
          dispatch.accountId,
          dispatch.items.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price })),
          tx
        )

        const updatedDispatch = await tx.dispatchOrder.update({
          where: { id: dispatchId },
          data: { status: "DISPATCHED", dispatchedAt: new Date() },
          include: {
            items: { include: { product: { select: { id: true, name: true } } } },
            subShift: { include: { user: { select: { id: true, name: true } } } },
            account: { select: { id: true, name: true } },
          },
        })

        return { dispatch: updatedDispatch, accountId: dispatch.accountId }
      })
    }

    // ── Despacho normal → crea Order ──────────────────────
    return prisma.$transaction(async (tx) => {
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
            create: dispatch.payments.map(p => ({
              paymentMethodId: p.paymentMethodId,
              amount: p.amount,
            })),
          },
        },
      })

      for (const item of dispatch.items) {
        if (item.product.type !== "SERVICE") {
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
      }

      const updatedDispatch = await tx.dispatchOrder.update({
        where: { id: dispatchId },
        data: { status: "DISPATCHED", dispatchedAt: new Date() },
        include: {
          items: { include: { product: { select: { id: true, name: true } } } },
          subShift: { include: { user: { select: { id: true, name: true } } } },
          account: { select: { id: true, name: true } },
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
      // Restaurar stock solo para productos físicos
      for (const item of dispatch.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } })
        if (product && product.type !== "SERVICE") {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          })
        }
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
        account: { select: { id: true, name: true } },
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
        account: { select: { id: true, name: true } },
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