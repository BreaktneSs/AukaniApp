import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ordersService } from "@/services/orders.service"
import { paymentMethodsService } from "@/services/catalog.service"
import { useUiStore } from "@/store/ui.store"
import NumPad from "@/components/ui/NumPad"
import { Eye, XCircle, RotateCcw, Loader2, ChevronLeft, ChevronRight, Minus, Plus, AlertTriangle } from "lucide-react"
import { confirm } from "@/components/ui/ConfirmDialog"
import { formatCOP } from "@/utils/currency"
import toast from "react-hot-toast"

const STATUS = {
  COMPLETED:      { label: "Completada",        color: "var(--brand)",   bg: "var(--brand-light)" },
  CANCELLED:      { label: "Cancelada",         color: "var(--danger)",  bg: "var(--danger-light)" },
  REFUNDED:       { label: "Reembolsada",       color: "var(--warning)", bg: "var(--warning-light)" },
  PARTIAL_REFUND: { label: "Dev. parcial",      color: "#7c3aed",        bg: "#ede9fe" },
}

// ── Detail modal ──────────────────────────────────────────────────────────────
function OrderDetail({ order, onClose, onRefund }) {
  const canRefund = order.status === "COMPLETED" || order.status === "PARTIAL_REFUND"
  const hasRefunds = order.items?.some(i => i.refundedQty > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="card p-6 w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg" style={{ color: "var(--text-primary)" }}>
            Venta #{order.id}
          </h2>
          <div className="flex items-center gap-1.5">
            <span className="badge text-xs" style={{ background: STATUS[order.status]?.bg, color: STATUS[order.status]?.color }}>
              {STATUS[order.status]?.label}
            </span>
            {order.items?.some(i => i.originalPrice != null) && (
              <span className="badge text-xs flex items-center gap-1"
                style={{ background: "var(--warning-light)", color: "var(--warning)" }}>
                <AlertTriangle size={10} />
                Ajustada
              </span>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="space-y-1 mb-4">
          {order.items?.map(item => {
            const returned = item.refundedQty > 0
            const fullyReturned = item.refundedQty >= item.quantity
            const priceAltered = item.originalPrice != null && Number(item.originalPrice) !== Number(item.price)
            return (
              <div key={item.id} className="rounded-md px-2 py-1.5" style={{ background: returned ? "var(--warning-light)" : "transparent" }}>
                <div className="flex justify-between text-sm">
                  <span style={{
                    color: fullyReturned ? "var(--text-muted)" : "var(--text-primary)",
                    textDecoration: fullyReturned ? "line-through" : "none",
                  }}>
                    {item.product?.name} × {item.quantity}
                  </span>
                  <span className="font-mono" style={{ color: fullyReturned ? "var(--text-muted)" : "var(--text-secondary)" }}>
                    {formatCOP(Number(item.price) * item.quantity)}
                  </span>
                </div>
                {priceAltered && (
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-mono" style={{ color: "var(--text-muted)", textDecoration: "line-through" }}>
                        {formatCOP(Number(item.originalPrice))} c/u cat.
                      </span>
                      <span className="text-xs font-semibold" style={{ color: "var(--brand)" }}>precio ajustado</span>
                    </div>
                    {item.priceNote && (
                      <span className="text-xs italic" style={{ color: "var(--text-muted)" }}>
                        "{item.priceNote}"
                      </span>
                    )}
                  </div>
                )}
                {returned && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <RotateCcw size={10} style={{ color: "var(--warning)" }} />
                    <span className="text-xs" style={{ color: "var(--warning)" }}>
                      {item.refundedQty === item.quantity
                        ? "Devuelto completo"
                        : `${item.refundedQty} devuelto${item.refundedQty > 1 ? "s" : ""} · quedan ${item.quantity - item.refundedQty}`}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Refund subtotal */}
        {hasRefunds && (() => {
          const refunded = order.items.reduce((s, i) => s + Number(i.price) * i.refundedQty, 0)
          return (
            <div className="flex justify-between text-sm px-2 pb-2 border-b" style={{ borderColor: "var(--border)" }}>
              <span style={{ color: "var(--warning)" }}>Total devuelto</span>
              <span className="font-mono font-bold" style={{ color: "var(--warning)" }}>− {formatCOP(refunded)}</span>
            </div>
          )
        })()}

        {/* Payments */}
        <div className="pt-3 space-y-1">
          {order.payments?.map(p => (
            <div key={p.id} className="flex justify-between text-sm">
              <span style={{ color: "var(--text-muted)" }}>{p.paymentMethod?.name}</span>
              <span className="font-mono" style={{ color: "var(--text-primary)" }}>{formatCOP(p.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between font-bold pt-1">
            <span style={{ color: "var(--text-primary)" }}>Total venta</span>
            <span className="font-mono" style={{ color: "var(--brand)" }}>{formatCOP(order.total)}</span>
          </div>
        </div>

        <div className="mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
          Cajero: {order.user?.name} · {new Date(order.createdAt).toLocaleString()}
        </div>

        <div className="flex gap-2 mt-4">
          {canRefund && (
            <button onClick={() => { onClose(); onRefund(order) }}
              className="btn-outline btn-md flex-1 flex items-center justify-center gap-2"
              style={{ color: "var(--warning)" }}>
              <RotateCcw size={14} /> Devolución
            </button>
          )}
          <button onClick={onClose} className="btn-outline btn-md flex-1">Cerrar</button>
        </div>
      </div>
    </div>
  )
}

// ── Refund modal ──────────────────────────────────────────────────────────────
function RefundModal({ order, onClose, onConfirm, isLoading, paymentMethods }) {
  const { touchMode } = useUiStore()
  // Only items that still have remaining quantity to return
  const refundableItems = useMemo(
    () => order.items.filter(i => (i.refundedQty ?? 0) < i.quantity),
    [order.items]
  )

  const [selection, setSelection] = useState({})
  const [refundPaymentMethodId, setRefundPaymentMethodId] = useState(null)
  const [numPad, setNumPad] = useState(null)

  const remaining = (item) => item.quantity - (item.refundedQty ?? 0)

  const toggle = (itemId) => {
    setSelection(prev => {
      if (prev[itemId] !== undefined) {
        const next = { ...prev }
        delete next[itemId]
        return next
      }
      return { ...prev, [itemId]: 1 }
    })
  }

  const setQty = (itemId, val) => {
    const item = refundableItems.find(i => i.id === itemId)
    const qty = Math.max(1, Math.min(Number(val) || 1, remaining(item)))
    setSelection(prev => ({ ...prev, [itemId]: qty }))
  }

  const refundTotal = useMemo(() => {
    return Object.entries(selection).reduce((sum, [itemId, qty]) => {
      const item = order.items.find(i => i.id === Number(itemId))
      return sum + (item ? Number(item.price) * qty : 0)
    }, 0)
  }, [selection, order.items])

  const selectedCount = Object.keys(selection).length

  const selectAll = () => {
    const all = {}
    refundableItems.forEach(i => { all[i.id] = remaining(i) })
    setSelection(all)
  }

  const handleConfirm = () => {
    if (selectedCount === 0 || !refundPaymentMethodId) return
    const items = Object.entries(selection).map(([orderItemId, quantity]) => ({
      orderItemId: Number(orderItemId),
      quantity,
    }))
    onConfirm(items, refundPaymentMethodId)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="card p-6 w-full max-w-lg animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display font-bold text-lg" style={{ color: "var(--text-primary)" }}>
            Devolución — Venta #{order.id}
          </h2>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Selecciona los artículos a devolver
          </span>
        </div>

        <div className="flex items-center justify-between mb-3">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {selectedCount} de {refundableItems.length} artículo(s) disponibles
          </span>
          <button onClick={selectAll} className="text-xs underline" style={{ color: "var(--brand)" }}>
            Seleccionar todo
          </button>
        </div>

        <div className="space-y-2 mb-4 max-h-72 overflow-y-auto pr-1">
          {refundableItems.map(item => {
            const checked = selection[item.id] !== undefined
            const max = remaining(item)
            return (
              <div key={item.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer select-none transition-colors"
                style={{
                  background: checked ? "var(--brand-light)" : "var(--bg-primary)",
                  border: `1px solid ${checked ? "var(--brand)" : "var(--border)"}`,
                }}
                onClick={() => toggle(item.id)}>
                {/* Checkbox */}
                <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                  style={{
                    background: checked ? "var(--brand)" : "transparent",
                    border: `2px solid ${checked ? "var(--brand)" : "var(--border)"}`,
                  }}>
                  {checked && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block" style={{ color: "var(--text-primary)" }}>
                    {item.product?.name}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {formatCOP(item.price)} c/u · disponible: {max}
                    {item.refundedQty > 0 && ` (${item.refundedQty} ya devuelto${item.refundedQty > 1 ? "s" : ""})`}
                  </span>
                </div>

                {/* Stepper */}
                {checked && (
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setQty(item.id, (selection[item.id] || 1) - 1)}
                      className="w-6 h-6 rounded flex items-center justify-center"
                      style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>
                      <Minus size={10} />
                    </button>
                    {touchMode ? (
                      <span
                        className="w-10 text-center text-sm font-mono font-bold cursor-pointer rounded"
                        style={{ color: "var(--brand)", background: "var(--brand-light)", padding: "3px 4px" }}
                        onClick={() => setNumPad({ itemId: item.id, value: selection[item.id] || 1, max, label: item.product?.name })}
                      >{selection[item.id] || 1}</span>
                    ) : (
                      <input
                        type="text" inputMode="numeric" min={1} max={max}
                        value={selection[item.id] || 1}
                        onChange={e => setQty(item.id, e.target.value.replace(/\D/g, ""))}
                        className="w-10 text-center text-sm rounded border font-mono"
                        style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                        onClick={e => e.target.select()}
                      />
                    )}
                    <button onClick={() => setQty(item.id, (selection[item.id] || 1) + 1)}
                      className="w-6 h-6 rounded flex items-center justify-center"
                      style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>
                      <Plus size={10} />
                    </button>
                  </div>
                )}

                {/* Amount */}
                <span className="font-mono text-sm font-bold flex-shrink-0"
                  style={{ color: checked ? "var(--brand)" : "var(--text-muted)", minWidth: "5rem", textAlign: "right" }}>
                  {checked
                    ? formatCOP(Number(item.price) * (selection[item.id] || 1))
                    : formatCOP(Number(item.price) * max)
                  }
                </span>
              </div>
            )
          })}
        </div>

        {/* Refund total */}
        <div className="flex items-center justify-between px-3 py-2 rounded-lg mb-3"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Total a devolver</span>
          <span className="font-mono font-bold text-lg" style={{ color: "var(--warning)" }}>
            {formatCOP(refundTotal)}
          </span>
        </div>

        {/* Refund payment method */}
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
            Método de devolución
          </p>
          <div className="flex flex-wrap gap-2">
            {(paymentMethods || []).map(pm => {
              const active = refundPaymentMethodId === pm.id
              return (
                <button
                  key={pm.id}
                  onClick={() => setRefundPaymentMethodId(pm.id)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: active ? "var(--warning)" : "var(--bg-primary)",
                    color: active ? "#fff" : "var(--text-secondary)",
                    border: `1.5px solid ${active ? "var(--warning)" : "var(--border)"}`,
                  }}
                >
                  {pm.name}
                </button>
              )
            })}
          </div>
          {!refundPaymentMethodId && selectedCount > 0 && (
            <p className="text-xs mt-1.5" style={{ color: "var(--danger)" }}>
              Selecciona el método de devolución
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} disabled={isLoading} className="btn-outline btn-md flex-1">Cancelar</button>
          <button onClick={handleConfirm} disabled={selectedCount === 0 || !refundPaymentMethodId || isLoading}
            className="btn-md flex-1 flex items-center justify-center gap-2"
            style={{
              background: selectedCount > 0 && refundPaymentMethodId ? "var(--warning)" : "var(--bg-secondary)",
              color: selectedCount > 0 && refundPaymentMethodId ? "#fff" : "var(--text-muted)",
              opacity: isLoading ? 0.7 : 1,
            }}>
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
            Confirmar devolución
          </button>
        </div>
      </div>
      {numPad && (
        <NumPad
          initialValue={numPad.value}
          label={numPad.label}
          onConfirm={val => { setQty(numPad.itemId, val); setNumPad(null) }}
          onClose={() => setNumPad(null)}
        />
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SalesPage() {
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState(null)
  const [refundOrder, setRefundOrder] = useState(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["orders", page],
    queryFn: () => ordersService.getAll({ page, limit: 20 }),
  })

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: paymentMethodsService.getAll,
    staleTime: Infinity,
  })

  const cancel = useMutation({
    mutationFn: ordersService.cancel,
    onSuccess: () => { toast.success("Venta cancelada"); qc.invalidateQueries({ queryKey: ["orders"] }) },
    onError: e => toast.error(e.response?.data?.error || "Error"),
  })

  const refund = useMutation({
    mutationFn: ({ id, items, refundPaymentMethodId }) => ordersService.refund(id, items, refundPaymentMethodId),
    onSuccess: (result) => {
      toast.success(`Devolución registrada · ${formatCOP(result.refundTotal)} vía ${result.refundPaymentMethod}`)
      setRefundOrder(null)
      qc.invalidateQueries({ queryKey: ["orders"] })
    },
    onError: e => toast.error(e.response?.data?.error || "Error al registrar devolución"),
  })

  const openRefundFor = async (orderSummary) => {
    const full = await ordersService.getById(orderSummary.id)
    setRefundOrder(full)
  }

  const orders = data?.orders || []
  const total = data?.total || 0
  const pages = Math.ceil(total / 20)

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="font-display font-bold text-xl" style={{ color: "var(--text-primary)" }}>Ventas</h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{total} registros en total</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--text-muted)" }} />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs font-medium" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                  <th className="text-left px-4 py-3">#</th>
                  <th className="text-left px-4 py-3">Fecha</th>
                  <th className="text-left px-4 py-3">Cajero</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o, i) => {
                  const canRefund = o.status === "COMPLETED" || o.status === "PARTIAL_REFUND"
                  return (
                    <tr key={o.id} className="border-b transition-colors hover:opacity-80"
                      style={{ borderColor: "var(--border)", background: i % 2 === 0 ? "transparent" : "var(--bg-primary)" }}>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-muted)" }}>#{o.id}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                        {new Date(o.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>{o.user?.name}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold" style={{ color: "var(--brand)" }}>
                        {formatCOP(o.total)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="badge text-xs"
                            style={{ background: STATUS[o.status]?.bg, color: STATUS[o.status]?.color }}>
                            {STATUS[o.status]?.label}
                          </span>
                          {o.hasAdjustedPrices && (
                            <span className="badge text-xs flex items-center gap-1"
                              style={{ background: "var(--warning-light)", color: "var(--warning)" }}
                              title="Contiene servicios con precio ajustado">
                              <AlertTriangle size={10} />
                              Ajustada
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => ordersService.getById(o.id).then(setDetail)}
                            className="btn-ghost w-7 h-7 rounded flex items-center justify-center"
                            title="Ver detalle">
                            <Eye size={13} />
                          </button>
                          {canRefund && (
                            <button
                              onClick={() => openRefundFor(o)}
                              className="w-7 h-7 rounded flex items-center justify-center btn-ghost"
                              style={{ color: "var(--warning)" }}
                              title="Devolver artículos">
                              <RotateCcw size={13} />
                            </button>
                          )}
                          {o.status === "COMPLETED" && (
                            <button
                              onClick={() => confirm({
                                title: "¿Cancelar esta venta?",
                                message: "Se restaurará el stock de los productos.",
                                confirmLabel: "Cancelar venta",
                                variant: "warning",
                              }).then(ok => { if (ok) cancel.mutate(o.id) })}
                              className="w-7 h-7 rounded flex items-center justify-center btn-ghost"
                              style={{ color: "var(--danger)" }}
                              title="Cancelar venta">
                              <XCircle size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: "var(--border)" }}>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Página {page} de {pages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="btn-outline btn-sm">
                  <ChevronLeft size={14} />
                </button>
                <button onClick={() => setPage(p => p + 1)} disabled={page === pages} className="btn-outline btn-sm">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {detail && (
        <OrderDetail
          order={detail}
          onClose={() => setDetail(null)}
          onRefund={order => { setDetail(null); openRefundFor(order) }}
        />
      )}

      {refundOrder && (
        <RefundModal
          order={refundOrder}
          onClose={() => setRefundOrder(null)}
          isLoading={refund.isPending}
          paymentMethods={paymentMethods}
          onConfirm={(items, refundPaymentMethodId) => refund.mutate({ id: refundOrder.id, items, refundPaymentMethodId })}
        />
      )}
    </div>
  )
}
