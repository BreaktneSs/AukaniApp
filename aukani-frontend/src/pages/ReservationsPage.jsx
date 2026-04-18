import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { reservationsService } from "@/services/reservations.service"
import { shiftsService } from "@/services/shifts.service"
import { paymentMethodsService } from "@/services/catalog.service"
import { productsService } from "@/services/products.service"
import {
  CalendarDays, Plus, X, Check, Ban, Loader2,
  Phone, Clock, ChevronLeft, ChevronRight, Search, Minus
} from "lucide-react"
import { formatCOP } from "@/utils/currency"
import toast from "react-hot-toast"

const STATUS = {
  PENDING:   { label: "Pendiente",   color: "var(--brand)",   bg: "var(--brand-light)" },
  COMPLETED: { label: "Completada",  color: "var(--success, #16a34a)", bg: "#dcfce7" },
  CANCELLED: { label: "Cancelada",   color: "var(--danger)",  bg: "var(--danger-light)" },
}
const TABS = ["PENDING", "COMPLETED", "CANCELLED"]
const TAB_LABELS = { PENDING: "Pendientes", COMPLETED: "Completadas", CANCELLED: "Canceladas" }

// ── Modal base ─────────────────────────────────────────────
function Modal({ onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)" }} onClick={onClose}>
      <div
        className={`card w-full animate-slide-up overflow-y-auto max-h-[92vh] ${wide ? "max-w-xl" : "max-w-md"}`}
        onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

function ModalHeader({ title, subtitle, onClose }) {
  return (
    <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
      <div>
        <h2 className="font-display font-bold text-base" style={{ color: "var(--text-primary)" }}>{title}</h2>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{subtitle}</p>}
      </div>
      <button onClick={onClose} className="btn-ghost w-7 h-7 rounded flex items-center justify-center shrink-0 ml-3">
        <X size={15} />
      </button>
    </div>
  )
}

