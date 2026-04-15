import { useState, useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { dispatchService } from "@/services/dispatch.service"
import { accountsService } from "@/services/accounts.service"
import { productsService } from "@/services/products.service"
import { categoriesService, paymentMethodsService } from "@/services/catalog.service"
import { useAuthStore } from "@/store/auth.store"
import { formatCOP, formatNumber } from "@/utils/currency"
import {
  Search, X, Plus, Minus, Trash2, Send, LogIn, LogOut,
  Loader2, Package, CheckCircle, User,
} from "lucide-react"
import toast from "react-hot-toast"
import { confirm } from "@/components/ui/ConfirmDialog"

// ── Placeholder SVG ───────────────────────────────────────
function ImgPlaceholder({ small }) {
  return (
    <div className={`${small ? "w-8 h-8" : "w-full h-20"} rounded-md flex items-center justify-center`}
      style={{ background: "var(--bg-tertiary)" }}>
      <svg viewBox="0 0 48 48" fill="none" className={small ? "w-4 h-4" : "w-8 h-8"}>
        <rect x="4" y="10" width="40" height="28" rx="3" stroke="currentColor" strokeWidth="2" fill="none" style={{ color: "var(--border)" }} />
        <circle cx="16" cy="20" r="4" stroke="currentColor" strokeWidth="2" fill="none" style={{ color: "var(--border)" }} />
        <path d="M4 32 L14 22 L22 30 L30 22 L44 36" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" style={{ color: "var(--border)" }} />
      </svg>
    </div>
  )
}

// ── Pantalla para vincular a una caja ─────────────────────
function LinkToCashierScreen({ onLink, loading }) {
  const [selectedShiftId, setSelectedShiftId] = useState("")
  const { user } = useAuthStore()

  const { data: openShifts = [], isLoading } = useQuery({
    queryKey: ["open-shifts"],
    queryFn: dispatchService.getOpenShifts,
    refetchInterval: 10_000,
  })

  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="card p-8 w-full max-w-sm animate-slide-up space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: "var(--brand-light)" }}>
            <LogIn size={28} style={{ color: "var(--brand)" }} />
          </div>
          <h2 className="font-display font-bold text-xl" style={{ color: "var(--text-primary)" }}>
            Caja remota
          </h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Hola, <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{user?.name}</span>
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Selecciona la caja a la que reportarás tus ventas
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-muted)" }} />
          </div>
        ) : openShifts.length === 0 ? (
          <div className="card p-4 text-center">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No hay cajas abiertas disponibles
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Pide al cajero que abra su turno primero
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {openShifts.map(shift => (
              <button key={shift.id}
                onClick={() => setSelectedShiftId(String(shift.id))}
                className="w-full card px-4 py-3 text-left transition-all duration-150 hover:opacity-80"
                style={{
                  borderColor: selectedShiftId === String(shift.id) ? "var(--brand)" : "var(--border)",
                  background: selectedShiftId === String(shift.id) ? "var(--brand-light)" : "var(--bg-secondary)",
                }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {shift.user?.name}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Caja #{shift.id} · Desde {new Date(shift.openedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {selectedShiftId === String(shift.id) && (
                    <CheckCircle size={18} style={{ color: "var(--brand)" }} />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => selectedShiftId && onLink(Number(selectedShiftId))}
          disabled={!selectedShiftId || loading}
          className="btn-primary btn-lg w-full">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
          Vincularme a esta caja
        </button>
      </div>
    </div>
  )
}

// ── Tarjeta de producto ───────────────────────────────────
function ProductCard({ product, onAdd }) {
  const [err, setErr] = useState(false)
  return (
    <button onClick={() => onAdd(product)}
      className="card text-left transition-all duration-150 active:scale-95 w-full group overflow-hidden flex flex-col"
      style={{ borderColor: "var(--border)", minHeight: "160px" }}>
      <div className="w-full flex-1 relative" style={{ minHeight: "100px" }}>
        {product.imageUrl && !err
          ? <img src={`/api${product.imageUrl}`} onError={() => setErr(true)} alt={product.name}
              className="w-full h-full object-cover absolute inset-0" />
          : <div className="w-full h-full flex items-center justify-center absolute inset-0"
              style={{ background: "var(--bg-tertiary)" }}>
              <ImgPlaceholder />
            </div>
        }
      </div>
      <div className="p-2.5 shrink-0">
        <p className="text-sm font-semibold leading-tight line-clamp-2 group-hover:text-green-500 transition-colors"
          style={{ color: "var(--text-primary)" }}>
          {product.name}
        </p>
        <div className="flex items-center justify-between mt-1.5">
          <p className="font-mono font-bold text-base" style={{ color: "var(--brand)" }}>
            {formatCOP(product.price)}
          </p>
          {product.type === "SERVICE" ? (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Servicio</p>
          ) : (
            <p className="text-xs" style={{ color: product.stock <= product.minStock ? "var(--warning)" : "var(--text-muted)" }}>
              {product.stock} uds
            </p>
          )}
        </div>
      </div>
    </button>
  )
}

// ── Item del carrito ──────────────────────────────────────
function CartItem({ item, onUpdate, onRemove }) {
  return (
    <div className="flex items-center gap-2 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{item.name}</p>
        <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{formatCOP(item.price)}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => onUpdate(item.id, item.quantity - 1)} className="w-6 h-6 rounded flex items-center justify-center btn-ghost"><Minus size={11} /></button>
        <span className="w-7 text-center text-sm font-mono font-bold" style={{ color: "var(--text-primary)" }}>{item.quantity}</span>
        <button onClick={() => onUpdate(item.id, item.quantity + 1)} className="w-6 h-6 rounded flex items-center justify-center btn-ghost"><Plus size={11} /></button>
      </div>
      <p className="font-mono text-sm font-bold w-20 text-right shrink-0" style={{ color: "var(--text-primary)" }}>
        {formatCOP(Number(item.price) * item.quantity)}
      </p>
      <button onClick={() => onRemove(item.id)} className="btn-ghost w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ color: "var(--danger)" }}>
        <Trash2 size={11} />
      </button>
    </div>
  )
}

// ── Panel de pago multi-método ────────────────────────────
function SendOrderPanel({ items, total, subShiftId, onSent, onCancel }) {
  const [payments, setPayments] = useState([])

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: paymentMethodsService.getAll,
  })

  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0)
  const cashMethod = paymentMethods.find(m => m.name === "Efectivo")
  const cashEntry = payments.find(p => p.paymentMethodId === cashMethod?.id)
  const cashPaid = cashEntry?.amount || 0

  // Calcular cuánto va en efectivo neto y cuál es el vuelto
  const nonCashTotal = payments.filter(p => p.paymentMethodId !== cashMethod?.id).reduce((s, p) => s + (p.amount || 0), 0)
  const cashNet = Math.max(0, total - nonCashTotal)
  const change = cashPaid - cashNet

  const { mutate: send, isPending } = useMutation({
    mutationFn: () => dispatchService.createDispatch({
      subShiftId,
      items: items.map(i => ({ productId: i.id, quantity: i.quantity })),
      payments: payments.filter(p => (p.amount || 0) > 0).map(p => ({
        paymentMethodId: p.paymentMethodId,
        amount: p.amount,
      })),
    }),
    onSuccess: () => { toast.success("✅ Pedido enviado al cajero"); onSent() },
    onError: e => toast.error(e.response?.data?.error || "Error al enviar pedido"),
  })

  const setAmount = (methodId, digits) => {
    const amount = Number(digits) || 0
    setPayments(prev => {
      const exists = prev.find(p => p.paymentMethodId === methodId)
      if (exists) return prev.map(p => p.paymentMethodId === methodId ? { ...p, amount, rawAmount: digits } : p)
      return [...prev, { paymentMethodId: methodId, amount, rawAmount: digits }]
    })
  }

  return (
    <div className="space-y-3 animate-slide-up">
      <div className="border-t pt-3 space-y-2.5" style={{ borderColor: "var(--border)" }}>
        <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Pago del cliente</p>
        {paymentMethods.filter(m => m.active).map(method => {
          const p = payments.find(x => x.paymentMethodId === method.id)
          const raw = p?.rawAmount || ""
          const display = raw ? new Intl.NumberFormat("es-CO").format(Number(raw)) : ""
          return (
            <div key={method.id} className="flex items-center gap-2">
              <label className="text-xs w-20 shrink-0 font-medium" style={{ color: "var(--text-secondary)" }}>{method.name}</label>
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono" style={{ color: "var(--text-muted)" }}>$</span>
                <input type="text" inputMode="numeric" className="input text-sm font-mono font-bold pl-6 text-right"
                  placeholder="0" value={display}
                  onChange={e => setAmount(method.id, e.target.value.replace(/\D/g, ""))} />
              </div>
            </div>
          )
        })}
      </div>

      {totalPaid > 0 && (
        <div className="rounded-lg px-4 py-3 space-y-1.5 animate-fade-in"
          style={{ background: totalPaid >= total ? "var(--brand-light)" : "var(--danger-light)" }}>
          <div className="flex justify-between text-sm">
            <span style={{ color: "var(--text-secondary)" }}>Total venta</span>
            <span className="font-mono font-bold" style={{ color: "var(--text-primary)" }}>{formatCOP(total)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: "var(--text-secondary)" }}>Total recibido</span>
            <span className="font-mono font-bold" style={{ color: "var(--text-primary)" }}>{formatCOP(totalPaid)}</span>
          </div>
          {change > 0 && (
            <div className="flex justify-between text-sm font-bold border-t pt-1.5" style={{ borderColor: "rgba(0,0,0,0.1)" }}>
              <span style={{ color: "var(--brand)" }}>Vuelto en efectivo</span>
              <span className="font-mono" style={{ color: "var(--brand)" }}>{formatCOP(change)}</span>
            </div>
          )}
          {totalPaid < total && (
            <div className="flex justify-between text-sm font-bold border-t pt-1.5" style={{ borderColor: "rgba(0,0,0,0.1)" }}>
              <span style={{ color: "var(--danger)" }}>Falta</span>
              <span className="font-mono" style={{ color: "var(--danger)" }}>{formatCOP(total - totalPaid)}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={onCancel} className="btn-outline btn-md flex-1">Cancelar</button>
        <button onClick={() => send()} disabled={isPending || totalPaid < total} className="btn-primary btn-md flex-1">
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Enviar pedido
        </button>
      </div>
    </div>
  )
}

// ── Panel enviar a cuenta ─────────────────────────────────
function SendToAccountPanel({ items, accounts, isLoadingAccounts, subShiftId, onSent, onCancel }) {
  const [selectedAccountId, setSelectedAccountId] = useState(null)
  const isLoading = isLoadingAccounts

  const { mutate: send, isPending } = useMutation({
    mutationFn: (accId) => dispatchService.createDispatch({
      subShiftId,
      items: items.map(i => ({ productId: i.id, quantity: i.quantity })),
      accountId: accId,
    }),
    onSuccess: () => { toast.success("✅ Enviado a la cuenta"); onSent() },
    onError: e => toast.error(e.response?.data?.error || "Error al enviar"),
  })

  return (
    <div className="space-y-3 animate-slide-up">
      <div className="border-t pt-3" style={{ borderColor: "var(--border)" }}>
        <p className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Seleccionar cuenta</p>
        {isLoading ? (
          <div className="flex justify-center py-3">
            <Loader2 size={16} className="animate-spin" style={{ color: "var(--text-muted)" }} />
          </div>
        ) : accounts.length === 0 ? (
          <p className="text-xs text-center py-3" style={{ color: "var(--text-muted)" }}>
            No hay cuentas abiertas en esta caja
          </p>
        ) : (
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {accounts.map(acc => (
              <button key={acc.id}
                onClick={() => setSelectedAccountId(acc.id)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all"
                style={{
                  background: selectedAccountId === acc.id ? "var(--info-light)" : "var(--bg-primary)",
                  border: `1px solid ${selectedAccountId === acc.id ? "var(--info)" : "var(--border)"}`,
                }}>
                <div className="flex items-center gap-2">
                  <User size={13} style={{ color: "var(--info)" }} />
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{acc.name}</span>
                </div>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {acc.items.reduce((s, i) => s + i.quantity, 0)} items
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="btn-outline btn-md flex-1">Cancelar</button>
        <button onClick={() => send(selectedAccountId)} disabled={isPending || !selectedAccountId}
          className="btn-md flex-1 text-white font-semibold"
          style={{ background: "var(--info)" }}>
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <User size={14} />}
          Agregar a cuenta
        </button>
      </div>
    </div>
  )
}

// ── WaiterPage ────────────────────────────────────────────
export default function WaiterPage() {
  const [query, setQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [cart, setCart] = useState([])
  const [showSend, setShowSend] = useState(false)
  const [showAccountSend, setShowAccountSend] = useState(false)
  const searchRef = useRef(null)
  const qc = useQueryClient()

  // Sub-turno actual
  const { data: subShift, isLoading: subLoading } = useQuery({
    queryKey: ["my-subshift"],
    queryFn: dispatchService.getMySubShift,
    retry: false,
    refetchOnWindowFocus: false,
  })

  // Abrir sub-turno
  const openSub = useMutation({
    mutationFn: (parentShiftId) => dispatchService.openSubShift(parentShiftId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-subshift"] }); toast.success("Vinculado a la caja") },
    onError: e => toast.error(e.response?.data?.error || "Error"),
  })

  // Cerrar sub-turno
  const closeSub = useMutation({
    mutationFn: () => dispatchService.closeSubShift(subShift.id),
    onSuccess: () => {
      qc.removeQueries({ queryKey: ["my-subshift"] })
      qc.invalidateQueries({ queryKey: ["my-subshift"] })
      setCart([])
      toast.success("Turno cerrado")
    },
    onError: e => toast.error(e.response?.data?.error || "Error"),
  })

  // Cuentas abiertas de la caja principal (poll frecuente para reflejar cierres)
  const { data: openAccounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ["accounts-shift", subShift?.parentShiftId],
    queryFn: () => accountsService.getByShift(subShift.parentShiftId),
    enabled: !!subShift?.parentShiftId,
    refetchInterval: 5_000,
    staleTime: 0,
  })

  // Categorías
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: categoriesService.getAll })

  // Productos
  const { data: allData } = useQuery({
    queryKey: ["products-all"],
    queryFn: () => productsService.getAll({ limit: 200 }),
    staleTime: 60_000,
  })
  const allProducts = [...(allData?.products || [])].sort((a, b) => a.name.localeCompare(b.name))

  const { data: searchData, isFetching } = useQuery({
    queryKey: ["products-search", query],
    queryFn: () => productsService.getAll({ search: query, limit: 50 }),
    enabled: query.length >= 1,
    staleTime: 0,
  })
  const searchResults = searchData?.products || []

  const base = query.length >= 1 ? searchResults : allProducts
  const displayProducts = selectedCategory
    ? base.filter(p => String(p.categoryId) === selectedCategory)
    : base

  // Carrito
  const addItem = (product) => {
    if (product.type !== "SERVICE" && product.stock <= 0) { toast.error("Sin stock"); return }
    setCart(prev => {
      const ex = prev.find(i => i.id === product.id)
      if (ex) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { ...product, quantity: 1 }]
    })
  }
  const updateQty = (id, qty) => {
    if (qty <= 0) { setCart(prev => prev.filter(i => i.id !== id)); return }
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i))
  }
  const removeItem = (id) => setCart(prev => prev.filter(i => i.id !== id))
  const total = cart.reduce((s, i) => s + Number(i.price) * i.quantity, 0)

  useEffect(() => { searchRef.current?.focus() }, [subShift?.id])

  if (subLoading) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 size={24} className="animate-spin" style={{ color: "var(--text-muted)" }} />
    </div>
  )

  if (!subShift) return (
    <div className="h-full flex flex-col">
      <LinkToCashierScreen onLink={(id) => openSub.mutate(id)} loading={openSub.isPending} />
    </div>
  )

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Header del sub-turno */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b shrink-0"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
        <div>
          <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Reportando a</p>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {subShift.parentShift?.user?.name} — Caja #{subShift.parentShiftId}
          </p>
        </div>
        <button
          onClick={async () => { const ok = await confirm({ title: "¿Cerrar turno de mesero?", message: "Se cancelarán los pedidos pendientes.", confirmLabel: "Cerrar turno", cancelLabel: "Seguir trabajando" }); if (ok) closeSub.mutate() }}
          disabled={closeSub.isPending}
          className="btn-sm flex items-center gap-1.5"
          style={{ background: "var(--danger-light)", color: "var(--danger)", border: "1px solid var(--danger)" }}>
          <LogOut size={13} />
          <span className="hidden sm:inline text-xs">Salir</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

        {/* Panel izquierdo — productos */}
        <div className="flex-1 flex flex-col overflow-hidden p-3 gap-2">
          <div className="relative">
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

          {/* Chips categorías */}
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

          <div className="flex-1 overflow-y-auto">
            {isFetching ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-muted)" }} />
              </div>
            ) : displayProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <Package size={24} style={{ color: "var(--text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Sin productos</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {displayProducts.map(p => <ProductCard key={p.id} product={p} onAdd={addItem} />)}
              </div>
            )}
          </div>
        </div>

        {/* Panel derecho — carrito */}
        <div className="w-full md:w-80 lg:w-96 flex flex-col border-t md:border-t-0 md:border-l"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>

          <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              <Send size={15} style={{ color: "var(--brand)" }} />
              <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Pedido</span>
              {cart.length > 0 && (
                <span className="badge text-white text-xs px-1.5" style={{ background: "var(--brand)" }}>
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button onClick={() => { setCart([]); setShowSend(false) }}
                className="text-xs btn-ghost px-2 py-1 rounded" style={{ color: "var(--danger)" }}>
                Limpiar
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 py-12">
                <Send size={28} style={{ color: "var(--bg-tertiary)" }} />
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Agrega productos al pedido</p>
              </div>
            ) : (
              cart.map(item => <CartItem key={item.id} item={item} onUpdate={updateQty} onRemove={removeItem} />)
            )}
          </div>

          <div className="p-4 border-t space-y-3" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Total</span>
              <span className="font-display font-bold text-2xl font-mono" style={{ color: "var(--text-primary)" }}>
                {formatCOP(total)}
              </span>
            </div>

            {!showSend && !showAccountSend ? (
              <div className="flex gap-2">
                <button onClick={() => setShowSend(true)} disabled={cart.length === 0}
                  className="btn-primary btn-md flex-1">
                  <Send size={15} /> Cobrar
                </button>
                <button onClick={() => setShowAccountSend(true)}
                  disabled={cart.length === 0 || openAccounts.length === 0}
                  title={openAccounts.length === 0 ? "No hay cuentas abiertas" : undefined}
                  className="btn-md flex-1 text-white font-semibold"
                  style={{ background: openAccounts.length > 0 ? "var(--info)" : "var(--bg-tertiary)", color: openAccounts.length > 0 ? "white" : "var(--text-muted)" }}>
                  <User size={15} /> A cuenta {openAccounts.length > 0 && <span className="text-xs opacity-75">({openAccounts.length})</span>}
                </button>
              </div>
            ) : showSend ? (
              <SendOrderPanel
                items={cart}
                total={total}
                subShiftId={subShift.id}
                onSent={() => { setCart([]); setShowSend(false) }}
                onCancel={() => setShowSend(false)}
              />
            ) : (
              <SendToAccountPanel
                items={cart}
                accounts={openAccounts}
                isLoadingAccounts={accountsLoading}
                subShiftId={subShift.id}
                onSent={() => { setCart([]); setShowAccountSend(false) }}
                onCancel={() => setShowAccountSend(false)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}