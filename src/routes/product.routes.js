import { productController } from "../controllers/product.controller.js"
import { allRoles, adminOrJefe } from "../middlewares/auth.js"

export async function productRoutes(fastify) {
  fastify.get("/products",                { preHandler: allRoles },    productController.getAll)
  fastify.get("/products/search",         { preHandler: allRoles },    productController.search)
  fastify.get("/products/barcode/:code",  { preHandler: allRoles },    productController.getByBarcode)
  fastify.get("/products/:id",            { preHandler: allRoles },    productController.getById)
  fastify.post("/products",               { preHandler: adminOrJefe }, productController.create)
  fastify.put("/products/:id",            { preHandler: adminOrJefe }, productController.update)
  fastify.patch("/products/:id/stock",    { preHandler: adminOrJefe }, productController.updateStock)
  fastify.delete("/products/:id",         { preHandler: adminOrJefe }, productController.delete)
}