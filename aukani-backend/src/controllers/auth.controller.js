import { authService } from "../services/auth.service.js"
import { auditService } from "../services/audit.service.js"

const ip = (req) => req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip

export const authController = {
  async login(req, reply) {
    const { email, password } = req.body
    const result = await authService.login(email, password)
    if (result.requires2FA) return reply.send(result)
    auditService.log({
      userId: result.user.id, userName: result.user.name, userRole: result.user.role,
      action: "LOGIN", entity: "AUTH", entityLabel: result.user.email, ip: ip(req),
    })
    return reply.send(result)
  },

  async loginVerify2FA(req, reply) {
    const { tempToken, code } = req.body
    try {
      const result = await authService.loginVerify2FA(tempToken, code)
      auditService.log({
        userId: result.user.id, userName: result.user.name, userRole: result.user.role,
        action: "LOGIN_2FA_SUCCESS", entity: "AUTH", entityLabel: result.user.email, ip: ip(req),
      })
      return reply.send(result)
    } catch (err) {
      auditService.log({ action: "LOGIN_2FA_FAIL", entity: "AUTH", ip: ip(req) })
      throw err
    }
  },

  async me(req, reply) {
    const user = await authService.me(req.user.id)
    return reply.send(user)
  },

  async changeOwnPassword(req, reply) {
    const { currentPassword, newPassword, totpCode } = req.body
    await authService.changeOwnPassword(req.user.id, currentPassword, newPassword, totpCode)
    auditService.log({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: "USER_PASSWORD_CHANGE", entity: "USER", entityId: req.user.id,
      entityLabel: req.user.name, ip: ip(req),
    })
    return reply.send({ ok: true })
  },

  async setup2FA(req, reply) {
    const result = await authService.setup2FA(req.user.id)
    return reply.send(result)
  },

  async confirm2FA(req, reply) {
    const { code } = req.body
    await authService.confirm2FA(req.user.id, code)
    auditService.log({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: "TWOFA_ENABLED", entity: "USER", entityId: req.user.id,
      entityLabel: req.user.name, ip: ip(req),
    })
    return reply.send({ ok: true })
  },

  async disable2FA(req, reply) {
    const { currentPassword } = req.body
    await authService.disable2FA(req.user.id, currentPassword)
    auditService.log({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: "TWOFA_DISABLED", entity: "USER", entityId: req.user.id,
      entityLabel: req.user.name, ip: ip(req),
    })
    return reply.send({ ok: true })
  },
}
