import bcrypt from "bcrypt"
import prisma from "../config/prisma.js"

export const userService = {
  async getAll() {
    return prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      orderBy: { name: "asc" },
    })
  },

  async getById(id) {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    })
  },

  async create({ name, email, password, role }) {
    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) throw { statusCode: 409, message: "El email ya está registrado" }

    const hashed = await bcrypt.hash(password, 10)
    return prisma.user.create({
      data: { name, email, password: hashed, role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })
  },

  async update(id, { name, email, role, active }) {
    return prisma.user.update({
      where: { id },
      data: { name, email, role, active },
      select: { id: true, name: true, email: true, role: true, active: true },
    })
  },

  async changePassword(id, newPassword) {
    const hashed = await bcrypt.hash(newPassword, 10)
    return prisma.user.update({
      where: { id },
      data: { password: hashed },
      select: { id: true, name: true },
    })
  },

  async deactivate(id) {
    return prisma.user.update({
      where: { id },
      data: { active: false },
      select: { id: true, name: true, active: true },
    })
  },
}