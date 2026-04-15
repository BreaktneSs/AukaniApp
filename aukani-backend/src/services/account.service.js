import prisma from "../config/prisma.js"

export const accountService = {
  async create(shiftId, name) {
    return prisma.account.create({
      data: { shiftId, name },
    })
  },

  async getByShift(shiftId) {
    return prisma.account.findMany({
      where: { shiftId, status: "OPEN" },
      include: {
        items: {
          include: { product: { select: { id: true, name: true } } },
          orderBy: { addedAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    })
  },

  async getById(id) {
    return prisma.account.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: { select: { id: true, name: true } } },
          orderBy: { addedAt: "asc" },
        },
      },
    })
  },

  // Agrega items a una cuenta (upsert por productId)
  async addItems(accountId, items, tx = prisma) {
    for (const item of items) {
      const existing = await tx.accountItem.findFirst({
        where: { accountId, productId: item.productId },
      })
      if (existing) {
        await tx.accountItem.update({
          where: { id: existing.id },
          data: { quantity: { increment: item.quantity } },
        })
      } else {
        await tx.accountItem.create({
          data: {
            accountId,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          },
        })
      }
    }
  },

  async close(id, tx = prisma) {
    return tx.account.update({
      where: { id },
      data: { status: "CLOSED", closedAt: new Date() },
    })
  },
}
