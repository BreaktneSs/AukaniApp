import prisma from "../config/prisma.js"

export const orderService = {
  async createSale({ items, payments, userId, shiftId }) {
    const shift = await prisma.shift.findUnique({ where: { id: shiftId } })
    if (!shift || shift.status !== "OPEN") {
      throw { statusCode: 400, message: "Debes tener un turno abierto para realizar ventas" }
    }

    return prisma.$transaction(async (tx) => {
      let total = 0
      const orderItems = []

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } })
        if (!product || !product.active) throw { statusCode: 404, message: `Producto no encontrado: ID ${item.productId}` }
        if (product.stock < item.quantity) throw { statusCode: 409, message: `Stock insuficiente para "${product.name}". Disponible: ${product.stock}` }

        total += Number(product.price) * item.quantity
        orderItems.push({ productId: product.id, quantity: item.quantity, price: product.price })

        await tx.product.update({ where: { id: product.id }, data: { stock: { decrement: item.quantity } } })
        await tx.inventoryMovement.create({ data: { productId: product.id, userId, type: "SALE", quantity: item.quantity, reason: "Venta" } })
      }

      const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0)
      if (totalPaid < total) throw { statusCode: 400, message: `Pago insuficiente. Total: ${total}, Pagado: ${totalPaid}` }

      // Distribuir el total real de la venta entre los métodos de pago proporcionalmente.
      // Si el cliente paga $50.000 en efectivo por una venta de $30.000,
      // el negocio retiene $30.000 (no $50.000). El cambio NO entra a caja.
      const change = totalPaid - total
      const paymentsToRecord = payments
        .filter(p => Number(p.amount) > 0)
        .map((p, idx, arr) => {
          const paidAmount = Number(p.amount)
          // El cambio siempre sale del último método de pago con saldo
          // Si hay un solo método: registrar solo el total de la venta
          if (arr.length === 1) {
            return { paymentMethodId: p.paymentMethodId, amount: total }
          }
          // Si hay múltiples métodos: el cambio sale del último que tenga excedente
          if (idx === arr.length - 1) {
            const previousTotal = arr.slice(0, idx).reduce((s, x) => s + Number(x.amount), 0)
            const thisMethodNet = total - previousTotal
            return { paymentMethodId: p.paymentMethodId, amount: Math.max(0, thisMethodNet) }
          }
          // Los métodos anteriores al último se registran completos (asumiendo que no tienen cambio)
          return { paymentMethodId: p.paymentMethodId, amount: paidAmount }
        })
        .filter(p => p.amount > 0)

      const order = await tx.order.create({
        data: {
          total, userId, shiftId,
          items: { create: orderItems },
          payments: { create: paymentsToRecord },
        },
        include: {
          items: { include: { product: { select: { id: true, name: true } } } },
          payments: { include: { paymentMethod: true } },
        },
      })

      return { ...order, change: totalPaid - total }
    })
  },

  async cancel(orderId, userId) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } })
    if (!order) throw { statusCode: 404, message: "Venta no encontrada" }
    if (order.status !== "COMPLETED") throw { statusCode: 409, message: "La venta ya fue cancelada" }

    return prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } })
        await tx.inventoryMovement.create({ data: { productId: item.productId, userId, type: "ENTRY", quantity: item.quantity, reason: `Cancelación venta #${orderId}` } })
      }
      return tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } })
    })
  },

  async getAll({ page = 1, limit = 20, from, to, userId, shiftId } = {}) {
    const skip = (page - 1) * limit
    const where = {}
    if (from || to) { where.createdAt = {}; if (from) where.createdAt.gte = new Date(from); if (to) where.createdAt.lte = new Date(to) }
    if (userId) where.userId = userId
    if (shiftId) where.shiftId = shiftId

    const [orders, total] = await Promise.all([
      prisma.order.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" }, include: { user: { select: { id: true, name: true } }, payments: { include: { paymentMethod: true } }, _count: { select: { items: true } } } }),
      prisma.order.count({ where }),
    ])
    return { orders, total, page, limit }
  },

  async getById(id) {
    return prisma.order.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true } }, items: { include: { product: { select: { id: true, name: true, barcode: true } } } }, payments: { include: { paymentMethod: true } } },
    })
  },

  async getDailySummary() {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
    const where = { createdAt: { gte: today, lt: tomorrow }, status: "COMPLETED" }
    const [count, aggregate] = await Promise.all([prisma.order.count({ where }), prisma.order.aggregate({ where, _sum: { total: true } })])
    return { date: today.toISOString().split("T")[0], totalOrders: count, totalRevenue: Number(aggregate._sum.total ?? 0) }
  },
}