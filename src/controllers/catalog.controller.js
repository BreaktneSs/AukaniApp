import { categoryService, paymentMethodService } from "../services/catalog.service.js"

export const categoryController = {
  async getAll(req, reply) { return reply.send(await categoryService.getAll()) },
  async create(req, reply) { return reply.status(201).send(await categoryService.create(req.body.name)) },
  async update(req, reply) { return reply.send(await categoryService.update(Number(req.params.id), req.body)) },
  async delete(req, reply) { await categoryService.delete(Number(req.params.id)); return reply.status(204).send() },
}

export const paymentMethodController = {
  async getAll(req, reply) { return reply.send(await paymentMethodService.getAll()) },
  async create(req, reply) { return reply.status(201).send(await paymentMethodService.create(req.body.name)) },
  async update(req, reply) { return reply.send(await paymentMethodService.update(Number(req.params.id), req.body)) },
  async delete(req, reply) { await paymentMethodService.delete(Number(req.params.id)); return reply.status(204).send() },
}