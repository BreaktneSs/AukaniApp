import { authController } from "../controllers/auth.controller.js"
import { authenticate } from "../middlewares/auth.js"

export async function authRoutes(fastify) {
  fastify.post("/auth/login", authController.login)
  fastify.get("/auth/me", { preHandler: [authenticate] }, authController.me)
}