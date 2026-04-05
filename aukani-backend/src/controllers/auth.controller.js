import { authService } from "../services/auth.service.js"
import { auditService } from "../services/audit.service.js"

const ip = (req) => req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip

export const authController = {
  async login(req, reply) {
    const { email, password } = req.body
    const result = await authService.login(email, password)
    auditService.log({
      userId: result.user.id, userName: result.user.name, userRole: result.user.role,
      action: "LOGIN", entity: "AUTH", entityLabel: result.user.email, ip: ip(req),
    })
    return reply.send(result)
  },

  async me(req, reply) {
    const user = await authService.me(req.user.id)
    return reply.send(user)
  },
}
