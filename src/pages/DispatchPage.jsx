import { useState, useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { dispatchService } from "@/services/dispatch.service"
import { shiftsService } from "@/services/shifts.service"
import { formatCOP } from "@/utils/currency"
import {
  Bell, CheckCircle, XCircle, Clock, Package,
  Loader2, Users, ChevronDown, ChevronUp, X, User,
} from "lucide-react"
import toast from "react-hot-toast"
import { confirm } from "@/components/ui/ConfirmDialog"

const STATUS = {
  PENDING:    { label: "Pendiente",   color: "var(--warning)", bg: "var(--warning-light)", icon: Clock },
  DISPATCHED: { label: "Despachado",  color: "var(--brand)",   bg: "var(--brand-light)",   icon: CheckCircle },
  CANCELLED:  { label: "Cancelado",   color: "var(--danger)",  bg: "var(--danger-light)",  icon: XCircle },
}

// ── Tarjeta de pedido pendiente ───────────────────────────
function DispatchCard({ dispatch, onConfirm, onCancel, confirming, cancelling }) {
  const change = Number(dispatch.change)
  const cashReceived = Number(dispatch.cashReceived)
  const total = Number(dispatch.total)
  const isAccountDispatch = !!dispatch.account

  return (
    <div className="card overflow-hidden animate-slide-up border-l-4"
      style={{ borderLeftColor: isAccountDispatch ? "var(--info)" : "var(--warning)" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "var(--border)", background: isAccountDispatch ? "var(--info-light)" : "var(--warning-light)" }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm"
            style={{ background: isAccountDispatch ? "var(--info)" : "var(--warning)" }}>
            {dispatch.subShift?.user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              {dispatch.subShift?.user?.name}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {new Date(dispatch.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {isAccountDispatch && (
            <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "var(--info)", color: "white" }}>
              <User size={11} /> {dispatch.account.name}
            </span>
          )}
          <span className="font-display font-bold text-xl"
            style={{ color: isAccountDispatch ? "var(--info)" : "var(--warning)" }}>
            {formatCOP(total)}
          </span>
        </div>
      </div>

      {/* Items */}
      <div className="px-4 py-3 space-y-2 border-b" style={{ borderColor: "var(--border)" }}>
        {dispatch.items.map(item => (
          <div key={item.id} className="flex items-center gap-3">
            {item.product?.imageUrl ? (
              <img src={`/api${item.product.imageUrl}`} alt={item.product.name}
                className="w-8 h-8 rounded object-cover shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded flex items-center justify-center shrink-0"
                style={{ background: "var(--bg-tertiary)" }}>
                <Package size={13} style={{ color: "var(--text-muted)" }} />
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {item.product?.name}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                x{item.quantity}
              </p>
              <p className="text-sm font-mono font-bold" style={{ color: "var(--text-primary)" }}>
                {formatCOP(Number(item.price) * item.quantity)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Resumen de caja — solo para despachos normales */}
      {!isAccountDispatch && (
        <div className="px-4 py-3 space-y-1.5 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex justify-between text-sm">
            <span style={{ color: "var(--text-secondary)" }}>Cliente pagó</span>
            <span className="font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
              {formatCOP(cashReceived)}
            </span>
          </div>
          <div className="flex justify-between text-sm font-bold">
            <span style={{ color: change > 0 ? "var(--brand)" : "var(--danger)" }}>
              {change > 0 ? "🔄 Vuelto a devolver" : "❌ Sin vuelto"}
            </span>
            <span className="font-mono text-lg" style={{ color: change > 0 ? "var(--brand)" : "var(--text-muted)" }}>
              {change > 0 ? formatCOP(change) : "—"}
            </span>
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-2 p-3">
        <button
          onClick={() => onCancel(dispatch.id)}
          disabled={cancelling}
          className="btn-sm flex-1 btn-outline"
          style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>
          {cancelling ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
          Cancelar
        </button>
        <button
          onClick={() => onConfirm(dispatch.id)}
          disabled={confirming}
          className="btn-sm flex-1 text-white font-bold"
          style={{ background: isAccountDispatch ? "var(--info)" : "var(--brand)" }}>
          {confirming ? <Loader2 size={13} className="animate-spin" /> : isAccountDispatch ? <User size={13} /> : <CheckCircle size={13} />}
          {isAccountDispatch ? "Agregar a cuenta" : "✅ Despachar"}
        </button>
      </div>
    </div>
  )
}

// ── DispatchPage ──────────────────────────────────────────
export default function DispatchPage() {
  const [showHistory, setShowHistory] = useState(false)
  const prevCountRef = useRef(0)
  const qc = useQueryClient()

  // Turno activo del cajero
  const { data: shift } = useQuery({
    queryKey: ["shift-mine"],
    queryFn: shiftsService.getMine,
    retry: false,
    refetchOnWindowFocus: false,
  })

  // Pedidos pendientes — polling cada 5 segundos
  const { data: pending = [], isLoading } = useQuery({
    queryKey: ["dispatches-pending", shift?.id],
    queryFn: () => dispatchService.getPendingDispatches(shift.id),
    enabled: !!shift?.id,
    refetchInterval: 5_000,
  })

  // Historial
  const { data: history = [] } = useQuery({
    queryKey: ["dispatches-history", shift?.id],
    queryFn: () => dispatchService.getDispatchHistory(shift.id),
    enabled: !!shift?.id && showHistory,
  })

  // Sub-turnos activos
  const { data: subShifts = [] } = useQuery({
    queryKey: ["active-subshifts", shift?.id],
    queryFn: () => dispatchService.getActiveSubShifts(shift.id),
    enabled: !!shift?.id,
    refetchInterval: 10_000,
  })

  // Notificación cuando llegan pedidos nuevos
  useEffect(() => {
    if (pending.length > prevCountRef.current) {
      const newCount = pending.length - prevCountRef.current
      toast(`🔔 ${newCount === 1 ? "Nuevo pedido" : `${newCount} nuevos pedidos"}`} de mesero`,
        { icon: "🛎️", duration: 5000 }
      )
      // Vibrar si el dispositivo lo soporta
      if ("vibrate" in navigator) navigator.vibrate([200, 100, 200])
    }
    prevCountRef.current = pending.length
  }, [pending.length])

  const confirmDispatch = useMutation({
    mutationFn: dispatchService.confirmDispatch,
    onSuccess: (data) => {
      toast.success(data?.accountId ? "✅ Agregado a la cuenta" : "✅ Pedido despachado")
      qc.invalidateQueries({ queryKey: ["dispatches-pending"] })
      qc.invalidateQueries({ queryKey: ["dispatches-history"] })
      qc.invalidateQueries({ queryKey: ["accounts-shift"] })
      qc.invalidateQueries({ queryKey: ["shift-mine"] })
    },
    onError: e => toast.error(e.response?.data?.error || "Error"),
  })

  const cancel = useMutation({
    mutationFn: dispatchService.cancelDispatch,
    onSuccess: () => {
      toast.success("Pedido cancelado")
      qc.invalidateQueries({ queryKey: ["dispatches-pending"] })
    },
    onError: e => toast.error(e.response?.data?.error || "Error"),
  })

  if (!shift) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="card p-8 max-w-sm text-center space-y-4">
          <Bell size={28} className="mx-auto" style={{ color: "var(--text-muted)" }} />
          <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Sin turno activo</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Abre un turno desde la pantalla de Caja para recibir pedidos de meseros
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            Despachos
            {pending.length > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white animate-pulse"
                style={{ background: "var(--warning)" }}>
                {pending.length}
              </span>
            )}
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Caja #{shift.id} · {subShifts.length} mesero{subShifts.length !== 1 ? "s" : ""} activo{subShifts.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Meseros activos */}
      {subShifts.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Meseros:</span>
          {subShifts.map(sub => (
            <div key={sub.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ background: "var(--brand-light)", color: "var(--brand)" }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--brand)" }} />
              {sub.user?.name}
              {sub.dispatches?.length > 0 && (
                <span className="font-bold">({sub.dispatches.length})</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pedidos pendientes */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--text-muted)" }} />
        </div>
      ) : pending.length === 0 ? (
        <div className="card p-10 text-center space-y-3">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
            style={{ background: "var(--bg-tertiary)" }}>
            <CheckCircle size={24} style={{ color: "var(--brand)" }} />
          </div>
          <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Todo al día</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No hay pedidos pendientes de despacho
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pending.map(dispatch => (
            <DispatchCard
              key={dispatch.id}
              dispatch={dispatch}
              onConfirm={(id) => confirmDispatch.mutate(id)}
              onCancel={async (id) => { const ok = await confirm({ title: "¿Cancelar pedido?", message: "El stock reservado se liberará.", confirmLabel: "Cancelar pedido", variant: "warning" }); if (ok) cancel.mutate(id) }}
              confirming={confirmDispatch.isPending && confirmDispatch.variables === dispatch.id}
              cancelling={cancel.isPending && cancel.variables === dispatch.id}
            />
          ))}
        </div>
      )}

      {/* Historial */}
      <div>
        <button
          onClick={() => setShowHistory(h => !h)}
          className="flex items-center gap-2 text-sm font-medium py-2"
          style={{ color: "var(--text-secondary)" }}>
          {showHistory ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          Historial de despachos
        </button>

        {showHistory && (
          <div className="card overflow-hidden mt-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs font-medium"
                    style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                    <th className="text-left px-4 py-3">Mesero</th>
                    <th className="text-left px-4 py-3">Hora</th>
                    <th className="text-right px-4 py-3">Total</th>
                    <th className="text-right px-4 py-3">Recibido</th>
                    <th className="text-right px-4 py-3">Vuelto</th>
                    <th className="text-left px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((d, i) => {
                    const s = STATUS[d.status]
                    return (
                      <tr key={d.id} className="border-b"
                        style={{ borderColor: "var(--border)", background: i % 2 === 0 ? "transparent" : "var(--bg-primary)" }}>
                        <td className="px-4 py-2.5 font-medium" style={{ color: "var(--text-primary)" }}>
                          {d.subShift?.user?.name}
                        </td>
                        <td className="px-4 py-2.5 text-xs" style={{ color: "var(--text-muted)" }}>
                          {new Date(d.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold" style={{ color: "var(--brand)" }}>
                          {formatCOP(d.total)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
                          {formatCOP(d.cashReceived)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                          {Number(d.change) > 0 ? formatCOP(d.change) : "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="badge text-xs" style={{ background: s.bg, color: s.color }}>
                            {s.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}