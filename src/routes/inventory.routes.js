import { inventoryController } from "../controllers/inventory.controller.js"
import { allRoles, adminOrJefe } from "../middlewares/auth.js"

export async function inventoryRoutes(fastify) {
  // Entrada: todos pueden registrar compras/entradas
  fastify.post("/inventory/entry",    { preHandler: allRoles },    inventoryController.entry)
  // Salida manual: solo admin y jefe
  fastify.post("/inventory/exit",     { preHandler: adminOrJefe }, inventoryController.exit)
  fastify.get("/inventory/movements", { preHandler: allRoles },    inventoryController.getMovements)
  fastify.get("/inventory/low-stock", { preHandler: adminOrJefe }, inventoryController.getLowStock)
}