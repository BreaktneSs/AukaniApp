import { PrismaClient } from "@prisma/client"
import bcrypt from "bcrypt"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding database...")

  // Métodos de pago
  await prisma.paymentMethod.createMany({
    data: [{ name: "Efectivo" }, { name: "Tarjeta" }, { name: "Nequi" }],
    skipDuplicates: true,
  })
  console.log("✅ Métodos de pago creados")

  // Categorías
  await prisma.category.createMany({
    data: [{ name: "Bebidas" }, { name: "Abarrotes" }, { name: "Lácteos" }, { name: "Limpieza" }, { name: "Panadería" }],
    skipDuplicates: true,
  })
  console.log("✅ Categorías creadas")

  // Usuario admin
  const hashed = await bcrypt.hash("admin123", 10)
  await prisma.user.upsert({
    where: { email: "admin@aukani.com" },
    update: {},
    create: { name: "Administrador", email: "admin@aukani.com", password: hashed, role: "ADMIN" },
  })
  console.log("✅ Usuario admin creado (admin@aukani.com / admin123)")

  // Productos de prueba
  const bebidas = await prisma.category.findUnique({ where: { name: "Bebidas" } })
  const abarrotes = await prisma.category.findUnique({ where: { name: "Abarrotes" } })

  await prisma.product.createMany({
    data: [
      { name: "Coca Cola 350ml", price: 1.5, cost: 0.9, stock: 100, minStock: 10, barcode: "7501055300274", categoryId: bebidas.id },
      { name: "Agua Natural 500ml", price: 1.0, cost: 0.5, stock: 150, minStock: 20, barcode: "7501055300281", categoryId: bebidas.id },
      { name: "Arroz 1kg", price: 2.0, cost: 1.2, stock: 80, minStock: 15, barcode: "7501000300019", categoryId: abarrotes.id },
      { name: "Aceite 1L", price: 4.5, cost: 3.0, stock: 30, minStock: 5, barcode: "7501000400020", categoryId: abarrotes.id },
    ],
    skipDuplicates: true,
  })
  console.log("✅ Productos de prueba creados")
  console.log("\n🚀 Seed completado. Inicia sesión con admin@aukani.com / admin123")
}

main().catch(console.error).finally(() => prisma.$disconnect())