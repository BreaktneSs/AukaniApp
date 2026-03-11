import { productController } from "../controllers/product.controller.js"

export async function productRoutes(fastify) {
  fastify.get("/products", productController.getAll)
  fastify.get("/products/search", productController.search)
  fastify.get("/products/barcode/:code", productController.getByBarcode)
  fastify.get("/products/:id", productController.getById)
  fastify.post("/products", productController.create)
  fastify.put("/products/:id", productController.update)
  fastify.patch("/products/:id/stock", productController.updateStock)
  fastify.delete("/products/:id", productController.delete)
}