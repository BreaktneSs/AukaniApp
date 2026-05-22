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

  async getSnapshot(date) {
    const cutoff = new Date(date)
    cutoff.setHours(23, 59, 59, 999)

    const [futureMovements, products, purchaseItems] = await Promise.all([
      // Movimientos posteriores al corte agrupados por producto
      prisma.inventoryMovement.groupBy({
        by: ["productId", "type"],
        where: { createdAt: { gt: cutoff } },
        _sum: { quantity: true },
      }),
      prisma.product.findMany({
        where: { type: "PHYSICAL" },
        select: {
          id: true, name: true, sku: true, stock: true, cost: true,
          category: { select: { name: true } },
        },
        orderBy: { name: "asc" },
      }),
      // Última compra de cada producto hasta la fecha de corte
      prisma.purchaseItem.findMany({
        where: { purchase: { createdAt: { lte: cutoff } } },
        select: {
          productId: true,
          unitCost: true,
          purchase: { select: { createdAt: true } },
        },
        orderBy: { purchase: { createdAt: "desc" } },
      }),
    ])

    // Índice: productId → { ENTRY: n, EXIT: n }
    const delta = {}
    for (const m of futureMovements) {
      if (!delta[m.productId]) delta[m.productId] = { ENTRY: 0, EXIT: 0 }
      delta[m.productId][m.type] = m._sum.quantity || 0
    }

    // Último costo por producto al corte (primer resultado ya es el más reciente por orderBy desc)
    const costAtCutoff = {}
    for (const pi of purchaseItems) {
      if (costAtCutoff[pi.productId] === undefined) {
        costAtCutoff[pi.productId] = Number(pi.unitCost)
      }
    }

    return products.map(p => {
      const d = delta[p.id] || { ENTRY: 0, EXIT: 0 }
      const stockAtCutoff = p.stock - d.ENTRY + d.EXIT
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category?.name ?? null,
        stockNow: p.stock,
        stockAtCutoff: Math.max(0, stockAtCutoff),
        costAtCutoff: costAtCutoff[p.id] ?? Number(p.cost ?? 0),
        costNow: Number(p.cost ?? 0),
      }
    })
  },

  async getLowStockProducts() {
    return prisma.$queryRaw`
      SELECT id, name, stock, "minStock", barcode, "categoryId"
      FROM "Product"
      WHERE active = true AND type = 'PHYSICAL' AND stock <= "minStock"
      ORDER BY stock ASC
    `
  },
}