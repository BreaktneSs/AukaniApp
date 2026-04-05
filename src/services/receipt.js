import { agentService } from "@/services/agent.service"

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

function getAgentConfig() {
  try {
    return JSON.parse(localStorage.getItem("aukani_agent") || "{}")
  } catch { return {} }
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
  const agentCfg = getAgentConfig()

  // Intentar imprimir via agente local (silencioso en background)
  if (agentCfg.useAgent !== false) {
    const result = await agentService.print(html, agentCfg.printer || null)
    if (result.ok) return
  }

  // Fallback: ventana del navegador
  const win = window.open("", "_blank", "width=340,height=600,toolbar=0,scrollbars=1")
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print(); win.onafterprint = () => win.close() }, 300)
}

// ── Abrir cajón de efectivo ───────────────────────────────
export async function openCashDrawer() {
  const agentCfg = getAgentConfig()
  if (agentCfg.useAgent === false) return
  const result = await agentService.openDrawer()
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