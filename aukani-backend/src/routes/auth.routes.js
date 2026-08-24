import { authController } from "../controllers/auth.controller.js"
import { authenticate } from "../middlewares/auth.js"

export async function authRoutes(fastify) {
  const loginRateLimit = {
    rateLimit: {
      max: 10,
      timeWindow: "1 minute",
      errorResponseBuilder: () => ({
        statusCode: 429,
        error: "Demasiados intentos. Espera 1 minuto antes de intentar de nuevo.",
      }),
    },
  }

  fastify.post("/auth/login",     { config: loginRateLimit }, authController.login)
  fastify.post("/auth/login/2fa", { config: loginRateLimit }, authController.loginVerify2FA)
  fastify.get("/auth/me",              { preHandler: [authenticate] }, authController.me)
  fastify.patch("/profile/password",   { preHandler: [authenticate] }, authController.changeOwnPassword)

  fastify.get("/auth/2fa/setup",   { preHandler: [authenticate] }, authController.setup2FA)
  fastify.post("/auth/2fa/confirm",{ preHandler: [authenticate] }, authController.confirm2FA)
  fastify.post("/auth/2fa/disable",{ preHandler: [authenticate] }, authController.disable2FA)

  fastify.post("/auth/forgot-password/check", { config: loginRateLimit }, authController.canResetWithTotp)
  fastify.post("/auth/forgot-password/reset", { config: loginRateLimit }, authController.resetPasswordWithTotp)
}