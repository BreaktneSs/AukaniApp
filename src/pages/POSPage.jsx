import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useCartStore } from "@/store/cart.store"
import { useAuthStore } from "@/store/auth.store"
import { productsService } from "@/services/products.service"
import { ordersService } from "@/services/orders.service"
import { shiftsService } from "@/services/shifts.service"
import { dispatchService } from "@/services/dispatch.service"
import { accountsService } from "@/services/accounts.service"
import { paymentMethodsService, categoriesService } from "@/services/catalog.service"
import {
  Search, X, Plus, Minus, Trash2, ShoppingCart,
  CreditCard, Banknote, Loader2, Package,
  PlusCircle, LogIn, LogOut, Bell, User, UserPlus, AlertTriangle,
} from "lucide-react"
import toast from "react-hot-toast"
import { formatCOP, formatNumber } from "@/utils/currency"

// ── (ImgPlaceholder inlined in ProductCard) ──────────────

// ── ProductCard ───────────────────────────────────────────
function ProductCard({ product, onAdd }) {
  const [err, setErr] = useState(false)
  return (
    <button onClick={() => onAdd(product)}
      className="relative aspect-square w-full overflow-hidden rounded-xl transition-all duration-150 animate-fade-in active:scale-95 group"
      style={{ border: "1px solid var(--border)" }}>
      {/* Imagen llena todo el cuadro */}
      {product.imageUrl && !err
        ? <img src={`/api${product.imageUrl}`} onError={() => setErr(true)} alt={product.name}
            className="w-full h-full object-contain"
            style={{ background: "var(--bg-tertiary)" }} />
        : <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--bg-tertiary)" }}>
            <svg viewBox="0 0 48 48" fill="none" className="w-8 h-8">
              <rect x="4" y="10" width="40" height="28" rx="3" stroke="currentColor" strokeWidth="2" fill="none" style={{ color: "var(--border)" }} />
              <circle cx="16" cy="20" r="4" stroke="currentColor" strokeWidth="2" fill="none" style={{ color: "var(--border)" }} />
              <path d="M4 32 L14 22 L22 30 L30 22 L44 36" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" style={{ color: "var(--border)" }} />
            </svg>
          </div>
      }
      {/* Info superpuesta en la parte inferior */}
      <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1"
        style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)" }}>
        <p className="text-xs font-semibold leading-tight line-clamp-1 text-white">
          {product.name}
        </p>
        <div className="flex items-center justify-between mt-0.5">
          <p className="font-mono font-bold text-xs text-white">
            {formatCOP(product.price)}
          </p>
          {product.type === "SERVICE" ? (
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>Servicio</p>
          ) : (
            <p className="text-xs" style={{ color: product.stock <= product.minStock ? "var(--warning)" : "rgba(255,255,255,0.55)" }}>
              {product.stock} uds
            </p>
          )}
        </div>
      </div>
    </button>
  )
}

// ── CartItem ──────────────────────────────────────────────
function CartItem({ item, onUpdate, onRemove }) {
  return (
    <div className="flex items-center gap-2 py-2.5 border-b animate-fade-in" style={{ borderColor: "var(--border)" }}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{item.name}</p>
        <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{formatCOP(item.price)}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => onUpdate(item.id, item.quantity - 1)} className="w-6 h-6 rounded flex items-center justify-center btn-ghost"><Minus size={11} /></button>
        <span className="w-7 text-center text-sm font-mono font-bold" style={{ color: "var(--text-primary)" }}>{item.quantity}</span>
        <button onClick={() => onUpdate(item.id, item.quantity + 1)} className="w-6 h-6 rounded flex items-center justify-center btn-ghost"><Plus size={11} /></button>
      </div>
      <p className="font-mono text-sm font-bold w-14 text-right shrink-0" style={{ color: "var(--text-primary)" }}>
        {formatCOP(Number(item.price) * item.quantity)}
      </p>
      <button onClick={() => onRemove(item.id)} className="btn-ghost w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ color: "var(--danger)" }}>
        <Trash2 size={11} />
      </button>
    </div>
  )
}

