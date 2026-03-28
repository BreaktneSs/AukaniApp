import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { shiftsService } from "@/services/shifts.service"
import {
  Users, Clock, DollarSign, TrendingUp, CheckCircle,
  XCircle, Eye, Loader2, AlertTriangle, X, LogOut
} from "lucide-react"
import { formatCOP } from "@/utils/currency"
import toast from "react-hot-toast"

// ── Detalle de turno ──────────────────────────────────────
function ShiftDetailModal({ shiftId, onClose }) {
  const { data: shift, isLoading } = useQuery({
    queryKey: ["shift-detail", shiftId],
    queryFn: () => shiftsService.getById(shiftId),
  })

  if (isLoading) return (
    <ModalWrapper onClose={onClose}>
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--text-muted)" }} />
      </div>
    </ModalWrapper>
  )

  if (!shift) return null

  const isOpen = shift.status === "OPEN"
  const totalSales = (shift.shiftPayments || []).reduce((s, p) => s + Number(p.total), 0)
  const cashPayment = shift.shiftPayments?.find(p => p.paymentMethod?.name === "Efectivo")
  const expectedCash = Number(shift.openingCash) + Number(cashPayment?.total || 0)

  const duration = shift.openedAt
    ? Math.round(((shift.closedAt ? new Date(shift.closedAt) : new Date()) - new Date(shift.openedAt)) / 60000)
    : 0
  const hours = Math.floor(duration / 60), mins = duration % 60

  return (
    <ModalWrapper onClose={onClose}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display font-bold text-lg" style={{ color: "var(--text-primary)" }}>
            Turno #{shift.id} — {shift.user?.name}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {new Date(shift.openedAt).toLocaleString()}
            {shift.closedAt ? ` → ${new Date(shift.closedAt).toLocaleString()}` : " · En curso"}
            {" · "}{hours > 0 ? `${hours}h ` : ""}{mins}min
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge text-xs px-2 py-1"
            style={{ background: isOpen ? "var(--brand-light)" : "var(--bg-tertiary)", color: isOpen ? "var(--brand)" : "var(--text-muted)" }}>
            {isOpen ? "Abierto" : "Cerrado"}
          </span>
          <button onClick={onClose} className="btn-ghost w-7 h-7 rounded flex items-center justify-center"><X size={15} /></button>
        </div>
      </div>

      {/* Resumen financiero */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: "Apertura", value: `${formatCOP(shift.openingCash)}`, color: "var(--text-primary)" },
          { label: "Ventas totales", value: `${formatCOP(totalSales)}`, color: "var(--brand)" },
          { label: "Efectivo esperado", value: `${formatCOP(expectedCash)}`, color: "var(--info)" },
          ...(shift.closingCash != null ? [
            { label: "Efectivo contado", value: `${formatCOP(shift.closingCash)}`, color: "var(--text-primary)" },
            {
              label: Number(shift.difference) >= 0 ? "Sobrante" : "Faltante",
              value: `${formatCOP(Math.abs(Number(shift.difference)))}`,
              color: Number(shift.difference) >= 0 ? "var(--brand)" : "var(--danger)"
            },
          ] : []),
        ].map(item => (
          <div key={item.label} className="rounded-lg p-3 text-center" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{item.label}</p>
            <p className="font-mono font-bold text-sm" style={{ color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Por método de pago */}
      {shift.shiftPayments?.length > 0 && (
        <div className="card p-4 mb-4 space-y-2">
          <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>Ventas por método de pago</p>
          {shift.shiftPayments.map(p => (
            <div key={p.id} className="flex justify-between text-sm">
              <span style={{ color: "var(--text-secondary)" }}>{p.paymentMethod?.name}</span>
              <span className="font-mono font-bold" style={{ color: "var(--brand)" }}>{formatCOP(p.total)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Órdenes del turno */}
      {shift.orders?.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
              {shift.orders.length} ventas en este turno
            </p>
          </div>
          <div className="max-h-48 overflow-y-auto divide-y" style={{ borderColor: "var(--border)" }}>
            {shift.orders.map(order => (
              <div key={order.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <div>
                  <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>#{order.id}</span>
                  <span className="mx-2" style={{ color: "var(--text-secondary)" }}>{new Date(order.createdAt).toLocaleTimeString()}</span>
                  <span className="badge text-xs"
                    style={{ background: order.status === "COMPLETED" ? "var(--brand-light)" : "var(--danger-light)", color: order.status === "COMPLETED" ? "var(--brand)" : "var(--danger)" }}>
                    {order.status === "COMPLETED" ? "OK" : "Cancelada"}
                  </span>
                </div>
                <span className="font-mono font-bold" style={{ color: "var(--brand)" }}>{formatCOP(order.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {shift.notes && (
        <div className="mt-4 p-3 rounded-lg text-sm" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Notas</p>
          <p style={{ color: "var(--text-secondary)" }}>{shift.notes}</p>
        </div>
      )}
    </ModalWrapper>
  )
}

function ModalWrapper({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div className="card p-6 w-full max-w-lg animate-slide-up overflow-y-auto max-h-[92vh]"
        onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

// ── Tarjeta de turno activo ───────────────────────────────
function ActiveShiftCard({ shift, onView }) {
  const totalSales = (shift.shiftPayments || []).reduce((s, p) => s + Number(p.total), 0)
  const cashPayment = shift.shiftPayments?.find(p => p.paymentMethod?.name === "Efectivo")
  const expectedCash = Number(shift.openingCash) + Number(cashPayment?.total || 0)
  const duration = Math.round((Date.now() - new Date(shift.openedAt)) / 60000)
  const hours = Math.floor(duration / 60), mins = duration % 60

  return (
    <div className="card p-4 space-y-3 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--brand)" }} />
            <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{shift.user?.name}</span>
            <span className="badge text-xs" style={{ background: "var(--brand-light)", color: "var(--brand)" }}>Activo</span>
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Desde {new Date(shift.openedAt).toLocaleTimeString()} · {hours > 0 ? `${hours}h ` : ""}{mins}min
          </p>
        </div>
        <button onClick={() => onView(shift.id)} className="btn-ghost w-7 h-7 rounded flex items-center justify-center">
          <Eye size={14} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="text-center rounded-lg p-2" style={{ background: "var(--bg-primary)" }}>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Apertura</p>
          <p className="font-mono font-bold text-sm" style={{ color: "var(--text-primary)" }}>
            {formatCOP(shift.openingCash)}
          </p>
        </div>
        <div className="text-center rounded-lg p-2" style={{ background: "var(--bg-primary)" }}>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Ventas</p>
          <p className="font-mono font-bold text-sm" style={{ color: "var(--brand)" }}>
            {formatCOP(totalSales)}
          </p>
        </div>
        <div className="text-center rounded-lg p-2" style={{ background: "var(--bg-primary)" }}>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Debe haber</p>
          <p className="font-mono font-bold text-sm" style={{ color: "var(--info)" }}>
            {formatCOP(expectedCash)}
          </p>
        </div>
      </div>

      {/* Por método */}
      {shift.shiftPayments?.length > 0 && (
        <div className="space-y-1 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
          {shift.shiftPayments.map(p => (
            <div key={p.id} className="flex justify-between text-xs">
              <span style={{ color: "var(--text-secondary)" }}>{p.paymentMethod?.name}</span>
              <span className="font-mono" style={{ color: "var(--text-primary)" }}>{formatCOP(p.total)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── ShiftsPage ────────────────────────────────────────────
export default function ShiftsPage() {
  const [detailId, setDetailId] = useState(null)
  const [page, setPage] = useState(1)

  // Turnos abiertos — todos los cajeros activos
  const { data: activeShifts = [], isLoading: loadingActive, refetch: refetchActive } = useQuery({
    queryKey: ["shifts-active"],
    queryFn: async () => {
      const result = await shiftsService.getAll({ limit: 50 })
      return (result.shifts || []).filter(s => s.status === "OPEN")
    },
    refetchInterval: 30_000, // Auto-refresh cada 30s
  })

  // Historial de turnos
  const { data: historyData, isLoading: loadingHistory } = useQuery({
    queryKey: ["shifts-history", page],
    queryFn: () => shiftsService.getAll({ page, limit: 15 }),
  })

  const history = (historyData?.shifts || []).filter(s => s.status === "CLOSED")
  const totalHistory = historyData?.total || 0

  // Totales globales activos
  const totalActive = activeShifts.reduce((s, sh) =>
    s + (sh.shiftPayments || []).reduce((ss, p) => ss + Number(p.total), 0), 0)
  const totalCashActive = activeShifts.reduce((s, sh) => {
    const cp = sh.shiftPayments?.find(p => p.paymentMethod?.name === "Efectivo")
    return s + Number(sh.openingCash) + Number(cp?.total || 0)
  }, 0)

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl" style={{ color: "var(--text-primary)" }}>Control de caja</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Turnos activos y cierre de caja</p>
        </div>
        <button onClick={() => refetchActive()} className="btn-outline btn-sm">
          Actualizar
        </button>
      </div>

      {/* Resumen global */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="card p-4 space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} style={{ color: "var(--brand)" }} />
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Cajeros activos</span>
          </div>
          <p className="font-display font-bold text-3xl" style={{ color: "var(--text-primary)" }}>{activeShifts.length}</p>
        </div>
        <div className="card p-4 space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} style={{ color: "var(--brand)" }} />
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Ventas en curso</span>
          </div>
          <p className="font-display font-bold text-3xl font-mono" style={{ color: "var(--brand)" }}>{formatCOP(totalActive)}</p>
        </div>
        <div className="card p-4 space-y-1 col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={14} style={{ color: "var(--info)" }} />
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Efectivo esperado total</span>
          </div>
          <p className="font-display font-bold text-3xl font-mono" style={{ color: "var(--info)" }}>{formatCOP(totalCashActive)}</p>
        </div>
      </div>

      {/* Turnos activos */}
      <div>
        <h2 className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--brand)" }} />
          Cajeros en turno ahora
        </h2>
        {loadingActive ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-muted)" }} />
          </div>
        ) : activeShifts.length === 0 ? (
          <div className="card p-8 text-center">
            <Users size={28} className="mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No hay cajeros activos</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {activeShifts.map(shift => (
              <ActiveShiftCard key={shift.id} shift={shift} onView={setDetailId} />
            ))}
          </div>
        )}
      </div>

      {/* Historial */}
      <div>
        <h2 className="font-semibold text-sm mb-3" style={{ color: "var(--text-primary)" }}>Historial de turnos</h2>
        {loadingHistory ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-muted)" }} />
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs font-medium" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                    <th className="text-left px-4 py-3">Cajero</th>
                    <th className="text-left px-4 py-3">Fecha</th>
                    <th className="text-right px-4 py-3">Apertura</th>
                    <th className="text-right px-4 py-3">Ventas</th>
                    <th className="text-right px-4 py-3">Diferencia</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((s, i) => {
                    const totalSales = (s.shiftPayments || []).reduce((ss, p) => ss + Number(p.total), 0)
                    const diff = Number(s.difference || 0)
                    return (
                      <tr key={s.id} className="border-b hover:opacity-80 transition-colors"
                        style={{ borderColor: "var(--border)", background: i % 2 === 0 ? "transparent" : "var(--bg-primary)" }}>
                        <td className="px-4 py-3 font-medium" style={{ color: "var(--text-primary)" }}>{s.user?.name}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                          {new Date(s.openedAt).toLocaleDateString()} {new Date(s.openedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
                          {formatCOP(s.openingCash)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold" style={{ color: "var(--brand)" }}>
                          {formatCOP(totalSales)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {s.difference != null ? (
                            <span className="badge font-mono text-xs"
                              style={{ background: Math.abs(diff) < 0.01 ? "var(--brand-light)" : diff > 0 ? "var(--brand-light)" : "var(--danger-light)", color: Math.abs(diff) < 0.01 ? "var(--brand)" : diff > 0 ? "var(--brand)" : "var(--danger)" }}>
                              {Math.abs(diff) < 0.01 ? "✅" : diff > 0 ? `+${formatCOP(diff)}` : `-${formatCOP(Math.abs(diff))}`}
                            </span>
                          ) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => setDetailId(s.id)} className="btn-ghost w-7 h-7 rounded flex items-center justify-center">
                            <Eye size={13} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {totalHistory > 15 && (
              <div className="flex items-center justify-between px-4 py-3 border-t text-xs" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                <span>Página {page} · {totalHistory} turnos</span>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-outline btn-sm px-2">←</button>
                  <button onClick={() => setPage(p => p + 1)} disabled={history.length < 15} className="btn-outline btn-sm px-2">→</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {detailId && <ShiftDetailModal shiftId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  )
}