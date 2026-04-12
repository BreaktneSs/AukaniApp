import prisma from "../config/prisma.js"

export const productService = {
  async getAll({ page = 1, limit = 200, search, categoryId, minPrice, maxPrice, lowStock, active = true } = {}) {
    const skip = (page - 1) * limit
    const where = { active }

    if (search && search.trim().length > 0) {
      const s = search.trim()
      where.OR = [
        { name:    { contains: s, mode: "insensitive" } },
        { sku:     { contains: s, mode: "insensitive" } },
        // barcode es opcional — solo buscar si no es null
        { barcode: { not: null, contains: s, mode: "insensitive" } },
      ]
    }

    if (categoryId) where.categoryId = Number(categoryId)
    if (minPrice !== undefined && minPrice !== "") where.price = { ...where.price, gte: Number(minPrice) }
    if (maxPrice !== undefined && maxPrice !== "") where.price = { ...where.price, lte: Number(maxPrice) }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        include: { category: { select: { id: true, name: true } } },
      }),
      prisma.product.count({ where }),
    ])

    const filtered = lowStock === "true"
      ? products.filter(p => p.type !== "SERVICE" && p.stock <= p.minStock)
      : products

    return { products: filtered, total, page, limit }
  },

  async getById(id) {
    return prisma.product.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true } } },
    })
  },

  async getByBarcode(barcode) {
    return prisma.product.findUnique({
      where: { barcode },
      include: { category: { select: { id: true, name: true } } },
    })
  },

  async search(query) {
    return (await this.getAll({ search: query, limit: 50 })).products
  },

  async create(data) {
    return prisma.product.create({
      data,
      include: { category: { select: { id: true, name: true } } },
    })
  },

  async update(id, data) {
    return prisma.product.update({
      where: { id },
      data,
      include: { category: { select: { id: true, name: true } } },
    })
  },

  async updateStock(id, quantity) {
    return prisma.product.update({
      where: { id },
      data: { stock: { increment: quantity } },
    })
  },

  async delete(id) {
    return prisma.product.update({ where: { id }, data: { active: false } })
  },
}