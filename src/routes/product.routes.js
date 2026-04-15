import { productController } from "../controllers/product.controller.js"
import { uploadController } from "../controllers/upload.controller.js"
import { allRoles, adminOrJefe } from "../middlewares/auth.js"

export async function productRoutes(fastify) {
  // ── Consultas (todos los roles) ──────────────────────
  fastify.get("/products",               { preHandler: allRoles },    productController.getAll)
  fastify.get("/products/search",        { preHandler: allRoles },    productController.search)
  fastify.get("/products/sku/generate",  { preHandler: adminOrJefe }, productController.generateSku)
  fastify.get("/products/barcode/:code", { preHandler: allRoles },    productController.getByBarcode)
  fastify.get("/products/:id",           { preHandler: allRoles },    productController.getById)

  // ── Gestión (admin y jefe) ───────────────────────────
  fastify.post("/products",              { preHandler: adminOrJefe }, productController.create)
  fastify.put("/products/:id",           { preHandler: adminOrJefe }, productController.update)
  fastify.patch("/products/:id/stock",   { preHandler: adminOrJefe }, productController.updateStock)
  fastify.delete("/products/:id",        { preHandler: adminOrJefe }, productController.delete)

  // ── Imágenes (admin y jefe) ──────────────────────────
  fastify.post("/products/:id/image",    { preHandler: adminOrJefe }, uploadController.uploadProductImage)
  fastify.delete("/products/:id/image",  { preHandler: adminOrJefe }, uploadController.deleteProductImage)
}