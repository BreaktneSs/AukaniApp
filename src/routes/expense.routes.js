import { expenseController } from "../controllers/expense.controller.js"
import { allRoles, adminOrJefe } from "../middlewares/auth.js"

export async function expenseRoutes(fastify) {
  fastify.post("/expenses",                     { preHandler: allRoles },    expenseController.create)
  fastify.get("/expenses/shift/:shiftId",       { preHandler: allRoles },    expenseController.getByShift)
  fastify.delete("/expenses/:id",               { preHandler: adminOrJefe }, expenseController.delete)
}
