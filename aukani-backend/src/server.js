import "dotenv/config"
import Fastify from "fastify"
import cors from "@fastify/cors"
import { productRoutes } from "./routes/product.routes.js"
import { orderRoutes } from "./routes/order.routes.js"
import { errorHandler } from "./middlewares/errorHandler.js"
import prisma from "./config/prisma.js"

const app = Fastify({ logger: true })

// Plugins
await app.register(cors, { origin: true })

// Routes
await app.register(productRoutes)
await app.register(orderRoutes)

// Error handler
app.setErrorHandler(errorHandler)

// Health check
app.get("/", async () => ({ status: "Aukani POS API running", version: "1.0.0" }))

// Graceful shutdown
const shutdown = async () => {
  await prisma.$disconnect()
  await app.close()
  process.exit(0)
}
process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)

// Start
try {
  await app.listen({ port: Number(process.env.PORT) || 3000, host: "0.0.0.0" })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}