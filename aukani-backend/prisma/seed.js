import { PrismaClient } from "@prisma/client"
import bcrypt from "bcrypt"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding database...")

  // ── Métodos de pago ───────────────────────────────────────
  await prisma.paymentMethod.createMany({
    data: [{ name: "Efectivo" }, { name: "Tarjeta" }, { name: "Nequi" }, { name: "Daviplata" }],
    skipDuplicates: true,
  })
  console.log("✅ Métodos de pago creados")

  // ── Categorías ────────────────────────────────────────────
  await prisma.category.createMany({
    data: [
      { name: "Entradas" },
      { name: "Bebidas" },
      { name: "Golosinas" },
      { name: "Snacks" },
    ],
    skipDuplicates: true,
  })
  console.log("✅ Categorías creadas")

  // ── Usuario admin ─────────────────────────────────────────
  const hashed = await bcrypt.hash("admin123", 10)
  await prisma.user.upsert({
    where: { email: "admin@aukani.com" },
    update: {},
    create: { name: "Administrador", email: "admin@aukani.com", password: hashed, role: "ADMIN" },
  })
  console.log("✅ Usuario admin creado (admin@aukani.com / admin123)")

  // ── Refs de categorías ────────────────────────────────────
  const [entradas, bebidas, golosinas, snacks] = await Promise.all([
    prisma.category.findUnique({ where: { name: "Entradas" } }),
    prisma.category.findUnique({ where: { name: "Bebidas" } }),
    prisma.category.findUnique({ where: { name: "Golosinas" } }),
    prisma.category.findUnique({ where: { name: "Snacks" } }),
  ])

  // ── Entradas (servicios) ──────────────────────────────────
  await prisma.product.createMany({
    data: [
      { name: "Entrada Adulto",       type: "SERVICE", price: 15000, cost: 0, categoryId: entradas.id },
      { name: "Entrada Niño",         type: "SERVICE", price: 8000,  cost: 0, categoryId: entradas.id },
    ],
    skipDuplicates: true,
  })

  // ── Bebidas ───────────────────────────────────────────────
  await prisma.product.createMany({
    data: [
      { name: "Coca Cola 350ml",       price: 3000,  cost: 1800, stock: 120, minStock: 24, barcode: "7501055300274", categoryId: bebidas.id },
      { name: "Coca Cola 600ml",       price: 4500,  cost: 2800, stock: 72,  minStock: 12, categoryId: bebidas.id },
      { name: "Agua Cristal 600ml",    price: 2500,  cost: 1200, stock: 200, minStock: 48, barcode: "7702056020084", categoryId: bebidas.id },
      { name: "Gatorade 500ml",        price: 5000,  cost: 3200, stock: 80,  minStock: 20, barcode: "0052000013528", categoryId: bebidas.id },
      { name: "Pony Malta 330ml",      price: 3000,  cost: 1800, stock: 96,  minStock: 24, categoryId: bebidas.id },
      { name: "Jugo Hit 250ml",        price: 2500,  cost: 1500, stock: 96,  minStock: 24, barcode: "7702001010012", categoryId: bebidas.id },
      { name: "Sprite 350ml",          price: 3000,  cost: 1800, stock: 72,  minStock: 12, categoryId: bebidas.id },
      { name: "Postobón Manzana 350ml",price: 2800,  cost: 1600, stock: 72,  minStock: 12, categoryId: bebidas.id },
      { name: "Soda Bretaña 350ml",    price: 2500,  cost: 1400, stock: 60,  minStock: 12, categoryId: bebidas.id },
      { name: "Mr. Tea 400ml",         price: 3500,  cost: 2200, stock: 60,  minStock: 12, categoryId: bebidas.id },
      { name: "Café Tinto",            price: 1500,  cost: 400,  stock: 50,  minStock: 10, categoryId: bebidas.id },
    ],
    skipDuplicates: true,
  })

  // ── Golosinas colombianas ─────────────────────────────────
  await prisma.product.createMany({
    data: [
      { name: "Bon Bon Bum Fresa",     price: 500,   cost: 300,  stock: 300, minStock: 60, categoryId: golosinas.id },
      { name: "Bon Bon Bum Uva",       price: 500,   cost: 300,  stock: 300, minStock: 60, categoryId: golosinas.id },
      { name: "Chocolatina Jet 16g",   price: 1500,  cost: 900,  stock: 200, minStock: 40, categoryId: golosinas.id },
      { name: "Nucita 20g",            price: 800,   cost: 500,  stock: 200, minStock: 40, categoryId: golosinas.id },
      { name: "Chocoramo",             price: 2500,  cost: 1600, stock: 80,  minStock: 20, categoryId: golosinas.id },
      { name: "Gansito",               price: 2000,  cost: 1200, stock: 80,  minStock: 20, categoryId: golosinas.id },
      { name: "Colombina Frutas x5",   price: 500,   cost: 300,  stock: 400, minStock: 80, categoryId: golosinas.id },
      { name: "Supercoco",             price: 300,   cost: 150,  stock: 400, minStock: 80, categoryId: golosinas.id },
      { name: "Trululu 15g",           price: 500,   cost: 280,  stock: 300, minStock: 60, categoryId: golosinas.id },
      { name: "Pirulito",              price: 300,   cost: 150,  stock: 400, minStock: 80, categoryId: golosinas.id },
      { name: "Mantecada Ramo",        price: 2000,  cost: 1200, stock: 60,  minStock: 12, categoryId: golosinas.id },
    ],
    skipDuplicates: true,
  })

  // ── Snacks ────────────────────────────────────────────────
  await prisma.product.createMany({
    data: [
      { name: "Papas Margarita 30g",   price: 2000,  cost: 1200, stock: 120, minStock: 30, barcode: "7702001070019", categoryId: snacks.id },
      { name: "Papas Margarita 100g",  price: 5000,  cost: 3200, stock: 60,  minStock: 12, categoryId: snacks.id },
      { name: "Doritos 42g",           price: 3500,  cost: 2200, stock: 80,  minStock: 16, categoryId: snacks.id },
      { name: "Maní La Rosa 100g",     price: 3500,  cost: 2200, stock: 80,  minStock: 16, categoryId: snacks.id },
      { name: "Chitos 30g",            price: 2000,  cost: 1200, stock: 100, minStock: 24, categoryId: snacks.id },
      { name: "Galletas Oreo x3",      price: 1500,  cost: 900,  stock: 150, minStock: 30, categoryId: snacks.id },
    ],
    skipDuplicates: true,
  })

  console.log("✅ Productos creados")
  console.log("\n🚀 Seed completado. Inicia sesión con admin@aukani.com / admin123")
}

main().catch(console.error).finally(() => prisma.$disconnect())
