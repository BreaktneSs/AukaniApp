import { authController } from "../controllers/auth.controller.js"
import { authenticate } from "../middlewares/auth.js"

export async function authRoutes(fastify) {
  fastify.post("/auth/login", {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: "1 minute",
        errorResponseBuilder: () => ({
          statusCode: 429,
          error: "Demasiados intentos. Espera 1 minuto antes de intentar de nuevo.",
        }),
      },
    },
  }, authController.login)
  fastify.get("/auth/me", { preHandler: [authenticate] }, authController.me)
}