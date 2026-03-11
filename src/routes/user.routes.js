import { userController } from "../controllers/user.controller.js"
import { onlyAdmin } from "../middlewares/auth.js"

export async function userRoutes(fastify) {
  // Solo ADMIN puede gestionar usuarios
  fastify.get("/users",              { preHandler: onlyAdmin }, userController.getAll)
  fastify.get("/users/:id",          { preHandler: onlyAdmin }, userController.getById)
  fastify.post("/users",             { preHandler: onlyAdmin }, userController.create)
  fastify.put("/users/:id",          { preHandler: onlyAdmin }, userController.update)
  fastify.patch("/users/:id/password", { preHandler: onlyAdmin }, userController.changePassword)
  fastify.delete("/users/:id",       { preHandler: onlyAdmin }, userController.deactivate)
}