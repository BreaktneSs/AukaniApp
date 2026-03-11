export function errorHandler(error, req, reply) {
  // Custom thrown errors from services
  if (error.statusCode && error.message) {
    return reply.status(error.statusCode).send({ error: error.message })
  }

  // Prisma errors
  if (error.code === "P2002") {
    return reply.status(409).send({ error: "Ya existe un registro con ese valor único." })
  }
  if (error.code === "P2025") {
    return reply.status(404).send({ error: "Registro no encontrado." })
  }

  // Fastify validation errors
  if (error.validation) {
    return reply.status(400).send({ error: "Datos inválidos.", details: error.validation })
  }

  req.log.error(error)
  return reply.status(500).send({ error: "Error interno del servidor." })
}