// ── Crear reserva ──────────────────────────────────────────
function CreateModal({ onClose, paymentMethods }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    clientName: "", clientPhone: "", notes: "",
    scheduledAt: "", depositAmount: "", depositMethodId: null,
  })
  const [cartItems, setCartItems] = useState([]) // [{product, quantity}]
  const [search, setSearch] = useState("")

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const { data: serviceProducts = [] } = useQuery({
    queryKey: ["products", "SERVICE"],
    queryFn: () => productsService.getAll({ type: "SERVICE", limit: 200 }).then(r => r.products),
    staleTime: 60_000,
  })

  const filtered = useMemo(() => {
    if (!search.trim()) return serviceProducts
    const s = search.toLowerCase()
    return serviceProducts.filter(p => p.name.toLowerCase().includes(s))
  }, [serviceProducts, search])

  const totalAmount = cartItems.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0)

  const addProduct = (product) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product, quantity: 1 }]
    })
  }

  const changeQty = (productId, delta) => {
    setCartItems(prev => {
      const next = prev.map(i => i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i)
      return next.filter(i => i.quantity > 0)
    })
  }

  const create = useMutation({
    mutationFn: reservationsService.create,
    onSuccess: () => {
      toast.success("Reserva creada")
      qc.invalidateQueries({ queryKey: ["reservations"] })
      onClose()
    },
    onError: e => toast.error(e.response?.data?.error || "Error al crear"),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (cartItems.length === 0) { toast.error("Agrega al menos un servicio"); return }
    if (!form.depositMethodId) { toast.error("Selecciona el método de pago del abono"); return }
    if (Number(form.depositAmount) > totalAmount) { toast.error("El abono no puede superar el total"); return }
    create.mutate({
      ...form,
      depositAmount: Number(form.depositAmount),
      depositMethodId: form.depositMethodId,
      items: cartItems.map(i => ({ productId: i.product.id, quantity: i.quantity })),
    })
  }

  const inputStyle = {
    background: "var(--bg-primary)", border: "1.5px solid var(--border)",
    color: "var(--text-primary)", borderRadius: "0.5rem",
    padding: "0.5rem 0.75rem", fontSize: "0.875rem", width: "100%", outline: "none",
  }

  return (
    <Modal onClose={onClose} wide>
      <ModalHeader title="Nueva reserva" subtitle="El abono no requiere turno abierto" onClose={onClose} />
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

        {/* Cliente + fecha */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>Cliente *</label>
            <input style={inputStyle} placeholder="Nombre del cliente" required value={form.clientName} onChange={e => set("clientName", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>Teléfono</label>
            <input style={inputStyle} placeholder="Opcional" value={form.clientPhone} onChange={e => set("clientPhone", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>Fecha *</label>
            <input type="date" style={inputStyle} required value={form.scheduledAt} onChange={e => set("scheduledAt", e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>Notas</label>
            <textarea style={{ ...inputStyle, resize: "none" }} rows={2} placeholder="Detalles adicionales..." value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>
        </div>

        {/* Selector de servicios */}
        <div>
          <label className="block text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>Servicios *</label>
          <div className="relative mb-2">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
            <input style={{ ...inputStyle, paddingLeft: "2rem" }} placeholder="Buscar servicio..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="rounded-lg overflow-hidden border" style={{ borderColor: "var(--border)", maxHeight: "160px", overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>
                {serviceProducts.length === 0 ? "No hay productos de tipo servicio" : "Sin resultados"}
              </p>
            ) : filtered.map(p => (
              <button key={p.id} type="button" onClick={() => addProduct(p)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:opacity-80 border-b last:border-0 transition-colors"
                style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
                <span className="truncate mr-2">{p.name}</span>
                <span className="font-mono font-semibold shrink-0" style={{ color: "var(--brand)" }}>{formatCOP(p.price)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Carrito */}
        {cartItems.length > 0 && (
          <div className="rounded-lg border" style={{ borderColor: "var(--border)" }}>
            {cartItems.map(item => (
              <div key={item.product.id} className="flex items-center gap-2 px-3 py-2 border-b last:border-0 text-sm" style={{ borderColor: "var(--border)" }}>
                <span className="flex-1 truncate" style={{ color: "var(--text-primary)" }}>{item.product.name}</span>
                <span className="font-mono text-xs shrink-0" style={{ color: "var(--text-muted)" }}>{formatCOP(Number(item.product.price) * item.quantity)}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => changeQty(item.product.id, -1)}
                    className="w-5 h-5 rounded flex items-center justify-center btn-ghost" style={{ color: "var(--danger)" }}>
                    <Minus size={11} />
                  </button>
                  <span className="w-5 text-center text-xs font-bold" style={{ color: "var(--text-primary)" }}>{item.quantity}</span>
                  <button type="button" onClick={() => changeQty(item.product.id, 1)}
                    className="w-5 h-5 rounded flex items-center justify-center btn-ghost" style={{ color: "var(--brand)" }}>
                    <Plus size={11} />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex justify-between px-3 py-2 font-bold text-sm" style={{ background: "var(--bg-secondary)" }}>
              <span style={{ color: "var(--text-muted)" }}>Total servicios</span>
              <span className="font-mono" style={{ color: "var(--text-primary)" }}>{formatCOP(totalAmount)}</span>
            </div>
          </div>
        )}

        {/* Abono */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>Abono inicial *</label>
            <input type="number" style={inputStyle} placeholder="0" min={0} required value={form.depositAmount} onChange={e => set("depositAmount", e.target.value)} />
          </div>
          {form.depositAmount && totalAmount > 0 && (
            <div className="flex items-end pb-1">
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                Restante al completar:
                <span className="ml-1 font-mono font-bold" style={{ color: "var(--warning)" }}>
                  {formatCOP(Math.max(0, totalAmount - Number(form.depositAmount)))}
                </span>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>Método de pago del abono *</label>
          <div className="flex flex-wrap gap-2">
            {paymentMethods.map(pm => {
              const active = form.depositMethodId === pm.id
              return (
                <button type="button" key={pm.id} onClick={() => set("depositMethodId", pm.id)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={{ background: active ? "var(--brand)" : "var(--bg-primary)", color: active ? "#fff" : "var(--text-secondary)", border: `1.5px solid ${active ? "var(--brand)" : "var(--border)"}` }}>
                  {pm.name}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-outline btn-md flex-1">Cancelar</button>
          <button type="submit" disabled={create.isPending || cartItems.length === 0}
            className="btn-md flex-1 flex items-center justify-center gap-2"
            style={{ background: "var(--brand)", color: "#fff", opacity: cartItems.length === 0 ? 0.5 : 1 }}>
            {create.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Crear reserva
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Completar reserva ──────────────────────────────────────
function CompleteModal({ reservation, onClose, paymentMethods, myShift }) {
  const qc = useQueryClient()
  const [methodId, setMethodId] = useState(null)
  const remaining = Number(reservation.totalAmount) - Number(reservation.depositAmount)

  const complete = useMutation({
    mutationFn: (data) => reservationsService.complete(reservation.id, data),
    onSuccess: () => {
      toast.success("Reserva completada y registrada en el turno")
      qc.invalidateQueries({ queryKey: ["reservations"] })
      qc.invalidateQueries({ queryKey: ["shifts-mine"] })
      onClose()
    },
    onError: e => toast.error(e.response?.data?.error || "Error al completar"),
  })

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Completar reserva" subtitle={`Cliente: ${reservation.clientName}`} onClose={onClose} />
      <div className="px-6 py-5 space-y-4">
        {!myShift ? (
          <div className="rounded-lg px-4 py-3 text-sm" style={{ background: "var(--danger-light)", border: "1px solid var(--danger)" }}>
            <p className="font-semibold" style={{ color: "var(--danger)" }}>Sin turno abierto</p>
            <p className="mt-0.5" style={{ color: "var(--danger)" }}>Debes abrir un turno para completar la reserva.</p>
          </div>
        ) : (
          <>
            <div className="rounded-lg px-4 py-3 space-y-1.5" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>Se registrará en el turno activo:</p>
              <div className="flex justify-between text-sm">
                <span style={{ color: "var(--text-secondary)" }}>Abono · {reservation.depositMethod?.name}</span>
                <span className="font-mono font-bold" style={{ color: "var(--brand)" }}>{formatCOP(reservation.depositAmount)}</span>
              </div>
              {remaining > 0 && (
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--text-secondary)" }}>Restante a cobrar</span>
                  <span className="font-mono font-bold" style={{ color: "var(--warning)" }}>{formatCOP(remaining)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                <span style={{ color: "var(--text-primary)" }}>Total del servicio</span>
                <span className="font-mono" style={{ color: "var(--brand)" }}>{formatCOP(reservation.totalAmount)}</span>
              </div>
            </div>

            {remaining > 0 && (
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>Método de pago del restante *</label>
                <div className="flex flex-wrap gap-2">
                  {paymentMethods.map(pm => {
                    const active = methodId === pm.id
                    return (
                      <button key={pm.id} onClick={() => setMethodId(pm.id)}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                        style={{ background: active ? "var(--brand)" : "var(--bg-primary)", color: active ? "#fff" : "var(--text-secondary)", border: `1.5px solid ${active ? "var(--brand)" : "var(--border)"}` }}>
                        {pm.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="btn-outline btn-md flex-1">Cancelar</button>
              <button
                onClick={() => complete.mutate({ shiftId: myShift.id, remainingMethodId: remaining > 0 ? methodId : reservation.depositMethodId })}
                disabled={complete.isPending || (remaining > 0 && !methodId)}
                className="btn-md flex-1 flex items-center justify-center gap-2"
                style={{ background: "var(--brand)", color: "#fff", opacity: (remaining > 0 && !methodId) ? 0.5 : 1 }}>
                {complete.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Confirmar cobro
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

// ── Cancelar reserva ───────────────────────────────────────
function CancelModal({ reservation, onClose, paymentMethods, myShift }) {
  const qc = useQueryClient()
  const [refundPct, setRefundPct] = useState(100)
  const [methodId, setMethodId] = useState(null)
  const deposit = Number(reservation.depositAmount)
  const refundAmount = Math.round(deposit * refundPct) / 100
  const retentionAmount = deposit - refundAmount

  const cancel = useMutation({
    mutationFn: (data) => reservationsService.cancel(reservation.id, data),
    onSuccess: () => {
      toast.success("Reserva cancelada")
      qc.invalidateQueries({ queryKey: ["reservations"] })
      qc.invalidateQueries({ queryKey: ["shifts-mine"] })
      onClose()
    },
    onError: e => toast.error(e.response?.data?.error || "Error al cancelar"),
  })

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Cancelar reserva" subtitle={`Cliente: ${reservation.clientName}`} onClose={onClose} />
      <div className="px-6 py-5 space-y-4">
        {!myShift ? (
          <div className="rounded-lg px-4 py-3 text-sm" style={{ background: "var(--danger-light)", border: "1px solid var(--danger)" }}>
            <p className="font-semibold" style={{ color: "var(--danger)" }}>Sin turno abierto</p>
            <p className="mt-0.5" style={{ color: "var(--danger)" }}>Debes abrir un turno para registrar la cancelación.</p>
          </div>
        ) : (
          <>
            <div className="rounded-lg px-4 py-3 space-y-3" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
              <div className="flex justify-between text-sm">
                <span style={{ color: "var(--text-muted)" }}>Abono recibido · {reservation.depositMethod?.name}</span>
                <span className="font-mono font-bold" style={{ color: "var(--text-primary)" }}>{formatCOP(deposit)}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>
                  % a devolver al cliente
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={0} max={100} step={5}
                    value={refundPct} onChange={e => setRefundPct(Number(e.target.value))}
                    className="flex-1"
                  />
                  <input
                    type="number" min={0} max={100}
                    value={refundPct} onChange={e => setRefundPct(Math.min(100, Math.max(0, Number(e.target.value))))}
                    className="w-16 text-center rounded-lg text-sm font-mono font-bold outline-none"
                    style={{ background: "var(--bg-secondary)", border: "1.5px solid var(--border)", color: "var(--text-primary)", padding: "0.35rem" }}
                  />
                  <span className="text-sm font-bold" style={{ color: "var(--text-muted)" }}>%</span>
                </div>
              </div>

              <div className="pt-2 border-t space-y-1.5" style={{ borderColor: "var(--border)" }}>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--text-muted)" }}>Reembolso al cliente</span>
                  <span className="font-mono font-bold" style={{ color: "var(--text-muted)" }}>
                    {formatCOP(refundAmount)} <span className="text-xs font-normal">(fuera de caja)</span>
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: retentionAmount > 0 ? "var(--brand)" : "var(--text-muted)" }}>
                    Ingresa a caja · {reservation.depositMethod?.name}
                  </span>
                  <span className="font-mono font-bold" style={{ color: retentionAmount > 0 ? "var(--brand)" : "var(--text-muted)" }}>
                    {formatCOP(retentionAmount)}
                  </span>
                </div>
              </div>
            </div>

            {refundAmount > 0 && (
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Método de devolución al cliente *</label>
                <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Este pago sale del fondo del abono, no de la caja.</p>
                <div className="flex flex-wrap gap-2">
                  {paymentMethods.map(pm => {
                    const active = methodId === pm.id
                    return (
                      <button key={pm.id} onClick={() => setMethodId(pm.id)}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                        style={{ background: active ? "var(--warning)" : "var(--bg-primary)", color: active ? "#fff" : "var(--text-secondary)", border: `1.5px solid ${active ? "var(--warning)" : "var(--border)"}` }}>
                        {pm.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="btn-outline btn-md flex-1">Volver</button>
              <button
                onClick={() => cancel.mutate({ shiftId: myShift.id, refundPct, refundMethodId: refundAmount > 0 ? methodId : null })}
                disabled={cancel.isPending || (refundAmount > 0 && !methodId)}
                className="btn-md flex-1 flex items-center justify-center gap-2"
                style={{ background: "var(--danger)", color: "#fff", opacity: (refundAmount > 0 && !methodId) ? 0.5 : 1 }}>
                {cancel.isPending ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                Cancelar reserva
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

// ── Tarjeta de reserva ─────────────────────────────────────
function ReservationCard({ reservation, onComplete, onCancel }) {
  const isPending = reservation.status === "PENDING"
  const remaining = Number(reservation.totalAmount) - Number(reservation.depositAmount)
  const scheduled = new Date(reservation.scheduledAt)
  const isOverdue = isPending && scheduled < new Date()

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>{reservation.clientName}</p>
          {reservation.clientPhone && (
            <div className="flex items-center gap-1 mt-0.5">
              <Phone size={11} style={{ color: "var(--text-muted)" }} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{reservation.clientPhone}</span>
            </div>
          )}
        </div>
        <span className="badge text-xs shrink-0"
          style={{ background: STATUS[reservation.status]?.bg, color: STATUS[reservation.status]?.color }}>
          {STATUS[reservation.status]?.label}
        </span>
      </div>

      <div className="flex items-center gap-1.5 text-xs"
        style={{ color: isOverdue ? "var(--danger)" : "var(--text-secondary)" }}>
        <Clock size={12} />
        <span>{scheduled.toLocaleDateString()}</span>
        {isOverdue && <span className="font-semibold">· Vencida</span>}
      </div>

      {reservation.notes && (
        <p className="text-xs line-clamp-2" style={{ color: "var(--text-muted)" }}>{reservation.notes}</p>
      )}

      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        {/* Items */}
        {(reservation.items || []).map(item => (
          <div key={item.id} className="flex justify-between items-center px-3 py-1.5 text-xs border-b" style={{ borderColor: "var(--border)", background: "var(--bg-primary)" }}>
            <span style={{ color: "var(--text-secondary)" }}>{item.product?.name} × {item.quantity}</span>
            <span className="font-mono font-semibold" style={{ color: "var(--text-primary)" }}>{formatCOP(Number(item.price) * item.quantity)}</span>
          </div>
        ))}
        {/* Totals */}
        <div className="px-3 py-2 space-y-1" style={{ background: "var(--bg-primary)" }}>
          <div className="flex justify-between text-xs font-bold">
            <span style={{ color: "var(--text-muted)" }}>Total</span>
            <span className="font-mono" style={{ color: "var(--text-primary)" }}>{formatCOP(reservation.totalAmount)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span style={{ color: "var(--text-muted)" }}>Abono · {reservation.depositMethod?.name}</span>
            <span className="font-mono font-semibold" style={{ color: "var(--brand)" }}>{formatCOP(reservation.depositAmount)}</span>
          </div>
          {reservation.status === "PENDING" && remaining > 0 && (
            <div className="flex justify-between text-xs pt-1 border-t" style={{ borderColor: "var(--border)" }}>
              <span style={{ color: "var(--text-muted)" }}>Restante</span>
              <span className="font-mono font-semibold" style={{ color: "var(--warning)" }}>{formatCOP(remaining)}</span>
            </div>
          )}
          {reservation.status === "COMPLETED" && (
            <div className="flex justify-between text-xs pt-1 border-t" style={{ borderColor: "var(--border)" }}>
              <span style={{ color: "var(--text-muted)" }}>Cobrado · {reservation.remainingMethod?.name}</span>
              <span className="font-mono font-semibold" style={{ color: "var(--brand)" }}>{formatCOP(reservation.remainingAmount)}</span>
            </div>
          )}
          {reservation.status === "CANCELLED" && reservation.refundAmount > 0 && (
            <div className="flex justify-between text-xs pt-1 border-t" style={{ borderColor: "var(--border)" }}>
              <span style={{ color: "var(--text-muted)" }}>Reembolsado ({reservation.refundPct}%) · {reservation.refundMethod?.name}</span>
              <span className="font-mono font-semibold" style={{ color: "var(--danger)" }}>−{formatCOP(reservation.refundAmount)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
        Creada por {reservation.createdBy?.name}
        {reservation.completedBy && ` · Completada por ${reservation.completedBy.name}`}
        {reservation.cancelledBy && ` · Cancelada por ${reservation.cancelledBy.name}`}
      </div>

      {isPending && (
        <div className="flex gap-2 pt-1">
          <button onClick={() => onCancel(reservation)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: "var(--danger-light)", color: "var(--danger)", border: "1px solid var(--danger)" }}>
            <Ban size={12} /> Cancelar
          </button>
          <button onClick={() => onComplete(reservation)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: "var(--brand)", color: "#fff" }}>
            <Check size={12} /> Completar
          </button>
        </div>
      )}
    </div>
  )
}

// ── ReservationsPage ───────────────────────────────────────
export default function ReservationsPage() {
  const [activeTab, setActiveTab] = useState("PENDING")
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [completing, setCompleting] = useState(null)
  const [cancelling, setCancelling] = useState(null)

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: paymentMethodsService.getAll,
    staleTime: Infinity,
  })

  const { data: myShift } = useQuery({
    queryKey: ["shifts-mine"],
    queryFn: shiftsService.getMine,
    refetchInterval: 30_000,
  })

  const { data, isLoading } = useQuery({
    queryKey: ["reservations", activeTab, page],
    queryFn: () => reservationsService.getAll({ status: activeTab, page, limit: 20 }),
    keepPreviousData: true,
  })

  const reservations = data?.reservations || []
  const total = data?.total || 0
  const pages = Math.ceil(total / 20)

  const handleTabChange = (tab) => { setActiveTab(tab); setPage(1) }

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl" style={{ color: "var(--text-primary)" }}>Reservas</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {total} {TAB_LABELS[activeTab].toLowerCase()}
            {!myShift && (
              <span className="ml-2 font-semibold" style={{ color: "var(--warning)" }}>· Sin turno abierto</span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold"
          style={{ background: "var(--brand)", color: "#fff" }}>
          <Plus size={15} /> Nueva reserva
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => handleTabChange(tab)}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === tab ? "var(--bg-primary)" : "transparent",
              color: activeTab === tab ? "var(--text-primary)" : "var(--text-muted)",
              boxShadow: activeTab === tab ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}>
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--text-muted)" }} />
        </div>
      ) : reservations.length === 0 ? (
        <div className="card p-12 text-center">
          <CalendarDays size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Sin {TAB_LABELS[activeTab].toLowerCase()}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {reservations.map(r => (
            <ReservationCard key={r.id} reservation={r}
              onComplete={setCompleting}
              onCancel={setCancelling}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-muted)" }}>
          <span>Página {page} de {pages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="btn-outline btn-sm">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= pages} className="btn-outline btn-sm">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {showCreate  && <CreateModal  onClose={() => setShowCreate(false)}  paymentMethods={paymentMethods} />}
      {completing  && <CompleteModal reservation={completing} onClose={() => setCompleting(null)}  paymentMethods={paymentMethods} myShift={myShift} />}
      {cancelling  && <CancelModal  reservation={cancelling}  onClose={() => setCancelling(null)}  paymentMethods={paymentMethods} myShift={myShift} />}
    </div>
  )
}
