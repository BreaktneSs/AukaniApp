import prisma from "../config/prisma.js"

export const auditService = {
  // Fire-and-forget — nunca lanza excepciones al caller
  log({ userId, userName, userRole, action, entity, entityId, entityLabel, oldValues, newValues, ip }) {
    try {
      prisma.auditLog.create({
        data: {
          userId:      userId ?? null,
          userName:    userName ?? "desconocido",
          userRole:    userRole ?? "desconocido",
          action,
          entity,
          entityId:    entityId ?? null,
          entityLabel: entityLabel ?? null,
          oldValues:   oldValues  ?? undefined,
          newValues:   newValues  ?? undefined,
          ip:          ip ?? null,
        },
      }).catch(err => {
        console.error("[AuditLog] Error al escribir entrada:", err?.message)
      })
    } catch (err) {
      console.error("[AuditLog] Error síncrono:", err?.message)
    }
  },

  async getAll({ page = 1, limit = 50, from, to, userId, action, entity } = {}) {
    const skip = (page - 1) * limit
    const where = {}

    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to)   where.createdAt.lte = new Date(new Date(to).setHours(23, 59, 59, 999))
    }
    if (userId) where.userId = Number(userId)
    if (action) where.action = action
    if (entity) where.entity = entity

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.auditLog.count({ where }),
    ])

    return { logs, total, page, limit }
  },
}