// ── SaleTabs ──────────────────────────────────────────────
function SaleTabs({ sales, activeId, onSwitch, onNew, onClose, onNewAccount }) {
  const genericSales = sales.filter(s => s.type !== "account")
  const accounts = sales.filter(s => s.type === "account")

  const renderTab = (sale) => {
    const isActive = sale.id === activeId
    const isAccount = sale.type === "account"
    const count = sale.items.reduce((s, i) => s + i.quantity, 0)
    return (
      <div key={sale.id} onClick={() => onSwitch(sale.id)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-t-md cursor-pointer shrink-0 select-none border-t border-l border-r -mb-px transition-all duration-150"
        style={{
          background: isActive ? "var(--bg-primary)" : "var(--bg-tertiary)",
          borderColor: isActive ? "var(--border)" : "transparent",
          borderBottomColor: isActive ? "var(--bg-primary)" : "transparent",
          minWidth: "90px", maxWidth: "150px",
        }}>
        {isAccount && (
          <User size={11} className="shrink-0" style={{ color: isActive ? "var(--info)" : "var(--text-muted)" }} />
        )}
        <span className="text-xs font-medium truncate flex-1"
          style={{ color: isActive ? "var(--text-primary)" : "var(--text-muted)" }}>
          {sale.label}
        </span>
        {count > 0 && (
          <span className="text-xs px-1 rounded shrink-0" style={{
            background: isAccount ? "var(--info-light)" : "var(--brand-light)",
            color: isAccount ? "var(--info)" : "var(--brand)",
            fontSize: "10px",
          }}>{count}</span>
        )}
        <button onClick={e => { e.stopPropagation(); onClose(sale.id) }}
          className="shrink-0 opacity-30 hover:opacity-100 ml-0.5" style={{ color: "var(--danger)" }}>
          <X size={11} />
        </button>
      </div>
    )
  }

  return (
    <div className="tabs-no-scrollbar flex items-center gap-1 px-2 pt-2 overflow-x-auto border-b shrink-0"
      style={{ borderColor: "var(--border)", background: "var(--bg-secondary)", scrollbarWidth: "none", msOverflowStyle: "none" }}>

      {/* Ventas genéricas */}
      {genericSales.map(sale => renderTab(sale))}
      <button onClick={onNew}
        className="flex items-center gap-1 px-2 py-1.5 rounded-t-md shrink-0 opacity-50 hover:opacity-100"
        style={{ color: "var(--text-muted)" }} title="Nueva venta">
        <PlusCircle size={15} />
      </button>

      {/* Separador */}
      <div className="h-5 w-px mx-1.5 shrink-0" style={{ background: "var(--border)" }} />

      {/* Cuentas abiertas */}
      {accounts.map(sale => renderTab(sale))}
      <button onClick={onNewAccount}
        className="flex items-center gap-1 px-2 py-1.5 rounded-t-md shrink-0 opacity-50 hover:opacity-100"
        style={{ color: "var(--info)" }} title="Nueva cuenta">
        <UserPlus size={15} />
      </button>
    </div>
  )
}

// ── Modal nueva cuenta ────────────────────────────────────
function NewAccountModal({ onConfirm, onClose }) {
  const [name, setName] = useState("")
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="card p-5 w-full max-w-xs animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "var(--info-light)" }}>
            <User size={15} style={{ color: "var(--info)" }} />
          </div>
          <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Nueva cuenta</h3>
        </div>
        <form onSubmit={e => { e.preventDefault(); if (name.trim()) { onConfirm(name.trim()); onClose() } }}
          className="space-y-3">
          <input
            type="text"
            autoFocus
            className="input"
            placeholder="Nombre del cliente o mesa"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={30}
          />
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-outline btn-md flex-1">Cancelar</button>
            <button type="submit" disabled={!name.trim()} className="btn-md flex-1 text-white font-semibold"
              style={{ background: "var(--info)" }}>
              Abrir cuenta
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal confirmación cierre de cuenta ───────────────────
function CloseAccountWarningModal({ account, onConfirm, onClose }) {
  const count = account?.items.reduce((s, i) => s + i.quantity, 0) || 0
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="card p-5 w-full max-w-xs animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={18} style={{ color: "var(--warning)" }} />
          <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>¿Cerrar cuenta?</h3>
        </div>
        <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
          La cuenta <strong>"{account?.label}"</strong> tiene{" "}
          <strong>{count} producto{count !== 1 ? "s" : ""}</strong> pendiente{count !== 1 ? "s" : ""}.
          Se perderán si cierras la pestaña sin cobrar.
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-outline btn-md flex-1">Cancelar</button>
          <button onClick={onConfirm} className="btn-danger btn-md flex-1">Cerrar cuenta</button>
        </div>
      </div>
    </div>
  )
}

// ── Pantalla apertura de turno ────────────────────────────
function OpenShiftScreen({ onOpen, loading }) {
  const [rawValue, setRawValue] = useState("")
  const { user } = useAuthStore()

  // Parsear solo dígitos y formatear en tiempo real
  const handleChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "")
    setRawValue(digits)
  }

  const numericValue = Number(rawValue) || 0
  const displayValue = rawValue ? formatNumber(numericValue) : ""

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="card p-8 w-full max-w-sm animate-slide-up space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "var(--brand-light)" }}>
            <LogIn size={28} style={{ color: "var(--brand)" }} />
          </div>
          <h2 className="font-display font-bold text-xl" style={{ color: "var(--text-primary)" }}>Abrir turno</h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Hola, <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{user?.name}</span>
          </p>
        </div>
        <form onSubmit={e => { e.preventDefault(); if (numericValue > 0) onOpen(numericValue) }} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Efectivo inicial en caja
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-2xl font-bold" style={{ color: "var(--text-muted)" }}>$</span>
              <input
                type="text"
                inputMode="numeric"
                required
                autoFocus
                className="input pl-10 text-2xl font-mono font-bold text-right pr-4"
                placeholder="0"
                value={displayValue}
                onChange={handleChange}
              />
            </div>
            <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>Cuenta el efectivo antes de empezar</p>
          </div>
          <button type="submit" disabled={loading || numericValue === 0} className="btn-primary btn-lg w-full">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
            Abrir turno
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Modal cierre de turno ─────────────────────────────────
// Tipografía numérica: DM Sans + tabular-nums (sin JetBrains Mono que confunde 0/8)
const NUM = { fontFamily: "'DM Sans', sans-serif", fontVariantNumeric: "tabular-nums" }

