import bcrypt from "bcrypt"
import prisma from "../config/prisma.js"
import { signToken } from "../utils/jwt.js"

export const authService = {
  async login(email, password) {
    const user = await prisma.user.findUnique({ where: { email } })

    if (!user || !user.active) {
      throw { statusCode: 401, message: "Credenciales inválidas" }
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      throw { statusCode: 401, message: "Credenciales inválidas" }
    }

    const token = signToken({ id: user.id, name: user.name, email: user.email, role: user.role })

    return {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    }
  },

  async me(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    })
    if (!user) throw { statusCode: 404, message: "Usuario no encontrado" }
    return user
  },

  async changeOwnPassword(userId, currentPassword, newPassword) {
    if (!newPassword || newPassword.length < 6)
      throw { statusCode: 400, message: "La nueva contraseña debe tener al menos 6 caracteres" }
    const user = await prisma.user.findUnique({ where: { id: userId } })
    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) throw { statusCode: 401, message: "La contraseña actual es incorrecta" }
    const hashed = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } })
  },
}