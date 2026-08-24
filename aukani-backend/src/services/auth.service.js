import bcrypt from "bcrypt"
import prisma from "../config/prisma.js"
import { signToken, verifyToken } from "../utils/jwt.js"
import { totpService } from "./totp.service.js"

const publicUser = (user) => ({
  id: user.id, name: user.name, email: user.email, role: user.role, totpEnabled: user.totpEnabled,
})

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

    if (user.totpEnabled) {
      const tempToken = signToken({ id: user.id, pending2FA: true }, "5m")
      return { requires2FA: true, tempToken }
    }

    const token = signToken({ id: user.id, name: user.name, email: user.email, role: user.role })
    return { token, user: publicUser(user) }
  },

  async loginVerify2FA(tempToken, code) {
    let payload
    try {
      payload = verifyToken(tempToken)
    } catch {
      throw { statusCode: 401, message: "Sesión de verificación expirada, inicia sesión de nuevo" }
    }
    if (!payload.pending2FA) {
      throw { statusCode: 401, message: "Token inválido" }
    }

    const user = await prisma.user.findUnique({ where: { id: payload.id } })
    if (!user || !user.active || !user.totpEnabled) {
      throw { statusCode: 401, message: "Credenciales inválidas" }
    }

    const valid = totpService.verify(user.totpSecret, code)
    if (!valid) throw { statusCode: 401, message: "Código incorrecto" }

    const token = signToken({ id: user.id, name: user.name, email: user.email, role: user.role })
    return { token, user: publicUser(user) }
  },

  async me(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, active: true, totpEnabled: true, createdAt: true },
    })
    if (!user) throw { statusCode: 404, message: "Usuario no encontrado" }
    return user
  },

  async changeOwnPassword(userId, currentPassword, newPassword, totpCode) {
    if (!newPassword || newPassword.length < 6)
      throw { statusCode: 400, message: "La nueva contraseña debe tener al menos 6 caracteres" }
    const user = await prisma.user.findUnique({ where: { id: userId } })
    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) throw { statusCode: 401, message: "La contraseña actual es incorrecta" }

    if (user.totpEnabled && !totpService.verify(user.totpSecret, totpCode)) {
      throw { statusCode: 401, message: "Código de verificación incorrecto" }
    }

    const hashed = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } })
  },

  // ── 2FA — activación propia ───────────────────────────────

  async setup2FA(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (user.totpEnabled) throw { statusCode: 400, message: "La verificación en dos pasos ya está activa" }

    const { secret, qrDataUrl } = await totpService.generateSetup(user.email)
    await prisma.user.update({ where: { id: userId }, data: { totpSecret: secret } })
    return { secret, qrDataUrl }
  },

  async confirm2FA(userId, code) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user.totpSecret) throw { statusCode: 400, message: "Primero solicita el código QR" }
    if (!totpService.verify(user.totpSecret, code)) {
      throw { statusCode: 401, message: "Código incorrecto" }
    }
    await prisma.user.update({ where: { id: userId }, data: { totpEnabled: true } })
  },

  async disable2FA(userId, currentPassword) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) throw { statusCode: 401, message: "La contraseña actual es incorrecta" }
    await prisma.user.update({ where: { id: userId }, data: { totpSecret: null, totpEnabled: false } })
  },
}