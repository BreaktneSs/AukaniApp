import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { shiftsService } from "@/services/shifts.service"
import { usersService } from "@/services/users.service"
import { categoriesService, paymentMethodsService } from "@/services/catalog.service"
import { useAuthStore } from "@/store/auth.store"
import { useCartStore } from "@/store/cart.store"
import { Plus, Loader2, CheckCircle, XCircle } from "lucide-react"
import { formatCOP } from "@/utils/currency"
import toast from "react-hot-toast"

const TABS = ["Turno de caja", "Usuarios", "Categorías", "Métodos de pago"]

// ── Turno ─────────────────────────────────────────────────
function ShiftTab() {
  const [openingCash, setOpeningCash] = useState("")
  const [closingCash, setClosingCash] = useState("")
  const [notes, setNotes] = useState("")
  const { setShift } = useCartStore()
  const qc = useQueryClient()

  const { data: shift, isLoading } = useQuery({ queryKey: ["shift-mine"], queryFn: shiftsService.getMine, retry: false })

  const open = useMutation({
    mutationFn: () => shiftsService.open(Number(openingCash)),
    onSuccess: (data) => { toast.success("Turno abierto"); setShift(data.id); qc.invalidateQueries({ queryKey: ["shift-mine"] }) },
    onError: e => toast.error(e.response?.data?.error || "Error"),
  })

  const close = useMutation({
    mutationFn: () => shiftsService.close(shift.id, { closingCash: Number(closingCash), notes }),
    onSuccess: () => { toast.success("Turno cerrado"); setShift(null); qc.invalidateQueries({ queryKey: ["shift-mine"] }) },
    onError: e => toast.error(e.response?.data?.error || "Error"),
  })

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin" style={{ color: "var(--text-muted)" }} /></div>

  return (
    <div className="max-w-sm space-y-4">
      {shift ? (
        <div className="space-y-4">
          <div className="card p-4 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={16} style={{ color: "var(--brand)" }} />
              <span className="font-semibold text-sm" style={{ color: "var(--brand)" }}>Turno activo</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: "var(--text-muted)" }}>Apertura</span>
              <span className="font-mono" style={{ color: "var(--text-primary)" }}>{formatCOP(shift.openingCash)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: "var(--text-muted)" }}>Inicio</span>
              <span style={{ color: "var(--text-secondary)" }}>{new Date(shift.openedAt).toLocaleTimeString()}</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Efectivo en caja al cerrar</label>
            <input type="number" className="input" placeholder="0.00" value={closingCash} onChange={e => setClosingCash(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Notas</label>
            <textarea className="input resize-none" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <button onClick={() => close.mutate()} disabled={!closingCash || close.isPending}
            className="btn-md w-full text-white" style={{ background: "var(--danger)" }}>
            {close.isPending ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
            Cerrar turno
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="card p-4 text-center space-y-2">
            <XCircle size={24} className="mx-auto" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No hay turno activo</p>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Efectivo inicial en caja</label>
            <input type="number" className="input" placeholder="0.00" value={openingCash} onChange={e => setOpeningCash(e.target.value)} />
          </div>
          <button onClick={() => open.mutate()} disabled={!openingCash || open.isPending} className="btn-primary btn-md w-full">
            {open.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            Abrir turno
          </button>
        </div>
      )}
    </div>
  )
}

// ── Usuarios ─────────────────────────────────────────────
function UsersTab() {
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "VENDEDOR" })
  const qc = useQueryClient()

  const { data: users = [], isLoading } = useQuery({ queryKey: ["users"], queryFn: usersService.getAll })
  const create = useMutation({
    mutationFn: usersService.create,
    onSuccess: () => { toast.success("Usuario creado"); qc.invalidateQueries({ queryKey: ["users"] }); setModal(false); setForm({ name: "", email: "", password: "", role: "VENDEDOR" }) },
    onError: e => toast.error(e.response?.data?.error || "Error"),
  })
  const deactivate = useMutation({
    mutationFn: usersService.deactivate,
    onSuccess: () => { toast.success("Usuario desactivado"); qc.invalidateQueries({ queryKey: ["users"] }) },
    onError: e => toast.error(e.response?.data?.error || "Error"),
  })

  const ROLES = { ADMIN: { label: "Admin", color: "var(--danger)" }, JEFE: { label: "Jefe", color: "var(--warning)" }, VENDEDOR: { label: "Vendedor", color: "var(--brand)" } }

  return (
    <div className="space-y-4">
      <button onClick={() => setModal(true)} className="btn-primary btn-md"><Plus size={15} /> Nuevo usuario</button>
      {isLoading ? <Loader2 className="animate-spin" style={{ color: "var(--text-muted)" }} /> : (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="card p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0"
                style={{ background: "var(--brand)" }}>{u.name[0].toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{u.name}</p>
                <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{u.email}</p>
              </div>
              <span className="badge text-xs" style={{ color: ROLES[u.role]?.color, background: `${ROLES[u.role]?.color}22` }}>{ROLES[u.role]?.label}</span>
              {u.active && (
                <button onClick={() => { if (confirm(`¿Desactivar a ${u.name}?`)) deactivate.mutate(u.id) }}
                  className="btn-ghost w-7 h-7 rounded flex items-center justify-center text-xs"
                  style={{ color: "var(--danger)" }}>✕</button>
              )}
            </div>
          ))}
        </div>
      )}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setModal(false)}>
          <div className="card p-6 w-full max-w-sm animate-slide-up" onClick={e => e.stopPropagation()}>
            <h2 className="font-display font-bold text-lg mb-4" style={{ color: "var(--text-primary)" }}>Nuevo usuario</h2>
            <form onSubmit={e => { e.preventDefault(); create.mutate(form) }} className="space-y-3">
              {[["Nombre", "name", "text"], ["Email", "email", "email"], ["Contraseña", "password", "password"]].map(([label, key, type]) => (
                <div key={key}>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>{label}</label>
                  <input type={type} required className="input" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Rol</label>
                <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="VENDEDOR">Vendedor</option>
                  <option value="JEFE">Jefe</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setModal(false)} className="btn-outline btn-md flex-1">Cancelar</button>
                <button type="submit" className="btn-primary btn-md flex-1" disabled={create.isPending}>Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Catálogos simples (categorías y métodos de pago) ──────
function SimpleListTab({ queryKey, fetchFn, createFn, deleteFn, label, minItems = 0 }) {
  const [name, setName] = useState("")
  const qc = useQueryClient()
  const { data = [], isLoading } = useQuery({ queryKey: [queryKey], queryFn: fetchFn })

  const activeItems = data.filter(item => item.active !== false)

  const create = useMutation({
    mutationFn: () => createFn(name),
    onSuccess: () => {
      toast.success(`${label} creado`)
      qc.invalidateQueries({ queryKey: [queryKey] })
      qc.invalidateQueries({ queryKey: ["payment-methods"] })
      setName("")
    },
    onError: e => toast.error(e.response?.data?.error || "Error"),
  })

  const remove = useMutation({
    mutationFn: deleteFn,
    onSuccess: () => {
      toast.success(`${label} eliminado`)
      qc.invalidateQueries({ queryKey: [queryKey] })
      qc.invalidateQueries({ queryKey: ["payment-methods"] })
    },
    onError: e => toast.error(e.response?.data?.error || "Error"),
  })

  const handleDelete = (item) => {
    if (activeItems.length <= minItems) {
      toast.error(`Debe haber al menos ${minItems} ${label.toLowerCase()}`)
      return
    }
    if (confirm(`¿Eliminar "${item.name}"?`)) remove.mutate(item.id)
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && name.trim()) create.mutate()
  }

  return (
    <div className="space-y-3 max-w-sm">
      <div className="flex gap-2">
        <input
          className="input"
          placeholder={`Nuevo ${label.toLowerCase()}...`}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          onClick={() => create.mutate()}
          disabled={!name.trim() || create.isPending}
          className="btn-primary btn-md shrink-0">
          {create.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={15} />}
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 size={18} className="animate-spin" style={{ color: "var(--text-muted)" }} />
        </div>
      ) : activeItems.length === 0 ? (
        <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
          No hay {label.toLowerCase()}s registradas
        </p>
      ) : (
        <div className="space-y-1.5">
          {activeItems.map((item, idx) => {
            const isLast = activeItems.length <= minItems
            return (
              <div key={item.id} className="card px-3 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {item.name}
                  </span>
                  {isLast && (
                    <span className="badge text-xs px-1.5"
                      style={{ background: "var(--brand-light)", color: "var(--brand)" }}>
                      requerido
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(item)}
                  disabled={isLast || remove.isPending}
                  title={isLast ? `Debe haber al menos ${minItems}` : `Eliminar ${item.name}`}
                  className="w-6 h-6 rounded flex items-center justify-center transition-opacity"
                  style={{
                    color: "var(--danger)",
                    opacity: isLast ? 0.3 : 1,
                    cursor: isLast ? "not-allowed" : "pointer",
                  }}>
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}

      {minItems > 0 && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          * Debe haber al menos {minItems} {label.toLowerCase()} activo
        </p>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────
export default function SettingsPage() {
  const [tab, setTab] = useState(0)
  const { user } = useAuthStore()
  const isAdmin = user?.role === "ADMIN"

  const visibleTabs = isAdmin ? TABS : TABS.filter(t => t !== "Usuarios")

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="font-display font-bold text-xl" style={{ color: "var(--text-primary)" }}>Configuración</h1>

      <div className="flex gap-1 border-b" style={{ borderColor: "var(--border)" }}>
        {visibleTabs.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className="px-4 py-2 text-sm transition-colors border-b-2 -mb-px"
            style={{ borderColor: tab === i ? "var(--brand)" : "transparent", color: tab === i ? "var(--brand)" : "var(--text-muted)", fontWeight: tab === i ? 600 : 400 }}>
            {t}
          </button>
        ))}
      </div>

      <div className="animate-fade-in">
        {tab === 0 && <ShiftTab />}
        {tab === 1 && isAdmin && <UsersTab />}
        {tab === (isAdmin ? 2 : 1) && <SimpleListTab queryKey="categories" fetchFn={categoriesService.getAll} createFn={categoriesService.create} deleteFn={categoriesService.delete} label="Categoría" />}
        {tab === (isAdmin ? 3 : 2) && <SimpleListTab queryKey="payment-methods" fetchFn={paymentMethodsService.getAll} createFn={paymentMethodsService.create} deleteFn={paymentMethodsService.delete} label="Método de pago" minItems={1} />}
      </div>
    </div>
  )
}