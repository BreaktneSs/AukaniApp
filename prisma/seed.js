import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

const products = [
  { name: "Coca Cola 350ml", price: 1.5, stock: 100, barcode: "7501055300274", category: "Bebidas" },
  { name: "Agua Natural 500ml", price: 1.0, stock: 150, barcode: "7501055300281", category: "Bebidas" },
  { name: "Pan Blanco", price: 2.5, stock: 40, barcode: "7501000100017", category: "Panadería" },
  { name: "Leche Entera 1L", price: 3.0, stock: 60, barcode: "7501000200018", category: "Lácteos" },
  { name: "Arroz 1kg", price: 2.0, stock: 80, barcode: "7501000300019", category: "Abarrotes" },
  { name: "Aceite 1L", price: 4.5, stock: 30, barcode: "7501000400020", category: "Abarrotes" },
  { name: "Azúcar 1kg", price: 1.8, stock: 50, barcode: "7501000500021", category: "Abarrotes" },
  { name: "Jabón de Manos", price: 2.2, stock: 45, barcode: "7501000600022", category: "Limpieza" },
]

async function main() {
  console.log("🌱 Seeding database...")
  await prisma.product.createMany({ data: products, skipDuplicates: true })
  console.log(`✅ ${products.length} productos creados`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())