import prisma from "../config/prisma.js"

export const orderService = {
  async createSale(items) {
    return prisma.$transaction(async (tx) => {
      let total = 0
      const orderItems = []

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        })

        if (!product || !product.active) {
          throw { statusCode: 404, message: `Producto no encontrado: ID ${item.productId}` }
        }

        if (product.stock < item.quantity) {
          throw {
            statusCode: 409,
            message: `Stock insuficiente para "${product.name}". Disponible: ${product.stock}`,
          }
        }

        const lineTotal = Number(product.price) * item.quantity
        total += lineTotal

        orderItems.push({
          productId: product.id,
          quantity: item.quantity,
          price: product.price,
        })

        await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: item.quantity } },
        })
      }

      const order = await tx.order.create({
        data: {
          total,
          items: { create: orderItems },
        },
        include: {
          items: {
            include: { product: { select: { id: true, name: true } } },
          },
        },
      })

      return order
    })
  },

  async getAll({ page = 1, limit = 20, from, to } = {}) {
    const skip = (page - 1) * limit
    const where = {}

    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to) where.createdAt.lte = new Date(to)
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { items: true },
      }),
      prisma.order.count({ where }),
    ])

    return { orders, total, page, limit }
  },

  async getById(id) {
    return prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: { select: { id: true, name: true, barcode: true } } },
        },
      },
    })
  },

  async getDailySummary() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const [orders, aggregate] = await Promise.all([
      prisma.order.count({
        where: { createdAt: { gte: today, lt: tomorrow }, status: "COMPLETED" },
      }),
      prisma.order.aggregate({
        where: { createdAt: { gte: today, lt: tomorrow }, status: "COMPLETED" },
        _sum: { total: true },
      }),
    ])

    return {
      date: today.toISOString().split("T")[0],
      totalOrders: orders,
      totalRevenue: Number(aggregate._sum.total ?? 0),
    }
  },
}