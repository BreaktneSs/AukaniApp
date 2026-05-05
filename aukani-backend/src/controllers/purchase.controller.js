import { purchaseService } from "../services/purchase.service.js"
import { auditService }    from "../services/audit.service.js"

const ip = (req) => req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip

export const purchaseController = {
  async create(req, reply) {
    const { items, notes } = req.body
    if (!Array.isArray(items) || items.length === 0)
      return reply.code(400).send({ error: "Se requiere al menos un producto" })

    for (const i of items) {
      if (!i.productId || !i.quantity || i.quantity < 1)
        return reply.code(400).send({ error: "Cada ítem requiere productId y quantity >= 1" })
      if (i.unitCost == null || Number(i.unitCost) < 0)
        return reply.code(400).send({ error: "El costo unitario no puede ser negativo" })
    }

    const purchase = await purchaseService.create({ userId: req.user.id, items, notes })

    await auditService.log({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: "PURCHASE_CREATE", entity: "PURCHASE",
      entityId: purchase.id, entityLabel: `Compra #${purchase.id}`,
      newValues: { items: items.length, total: Number(purchase.total) },
      ip: ip(req),
    })

    reply.code(201).send(purchase)
  },

  async createReturn(req, reply) {
    const purchaseId = Number(req.params.id)
    const { items, notes } = req.body

    if (!notes || !String(notes).trim())
      return reply.code(400).send({ error: "El motivo de devolución es obligatorio" })
    if (!Array.isArray(items) || items.length === 0)
      return reply.code(400).send({ error: "Se requiere al menos un producto a devolver" })

    for (const i of items) {
      if (!i.productId || !i.quantity || i.quantity < 1)
        return reply.code(400).send({ error: "Cada ítem requiere productId y quantity >= 1" })
    }

    try {
      const ret = await purchaseService.createReturn({
        purchaseId,
        userId: req.user.id,
        items,
        notes,
      })

      await auditService.log({
        userId: req.user.id, userName: req.user.name, userRole: req.user.role,
        action: "PURCHASE_RETURN_CREATE", entity: "PURCHASE_RETURN",
        entityId: ret.id, entityLabel: `Devolución compra #${purchaseId}`,
        newValues: { items: items.length, total: Number(ret.total) },
        ip: ip(req),
      })

      reply.code(201).send(ret)
    } catch (err) {
      reply.code(400).send({ error: err.message })
    }
  },

  async getAll(req, reply) {
    const { page, limit, productId, from, to, minTotal, maxTotal, hasReturns } = req.query
    const result = await purchaseService.getAll({
      page:       page      ? Number(page)      : 1,
      limit:      limit     ? Number(limit)     : 20,
      productId:  productId ? Number(productId) : undefined,
      from, to,
      minTotal:   minTotal  ? Number(minTotal)  : undefined,
      maxTotal:   maxTotal  ? Number(maxTotal)  : undefined,
      hasReturns: hasReturns === "true",
    })
    reply.send(result)
  },
}
