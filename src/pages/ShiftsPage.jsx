import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { shiftsService } from "@/services/shifts.service"
import { expensesService } from "@/services/expenses.service"
import { paymentMethodsService } from "@/services/catalog.service"
import { useAuthStore } from "@/store/auth.store"
import {
  Users, Clock, DollarSign, TrendingUp,
  Eye, Loader2, X, TrendingDown, Plus, Trash2, LogOut, AlertTriangle
} from "lucide-react"
import { formatCOP } from "@/utils/currency"
import { confirm } from "@/components/ui/ConfirmDialog"
import toast from "react-hot-toast"

// ── Modal wrapper ─────────────────────────────────────────
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

// ── Modal cierre forzado (admin) ──────────────────────────
function ForceCloseModal({ shift, onClose, onConfirm, loading }) {
  const [closingCash, setClosingCash] = useState("")
  const [notes, setNotes] = useState("")

  const totalSales = (shift.shiftPayments || []).reduce((s, p) => s + Number(p.total), 0)
  const cashPayment = shift.shiftPayments?.find(p => p.paymentMethod?.name === "Efectivo")
  const cashExpenses = (shift.expenses || [])
    .filter(e => e.paymentMethod?.name === "Efectivo")
    .reduce((s, e) => s + Number(e.amount), 0)
  const expectedCash = Number(shift.openingCash) + Number(cashPayment?.total || 0) - cashExpenses
  const cash = Number(closingCash.replace(/\D/g, "")) || 0
  const diff = cash - expectedCash

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }} onClick={onClose}>
      <div className="card p-5 w-full max-w-sm animate-slide-up space-y-4"
        onClick={e => e.stopPropagation()}>

        <div className="flex items-start justify-between">
          <div>
            <p className="font-display font-bold text-base" style={{ color: "var(--text-primary)" }}>
              Cerrar turno #{shift.id}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{shift.user?.name}</p>
          </div>
          <button onClick={onClose} className="btn-ghost w-7 h-7 rounded flex items-center justify-center">
            <X size={14} />
          </button>
        </div>

        {/* Aviso admin */}
        <div className="flex items-start gap-2 rounded-lg p-3"
          style={{ background: "var(--warning-light, #fff7ed)", border: "1px solid var(--warning, #f59e0b)" }}>
          <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: "var(--warning, #f59e0b)" }} />
          <p className="text-xs" style={{ color: "var(--warning, #b45309)" }}>
            Estás cerrando el turno de <strong>{shift.user?.name}</strong> como administrador.
          </p>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Ventas", value: formatCOP(totalSales), color: "var(--brand)" },
            { label: "Efectivo esperado", value: formatCOP(expectedCash), color: "var(--info)" },
          ].map(item => (
            <div key={item.label} className="rounded-lg p-2.5 text-center"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
              <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>{item.label}</p>
              <p className="font-mono font-bold text-sm" style={{ color: item.color }}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* Efectivo contado */}
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Efectivo contado en caja
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={closingCash ? new Intl.NumberFormat("es-CO").format(Number(closingCash.replace(/\D/g, ""))) : ""}
            onChange={e => setClosingCash(e.target.value.replace(/\D/g, ""))}
            className="input w-full font-mono text-lg text-center"
            autoFocus
          />
          {closingCash && (
            <p className="text-xs mt-1 text-center font-mono"
              style={{ color: diff >= 0 ? "var(--brand)" : "var(--danger)" }}>
              {diff >= 0 ? "+" : ""}{formatCOP(diff)}
            </p>
          )}
        </div>

        {/* Notas */}
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Notas (opcional)
          </label>
          <textarea
            rows={2}
            className="input w-full resize-none text-sm"
            placeholder="Motivo del cierre administrativo..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn-outline btn-md flex-1">Cancelar</button>
          <button
            disabled={loading || !closingCash}
            onClick={() => onConfirm({ closingCash: cash, notes: notes.trim() || undefined })}
            className="btn-md flex-1 font-semibold flex items-center justify-center gap-1.5"
            style={{ background: "var(--danger)", color: "#fff", opacity: (!closingCash || loading) ? 0.5 : 1 }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
            Cerrar turno
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Detalle de turno ──────────────────────────────────────
function ShiftDetailModal({ shiftId, onClose, onForceClose }) {
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
  const totalExpenses = (shift.expenses || []).reduce((s, e) => s + Number(e.amount), 0)
  const cashPayment = shift.shiftPayments?.find(p => p.paymentMethod?.name === "Efectivo")
  const cashExpenses = (shift.expenses || [])
    .filter(e => e.paymentMethod?.name === "Efectivo")
    .reduce((s, e) => s + Number(e.amount), 0)
  const expectedCash = Number(shift.openingCash) + Number(cashPayment?.total || 0) - cashExpenses

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
          {isOpen && onForceClose && (
            <button
              onClick={() => onForceClose(shift)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
              style={{ background: "var(--danger-light)", color: "var(--danger)", border: "1px solid var(--danger)" }}>
              <LogOut size={11} />
              Cerrar
            </button>
          )}
          <button onClick={onClose} className="btn-ghost w-7 h-7 rounded flex items-center justify-center"><X size={15} /></button>
        </div>
      </div>

      {/* Resumen financiero */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: "Apertura", value: formatCOP(shift.openingCash), color: "var(--text-primary)" },
          { label: "Ventas totales", value: formatCOP(totalSales), color: "var(--brand)" },
          { label: "Egresos", value: formatCOP(totalExpenses), color: "var(--danger)" },
          { label: "Efectivo esperado", value: formatCOP(expectedCash), color: "var(--info)" },
          ...(shift.closingCash != null ? [
            { label: "Efectivo contado", value: formatCOP(shift.closingCash), color: "var(--text-primary)" },
            {
              label: Number(shift.difference) >= 0 ? "Sobrante" : "Faltante",
              value: formatCOP(Math.abs(Number(shift.difference))),
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

      {/* Egresos del turno */}
      {shift.expenses?.length > 0 && (
        <div className="card p-4 mb-4 space-y-2">
          <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>Egresos</p>
          {shift.expenses.map(e => (
            <div key={e.id} className="flex items-center justify-between text-sm">
              <div className="min-w-0 flex-1">
                <span style={{ color: "var(--text-primary)" }}>{e.concept}</span>
                <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>
                  · {e.paymentMethod?.name} · {e.user?.name}
                </span>
              </div>
              <span className="font-mono font-bold ml-3 shrink-0" style={{ color: "var(--danger)" }}>
                −{formatCOP(e.amount)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Órdenes del turno */}
      {shift.orders?.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
              {shift.orders.length} venta{shift.orders.length !== 1 ? "s" : ""} en este turno
            </p>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y" style={{ borderColor: "var(--border)" }}>
            {shift.orders.map(order => {
              const statusColor = order.status === "COMPLETED" ? "var(--brand)" : "var(--danger)"
              const statusBg   = order.status === "COMPLETED" ? "var(--brand-light)" : "var(--danger-light)"
              const statusLabel = order.status === "COMPLETED" ? "OK" : order.status === "PARTIAL_REFUND" ? "Dev. parcial" : "Cancelada"
              return (
                <div key={order.id} className="px-4 py-2.5">
                  {/* Cabecera de la orden */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>#{order.id}</span>
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="badge text-xs" style={{ background: statusBg, color: statusColor }}>
                        {statusLabel}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-sm" style={{ color: "var(--brand)" }}>
                      {formatCOP(order.total)}
                    </span>
                  </div>
                  {/* Productos */}
                  {order.items?.length > 0 && (
                    <div className="mt-1.5 space-y-0.5 pl-2 border-l-2" style={{ borderColor: "var(--border)" }}>
                      {order.items.map(item => (
                        <div key={item.id} className="flex items-center justify-between">
                          <span className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                            {item.quantity > 1 && (
                              <span className="font-mono font-semibold mr-1" style={{ color: "var(--text-muted)" }}>
                                {item.quantity}×
                              </span>
                            )}
                            {item.product?.name || "—"}
                          </span>
                          <span className="text-xs font-mono ml-3 shrink-0" style={{ color: "var(--text-muted)" }}>
                            {formatCOP(Number(item.price) * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
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

// ── Tarjeta de turno activo ───────────────────────────────
function ActiveShiftCard({ shift, onView, onForceClose }) {
  const totalSales = (shift.shiftPayments || []).reduce((s, p) => s + Number(p.total), 0)
  const totalExpenses = (shift.expenses || []).reduce((s, e) => s + Number(e.amount), 0)
  const cashPayment = shift.shiftPayments?.find(p => p.paymentMethod?.name === "Efectivo")
  const cashExpenses = (shift.expenses || [])
    .filter(e => e.paymentMethod?.name === "Efectivo")
    .reduce((s, e) => s + Number(e.amount), 0)
  const expectedCash = Number(shift.openingCash) + Number(cashPayment?.total || 0) - cashExpenses
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
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onForceClose(shift)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
            style={{ background: "var(--danger-light)", color: "var(--danger)", border: "1px solid var(--danger)" }}>
            <LogOut size={11} />
            Cerrar
          </button>
          <button onClick={() => onView(shift.id)} className="btn-ghost w-7 h-7 rounded flex items-center justify-center">
            <Eye size={14} />
          </button>
        </div>
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

      {/* Por método + egresos */}
      {(shift.shiftPayments?.length > 0 || totalExpenses > 0) && (
        <div className="space-y-1 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
          {shift.shiftPayments?.map(p => (
            <div key={p.id} className="flex justify-between text-xs">
              <span style={{ color: "var(--text-secondary)" }}>{p.paymentMethod?.name}</span>
              <span className="font-mono" style={{ color: "var(--text-primary)" }}>{formatCOP(p.total)}</span>
            </div>
          ))}
          {totalExpenses > 0 && (
            <div className="flex justify-between text-xs pt-0.5 border-t" style={{ borderColor: "var(--border)" }}>
              <span style={{ color: "var(--danger)" }}>Egresos</span>
              <span className="font-mono" style={{ color: "var(--danger)" }}>−{formatCOP(totalExpenses)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Pestaña Egresos ───────────────────────────────────────
function ExpensesTab() {
  const { user } = useAuthStore()
  const qc = useQueryClient()

  const [concept, setConcept] = useState("")
  const [amount, setAmount] = useState("")
  const [paymentMethodId, setPaymentMethodId] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const { data: myShift } = useQuery({
    queryKey: ["shifts-mine"],
    queryFn: shiftsService.getMine,
  })

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: paymentMethodsService.getAll,
    staleTime: Infinity,
  })

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses-shift", myShift?.id],
    queryFn: () => expensesService.getByShift(myShift.id),
    enabled: !!myShift?.id,
    refetchInterval: 15_000,
  })

  const create = useMutation({
    mutationFn: expensesService.create,
    onSuccess: () => {
      toast.success("Egreso registrado")
      setConcept(""); setAmount(""); setPaymentMethodId(null); setShowForm(false)
      qc.invalidateQueries({ queryKey: ["expenses-shift", myShift?.id] })
      qc.invalidateQueries({ queryKey: ["shifts-active"] })
    },
    onError: e => toast.error(e.response?.data?.error || "Error al registrar"),
  })

  const remove = useMutation({
    mutationFn: expensesService.delete,
    onSuccess: () => {
      toast.success("Egreso eliminado")
      qc.invalidateQueries({ queryKey: ["expenses-shift", myShift?.id] })
      qc.invalidateQueries({ queryKey: ["shifts-active"] })
    },
    onError: e => toast.error(e.response?.data?.error || "Error al eliminar"),
  })

  const handleCreate = () => {
    if (!concept.trim() || !amount || !paymentMethodId) {
      toast.error("Completa todos los campos")
      return
    }
    create.mutate({ shiftId: myShift.id, concept, amount: Number(amount), paymentMethodId })
  }

  const handleDelete = (expense) => {
    confirm({
      title: "¿Eliminar egreso?",
      message: `"${expense.concept}" por ${formatCOP(expense.amount)}`,
      confirmLabel: "Eliminar",
      variant: "warning",
    }).then(ok => { if (ok) remove.mutate(expense.id) })
  }

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const canDelete = user?.role === "ADMIN" || user?.role === "JEFE"

  if (!myShift) {
    return (
      <div className="card p-10 text-center">
        <TrendingDown size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
        <p className="font-semibold text-sm mb-1" style={{ color: "var(--text-primary)" }}>Sin turno activo</p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Abre un turno para registrar egresos</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header + botón registrar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Turno #{myShift.id} · {myShift.user?.name}
          </p>
          {totalExpenses > 0 && (
            <p className="text-xs mt-0.5" style={{ color: "var(--danger)" }}>
              Total egresos: {formatCOP(totalExpenses)}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowForm(f => !f)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
          style={{
            background: showForm ? "var(--bg-secondary)" : "var(--brand)",
            color: showForm ? "var(--text-secondary)" : "#fff",
            border: "1.5px solid var(--brand)",
          }}>
          <Plus size={14} />
          {showForm ? "Cancelar" : "Registrar egreso"}
        </button>
      </div>

      {/* Formulario de egreso */}
      {showForm && (
        <div className="card p-4 space-y-3 animate-slide-up">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Nuevo egreso
          </p>

          <input
            type="text"
            placeholder="Concepto (ej: Pago proveedores, Insumos...)"
            value={concept}
            onChange={e => setConcept(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
            style={{
              background: "var(--bg-primary)",
              border: "1.5px solid var(--border)",
              color: "var(--text-primary)",
            }}
            onFocus={e => e.target.style.borderColor = "var(--brand)"}
            onBlur={e => e.target.style.borderColor = "var(--border)"}
          />

          <input
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={amount ? new Intl.NumberFormat("es-CO").format(Number(amount)) : ""}
            onChange={e => setAmount(e.target.value.replace(/\D/g, ""))}
            className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none transition-colors"
            style={{
              background: "var(--bg-primary)",
              border: "1.5px solid var(--border)",
              color: "var(--text-primary)",
            }}
            onFocus={e => e.target.style.borderColor = "var(--brand)"}
            onBlur={e => e.target.style.borderColor = "var(--border)"}
          />

          <div>
            <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Método de pago</p>
            <div className="flex flex-wrap gap-2">
              {paymentMethods.map(pm => {
                const active = paymentMethodId === pm.id
                return (
                  <button
                    key={pm.id}
                    onClick={() => setPaymentMethodId(pm.id)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: active ? "var(--brand)" : "var(--bg-primary)",
                      color: active ? "#fff" : "var(--text-secondary)",
                      border: `1.5px solid ${active ? "var(--brand)" : "var(--border)"}`,
                    }}>
                    {pm.name}
                  </button>
                )
              })}
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={create.isPending || !concept.trim() || !amount || !paymentMethodId}
            className="w-full rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all"
            style={{
              background: "var(--danger)",
              color: "#fff",
              opacity: (create.isPending || !concept.trim() || !amount || !paymentMethodId) ? 0.5 : 1,
            }}>
            {create.isPending ? <Loader2 size={14} className="animate-spin" /> : <TrendingDown size={14} />}
            Confirmar egreso
          </button>
        </div>
      )}

      {/* Lista de egresos */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-muted)" }} />
        </div>
      ) : expenses.length === 0 ? (
        <div className="card p-8 text-center">
          <TrendingDown size={24} className="mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Sin egresos registrados en este turno</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {expenses.map(e => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{e.concept}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {e.paymentMethod?.name} · {e.user?.name} · {new Date(e.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <span className="font-mono font-bold shrink-0" style={{ color: "var(--danger)" }}>
                  −{formatCOP(e.amount)}
                </span>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(e)}
                    disabled={remove.isPending}
                    className="w-7 h-7 rounded flex items-center justify-center btn-ghost shrink-0"
                    style={{ color: "var(--danger)" }}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {expenses.length > 0 && (
            <div className="flex justify-between items-center px-4 py-2.5 border-t text-sm font-semibold"
              style={{ borderColor: "var(--border)", background: "var(--bg-primary)" }}>
              <span style={{ color: "var(--text-primary)" }}>Total egresos</span>
              <span className="font-mono" style={{ color: "var(--danger)" }}>−{formatCOP(totalExpenses)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── ShiftsPage ────────────────────────────────────────────
const TABS = ["Turnos activos", "Egresos", "Historial"]

export default function ShiftsPage() {
  const [activeTab, setActiveTab] = useState("Turnos activos")
  const [detailId, setDetailId] = useState(null)
  const [forceCloseShift, setForceCloseShift] = useState(null) // shift object to force-close
  const [page, setPage] = useState(1)
  const qcPage = useQueryClient()

  const closeShiftMut = useMutation({
    mutationFn: ({ id, data }) => shiftsService.close(id, data),
    onSuccess: () => {
      toast.success("Turno cerrado")
      setForceCloseShift(null)
      setDetailId(null)
      qcPage.invalidateQueries({ queryKey: ["shifts-active"] })
      qcPage.invalidateQueries({ queryKey: ["shifts-history"] })
    },
    onError: e => toast.error(e.response?.data?.error || "Error al cerrar turno"),
  })

  const handleForceClose = (shift) => setForceCloseShift(shift)

  const { data: activeShifts = [], isLoading: loadingActive, refetch: refetchActive } = useQuery({
    queryKey: ["shifts-active"],
    queryFn: async () => {
      const result = await shiftsService.getAll({ limit: 50 })
      return (result.shifts || []).filter(s => s.status === "OPEN")
    },
    refetchInterval: 30_000,
  })

  const { data: historyData, isLoading: loadingHistory } = useQuery({
    queryKey: ["shifts-history", page],
    queryFn: () => shiftsService.getAll({ page, limit: 15 }),
    enabled: activeTab === "Historial",
  })

  const history = (historyData?.shifts || []).filter(s => s.status === "CLOSED")
  const totalHistory = historyData?.total || 0

  const totalActive = activeShifts.reduce((s, sh) =>
    s + (sh.shiftPayments || []).reduce((ss, p) => ss + Number(p.total), 0), 0)
  const totalExpensesActive = activeShifts.reduce((s, sh) =>
    s + (sh.expenses || []).reduce((ss, e) => ss + Number(e.amount), 0), 0)
  const totalCashActive = activeShifts.reduce((s, sh) => {
    const cp = sh.shiftPayments?.find(p => p.paymentMethod?.name === "Efectivo")
    const cashExp = (sh.expenses || [])
      .filter(e => e.paymentMethod?.name === "Efectivo")
      .reduce((ss, e) => ss + Number(e.amount), 0)
    return s + Number(sh.openingCash) + Number(cp?.total || 0) - cashExp
  }, 0)

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl" style={{ color: "var(--text-primary)" }}>Control de caja</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Turnos, egresos y cierre de caja</p>
        </div>
        <button onClick={() => refetchActive()} className="btn-outline btn-sm">Actualizar</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === tab ? "var(--bg-primary)" : "transparent",
              color: activeTab === tab ? "var(--text-primary)" : "var(--text-muted)",
              boxShadow: activeTab === tab ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── Turnos activos ── */}
      {activeTab === "Turnos activos" && (
        <div className="space-y-5">
          {/* Resumen global */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users size={14} style={{ color: "var(--brand)" }} />
                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Cajeros activos</span>
              </div>
              <p className="font-display font-bold text-3xl" style={{ color: "var(--text-primary)" }}>{activeShifts.length}</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} style={{ color: "var(--brand)" }} />
                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Ventas en curso</span>
              </div>
              <p className="font-display font-bold text-3xl font-mono" style={{ color: "var(--brand)" }}>{formatCOP(totalActive)}</p>
              {totalExpensesActive > 0 && (
                <p className="text-xs font-mono mt-1" style={{ color: "var(--danger)" }}>
                  Egresos: −{formatCOP(totalExpensesActive)}
                </p>
              )}
            </div>
            <div className="card p-4 col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={14} style={{ color: "var(--info)" }} />
                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Efectivo esperado total</span>
              </div>
              <p className="font-display font-bold text-3xl font-mono" style={{ color: "var(--info)" }}>{formatCOP(totalCashActive)}</p>
            </div>
          </div>

          {/* Tarjetas de cajeros */}
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
                  <ActiveShiftCard key={shift.id} shift={shift} onView={setDetailId} onForceClose={handleForceClose} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Egresos ── */}
      {activeTab === "Egresos" && <ExpensesTab />}

      {/* ── Historial ── */}
      {activeTab === "Historial" && (
        <div>
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
                                style={{
                                  background: Math.abs(diff) < 0.01 ? "var(--brand-light)" : diff > 0 ? "var(--brand-light)" : "var(--danger-light)",
                                  color: Math.abs(diff) < 0.01 ? "var(--brand)" : diff > 0 ? "var(--brand)" : "var(--danger)"
                                }}>
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
      )}

      {detailId && (
        <ShiftDetailModal
          shiftId={detailId}
          onClose={() => setDetailId(null)}
          onForceClose={(shift) => { setDetailId(null); setForceCloseShift(shift) }}
        />
      )}

      {forceCloseShift && (
        <ForceCloseModal
          shift={forceCloseShift}
          onClose={() => setForceCloseShift(null)}
          loading={closeShiftMut.isPending}
          onConfirm={(data) => closeShiftMut.mutate({ id: forceCloseShift.id, data })}
        />
      )}
    </div>
  )
}
