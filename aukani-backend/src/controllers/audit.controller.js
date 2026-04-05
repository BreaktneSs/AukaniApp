import { auditService } from "../services/audit.service.js"

export const auditController = {
  async getAll(req, reply) {
    const { page, limit, from, to, userId, action, entity } = req.query
    return reply.send(
      await auditService.getAll({
        page:   Number(page)  || 1,
        limit:  Number(limit) || 50,
        from:   from   || undefined,
        to:     to     || undefined,
        userId: userId ? Number(userId) : undefined,
        action: action || undefined,
        entity: entity || undefined,
      })
    )
  },
}
