import prisma from "../config/prisma.js"

export const productService = {
  async getAll({ page = 1, limit = 50, category, active = true } = {}) {
    const skip = (page - 1) * limit
    const where = { active }
    if (category) where.category = category

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
      prisma.product.count({ where }),
    ])

    return { products, total, page, limit }
  },

  async getById(id) {
    return prisma.product.findUnique({ where: { id } })
  },

  async getByBarcode(barcode) {
    return prisma.product.findUnique({ where: { barcode } })
  },

  async search(query) {
    if (!query || query.trim().length === 0) return []

    return prisma.product.findMany({
      where: {
        active: true,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { sku: { contains: query, mode: "insensitive" } },
          { category: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 20,
      orderBy: { name: "asc" },
    })
  },

  async create(data) {
    return prisma.product.create({ data })
  },

  async update(id, data) {
    return prisma.product.update({ where: { id }, data })
  },

  async updateStock(id, quantity) {
    return prisma.product.update({
      where: { id },
      data: { stock: { increment: quantity } },
    })
  },

  async delete(id) {
    // Soft delete — never lose product history
    return prisma.product.update({
      where: { id },
      data: { active: false },
    })
  },
}