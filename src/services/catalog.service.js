import prisma from "../config/prisma.js"

export const categoryService = {
  async getAll() {
    return prisma.category.findMany({ where: { active: true }, orderBy: { name: "asc" } })
  },
  async create(name) {
    return prisma.category.create({ data: { name } })
  },
  async update(id, data) {
    return prisma.category.update({ where: { id }, data })
  },
  async delete(id) {
    return prisma.category.update({ where: { id }, data: { active: false } })
  },
}

export const paymentMethodService = {
  async getAll() {
    return prisma.paymentMethod.findMany({ orderBy: { name: "asc" } })
  },
  async create(name) {
    return prisma.paymentMethod.create({ data: { name } })
  },
  async update(id, data) {
    return prisma.paymentMethod.update({ where: { id }, data })
  },
  async delete(id) {
    return prisma.paymentMethod.update({ where: { id }, data: { active: false } })
  },
}