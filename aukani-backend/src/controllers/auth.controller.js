import { authService } from "../services/auth.service.js"

export const authController = {
  async login(req, reply) {
    const { email, password } = req.body
    const result = await authService.login(email, password)
    return reply.send(result)
  },

  async me(req, reply) {
    const user = await authService.me(req.user.id)
    return reply.send(user)
  },
}