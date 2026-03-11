import prisma from "../config/prisma.js"

export const inventoryService = {
  // Entrada de productos (compra) — vendedor puede hacer esto
  async entry({ productId, quantity, reason, userId }) {
    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) throw { statusCode: 404, message: "Producto no encontrado" }

    const [movement, updatedProduct] = await prisma.$transaction([
      prisma.inventoryMovement.create({
        data: { productId, userId, type: "ENTRY", quantity, reason: reason || "Entrada de inventario" },
      }),
      prisma.product.update({
        where: { id: productId },
        data: { stock: { increment: quantity } },
      }),
    ])

    return { movement, product: updatedProduct }
  },

  // Salida manual (solo admin/jefe)
  async exit({ productId, quantity, reason, userId }) {
    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) throw { statusCode: 404, message: "Producto no encontrado" }
    if (product.stock < quantity) throw { statusCode: 409, message: `Stock insuficiente. Disponible: ${product.stock}` }

    const [movement, updatedProduct] = await prisma.$transaction([
      prisma.inventoryMovement.create({
        data: { productId, userId, type: "EXIT", quantity, reason: reason || "Salida manual" },
      }),
      prisma.product.update({
        where: { id: productId },
        data: { stock: { decrement: quantity } },
      }),
    ])

    return { movement, product: updatedProduct }
  },

  async getMovements({ page = 1, limit = 30, productId, type, from, to } = {}) {
    const skip = (page - 1) * limit
    const where = {}
    if (productId) where.productId = productId
    if (type) where.type = type
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to) where.createdAt.lte = new Date(to)
    }

    const [movements, total] = await Promise.all([
      prisma.inventoryMovement.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          product: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
        },
      }),
      prisma.inventoryMovement.count({ where }),
    ])

    return { movements, total, page, limit }
  },

  async getLowStock() {
    return prisma.product.findMany({
      where: { active: true, stock: { lte: prisma.product.fields.minStock } },
    })
    // Fallback con raw query para comparar dos campos
  },

  async getLowStockProducts() {
    return prisma.$queryRaw`
      SELECT id, name, stock, "minStock", barcode, "categoryId"
      FROM "Product"
      WHERE active = true AND stock <= "minStock"
      ORDER BY stock ASC
    `
  },
}