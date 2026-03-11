import { userService } from "../services/user.service.js"

export const userController = {
  async getAll(req, reply) {
    return reply.send(await userService.getAll())
  },
  async getById(req, reply) {
    const user = await userService.getById(Number(req.params.id))
    if (!user) return reply.status(404).send({ error: "Usuario no encontrado" })
    return reply.send(user)
  },
  async create(req, reply) {
    const user = await userService.create(req.body)
    return reply.status(201).send(user)
  },
  async update(req, reply) {
    return reply.send(await userService.update(Number(req.params.id), req.body))
  },
  async changePassword(req, reply) {
    return reply.send(await userService.changePassword(Number(req.params.id), req.body.password))
  },
  async deactivate(req, reply) {
    return reply.send(await userService.deactivate(Number(req.params.id)))
  },
}