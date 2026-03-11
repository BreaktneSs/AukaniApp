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

      const order = await tx.order.create({
        data: {
          total, userId, shiftId,
          items: { create: orderItems },
          payments: { create: payments.map((p) => ({ paymentMethodId: p.paymentMethodId, amount: p.amount })) },
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