function CloseShiftModal({ shift, onClose, onConfirm, loading }) {
  const [rawClosing, setRawClosing] = useState("")
  const [notes, setNotes] = useState("")

  const handleClosingChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "")
    setRawClosing(digits)
  }

  const closingCash = Number(rawClosing) || 0
  const displayClosing = rawClosing ? formatNumber(closingCash) : ""

  const cashPayment = shift?.shiftPayments?.find(p => p.paymentMethod?.name === "Efectivo")
  const cashSales = Number(cashPayment?.total || 0)
  const openingCash = Number(shift?.openingCash || 0)
  const expectedCash = openingCash + cashSales
  const difference = rawClosing !== "" ? closingCash - expectedCash : null
  const totalSales = (shift?.shiftPayments || []).reduce((s, p) => s + Number(p.total), 0)

  const duration = shift?.openedAt ? Math.round((Date.now() - new Date(shift.openedAt)) / 60000) : 0
  const hours = Math.floor(duration / 60), mins = duration % 60

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }} onClick={onClose}>
      <div className="card w-full max-w-md animate-slide-up overflow-y-auto max-h-[92vh]" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "var(--danger-light)" }}>
              <LogOut size={17} style={{ color: "var(--danger)" }} />
            </div>
            <div>
              <h2 className="font-display font-bold text-base leading-tight" style={{ color: "var(--text-primary)" }}>
                Cierre de turno
              </h2>
              <p className="text-xs font-medium" style={{ color: "var(--info)" }}>
                {shift?.user?.name}
                {" · "}
                {hours > 0 ? `${hours}h ` : ""}{mins}min
                {" · desde "}
                {shift?.openedAt ? new Date(shift.openedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost w-7 h-7 rounded flex items-center justify-center shrink-0">
            <X size={15} />
          </button>
        </div>

        {/* ── Ventas totales ── */}
        <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border)", background: "var(--brand-light)" }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--brand-dark)" }}>
            Total vendido
          </p>
          <p className="text-3xl font-bold leading-none" style={{ color: "var(--brand)", ...NUM }}>
            {formatCOP(totalSales)}
          </p>
        </div>

        {/* ── Por método de pago ── */}
        <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
            Por método de pago
          </p>
          {shift?.shiftPayments?.length > 0 ? (
            <div className="space-y-2">
              {shift.shiftPayments.map(p => (
                <div key={p.id} className="flex items-center justify-between">
                  <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
                    {p.paymentMethod?.name}
                  </span>
                  <span className="text-base font-bold" style={{ color: "var(--text-primary)", ...NUM }}>
                    {formatCOP(p.total)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Sin ventas registradas</p>
          )}
        </div>

        {/* ── Efectivo esperado ── */}
        <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
            Cuadre de efectivo
          </p>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Efectivo esperado</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                <span style={{ color: "var(--text-secondary)" }}>{formatCOP(openingCash)}</span>
                {" apertura + "}
                <span style={{ color: "var(--text-secondary)" }}>{formatCOP(cashSales)}</span>
                {" ventas"}
              </p>
            </div>
            <p className="text-xl font-bold" style={{ color: "var(--brand)", ...NUM }}>
              {formatCOP(expectedCash)}
            </p>
          </div>
        </div>

        {/* ── Formulario ── */}
        <form onSubmit={e => { e.preventDefault(); onConfirm({ closingCash, notes }) }} className="px-6 py-4 space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-secondary)" }}>
              Efectivo contado en caja *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold" style={{ color: "var(--text-muted)", ...NUM }}>$</span>
              <input
                type="text"
                inputMode="numeric"
                required
                autoFocus
                className="input pl-8 text-xl font-bold text-right pr-3"
                style={NUM}
                placeholder="0"
                value={displayClosing}
                onChange={handleClosingChange}
              />
            </div>
          </div>

          {difference !== null && (
            <div className="flex items-center justify-between rounded-xl px-4 py-3 animate-fade-in"
              style={{
                background: Math.abs(difference) < 0.01 ? "var(--brand-light)" : difference > 0 ? "var(--brand-light)" : "var(--danger-light)",
                border: `1.5px solid ${Math.abs(difference) < 0.01 ? "var(--brand)" : difference > 0 ? "var(--brand)" : "var(--danger)"}`,
              }}>
              <span className="text-sm font-bold" style={{ color: Math.abs(difference) < 0.01 ? "var(--brand)" : difference > 0 ? "var(--brand)" : "var(--danger)" }}>
                {Math.abs(difference) < 0.01 ? "✓ Cuadra exacto" : difference > 0 ? "↑ Sobrante" : "↓ Faltante"}
              </span>
              {Math.abs(difference) >= 0.01 && (
                <span className="text-lg font-bold" style={{ color: difference > 0 ? "var(--brand)" : "var(--danger)", ...NUM }}>
                  {formatCOP(Math.abs(difference))}
                </span>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Notas
            </label>
            <textarea className="input resize-none" rows={2}
              placeholder="Observaciones del turno..."
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-outline btn-md flex-1">Cancelar</button>
            <button type="submit" disabled={loading || rawClosing === ""}
              className="btn-md flex-1 text-white font-bold"
              style={{ background: "var(--danger)" }}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
              Cerrar turno
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── POSPage ───────────────────────────────────────────────
export default function POSPage() {
  const [query, setQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [showPayment, setShowPayment] = useState(false)
  const [showCloseShift, setShowCloseShift] = useState(false)
  const [showNewAccount, setShowNewAccount] = useState(false)
  const [confirmCloseAccount, setConfirmCloseAccount] = useState(null) // sale id
  const [payments, setPayments] = useState([])
  const searchRef = useRef(null)
  const qc = useQueryClient()

  const navigate = useNavigate()
  const { sales, activeId, shiftId, resetForNewShift, newSale, newAccount, switchSale, closeSale, addItem, removeItem, updateQuantity, clearActive, getActive, getTotal, setAccountBackendId, updateAccountRemoteItems } = useCartStore()
  const active = getActive()
  const items = active?.items || []
  const remoteItems = active?.type === "account" ? (active?.remoteItems || []) : []
  const total = items.reduce((s, i) => s + Number(i.price) * i.quantity, 0)
            + remoteItems.reduce((s, i) => s + Number(i.price) * i.quantity, 0)
  const openAccounts = sales.filter(s => s.type === "account")

  // Turno
  const { data: shift, isLoading: shiftLoading, refetch: refetchShift } = useQuery({
    queryKey: ["shift-mine"],
    queryFn: shiftsService.getMine,
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: 60_000, // Actualiza cada minuto automáticamente
  })
  useEffect(() => {
    if (shift?.id) {
      // Solo sincronizar el shiftId en el store, sin tocar las ventas
      useCartStore.setState({ shiftId: shift.id })
    }
  }, [shift?.id])

  // Cuentas abiertas del turno — polling cada 10s para actualizar remoteItems
  const { data: backendAccounts = [] } = useQuery({
    queryKey: ["accounts-shift", shift?.id],
    queryFn: () => accountsService.getByShift(shift.id),
    enabled: !!shift?.id,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  })
  useEffect(() => {
    for (const ba of backendAccounts) {
      const remoteItems = ba.items.map(i => ({
        id: i.productId,
        accountItemId: i.id,
        name: i.product?.name || "",
        price: i.price,
        quantity: i.quantity,
        fromAccount: true,
      }))
      const { sales } = useCartStore.getState()
      const exists = sales.some(s => s.type === "account" && s.backendId === ba.id)
      if (!exists) {
        // Cuenta creada desde caja remota — crear pestaña automáticamente
        useCartStore.getState().newAccount(ba.name, ba.id)
      }
      // Siempre actualizar remoteItems (newAccount inicializa con [] y luego se llena aquí)
      updateAccountRemoteItems(ba.id, remoteItems)
    }
  }, [backendAccounts])

  // Pedidos de despacho pendientes — polling cada 5s
  const { data: pendingDispatches = [] } = useQuery({
    queryKey: ["dispatches-pending", shift?.id],
    queryFn: () => dispatchService.getPendingDispatches(shift.id),
    enabled: !!shift?.id,
    refetchInterval: 5_000,
  })

  // Métodos de pago
  const { data: paymentMethods = [] } = useQuery({ queryKey: ["payment-methods"], queryFn: paymentMethodsService.getAll })

  // Categorías
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: categoriesService.getAll })

  // Todos los productos — usando getAll que ya devuelve { products, total }
  const { data: allData } = useQuery({
    queryKey: ["products-all"],
    queryFn: () => productsService.getAll({ limit: 200 }),
    staleTime: 60_000,
  })
  const allProducts = [...(allData?.products || [])].sort((a, b) => a.name.localeCompare(b.name))

  // Búsqueda — también usa getAll con search param
  const { data: searchData, isFetching } = useQuery({
    queryKey: ["products-search", query],
    queryFn: () => productsService.getAll({ search: query, limit: 50 }),
    enabled: query.length >= 1,
    staleTime: 0,
  })
  const searchResults = searchData?.products || []

  // Productos a mostrar + filtro categoría
  const base = query.length >= 1 ? searchResults : allProducts
  const displayProducts = selectedCategory
    ? base.filter(p => String(p.categoryId) === selectedCategory)
    : base

  // Inicializar pago
  useEffect(() => {
    if (showPayment && paymentMethods.length > 0) {
      const efectivo = paymentMethods.find(m => m.active && m.name === "Efectivo") || paymentMethods.find(m => m.active)
      setPayments(efectivo ? [{ paymentMethodId: efectivo.id, amount: 0, rawAmount: "" }] : [])
    }
  }, [showPayment, paymentMethods])

  useEffect(() => { searchRef.current?.focus() }, [activeId, shift?.id])

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") { setQuery(""); setShowPayment(false); searchRef.current?.focus() } }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [])

  // Abrir turno
  const openShift = useMutation({
    mutationFn: (cash) => shiftsService.open(cash),
    onSuccess: (data) => { resetForNewShift(data.id); qc.invalidateQueries({ queryKey: ["shift-mine"] }); toast.success("Turno abierto") },
    onError: e => toast.error(e.response?.data?.error || "Error"),
  })

  // Cerrar turno
  const closeShiftMut = useMutation({
    mutationFn: (data) => shiftsService.close(shift.id, data),
    onSuccess: () => {
      useCartStore.setState({ shiftId: null })
      setShowCloseShift(false)
      setShowPayment(false)
      // Invalidar y forzar refetch para que aparezca la pantalla de apertura
      qc.removeQueries({ queryKey: ["shift-mine"] })
      qc.invalidateQueries({ queryKey: ["shift-mine"] })
      toast.success("Turno cerrado correctamente")
    },
    onError: (e) => {
      const msg = e.response?.data?.error || ""
      if (e.response?.status === 409 && msg.includes("cerrado")) {
        // El turno ya estaba cerrado — limpiar UI igual que en onSuccess
        useCartStore.setState({ shiftId: null })
        setShowCloseShift(false)
        setShowPayment(false)
        qc.removeQueries({ queryKey: ["shift-mine"] })
        qc.invalidateQueries({ queryKey: ["shift-mine"] })
        toast.success("Turno cerrado correctamente")
      } else {
        toast.error(msg || "Error al cerrar turno")
      }
    },
  })

  // Cerrar cuenta (pestaña de cuenta sin liquidar)
  const closeAccountMut = useMutation({
    mutationFn: (backendId) => accountsService.close(backendId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts-shift", shift?.id] })
    },
    onError: e => toast.error(e.response?.data?.error || "Error al cerrar cuenta"),
  })

  // Eliminar item de cuenta remota
  const { mutate: removeAccountItem, variables: removingItemId } = useMutation({
    mutationFn: ({ accountBackendId, accountItemId }) => accountsService.removeItem(accountBackendId, accountItemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts-shift", shift?.id] })
    },
    onError: e => toast.error(e.response?.data?.error || "Error al eliminar item"),
  })

  // Venta
  const { mutate: createSale, isPending: selling } = useMutation({
    mutationFn: ordersService.createSale,
    onSuccess: (data) => {
      const change = data.change || 0
      toast.success(`✅ Venta registrada${change > 0 ? ` · Cambio: ${formatCOP(change)}` : ""}`)
      closeSale(activeId); setShowPayment(false)
      qc.invalidateQueries({ queryKey: ["products-all"] })
      qc.invalidateQueries({ queryKey: ["shift-mine"] })
      qc.invalidateQueries({ queryKey: ["accounts-shift", shift?.id] })
    },
    onError: e => toast.error(e.response?.data?.error || "Error al registrar venta"),
  })

  const handleAddToCart = (product) => {
    if (product.type !== "SERVICE" && product.stock <= 0) { toast.error("Sin stock disponible"); return }
    addItem(product)
  }

  const handleTabClose = (id) => {
    const sale = sales.find(s => s.id === id)
    if (sale?.type === "account") {
      setConfirmCloseAccount(id)
      return
    }
    closeSale(id)
    setShowPayment(false)
  }

  const handleSell = () => {
    if (!shiftId) { toast.error("Abre un turno antes de vender"); return }
    if (items.length === 0) return
    const paid = payments.reduce((s, p) => s + (p.amount || 0), 0)
    if (paid < total) { toast.error(`Falta ${formatCOP(total - paid)} por pagar`); return }
    const allItems = [
      ...items.map(i => ({ productId: i.id, quantity: i.quantity })),
      ...remoteItems.map(i => ({ productId: i.id, quantity: i.quantity })),
    ]
    createSale({
      shiftId,
      items: allItems,
      payments: payments.filter(p => (p.amount || 0) > 0).map(p => ({ paymentMethodId: p.paymentMethodId, amount: p.amount })),
      ...(active?.type === "account" && active?.backendId && { accountId: active.backendId }),
    })
  }

  if (shiftLoading) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 size={24} className="animate-spin" style={{ color: "var(--text-muted)" }} />
    </div>
  )

  // Sin turno → pantalla de apertura
  if (!shift) return (
    <div className="h-full flex flex-col">
      <OpenShiftScreen onOpen={(amount) => openShift.mutate(amount)} loading={openShift.isPending} />
    </div>
  )

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <SaleTabs
        sales={sales} activeId={activeId}
        onSwitch={(id) => { switchSale(id); setShowPayment(false); setQuery("") }}
        onNew={() => { newSale(); setShowPayment(false); setQuery("") }}
        onClose={handleTabClose}
        onNewAccount={() => setShowNewAccount(true)}
      />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
      {/* Panel izquierdo */}
      <div className="flex-1 flex flex-col overflow-hidden p-3 gap-2">

          {/* Búsqueda + widget despachos + cerrar turno */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
              <input ref={searchRef} type="text" className="input pl-9 pr-9 py-2.5"
                placeholder="Buscar o escanear código..."
                value={query} onChange={e => setQuery(e.target.value)} />
              {query && (
                <button onClick={() => { setQuery(""); searchRef.current?.focus() }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 btn-ghost w-5 h-5 rounded flex items-center justify-center">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Widget despachos pendientes */}
            <button
              onClick={() => navigate("/dispatch")}
              className="relative shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-md font-medium text-sm transition-all duration-200"
              style={{
                background: pendingDispatches.length > 0 ? "var(--warning-light)" : "var(--bg-secondary)",
                color: pendingDispatches.length > 0 ? "var(--warning)" : "var(--text-muted)",
                border: `1px solid ${pendingDispatches.length > 0 ? "var(--warning)" : "var(--border)"}`,
              }}
              title="Ver despachos pendientes">
              <Bell size={15} className={pendingDispatches.length > 0 ? "animate-pulse" : ""} />
              {pendingDispatches.length > 0 && (
                <>
                  <span className="hidden sm:inline text-xs font-bold">
                    {pendingDispatches.length} despacho{pendingDispatches.length !== 1 ? "s" : ""}
                  </span>
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-white flex items-center justify-center font-bold"
                    style={{ background: "var(--warning)", fontSize: "10px" }}>
                    {pendingDispatches.length}
                  </span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                if (openAccounts.length > 0) {
                  toast.error(`Tienes ${openAccounts.length} cuenta${openAccounts.length !== 1 ? "s" : ""} abierta${openAccounts.length !== 1 ? "s" : ""}. Ciérralas antes de cerrar el turno`)
                  return
                }
                refetchShift(); setShowCloseShift(true)
              }}
              className="btn-md shrink-0 flex items-center gap-1.5 text-sm font-medium"
              style={{ background: "var(--danger-light)", color: "var(--danger)", border: "1px solid var(--danger)" }}>
              <LogOut size={15} />
              <span className="hidden sm:inline">Cerrar turno</span>
              {openAccounts.length > 0 && (
                <span className="w-4 h-4 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0"
                  style={{ background: "var(--danger)", fontSize: "10px" }}>
                  {openAccounts.length}
                </span>
              )}
            </button>
          </div>

          {/* Chips de categorías */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {[{ id: "", name: "Todos" }, ...categories].map(cat => (
                <button key={cat.id}
                  onClick={() => setSelectedCategory(cat.id ? (selectedCategory === String(cat.id) ? "" : String(cat.id)) : "")}
                  className="px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all border whitespace-nowrap"
                  style={{
                    background: (cat.id === "" && !selectedCategory) || selectedCategory === String(cat.id) ? "var(--brand)" : "transparent",
                    color: (cat.id === "" && !selectedCategory) || selectedCategory === String(cat.id) ? "white" : "var(--text-secondary)",
                    borderColor: (cat.id === "" && !selectedCategory) || selectedCategory === String(cat.id) ? "var(--brand)" : "var(--border)",
                  }}>
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Grid productos */}
          <div className="flex-1 overflow-y-auto">
            {isFetching ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-muted)" }} />
              </div>
            ) : displayProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <Package size={24} style={{ color: "var(--text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {query ? `Sin resultados para "${query}"` : "Sin productos"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {displayProducts.map(p => <ProductCard key={p.id} product={p} onAdd={handleAddToCart} />)}
              </div>
            )}
          </div>
        </div>

      {/* Carrito */}
      <div className="w-full md:w-80 lg:w-96 flex flex-col border-t md:border-t-0 md:border-l"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>

          <div className="flex-1 overflow-y-auto px-4 pt-2">
            {items.length === 0 && remoteItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 py-12">
                <ShoppingCart size={28} style={{ color: "var(--bg-tertiary)" }} />
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Carrito vacío</p>
              </div>
            ) : (
              <>
                {items.length > 0 && (
                  <>
                    <div className="flex justify-end py-1">
                      <button onClick={clearActive} className="text-xs btn-ghost px-2 py-0.5 rounded" style={{ color: "var(--danger)" }}>Limpiar</button>
                    </div>
                    {items.map(item => <CartItem key={item.id} item={item} onUpdate={updateQuantity} onRemove={removeItem} />)}
                  </>
                )}
                {remoteItems.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 py-2 mt-1">
                      <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                      <span className="text-xs font-medium shrink-0" style={{ color: "var(--info)" }}>
                        Pedidos mesero
                      </span>
                      <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                    </div>
                    {remoteItems.map((item, idx) => {
                      const isRemoving = removingItemId?.accountItemId === item.accountItemId
                      return (
                        <div key={idx} className="flex items-center gap-2 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{item.name}</p>
                            <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{formatCOP(item.price)}</p>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded font-mono font-bold"
                            style={{ background: "var(--info-light)", color: "var(--info)" }}>×{item.quantity}</span>
                          <p className="font-mono text-sm font-bold w-14 text-right shrink-0" style={{ color: "var(--text-primary)" }}>
                            {formatCOP(Number(item.price) * item.quantity)}
                          </p>
                          {item.accountItemId && active?.backendId && (
                            <button
                              onClick={() => removeAccountItem({ accountBackendId: active.backendId, accountItemId: item.accountItemId })}
                              disabled={isRemoving}
                              className="btn-ghost w-6 h-6 rounded flex items-center justify-center shrink-0"
                              style={{ color: "var(--danger)" }}
                              title="Eliminar de la cuenta">
                              {isRemoving ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </>
                )}
              </>
            )}
          </div>

          <div className="p-4 border-t space-y-3" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Total</span>
              <span className="font-display font-bold text-2xl font-mono" style={{ color: "var(--text-primary)" }}>{formatCOP(total)}</span>
            </div>

            {!showPayment ? (
              <button onClick={() => setShowPayment(true)} disabled={items.length === 0 && remoteItems.length === 0} className="btn-primary btn-lg w-full">
                <CreditCard size={17} /> Cobrar
              </button>
            ) : (
              <div className="space-y-2 animate-slide-up">
                {payments.map((row, idx) => {
                  const usedIds = payments.filter(p => p.paymentMethodId !== row.paymentMethodId).map(p => p.paymentMethodId)
                  const availableMethods = paymentMethods.filter(m => m.active && (m.id === row.paymentMethodId || !usedIds.includes(m.id)))
                  const displayAmt = row.rawAmount ? formatNumber(Number(row.rawAmount)) : ""
                  return (
                    <div key={row.paymentMethodId} className="flex items-center gap-1.5">
                      <select
                        value={row.paymentMethodId}
                        onChange={e => {
                          const newId = Number(e.target.value)
                          setPayments(prev => prev.map(p => p.paymentMethodId === row.paymentMethodId
                            ? { paymentMethodId: newId, amount: 0, rawAmount: "" }
                            : p
                          ))
                        }}
                        className="input text-sm flex-1 min-w-0"
                      >
                        {availableMethods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--text-muted)" }}>$</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoFocus={idx === 0}
                          className="input text-sm font-bold pl-6 text-right h-10"
                          placeholder="0"
                          value={displayAmt}
                          onChange={e => {
                            const digits = e.target.value.replace(/\D/g, "")
                            setPayments(prev => prev.map(p => p.paymentMethodId === row.paymentMethodId
                              ? { ...p, amount: Number(digits) || 0, rawAmount: digits }
                              : p
                            ))
                          }}
                          onKeyDown={e => { if (e.key === "Enter") handleSell() }}
                        />
                      </div>
                      {payments.length > 1 && (
                        <button
                          onClick={() => setPayments(prev => prev.filter(p => p.paymentMethodId !== row.paymentMethodId))}
                          className="w-9 h-10 rounded flex items-center justify-center shrink-0 btn-ghost"
                          style={{ color: "var(--danger)" }}
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  )
                })}

                {/* Agregar método de pago */}
                {paymentMethods.filter(m => m.active && !payments.some(p => p.paymentMethodId === m.id)).length > 0 && (
                  <button
                    onClick={() => {
                      const available = paymentMethods.filter(m => m.active && !payments.some(p => p.paymentMethodId === m.id))
                      if (available.length > 0) setPayments(prev => [...prev, { paymentMethodId: available[0].id, amount: 0, rawAmount: "" }])
                    }}
                    className="w-full btn-sm flex items-center justify-center gap-1.5 rounded-lg"
                    style={{ border: "1.5px dashed var(--border)", color: "var(--text-muted)", background: "transparent" }}
                  >
                    <Plus size={13} /> Agregar método de pago
                  </button>
                )}

                {(() => {
                  const paid = payments.reduce((s, p) => s + (p.amount || 0), 0)
                  const change = paid - total
                  return paid > 0 ? (
                    <div className="flex justify-between text-sm pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                      <span style={{ color: "var(--text-muted)" }}>Cambio</span>
                      <span className="font-bold" style={{ color: change >= 0 ? "var(--brand)" : "var(--danger)" }}>{formatCOP(change)}</span>
                    </div>
                  ) : null
                })()}

                <div className="flex gap-2 pt-1">
                  <button onClick={() => setShowPayment(false)} className="btn-outline btn-md flex-1">Cancelar</button>
                  <button onClick={handleSell} disabled={selling} className="btn-primary btn-md flex-1">
                    {selling ? <Loader2 size={14} className="animate-spin" /> : <Banknote size={14} />}
                    Confirmar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCloseShift && shift && (
        <CloseShiftModal shift={shift} onClose={() => setShowCloseShift(false)}
          onConfirm={(data) => closeShiftMut.mutate(data)} loading={closeShiftMut.isPending} />
      )}

      {showNewAccount && (
        <NewAccountModal
          onConfirm={async (name) => {
            try {
              const { nextId } = useCartStore.getState()
              newAccount(name, null)
              const created = await accountsService.create(shift.id, name)
              setAccountBackendId(nextId, created.id)
              qc.invalidateQueries({ queryKey: ["accounts-shift", shift.id] })
            } catch { /* backend error no impide el tab local */ }
            setShowPayment(false); setQuery("")
          }}
          onClose={() => setShowNewAccount(false)}
        />
      )}

      {confirmCloseAccount && (
        <CloseAccountWarningModal
          account={sales.find(s => s.id === confirmCloseAccount)}
          onConfirm={() => {
            const sale = sales.find(s => s.id === confirmCloseAccount)
            if (sale?.backendId) closeAccountMut.mutate(sale.backendId)
            closeSale(confirmCloseAccount)
            setShowPayment(false)
            setConfirmCloseAccount(null)
          }}
          onClose={() => setConfirmCloseAccount(null)}
        />
      )}
    </div>
  )
}