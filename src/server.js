import dotenv from "dotenv"
if (!process.env.DATABASE_URL) dotenv.config()
import Fastify from "fastify"
import cors from "@fastify/cors"
import rateLimit from "@fastify/rate-limit"
import multipart from "@fastify/multipart"
import staticFiles from "@fastify/static"
import path from "path"
import fs from "fs"
import { fileURLToPath } from "url"

import { authRoutes }      from "./routes/auth.routes.js"
import { userRoutes }      from "./routes/user.routes.js"
import { productRoutes }   from "./routes/product.routes.js"
import { orderRoutes }     from "./routes/order.routes.js"
import { shiftRoutes }     from "./routes/shift.routes.js"
import { inventoryRoutes } from "./routes/inventory.routes.js"
import { catalogRoutes }   from "./routes/catalog.routes.js"
import { dispatchRoutes }  from "./routes/dispatch.routes.js"
import { auditRoutes }     from "./routes/audit.routes.js"
import { accountRoutes }   from "./routes/account.routes.js"
import { expenseRoutes }     from "./routes/expense.routes.js"
import { reservationRoutes } from "./routes/reservation.routes.js"
import { errorHandler }    from "./middlewares/errorHandler.js"
import prisma              from "./config/prisma.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = Fastify({ logger: true })

// ── Plugins ──────────────────────────────────────────────
await app.register(cors, { origin: true })
await app.register(rateLimit, {
  global: false, // solo aplicar donde se indique explícitamente
})
await app.register(multipart)
await app.register(staticFiles, {
  root: path.join(__dirname, "..", "uploads"),
  prefix: "/uploads/",
})

await app.register(staticFiles, {
  root: path.join(__dirname, "..", "downloads"),
  prefix: "/downloads/",
  decorateReply: false,
})

app.get("/downloads/:filename", async (req, reply) => {
  const allowed = ["aukani-agent-windows.exe", "aukani-agent-linux"]
  const filename = req.params.filename
  if (!allowed.includes(filename)) return reply.status(404).send({ error: "Archivo no encontrado" })
  return reply
    .header("Content-Disposition", `attachment; filename="${filename}"`)
    .sendFile(filename, path.join(__dirname, "..", "downloads"))
})

// ── Routes ───────────────────────────────────────────────
await app.register(authRoutes)
await app.register(userRoutes)
await app.register(productRoutes)
await app.register(orderRoutes)
await app.register(shiftRoutes)
await app.register(inventoryRoutes)
await app.register(catalogRoutes)
await app.register(dispatchRoutes)
await app.register(accountRoutes)
await app.register(expenseRoutes)
await app.register(reservationRoutes)
await app.register(auditRoutes)

// ── Error handler ────────────────────────────────────────
app.setErrorHandler(errorHandler)

// ── Health check ─────────────────────────────────────────
app.get("/", async () => ({ status: "Aukani POS API running", version: "2.0.0" }))

// ── Graceful shutdown ────────────────────────────────────
const shutdown = async () => { await prisma.$disconnect(); await app.close(); process.exit(0) }
process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)

// ── Start ────────────────────────────────────────────────
try {
  await app.listen({ port: Number(process.env.PORT) || 3000, host: "0.0.0.0" })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}