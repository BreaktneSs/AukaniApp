import { auditController } from "../controllers/audit.controller.js"
import { onlyAdmin } from "../middlewares/auth.js"

export async function auditRoutes(fastify) {
  fastify.get("/audit/logs", { preHandler: onlyAdmin }, auditController.getAll)
}
