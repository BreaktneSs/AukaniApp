import { saveProductImage, deleteProductImage } from "../utils/upload.js"
import prisma from "../config/prisma.js"

export const uploadController = {
  async uploadProductImage(req, reply) {
    const productId = Number(req.params.id)

    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) return reply.status(404).send({ error: "Producto no encontrado" })

    const file = await req.file()
    if (!file) return reply.status(400).send({ error: "No se recibió ningún archivo" })

    // Borrar imagen anterior si existe
    if (product.imageUrl) deleteProductImage(product.imageUrl)

    const imageUrl = await saveProductImage(file)

    const updated = await prisma.product.update({
      where: { id: productId },
      data: { imageUrl },
      select: { id: true, name: true, imageUrl: true },
    })

    return reply.send(updated)
  },

  async deleteProductImage(req, reply) {
    const productId = Number(req.params.id)

    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) return reply.status(404).send({ error: "Producto no encontrado" })

    deleteProductImage(product.imageUrl)

    const updated = await prisma.product.update({
      where: { id: productId },
      data: { imageUrl: null },
      select: { id: true, name: true, imageUrl: true },
    })

    return reply.send(updated)
  },
}