import { useState, useEffect } from "react"
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
//
// Requiere turno abierto: sin turno no hay caja/cuentas que respaldar, así que el
// botón se ve "apagado" y al presionarlo solo ofrece imprimir el inventario (que no
// depende de haber abierto turno). Esto solo bloquea cuando el servidor CONFIRMA
// (404) que no hay turno — si el servidor no responde (la razón de ser de este
// botón durante un apagón), se asume que sí puede haber turno y se imprime con los
// mensajes predeterminados, igual que siempre.
const CASH_METHOD_MATCH = "efectivo"
const SHIFT_CHECK_INTERVAL = 30000

export default function EmergencyPrintButton() {
  const [loading, setLoading] = useState(false)
  const [hasShift, setHasShift] = useState(true) // optimista: no apagar el botón mientras se confirma

  useEffect(() => {
    let cancelled = false
    const checkShift = async () => {
      try {
        await api.get("/shifts/active", { timeout: 4000 })
        if (!cancelled) setHasShift(true)
      } catch (err) {
        if (!cancelled && err?.response?.status === 404) setHasShift(false)
        else if (!cancelled) setHasShift(true)
      }
    }
    checkShift()
    const interval = setInterval(checkShift, SHIFT_CHECK_INTERVAL)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  const printInventoryOnly = async () => {
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

  const handleClick = async () => {
    if (loading) return
    setLoading(true)

    let shift = null
    let cashAvailable = null
    let noShift = false
    try {
      shift = await api.get("/shifts/active", { timeout: 4000 }).then(r => r.data)
      const cashPayment = (shift.shiftPayments || [])
        .find(p => p.paymentMethod?.name?.toLowerCase().includes(CASH_METHOD_MATCH))
      const cashSales = Number(cashPayment?.total || 0)
      const cashExpenses = (shift.expenses || [])
        .filter(e => e.paymentMethod?.name?.toLowerCase().includes(CASH_METHOD_MATCH))
        .reduce((sum, e) => sum + Number(e.amount), 0)
      cashAvailable = Number(shift.openingCash) + cashSales - cashExpenses
    } catch (err) {
      if (err?.response?.status === 404) noShift = true
      shift = null
      cashAvailable = null
    }
    setLoading(false)

    if (noShift) {
      setHasShift(false)
      const wantsInventory = await confirm({
        title: "No hay turno abierto",
        message: "Debes abrir un turno antes de usar el botón de emergencia — sin turno no hay caja ni cuentas que respaldar. ¿Deseas imprimir al menos el inventario con precios? (esto no depende del turno)",
        confirmLabel: "Imprimir inventario",
        cancelLabel: "Cancelar",
        variant: "warning",
      })
      if (wantsInventory) await printInventoryOnly()
      return
    }

    const result = await printEmergencyReceipt({ shift, cashAvailable, openAccounts: useCartStore.getState().sales.filter(s => s.type === "account"), printedAt: new Date() })
    if (result.previewed) {
      toast("No se detectó impresora — mostrando vista previa", { icon: "🖨️" })
    } else if (result.ok) {
      toast.success(shift ? "Colilla de emergencia impresa" : "Colilla impresa — sin conexión al servidor")
    } else {
      toast.error("No se pudo imprimir: " + (result.error || "error desconocido"))
    }

    // Después de la colilla, preguntar si también se necesita el inventario completo
    const wantsInventory = await confirm({
      title: "¿Imprimir también el inventario?",
      message: "Se imprime aparte, con todos los productos y su precio — útil para seguir vendiendo manualmente en papel.",
      confirmLabel: "Sí, imprimir inventario",
      cancelLabel: "No",
      variant: "brand",
    })
    if (wantsInventory) await printInventoryOnly()
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title={hasShift
        ? "Emergencia: imprimir estado de caja, cuentas abiertas, y opcionalmente el inventario"
        : "No hay turno abierto — solo se puede imprimir el inventario"}
      className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-opacity"
      style={{
        background: hasShift ? "var(--danger)" : "var(--border)",
        color: hasShift ? "white" : "var(--text-muted)",
        opacity: loading ? 0.6 : 1,
      }}>
      {loading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} fill={hasShift ? "white" : "none"} />}
    </button>
  )
}
