import { inventoryController } from "../controllers/inventory.controller.js"
import { allRoles, adminOrJefe, onlyAdmin } from "../middlewares/auth.js"

export async function inventoryRoutes(fastify) {
  fastify.post("/inventory/entry",    { preHandler: onlyAdmin },   inventoryController.entry)
  fastify.post("/inventory/exit",     { preHandler: onlyAdmin },   inventoryController.exit)
  fastify.get("/inventory/movements", { preHandler: allRoles },    inventoryController.getMovements)
  fastify.get("/inventory/low-stock", { preHandler: adminOrJefe }, inventoryController.getLowStock)
  fastify.get("/inventory/snapshot",  { preHandler: adminOrJefe }, inventoryController.getSnapshot)
}