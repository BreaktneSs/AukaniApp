import { accountService } from "../services/account.service.js"
import { auditService } from "../services/audit.service.js"

const ip = (req) => req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip

export const accountController = {
  async create(req, reply) {
    const { shiftId, name } = req.body
    if (!shiftId || !name?.trim()) {
      return reply.code(400).send({ error: "shiftId y name son requeridos" })
    }
    const account = await accountService.create(Number(shiftId), name.trim())
    await auditService.log({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: "ACCOUNT_CREATE", entity: "ACCOUNT",
      entityId: account.id, entityLabel: name.trim(),
      newValues: { shiftId: Number(shiftId), name: name.trim() },
      ip: ip(req),
    })
    reply.code(201).send(account)
  },

  async getByShift(req, reply) {
    const accounts = await accountService.getByShift(Number(req.params.shiftId))
    reply.send(accounts)
  },

  async addCashierItem(req, reply) {
    const accountId = Number(req.params.id)
    const { productId, price } = req.body
    if (!productId) return reply.code(400).send({ error: "productId requerido" })
    const item = await accountService.addCashierItem(accountId, { productId: Number(productId), price }, req.user.id)
    reply.code(201).send(item)
  },

  async updateItem(req, reply) {
    const accountId = Number(req.params.id)
    const itemId    = Number(req.params.itemId)
    const { quantity, price } = req.body
    const item = await accountService.updateItem(accountId, itemId, { quantity, price }, req.user.id)
    reply.send(item ?? {})
  },

  async removeItem(req, reply) {
    const accountId = Number(req.params.id)
    const itemId    = Number(req.params.itemId)
    const item = await accountService.removeItem(accountId, itemId, req.user.id)
    await auditService.log({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: "ACCOUNT_ITEM_REMOVE", entity: "ACCOUNT",
      entityId: accountId, entityLabel: `Cuenta #${accountId}`,
      newValues: { itemId, productId: item?.productId, quantity: item?.quantity },
      ip: ip(req),
    })
    reply.code(204).send()
  },

  async close(req, reply) {
    const account = await accountService.close(Number(req.params.id), req.user.id)
    await auditService.log({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: "ACCOUNT_CLOSE", entity: "ACCOUNT",
      entityId: account.id, entityLabel: account.name,
      newValues: { status: "CLOSED" },
      ip: ip(req),
    })
    reply.send(account)
  },
}
