import prisma from "../config/prisma.js"

// Normaliza texto para extraer código de categoría: "Lácteos" → "LAC"
function catCode(name) {
  return name
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3)
    .padEnd(3, "X")
}

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

  async generateSku(type, categoryId) {
    const prefix = type === "SERVICE" ? "SVC" : "PRD"

    let code = "GEN"
    if (categoryId) {
      const cat = await prisma.category.findUnique({ where: { id: Number(categoryId) } })
      if (cat) code = catCode(cat.name)
    }

    const pattern = `${prefix}-${code}-`
    const existing = await prisma.product.findMany({
      where: { sku: { startsWith: pattern } },
      select: { sku: true },
    })

    let maxSeq = 0
    for (const p of existing) {
      const n = parseInt(p.sku.slice(pattern.length), 10)
      if (!isNaN(n) && n > maxSeq) maxSeq = n
    }

    return `${pattern}${String(maxSeq + 1).padStart(4, "0")}`
  },

  async create(data) {
    // Auto-generar SKU si no viene en el body
    const sku = data.sku?.trim()
      || await this.generateSku(data.type || "PHYSICAL", data.categoryId || null)

    return prisma.product.create({
      data: { ...data, sku },
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