import Fastify from "fastify"

const app = Fastify({
  logger: true
})

app.get("/", async () => {
  return { status: "Aukani POS API running" }
})

const start = async () => {
  try {
    await app.listen({ port: 3000, host: "0.0.0.0" })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

app.post("/sale", async (req) => {

  const { items } = req.body

  const result = await prisma.$transaction(async (tx) => {

    let total = 0

    const orderItems = []

    for (const item of items) {

      const product = await tx.product.findUnique({
        where: { id: item.productId }
      })

      if (!product) {
        throw new Error("Product not found")
      }

      if (product.stock < item.quantity) {
        throw new Error(`Not enough stock for ${product.name}`)
      }

      const price = product.price * item.quantity

      total += price

      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: product.price
      })

      await tx.product.update({
        where: { id: product.id },
        data: {
          stock: product.stock - item.quantity
        }
      })

    }

    const order = await tx.order.create({
      data: {
        total,
        items: {
          create: orderItems
        }
      },
      include: {
        items: true
      }
    })

    return order

  })

  return result

})

start()