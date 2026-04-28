import prisma from "../config/prisma.js"

export const orderService = {
  async createSale({ items, payments, userId, shiftId, accountId = null, accountItemUpdates = [] }) {
    const shift = await prisma.shift.findUnique({ where: { id: shiftId } })
    if (!shift || shift.status !== "OPEN") {
      throw { statusCode: 400, message: "Debes tener un turno abierto para realizar ventas" }
    }

    return prisma.$transaction(async (tx) => {
      let total = 0
      const orderItems = []

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } })
        if (!product || !product.active) throw { statusCode: 404, message: `Producto no encontrado: ID ${item.productId}` }

        const isService = product.type === "SERVICE"
        if (!isService && product.stock < item.quantity) throw { statusCode: 409, message: `Stock insuficiente para "${product.name}". Disponible: ${product.stock}` }

        const customPrice = item.customPrice != null && Number(item.customPrice) > 0
          ? Number(item.customPrice)
          : null
        const effectivePrice = customPrice ?? Number(product.price)
        const originalPrice  = customPrice !== null && customPrice !== Number(product.price)
          ? Number(product.price)
          : null

        total += effectivePrice * item.quantity
        orderItems.push({
          productId: product.id,
          quantity: item.quantity,
          price: effectivePrice,
          ...(originalPrice !== null && { originalPrice }),
          ...(originalPrice !== null && item.priceNote && { priceNote: item.priceNote }),
        })

        if (!isService) {
          await tx.product.update({ where: { id: product.id }, data: { stock: { decrement: item.quantity } } })
          await tx.inventoryMovement.create({ data: { productId: product.id, userId, type: "SALE", quantity: item.quantity, reason: "Venta" } })
        }
      }

      const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0)
      if (totalPaid < total) throw { statusCode: 400, message: `Pago insuficiente. Total: ${total}, Pagado: ${totalPaid}` }

      // Distribuir el total real de la venta entre los métodos de pago proporcionalmente.
      // Si el cliente paga $50.000 en efectivo por una venta de $30.000,
      // el negocio retiene $30.000 (no $50.000). El cambio NO entra a caja.
      const change = totalPaid - total
      const paymentsToRecord = payments
        .filter(p => Number(p.amount) > 0)
        .map((p, idx, arr) => {
          const paidAmount = Number(p.amount)
          // El cambio siempre sale del último método de pago con saldo
          // Si hay un solo método: registrar solo el total de la venta
          if (arr.length === 1) {
            return { paymentMethodId: p.paymentMethodId, amount: total }
          }
          // Si hay múltiples métodos: el cambio sale del último que tenga excedente
          if (idx === arr.length - 1) {
            const previousTotal = arr.slice(0, idx).reduce((s, x) => s + Number(x.amount), 0)
            const thisMethodNet = total - previousTotal
            return { paymentMethodId: p.paymentMethodId, amount: Math.max(0, thisMethodNet) }
          }
          // Los métodos anteriores al último se registran completos (asumiendo que no tienen cambio)
          return { paymentMethodId: p.paymentMethodId, amount: paidAmount }
        })
        .filter(p => p.amount > 0)

      const order = await tx.order.create({
        data: {
          total, userId, shiftId,
          items: { create: orderItems },
          payments: { create: paymentsToRecord },
        },
        include: {
          items: { include: { product: { select: { id: true, name: true } } } },
          payments: { include: { paymentMethod: true } },
        },
      })

      // Gestión de cuenta abierta tras el pago
      if (accountId) {
        for (const upd of accountItemUpdates) {
          const ai = await tx.accountItem.findUnique({ where: { id: upd.id } })
          if (!ai) continue
          if (upd.quantityPaid >= ai.quantity) {
            await tx.accountItem.delete({ where: { id: upd.id } })
          } else {
            await tx.accountItem.update({
              where: { id: upd.id },
              data: { quantity: { decrement: upd.quantityPaid } },
            })
          }
        }
        // Cerrar la cuenta solo si no quedan items pendientes
        const remaining = await tx.accountItem.count({ where: { accountId } })
        if (remaining === 0) {
          await tx.account.update({
            where: { id: accountId },
            data: { status: "CLOSED", closedAt: new Date() },
          })
        }
      }

      return { ...order, change: totalPaid - total }
    })
  },

  async cancel(orderId, userId) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } })
    if (!order) throw { statusCode: 404, message: "Venta no encontrada" }
    if (order.status !== "COMPLETED") throw { statusCode: 409, message: "La venta ya fue cancelada" }

    return prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } })
        if (product && product.type !== "SERVICE") {
          await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } })
          await tx.inventoryMovement.create({ data: { productId: item.productId, userId, type: "ENTRY", quantity: item.quantity, reason: `Cancelación venta #${orderId}` } })
        }
      }
      return tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } })
    })
  },

  // items: [{ orderItemId, quantity }], refundPaymentMethodId: Int
  async refund(orderId, userId, items, refundPaymentMethodId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    })
    if (!order) throw { statusCode: 404, message: "Venta no encontrada" }
    if (order.status === "CANCELLED")      throw { statusCode: 409, message: "La venta está cancelada" }
    if (order.status === "REFUNDED")       throw { statusCode: 409, message: "La venta ya fue devuelta completamente" }
    if (!refundPaymentMethodId)            throw { statusCode: 400, message: "Debes indicar el método de devolución" }

    const paymentMethod = await prisma.paymentMethod.findUnique({ where: { id: refundPaymentMethodId } })
    if (!paymentMethod) throw { statusCode: 400, message: "Método de pago no encontrado" }

    // Validar que cada item exista en la orden y la cantidad sea válida
    for (const r of items) {
      const orderItem = order.items.find(i => i.id === r.orderItemId)
      if (!orderItem) throw { statusCode: 400, message: `Artículo #${r.orderItemId} no pertenece a esta venta` }
      const remaining = orderItem.quantity - orderItem.refundedQty
      if (r.quantity <= 0 || r.quantity > remaining) {
        throw { statusCode: 400, message: `Cantidad inválida para "${orderItem.product?.name}". Máximo a devolver: ${remaining}` }
      }
    }

    const refundTotal = items.reduce((sum, r) => {
      const orderItem = order.items.find(i => i.id === r.orderItemId)
      return sum + Number(orderItem.price) * r.quantity
    }, 0)

    return prisma.$transaction(async (tx) => {
      for (const r of items) {
        const orderItem = order.items.find(i => i.id === r.orderItemId)

        // Actualizar refundedQty en el item
        await tx.orderItem.update({
          where: { id: orderItem.id },
          data: { refundedQty: { increment: r.quantity } },
        })

        if (orderItem.product?.type !== "SERVICE") {
          await tx.product.update({
            where: { id: orderItem.productId },
            data: { stock: { increment: r.quantity } },
          })
          await tx.inventoryMovement.create({
            data: {
              productId: orderItem.productId,
              userId,
              type: "ENTRY",
              quantity: r.quantity,
              reason: `Devolución venta #${orderId}`,
            },
          })
        }
      }

      // Registrar el pago de devolución como monto negativo en el mismo turno
      await tx.orderPayment.create({
        data: { orderId, paymentMethodId: refundPaymentMethodId, amount: -refundTotal },
      })

      // Calcular el estado tras aplicar esta devolución
      const updatedItems = await tx.orderItem.findMany({ where: { orderId } })
      const isFullRefund = updatedItems.every(oi => oi.refundedQty >= oi.quantity)
      const newStatus = isFullRefund ? "REFUNDED" : "PARTIAL_REFUND"

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: newStatus },
        include: {
          items: { include: { product: { select: { id: true, name: true } } } },
          payments: { include: { paymentMethod: true } },
          user: { select: { id: true, name: true } },
        },
      })

      return { order: updatedOrder, refundTotal, refundedItems: items, refundPaymentMethod: paymentMethod.name }
    })
  },

  async getAll({ page = 1, limit = 20, from, to, userId, shiftId } = {}) {
    const skip = (page - 1) * limit
    const where = {}
    if (from || to) { where.createdAt = {}; if (from) where.createdAt.gte = new Date(from); if (to) where.createdAt.lte = new Date(to) }
    if (userId) where.userId = userId
    if (shiftId) where.shiftId = shiftId

    const [raw, total] = await Promise.all([
      prisma.order.findMany({
        where, skip, take: limit, orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true } },
          payments: { include: { paymentMethod: true } },
          _count: { select: { items: true } },
          items: { where: { originalPrice: { not: null } }, select: { id: true }, take: 1 },
        },
      }),
      prisma.order.count({ where }),
    ])

    const orders = raw.map(({ items, ...o }) => ({
      ...o,
      hasAdjustedPrices: items.length > 0,
    }))

    return { orders, total, page, limit }
  },

  async getById(id) {
    return prisma.order.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true } }, items: { include: { product: { select: { id: true, name: true, barcode: true } } } }, payments: { include: { paymentMethod: true } } },
    })
  },

  async getDailySummary() {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
    const where = { createdAt: { gte: today, lt: tomorrow }, status: "COMPLETED" }
    const [count, aggregate] = await Promise.all([prisma.order.count({ where }), prisma.order.aggregate({ where, _sum: { total: true } })])
    return { date: today.toISOString().split("T")[0], totalOrders: count, totalRevenue: Number(aggregate._sum.total ?? 0) }
  },

  async getAccountingReport({ from, to }) {
    // Parsear fechas — siempre cubrir el día completo
    const dateFrom = from
      ? (() => { const d = new Date(from + "T00:00:00.000Z"); return d })()
      : (() => { const d = new Date(); d.setUTCDate(d.getUTCDate() - 6); d.setUTCHours(0,0,0,0); return d })()

    const dateTo = to
      ? (() => { const d = new Date(to + "T23:59:59.999Z"); return d })()
      : (() => { const d = new Date(); d.setUTCHours(23,59,59,999); return d })()

    // Totales generales
    const [completedAgg, completedCount, cancelledCount] = await Promise.all([
      prisma.order.aggregate({ where: { createdAt: { gte: dateFrom, lte: dateTo }, status: "COMPLETED" }, _sum: { total: true } }),
      prisma.order.count({ where: { createdAt: { gte: dateFrom, lte: dateTo }, status: "COMPLETED" } }),
      prisma.order.count({ where: { createdAt: { gte: dateFrom, lte: dateTo }, status: "CANCELLED" } }),
    ])

    const totalRevenue = Number(completedAgg._sum.total ?? 0)
    const avgTicket    = completedCount > 0 ? totalRevenue / completedCount : 0

    // IDs de órdenes completadas — necesario para sub-queries (Prisma no permite filtrar por relación en groupBy)
    const completedOrders = await prisma.order.findMany({
      where: { createdAt: { gte: dateFrom, lte: dateTo }, status: "COMPLETED" },
      select: { id: true },
    })
    const orderIds = completedOrders.map(o => o.id)

    // Desglose por método de pago
    let paymentBreakdown = []
    if (orderIds.length > 0) {
      const paymentRows = await prisma.orderPayment.groupBy({
        by: ["paymentMethodId"],
        where: { orderId: { in: orderIds } },
        _sum: { amount: true },
        _count: { id: true },
      })
      const methods   = await prisma.paymentMethod.findMany({ where: { id: { in: paymentRows.map(r => r.paymentMethodId) } } })
      const methodMap = Object.fromEntries(methods.map(m => [m.id, m.name]))
      paymentBreakdown = paymentRows
        .map(r => ({
          name:   methodMap[r.paymentMethodId] || "Otro",
          amount: Number(r._sum.amount ?? 0),
          count:  r._count.id,
          pct:    totalRevenue > 0 ? Math.round((Number(r._sum.amount ?? 0) / totalRevenue) * 100) : 0,
        }))
        .sort((a, b) => b.amount - a.amount)
    }

    // Tendencia diaria (una query por día, máximo 31 iteraciones)
    const msPerDay = 86_400_000
    const dayCount = Math.min(Math.ceil((dateTo - dateFrom) / msPerDay) + 1, 31)
    const dailyTrend = await Promise.all(
      Array.from({ length: dayCount }, (_, i) => {
        const dayStart = new Date(dateFrom.getTime() + i * msPerDay)
        dayStart.setUTCHours(0, 0, 0, 0)
        const dayEnd = new Date(dayStart); dayEnd.setUTCHours(23, 59, 59, 999)
        return Promise.all([
          prisma.order.aggregate({ where: { createdAt: { gte: dayStart, lte: dayEnd }, status: "COMPLETED" }, _sum: { total: true } }),
          prisma.order.count({ where: { createdAt: { gte: dayStart, lte: dayEnd }, status: "COMPLETED" } }),
        ]).then(([agg, cnt]) => ({
          date:    dayStart.toISOString().split("T")[0],
          revenue: Number(agg._sum.total ?? 0),
          orders:  cnt,
        }))
      })
    )

    // Desglose por tipo de producto para la tendencia
    if (orderIds.length > 0) {
      const typeRows = await prisma.$queryRaw`
        SELECT o."createdAt"::date AS date,
               p.type,
               CAST(SUM(oi.quantity * oi.price) AS FLOAT) AS revenue
        FROM "Order" o
        JOIN "OrderItem" oi ON oi."orderId" = o.id
        JOIN "Product" p ON p.id = oi."productId"
        WHERE o.id = ANY(${orderIds}::int[])
        GROUP BY o."createdAt"::date, p.type
      `
      const typeMap = {}
      for (const row of typeRows) {
        const d = row.date instanceof Date ? row.date.toISOString().split("T")[0] : String(row.date)
        if (!typeMap[d]) typeMap[d] = { SERVICE: 0, PHYSICAL: 0 }
        typeMap[d][row.type] = Number(row.revenue)
      }
      for (const day of dailyTrend) {
        day.revenueServices = typeMap[day.date]?.SERVICE ?? 0
        day.revenueProducts = typeMap[day.date]?.PHYSICAL ?? 0
      }
    } else {
      for (const day of dailyTrend) {
        day.revenueServices = 0
        day.revenueProducts = 0
      }
    }

    // Top productos — raw SQL para calcular revenue correcto (price × quantity)
    let topProducts = []
    if (orderIds.length > 0) {
      topProducts = await prisma.$queryRaw`
        SELECT p.name,
               CAST(SUM(oi.quantity) AS INT) AS quantity,
               CAST(SUM(oi.quantity * oi.price) AS FLOAT) AS revenue
        FROM "OrderItem" oi
        JOIN "Product" p ON p.id = oi."productId"
        WHERE oi."orderId" = ANY(${orderIds}::int[])
        GROUP BY p.id, p.name
        ORDER BY revenue DESC
        LIMIT 5
      `
      topProducts = topProducts.map(r => ({
        name: r.name,
        quantity: Number(r.quantity),
        revenue: Number(r.revenue),
      }))
    }

    return {
      period: { from: dateFrom.toISOString(), to: dateTo.toISOString() },
      summary: { totalRevenue, totalOrders: completedCount, avgTicket, cancelledCount },
      paymentBreakdown,
      dailyTrend,
      topProducts,
    }
  },
}