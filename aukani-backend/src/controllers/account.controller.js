import { accountService } from "../services/account.service.js"
import { auditService } from "../services/audit.service.js"

export const accountController = {
  async create(req, reply) {
    const { shiftId, name } = req.body
    if (!shiftId || !name?.trim()) {
      return reply.code(400).send({ error: "shiftId y name son requeridos" })
    }
    const account = await accountService.create(Number(shiftId), name.trim())
    await auditService.log({
      userId: req.user.id, action: "ACCOUNT_CREATE", entity: "ACCOUNT",
      entityId: account.id, entityLabel: name.trim(),
    })
    reply.code(201).send(account)
  },

  async getByShift(req, reply) {
    const accounts = await accountService.getByShift(Number(req.params.shiftId))
    reply.send(accounts)
  },

  async close(req, reply) {
    const account = await accountService.close(Number(req.params.id))
    await auditService.log({
      userId: req.user.id, action: "ACCOUNT_CLOSE", entity: "ACCOUNT",
      entityId: account.id, entityLabel: account.name,
    })
    reply.send(account)
  },
}
