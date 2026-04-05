import { userService } from "../services/user.service.js"
import { auditService } from "../services/audit.service.js"

const ip = (req) => req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip

export const userController = {
  async getAll(req, reply) {
    return reply.send(await userService.getAll())
  },

  async getById(req, reply) {
    const user = await userService.getById(Number(req.params.id))
    if (!user) return reply.status(404).send({ error: "Usuario no encontrado" })
    return reply.send(user)
  },

  async create(req, reply) {
    const user = await userService.create(req.body)
    auditService.log({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: "USER_CREATE", entity: "USER", entityId: user.id,
      entityLabel: `${user.name} (${user.email})`,
      newValues: { name: user.name, email: user.email, role: user.role },
      ip: ip(req),
    })
    return reply.status(201).send(user)
  },

  async update(req, reply) {
    const before = await userService.getById(Number(req.params.id))
    const user = await userService.update(Number(req.params.id), req.body)
    auditService.log({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: "USER_UPDATE", entity: "USER", entityId: user.id,
      entityLabel: user.name,
      oldValues: { name: before.name, email: before.email, role: before.role },
      newValues: { name: user.name, email: user.email, role: user.role },
      ip: ip(req),
    })
    return reply.send(user)
  },

  async changePassword(req, reply) {
    const result = await userService.changePassword(Number(req.params.id), req.body.password)
    auditService.log({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: "USER_PASSWORD_CHANGE", entity: "USER", entityId: result.id,
      entityLabel: result.name, ip: ip(req),
    })
    return reply.send(result)
  },

  async deactivate(req, reply) {
    const result = await userService.deactivate(Number(req.params.id))
    auditService.log({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: "USER_DEACTIVATE", entity: "USER", entityId: result.id,
      entityLabel: result.name,
      newValues: { active: false },
      ip: ip(req),
    })
    return reply.send(result)
  },
}
