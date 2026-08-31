import { printerService } from "@/services/printer.service"

// ── Config del negocio desde localStorage ────────────────
function getBusiness() {
  try {
    const s = JSON.parse(localStorage.getItem("aukani_business") || "{}")
    return {
      name:    s.name    || "Aukani POS",
      nit:     s.nit     || "",
      address: s.address || "",
      phone:   s.phone   || "",
      footer:  s.footer  || "¡Gracias por su compra!",
    }
  } catch {
    return { name: "Aukani POS", nit: "", address: "", phone: "", footer: "¡Gracias por su compra!" }
  }
}

// ── Formateo ──────────────────────────────────────────────
const cop = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(Number(v || 0))

// ── HTML de la factura ────────────────────────────────────
export function buildReceiptHTML(order, business) {
  business = business || getBusiness()
  const date = new Date(order.createdAt || Date.now())
  const dateStr = date.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" })
  const timeStr = date.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })

  const itemsHTML = (order.items || []).map(item => `
    <tr>
      <td>${item.product?.name || item.name}</td>
      <td class="center">${item.quantity}</td>
      <td class="right">${cop(Number(item.price) * item.quantity)}</td>
    </tr>`).join("")

  const paymentsHTML = (order.payments || []).map(p => `
    <tr>
      <td colspan="2">${p.paymentMethod?.name || "Pago"}</td>
      <td class="right">${cop(p.amount)}</td>
    </tr>`).join("")

  const change = Number(order.change || 0)

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Factura #${order.id}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',monospace;font-size:12px;width:72mm;margin:0 auto;padding:3mm;color:#000;background:#fff}
  .center{text-align:center}.right{text-align:right}.bold{font-weight:bold}
  .lg{font-size:15px}.xl{font-size:19px}
  hr{border:none;border-top:1px dashed #000;margin:4px 0}
  table{width:100%;border-collapse:collapse}
  th{font-weight:bold;border-bottom:1px solid #000;padding:2px 0;font-size:11px}
  td{padding:2px 0;vertical-align:top}
  .total-row td{border-top:1px solid #000;font-weight:bold;padding-top:4px;font-size:13px}
  .change-row td{font-size:12px}
  .footer{margin-top:6px;font-size:10px}
  @media print{
    body{width:72mm}
    @page{margin:0;size:80mm auto}
  }
</style>
</head>
<body>
  <div class="center">
    <p class="bold xl">${business.name}</p>
    ${business.nit ? `<p class="bold">NIT: ${business.nit}</p>` : ""}
    ${business.address ? `<p>${business.address}</p>` : ""}
    ${business.phone ? `<p>Tel: ${business.phone}</p>` : ""}
  </div>
  <hr>
  <p><b>Factura #:</b> ${order.id}</p>
  <p><b>Fecha:</b> ${dateStr} ${timeStr}</p>
  ${order.user?.name ? `<p><b>Cajero:</b> ${order.user.name}</p>` : ""}
  <hr>
  <table>
    <thead><tr><th style="text-align:left">Producto</th><th style="text-align:center">Cant</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>${itemsHTML}</tbody>
  </table>
  <hr>
  <table>
    <tbody>
      ${paymentsHTML}
      <tr class="total-row"><td colspan="2">TOTAL</td><td class="right">${cop(order.total)}</td></tr>
      ${change > 0 ? `<tr class="change-row"><td colspan="2">Cambio</td><td class="right">${cop(change)}</td></tr>` : ""}
    </tbody>
  </table>
  <hr>
  <div class="center footer">
    <p>${business.footer}</p>
    <p style="margin-top:3px;font-size:9px">Aukani POS</p>
  </div>
  <div style="height:18mm"></div>
</body>
</html>`
}

// ── Imprimir factura ──────────────────────────────────────
export async function printReceipt(order, business) {
  const html = buildReceiptHTML(order, business)
  const result = await printerService.print(html)
  if (!result.ok) {
    console.warn("[Impresora] Error nativo:", result.error)
  }
}

// ── Abrir cajón de efectivo ───────────────────────────────
export async function openCashDrawer() {
  const result = await printerService.openDrawer()
  if (!result.ok) {
    console.warn("[Cajón] No se pudo abrir:", result.error)
  }
}

// ── Combinado: venta completada ───────────────────────────
export async function handleSaleReceipt(order) {
  const hasCash = (order.payments || []).some(p =>
    p.paymentMethod?.name?.toLowerCase().includes("efectivo")
  )
  if (hasCash) openCashDrawer() // no await — no bloqueamos
  printReceipt(order)
}

// ── Colilla de emergencia (apagón) ─────────────────────────
// shift/cashAvailable pueden venir null si no hubo respuesta a tiempo del servidor —
// en ese caso se imprime igual, con un mensaje predeterminado en esos campos.
const NO_DATA_MSG = "No disponible — sin conexión al servidor, verificar manualmente"

export function buildEmergencyReceiptHTML({ shift, cashAvailable, openAccounts, printedAt }, business) {
  business = business || getBusiness()
  const printed = printedAt || new Date()
  const printedStr = `${printed.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" })} ${printed.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`

  const openedStr = shift?.openedAt
    ? new Date(shift.openedAt).toLocaleString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : NO_DATA_MSG

  const accountsHTML = (openAccounts || []).length === 0
    ? `<p class="center" style="margin-top:4px">Sin cuentas abiertas</p>`
    : (openAccounts || []).map(acc => {
        // Las cuentas (mesas) guardan lo agregado localmente en "items" y lo ya
        // despachado/confirmado en "remoteItems" (POSPage.jsx:1013-1022) — hay que
        // sumar ambos, si no, una cuenta con solo productos despachados sale vacía.
        const allItems = [...(acc.items || []), ...(acc.remoteItems || [])]
        const itemsHTML = allItems.map(item => `
          <tr>
            <td>${item.name}</td>
            <td class="center">${item.quantity}</td>
            <td class="right">${cop(Number(item.price) * item.quantity)}</td>
          </tr>`).join("")
        const total = allItems.reduce((s, i) => s + Number(i.price) * i.quantity, 0)
        return `
          <hr>
          <p class="bold">${acc.name || acc.label}</p>
          <table>
            <thead><tr><th style="text-align:left">Producto</th><th style="text-align:center">Cant</th><th style="text-align:right">Total</th></tr></thead>
            <tbody>${itemsHTML}</tbody>
          </table>
          <table><tbody><tr class="total-row"><td colspan="2">TOTAL</td><td class="right">${cop(total)}</td></tr></tbody></table>
        `
      }).join("")

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Colilla de emergencia</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',monospace;font-size:12px;width:72mm;margin:0 auto;padding:3mm;color:#000;background:#fff}
  .center{text-align:center}.right{text-align:right}.bold{font-weight:bold}
  .lg{font-size:15px}.xl{font-size:19px}
  hr{border:none;border-top:1px dashed #000;margin:4px 0}
  table{width:100%;border-collapse:collapse}
  th{font-weight:bold;border-bottom:1px solid #000;padding:2px 0;font-size:11px}
  td{padding:2px 0;vertical-align:top}
  .total-row td{border-top:1px solid #000;font-weight:bold;padding-top:4px;font-size:13px}
  .warn{border:1px solid #000;padding:3px;margin:4px 0}
  @media print{
    body{width:72mm}
    @page{margin:0;size:80mm auto}
  }
</style>
</head>
<body>
  <div class="center">
    <p class="bold xl">${business.name}</p>
    <p class="bold lg" style="margin-top:4px">COLILLA DE EMERGENCIA</p>
    <p style="font-size:10px">Corte de energía / respaldo manual</p>
  </div>
  <hr>
  <p><b>Impreso:</b> ${printedStr}</p>
  <hr>
  <p class="bold">TURNO</p>
  <p><b>Cajero:</b> ${shift?.user?.name || NO_DATA_MSG}</p>
  <p><b>Abierto:</b> ${openedStr}</p>
  <p><b>Base inicial:</b> ${shift ? cop(shift.openingCash) : NO_DATA_MSG}</p>
  <div class="warn">
    <p><b>Efectivo esperado en caja:</b></p>
    <p class="bold lg">${cashAvailable != null ? cop(cashAvailable) : NO_DATA_MSG}</p>
  </div>
  <hr>
  <p class="bold center">CUENTAS ABIERTAS</p>
  ${accountsHTML}
  <hr>
  <div class="center" style="margin-top:4px;font-size:9px">
    <p>Verificar y conciliar apenas se restablezca el servicio.</p>
    <p style="margin-top:3px">Aukani POS</p>
  </div>
  <div style="height:18mm"></div>
</body>
</html>`
}

export async function printEmergencyReceipt(data, business) {
  const html = buildEmergencyReceiptHTML(data, business)
  const result = await printerService.print(html)
  if (!result.ok) {
    console.warn("[Impresora] Error al imprimir colilla de emergencia (mostrando vista previa):", result.error)
    await printerService.preview(html)
    return { ok: true, previewed: true, error: result.error }
  }
  return result
}

// ── Listado de inventario con precios (respaldo para operar sin sistema) ──
export function buildInventoryReceiptHTML({ products, printedAt }, business) {
  business = business || getBusiness()
  const printed = printedAt || new Date()
  const printedStr = `${printed.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" })} ${printed.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}`

  // Agrupar por categoría para que sea más fácil de usar en papel
  const groups = new Map()
  for (const p of products || []) {
    const key = p.category?.name || "Sin categoría"
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(p)
  }

  const groupsHTML = [...groups.entries()].map(([categoryName, items]) => `
    <p class="bold" style="margin-top:6px">${categoryName}</p>
    ${items.map(p => `
      <div class="leader">
        <span class="name">${p.name}</span>
        <span class="dots"></span>
        <span class="price">${cop(p.price)}</span>
      </div>`).join("")}
  `).join("")

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Inventario y precios</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',monospace;font-size:12px;width:72mm;margin:0 auto;padding:3mm;color:#000;background:#fff}
  .center{text-align:center}.right{text-align:right}.bold{font-weight:bold}
  .lg{font-size:15px}.xl{font-size:19px}
  hr{border:none;border-top:1px dashed #000;margin:4px 0}
  .leader{display:flex;align-items:flex-end;gap:2px;padding:1px 0}
  .leader .name{white-space:nowrap;overflow:hidden}
  .leader .dots{flex:1;border-bottom:1px dotted #000;margin-bottom:2px}
  .leader .price{white-space:nowrap}
  @media print{
    body{width:72mm}
    @page{margin:0;size:80mm auto}
  }
</style>
</head>
<body>
  <div class="center">
    <p class="bold xl">${business.name}</p>
    <p class="bold lg" style="margin-top:4px">INVENTARIO Y PRECIOS</p>
    <p style="font-size:10px">Respaldo para operar sin sistema</p>
  </div>
  <hr>
  <p><b>Impreso:</b> ${printedStr}</p>
  <p><b>Total productos:</b> ${(products || []).length}</p>
  ${groupsHTML}
  <hr>
  <div class="center" style="margin-top:4px;font-size:9px">
    <p>Aukani POS</p>
  </div>
  <div style="height:18mm"></div>
</body>
</html>`
}

export async function printInventoryReceipt(data, business) {
  const html = buildInventoryReceiptHTML(data, business)
  const result = await printerService.print(html)
  if (!result.ok) {
    console.warn("[Impresora] Error al imprimir inventario (mostrando vista previa):", result.error)
    await printerService.preview(html)
    return { ok: true, previewed: true, error: result.error }
  }
  return result
}
