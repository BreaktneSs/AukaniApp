import { useState } from "react"
import { Zap, Loader2 } from "lucide-react"
import toast from "react-hot-toast"
import api from "@/services/api"
import { useCartStore } from "@/store/cart.store"
import { printEmergencyReceipt, printInventoryReceipt } from "@/services/receipt"
import { productsService } from "@/services/products.service"
import { confirm } from "@/components/ui/ConfirmDialog"

// Botón de emergencia (apagón): intenta traer el estado real de caja con un timeout
// corto; si el servidor no responde a tiempo, igual imprime con un mensaje
// predeterminado en los campos de caja — las cuentas abiertas siempre se imprimen
// completas porque viven en el store local, no dependen del servidor.
// Después de esa colilla, pregunta aparte si también se quiere imprimir el
// inventario completo con precios (documento separado, para operar en papel).
const CASH_METHOD_MATCH = "efectivo"

export default function EmergencyPrintButton() {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (loading) return
    setLoading(true)

    let shift = null
    let cashAvailable = null
    try {
      shift = await api.get("/shifts/active", { timeout: 4000 }).then(r => r.data)
      const cashPayment = (shift.shiftPayments || [])
        .find(p => p.paymentMethod?.name?.toLowerCase().includes(CASH_METHOD_MATCH))
      const cashSales = Number(cashPayment?.total || 0)
      const cashExpenses = (shift.expenses || [])
        .filter(e => e.paymentMethod?.name?.toLowerCase().includes(CASH_METHOD_MATCH))
        .reduce((sum, e) => sum + Number(e.amount), 0)
      cashAvailable = Number(shift.openingCash) + cashSales - cashExpenses
    } catch {
      shift = null
      cashAvailable = null
    }

    const openAccounts = useCartStore.getState().sales.filter(s => s.type === "account")

    const result = await printEmergencyReceipt({ shift, cashAvailable, openAccounts, printedAt: new Date() })
    if (result.previewed) {
      toast("No se detectó impresora — mostrando vista previa", { icon: "🖨️" })
    } else if (result.ok) {
      toast.success(shift ? "Colilla de emergencia impresa" : "Colilla impresa — sin conexión al servidor")
    } else {
      toast.error("No se pudo imprimir: " + (result.error || "error desconocido"))
    }

    setLoading(false)

    // Después de la colilla, preguntar si también se necesita el inventario completo
    const wantsInventory = await confirm({
      title: "¿Imprimir también el inventario?",
      message: "Se imprime aparte, con todos los productos y su precio — útil para seguir vendiendo manualmente en papel.",
      confirmLabel: "Sí, imprimir inventario",
      cancelLabel: "No",
      variant: "brand",
    })
    if (!wantsInventory) return

    setLoading(true)
    try {
      const { products } = await productsService.getAll({ limit: 9999, active: true })
      const invResult = await printInventoryReceipt({ products, printedAt: new Date() })
      if (invResult.previewed) {
        toast("No se detectó impresora — mostrando vista previa del inventario", { icon: "🖨️" })
      } else if (invResult.ok) {
        toast.success("Inventario impreso")
      } else {
        toast.error("No se pudo imprimir el inventario: " + (invResult.error || "error desconocido"))
      }
    } catch {
      toast.error("No se pudo obtener el inventario — sin conexión al servidor")
    }
    setLoading(false)
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title="Emergencia: imprimir estado de caja, cuentas abiertas, y opcionalmente el inventario"
      className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-opacity"
      style={{ background: "var(--danger)", color: "white", opacity: loading ? 0.6 : 1 }}>
      {loading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} fill="white" />}
    </button>
  )
}
