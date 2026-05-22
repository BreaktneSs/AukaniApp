import prisma from "../config/prisma.js"

const INCLUDE_PURCHASE = {
  user:    { select: { id: true, name: true } },
  items:   { include: { product: { select: { id: true, name: true } } } },
  returns: {
    orderBy: { createdAt: "asc" },
    include: {
      user:  { select: { id: true, name: true } },
      items: true,
    },
  },
}

export const purchaseService = {
  async create({ userId, items, notes }) {
    const rawTotal = items.reduce((sum, i) => sum + Number(i.unitCost) * i.quantity, 0)
    const total = Math.round(rawTotal / 50) * 50

    return prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          userId, notes, total,
          items: {
            create: items.map(i => ({
              productId: i.productId,
              quantity:  i.quantity,
              unitCost:  i.unitCost,
            })),
          },
        },
        include: INCLUDE_PURCHASE,
      })

      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data:  { stock: { increment: item.quantity }, cost: item.unitCost },
        })
        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            userId,
            type:     "ENTRY",
            quantity:  item.quantity,
            reason:   `Compra #${purchase.id}`,
          },
        })
      }

      return purchase
    })
  },

  async createReturn({ purchaseId, userId, items, notes }) {
    const purchase = await prisma.purchase.findUnique({
      where:   { id: purchaseId },
      include: {
        items:   true,
        returns: { include: { items: true } },
      },
    })
    if (!purchase) throw new Error("Compra no encontrada")

    // Compute already-returned quantities per product
    const alreadyReturned = {}
    for (const ret of purchase.returns) {
      for (const ri of ret.items) {
        alreadyReturned[ri.productId] = (alreadyReturned[ri.productId] || 0) + ri.quantity
      }
    }

    // Validate and resolve unit costs from original purchase
    const resolved = []
    for (const item of items) {
      const orig = purchase.items.find(i => i.productId === item.productId)
      if (!orig) throw new Error(`Producto no encontrado en la compra original`)
      const maxReturnable = orig.quantity - (alreadyReturned[orig.productId] || 0)
      if (item.quantity > maxReturnable)
        throw new Error(`Solo se pueden devolver hasta ${maxReturnable} unidades de ese producto`)
      resolved.push({ productId: item.productId, quantity: item.quantity, unitCost: Number(orig.unitCost) })
    }

    const total = resolved.reduce((s, i) => s + i.unitCost * i.quantity, 0)

    return prisma.$transaction(async (tx) => {
      const ret = await tx.purchaseReturn.create({
        data: {
          purchaseId, userId, notes, total,
          items: { create: resolved },
        },
        include: {
          user:  { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, name: true } } } },
        },
      })

      for (const item of resolved) {
        await tx.product.update({
          where: { id: item.productId },
          data:  { stock: { decrement: item.quantity } },
        })
        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            userId,
            type:     "PURCHASE_RETURN",
            quantity:  item.quantity,
            reason:   `Devolución compra #${purchaseId}`,
          },
        })
      }

      return ret
    })
  },

  async getAll({ page = 1, limit = 20, productId, from, to, minTotal, maxTotal, hasReturns } = {}) {
    const skip  = (page - 1) * limit
    const where = {}

    if (productId) where.items = { some: { productId } }
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to)   where.createdAt.lte = new Date(to + "T23:59:59.999Z")
    }
    if (minTotal != null || maxTotal != null) {
      where.total = {}
      if (minTotal != null) where.total.gte = minTotal
      if (maxTotal != null) where.total.lte = maxTotal
    }
    if (hasReturns === true) where.returns = { some: {} }

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: "desc" },
        include: INCLUDE_PURCHASE,
      }),
      prisma.purchase.count({ where }),
    ])

    return { purchases, total, page, limit }
  },
}
