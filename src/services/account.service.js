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
          include: {
            product: { select: { id: true, name: true } },
            addedBy: { select: { id: true, name: true } },
          },
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
          include: {
            product: { select: { id: true, name: true } },
            addedBy: { select: { id: true, name: true } },
          },
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

  async addCashierItem(accountId, { productId, price }, userId) {
    const account = await prisma.account.findUnique({ where: { id: accountId } })
    if (!account || account.status !== "OPEN") throw { statusCode: 400, message: "Cuenta cerrada" }

    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product || !product.active) throw { statusCode: 404, message: "Producto no encontrado" }

    const isService = product.type === "SERVICE"
    if (!isService && product.stock < 1) throw { statusCode: 409, message: "Stock insuficiente" }

    return prisma.$transaction(async (tx) => {
      if (!isService) {
        await tx.product.update({ where: { id: productId }, data: { stock: { decrement: 1 } } })
        await tx.inventoryMovement.create({
          data: { productId, userId, type: "SALE", quantity: 1, reason: `Cuenta "${account.name}" - Caja` },
        })
      }
      const existing = await tx.accountItem.findFirst({ where: { accountId, productId } })
      if (existing) {
        return tx.accountItem.update({ where: { id: existing.id }, data: { quantity: { increment: 1 } } })
      }
      return tx.accountItem.create({
        data: { accountId, productId, quantity: 1, price: price ?? product.price, addedByUserId: userId },
      })
    })
  },

  // Actualiza cantidad y/o precio de un AccountItem; ajusta stock según el delta de cantidad
  async updateItem(accountId, itemId, { quantity, price }, userId) {
    const item = await prisma.accountItem.findUnique({ where: { id: itemId } })
    if (!item || item.accountId !== accountId) throw { statusCode: 404, message: "Item no encontrado en la cuenta" }

    return prisma.$transaction(async (tx) => {
      if (quantity !== undefined && quantity !== item.quantity) {
        const delta = quantity - item.quantity
        const product = await tx.product.findUnique({ where: { id: item.productId } })
        if (product?.type !== "SERVICE") {
          if (delta > 0) {
            if (product.stock < delta) throw { statusCode: 409, message: "Stock insuficiente" }
            await tx.product.update({ where: { id: item.productId }, data: { stock: { decrement: delta } } })
          } else {
            await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: -delta } } })
          }
        }
        if (quantity <= 0) return tx.accountItem.delete({ where: { id: itemId } })
      }

      const data = {}
      if (quantity !== undefined && quantity > 0) data.quantity = quantity
      if (price !== undefined) data.price = price
      if (!Object.keys(data).length) return item
      return tx.accountItem.update({ where: { id: itemId }, data })
    })
  },

  async removeItem(accountId, itemId) {
    const item = await prisma.accountItem.findUnique({ where: { id: itemId } })
    if (!item || item.accountId !== accountId) throw { statusCode: 404, message: "Item no encontrado en la cuenta" }

    // Restaurar stock para productos físicos
    const product = await prisma.product.findUnique({ where: { id: item.productId } })
    if (product && product.type !== "SERVICE") {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      })
    }

    return prisma.accountItem.delete({ where: { id: item.id } })
  },

  async close(id) {
    return prisma.$transaction(async (tx) => {
      const account = await tx.account.findUnique({
        where: { id },
        include: {
          items: { include: { product: { select: { id: true, type: true } } } },
        },
      })
      if (!account) throw { statusCode: 404, message: "Cuenta no encontrada" }

      // Restaurar stock de productos físicos que quedaron en la cuenta
      for (const item of account.items) {
        if (item.product?.type !== "SERVICE") {
          await tx.product.update({
            where: { id: item.productId },
            data:  { stock: { increment: item.quantity } },
          })
        }
      }

      return tx.account.update({
        where: { id },
        data:  { status: "CLOSED", closedAt: new Date() },
      })
    })
  },
}
