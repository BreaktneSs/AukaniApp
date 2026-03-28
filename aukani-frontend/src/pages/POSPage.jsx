import { useState, useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useCartStore } from "@/store/cart.store"
import { useAuthStore } from "@/store/auth.store"
import { productsService } from "@/services/products.service"
import { ordersService } from "@/services/orders.service"
import { shiftsService } from "@/services/shifts.service"
import { paymentMethodsService, categoriesService } from "@/services/catalog.service"
import {
  Search, X, Plus, Minus, Trash2, ShoppingCart,
  CreditCard, Banknote, Loader2, Package,
  PlusCircle, Edit2, LogIn, LogOut,
} from "lucide-react"
import toast from "react-hot-toast"

// ── (ImgPlaceholder inlined in ProductCard) ──────────────

// ── ProductCard ───────────────────────────────────────────
function ProductCard({ product, onAdd }) {
  const [err, setErr] = useState(false)
  return (
    <button onClick={() => onAdd(product)}
      className="card text-left transition-all duration-150 animate-fade-in active:scale-95 w-full group overflow-hidden flex flex-col"
      style={{ borderColor: "var(--border)", minHeight: "160px" }}>
      {/* Imagen ocupa la mitad superior */}
      <div className="w-full flex-1 relative" style={{ minHeight: "100px" }}>
        {product.imageUrl && !err
          ? <img src={`/api${product.imageUrl}`} onError={() => setErr(true)} alt={product.name} className="w-full h-full object-cover absolute inset-0" />
          : <div className="w-full h-full flex items-center justify-center absolute inset-0" style={{ background: "var(--bg-tertiary)" }}>
              <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10">
                <rect x="4" y="10" width="40" height="28" rx="3" stroke="currentColor" strokeWidth="2" fill="none" style={{ color: "var(--border)" }} />
                <circle cx="16" cy="20" r="4" stroke="currentColor" strokeWidth="2" fill="none" style={{ color: "var(--border)" }} />
                <path d="M4 32 L14 22 L22 30 L30 22 L44 36" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" style={{ color: "var(--border)" }} />
              </svg>
            </div>
        }
      </div>
      {/* Info en la parte inferior */}
      <div className="p-2.5 shrink-0">
        <p className="text-sm font-semibold leading-tight line-clamp-2 group-hover:text-green-500 transition-colors" style={{ color: "var(--text-primary)" }}>
          {product.name}
        </p>
        <div className="flex items-center justify-between mt-1.5">
          <p className="font-mono font-bold text-base" style={{ color: "var(--brand)" }}>
            ${Number(product.price).toFixed(2)}
          </p>
          <p className="text-xs" style={{ color: product.stock <= product.minStock ? "var(--warning)" : "var(--text-muted)" }}>
            {product.stock} uds
          </p>
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
        <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>${Number(item.price).toFixed(2)}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => onUpdate(item.id, item.quantity - 1)} className="w-6 h-6 rounded flex items-center justify-center btn-ghost"><Minus size={11} /></button>
        <span className="w-7 text-center text-sm font-mono font-bold" style={{ color: "var(--text-primary)" }}>{item.quantity}</span>
        <button onClick={() => onUpdate(item.id, item.quantity + 1)} className="w-6 h-6 rounded flex items-center justify-center btn-ghost"><Plus size={11} /></button>
      </div>
      <p className="font-mono text-sm font-bold w-14 text-right shrink-0" style={{ color: "var(--text-primary)" }}>
        ${(Number(item.price) * item.quantity).toFixed(2)}
      </p>
      <button onClick={() => onRemove(item.id)} className="btn-ghost w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ color: "var(--danger)" }}>
        <Trash2 size={11} />
      </button>
    </div>
  )
}

// ── SaleTabs ──────────────────────────────────────────────
function SaleTabs({ sales, activeId, onSwitch, onNew, onClose, onRename }) {
  const [editing, setEditing] = useState(null)
  const [editVal, setEditVal] = useState("")
  const inputRef = useRef(null)

  const startEdit = (sale, e) => {
    e.stopPropagation(); setEditing(sale.id); setEditVal(sale.label)
    setTimeout(() => inputRef.current?.focus(), 50)
  }
  const confirmEdit = (id) => { if (editVal.trim()) onRename(id, editVal.trim()); setEditing(null) }

  return (
    <div className="flex items-center gap-1 px-3 pt-2 overflow-x-auto border-b shrink-0"
      style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
      {sales.map(sale => {
        const isActive = sale.id === activeId
        const count = sale.items.reduce((s, i) => s + i.quantity, 0)
        return (
          <div key={sale.id} onClick={() => onSwitch(sale.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-t-md cursor-pointer shrink-0 select-none border-t border-l border-r -mb-px transition-all duration-150"
            style={{ background: isActive ? "var(--bg-primary)" : "var(--bg-tertiary)", borderColor: isActive ? "var(--border)" : "transparent", borderBottomColor: isActive ? "var(--bg-primary)" : "transparent", minWidth: "100px", maxWidth: "160px" }}>
            {editing === sale.id ? (
              <input ref={inputRef} value={editVal} onChange={e => setEditVal(e.target.value)}
                onBlur={() => confirmEdit(sale.id)}
                onKeyDown={e => { if (e.key === "Enter") confirmEdit(sale.id); if (e.key === "Escape") setEditing(null) }}
                onClick={e => e.stopPropagation()}
                className="text-xs w-full outline-none font-medium"
                style={{ background: "transparent", color: "var(--text-primary)" }} />
            ) : (
              <>
                <span className="text-xs font-medium truncate flex-1" style={{ color: isActive ? "var(--text-primary)" : "var(--text-muted)" }}>{sale.label}</span>
                {count > 0 && <span className="text-xs px-1 rounded shrink-0" style={{ background: "var(--brand-light)", color: "var(--brand)", fontSize: "10px" }}>{count}</span>}
                {isActive && <button onClick={e => startEdit(sale, e)} className="shrink-0 opacity-40 hover:opacity-100"><Edit2 size={10} /></button>}
                <button onClick={e => { e.stopPropagation(); onClose(sale.id) }} className="shrink-0 opacity-30 hover:opacity-100 ml-0.5" style={{ color: "var(--danger)" }}><X size={11} /></button>
              </>
            )}
          </div>
        )
      })}
      <button onClick={onNew} className="flex items-center gap-1 px-2 py-1.5 rounded-t-md shrink-0 opacity-50 hover:opacity-100" style={{ color: "var(--text-muted)" }} title="Nueva venta">
        <PlusCircle size={15} />
      </button>
    </div>
  )
}

// ── Pantalla apertura de turno ────────────────────────────
function OpenShiftScreen({ onOpen, loading }) {
  const [amount, setAmount] = useState("")
  const { user } = useAuthStore()

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
        <form onSubmit={e => { e.preventDefault(); if (amount !== "") onOpen(Number(amount)) }} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Efectivo inicial en caja
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm" style={{ color: "var(--text-muted)" }}>$</span>
              <input type="number" min="0" step="0.01" required autoFocus
                className="input pl-7 text-xl font-mono font-bold"
                placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Cuenta el efectivo antes de empezar</p>
          </div>
          <button type="submit" disabled={loading || amount === ""} className="btn-primary btn-lg w-full">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
            Abrir turno
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Modal cierre de turno ─────────────────────────────────
function CloseShiftModal({ shift, onClose, onConfirm, loading }) {
  const [closingCash, setClosingCash] = useState("")
  const [notes, setNotes] = useState("")

  const cashPayment = shift?.shiftPayments?.find(p => p.paymentMethod?.name === "Efectivo")
  const cashSales = Number(cashPayment?.total || 0)
  const openingCash = Number(shift?.openingCash || 0)
  const expectedCash = openingCash + cashSales
  const difference = closingCash !== "" ? Number(closingCash) - expectedCash : null
  const totalSales = (shift?.shiftPayments || []).reduce((s, p) => s + Number(p.total), 0)

  const duration = shift?.openedAt ? Math.round((Date.now() - new Date(shift.openedAt)) / 60000) : 0
  const hours = Math.floor(duration / 60), mins = duration % 60

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div className="card p-6 w-full max-w-md animate-slide-up overflow-y-auto max-h-[92vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg" style={{ color: "var(--text-primary)" }}>Cierre de turno</h2>
          <button onClick={onClose} className="btn-ghost w-7 h-7 rounded flex items-center justify-center"><X size={15} /></button>
        </div>

        {/* Resumen */}
        <div className="rounded-lg p-4 mb-4 space-y-3" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{shift?.user?.name}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Inicio: {shift?.openedAt ? new Date(shift.openedAt).toLocaleTimeString() : "—"}
                {" · "}{hours > 0 ? `${hours}h ` : ""}{mins}min
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Ventas totales</p>
              <p className="font-mono font-bold" style={{ color: "var(--brand)" }}>${totalSales.toFixed(2)}</p>
            </div>
          </div>

          <div className="border-t pt-3 space-y-1.5" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Por método de pago</p>
            {shift?.shiftPayments?.length > 0 ? shift.shiftPayments.map(p => (
              <div key={p.id} className="flex justify-between text-sm">
                <span style={{ color: "var(--text-secondary)" }}>{p.paymentMethod?.name}</span>
                <span className="font-mono font-medium" style={{ color: "var(--text-primary)" }}>${Number(p.total).toFixed(2)}</span>
              </div>
            )) : <p className="text-xs" style={{ color: "var(--text-muted)" }}>Sin ventas registradas</p>}
          </div>

          <div className="border-t pt-3" style={{ borderColor: "var(--border)" }}>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Efectivo esperado</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Apertura ${openingCash.toFixed(2)} + ventas efectivo ${cashSales.toFixed(2)}
                </p>
              </div>
              <p className="font-mono font-bold text-lg" style={{ color: "var(--brand)" }}>${expectedCash.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <form onSubmit={e => { e.preventDefault(); onConfirm({ closingCash: Number(closingCash), notes }) }} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Efectivo contado en caja *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm" style={{ color: "var(--text-muted)" }}>$</span>
              <input type="number" min="0" step="0.01" required autoFocus
                className="input pl-7 text-lg font-mono font-bold"
                placeholder="0.00" value={closingCash} onChange={e => setClosingCash(e.target.value)} />
            </div>
          </div>

          {difference !== null && (
            <div className="flex items-center justify-between rounded-lg px-4 py-3 animate-fade-in"
              style={{ background: Math.abs(difference) < 0.01 ? "var(--brand-light)" : difference > 0 ? "var(--brand-light)" : "var(--danger-light)" }}>
              <span className="text-sm font-semibold" style={{ color: Math.abs(difference) < 0.01 ? "var(--brand)" : difference > 0 ? "var(--brand)" : "var(--danger)" }}>
                {Math.abs(difference) < 0.01 ? "✅ Cuadra exacto" : difference > 0 ? "↑ Sobrante" : "↓ Faltante"}
              </span>
              {Math.abs(difference) >= 0.01 && (
                <span className="font-mono font-bold" style={{ color: difference > 0 ? "var(--brand)" : "var(--danger)" }}>
                  ${Math.abs(difference).toFixed(2)}
                </span>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Notas</label>
            <textarea className="input resize-none" rows={2} placeholder="Observaciones del turno..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-outline btn-md flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-md flex-1 text-white font-semibold" style={{ background: "var(--danger)" }}>
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
  const [payments, setPayments] = useState([])
  const searchRef = useRef(null)
  const qc = useQueryClient()

  const { sales, activeId, shiftId, setShift, newSale, switchSale, closeSale, renameSale, addItem, removeItem, updateQuantity, clearActive, getActive, getTotal } = useCartStore()
  const active = getActive()
  const items = active?.items || []
  const total = getTotal()

  // Turno
  const { data: shift, isLoading: shiftLoading } = useQuery({
    queryKey: ["shift-mine"],
    queryFn: shiftsService.getMine,
    retry: false,
    refetchOnWindowFocus: false,
  })
  useEffect(() => { if (shift?.id) setShift(shift.id) }, [shift])

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
    enabled: query.length >= 2,
  })
  const searchResults = searchData?.products || []

  // Productos a mostrar + filtro categoría
  const base = query.length >= 2 ? searchResults : allProducts
  const displayProducts = selectedCategory
    ? base.filter(p => String(p.categoryId) === selectedCategory)
    : base

  // Inicializar pago
  useEffect(() => {
    if (showPayment && paymentMethods.length > 0) {
      const efectivo = paymentMethods.find(m => m.name === "Efectivo")
      setPayments(efectivo ? [{ paymentMethodId: efectivo.id, amount: "" }] : [])
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
    onSuccess: (data) => { setShift(data.id); qc.invalidateQueries({ queryKey: ["shift-mine"] }); toast.success("Turno abierto") },
    onError: e => toast.error(e.response?.data?.error || "Error"),
  })

  // Cerrar turno
  const closeShiftMut = useMutation({
    mutationFn: (data) => shiftsService.close(shift.id, data),
    onSuccess: () => { setShift(null); qc.invalidateQueries({ queryKey: ["shift-mine"] }); setShowCloseShift(false); toast.success("Turno cerrado") },
    onError: e => toast.error(e.response?.data?.error || "Error"),
  })

  // Venta
  const { mutate: createSale, isPending: selling } = useMutation({
    mutationFn: ordersService.createSale,
    onSuccess: (data) => {
      const change = data.change || 0
      toast.success(`✅ Venta registrada${change > 0 ? ` · Cambio: $${change.toFixed(2)}` : ""}`)
      closeSale(activeId); setShowPayment(false)
      qc.invalidateQueries({ queryKey: ["products-all"] })
      qc.invalidateQueries({ queryKey: ["shift-mine"] })
    },
    onError: e => toast.error(e.response?.data?.error || "Error al registrar venta"),
  })

  const handleAddToCart = (product) => {
    if (product.stock <= 0) { toast.error("Sin stock disponible"); return }
    addItem(product)
  }

  const handleSell = () => {
    if (!shiftId) { toast.error("Abre un turno antes de vender"); return }
    if (items.length === 0) return
    const paid = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
    if (paid < total) { toast.error(`Falta $${(total - paid).toFixed(2)} por pagar`); return }
    createSale({
      shiftId,
      items: items.map(i => ({ productId: i.id, quantity: i.quantity })),
      payments: payments.filter(p => Number(p.amount) > 0).map(p => ({ paymentMethodId: p.paymentMethodId, amount: Number(p.amount) })),
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
        onClose={(id) => { closeSale(id); setShowPayment(false) }}
        onRename={renameSale}
      />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Panel izquierdo */}
        <div className="flex-1 flex flex-col overflow-hidden p-3 gap-2">

          {/* Búsqueda + cerrar turno */}
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
            <button onClick={() => setShowCloseShift(true)}
              className="btn-md shrink-0 flex items-center gap-1.5 text-sm font-medium"
              style={{ background: "var(--danger-light)", color: "var(--danger)", border: "1px solid var(--danger)" }}>
              <LogOut size={15} />
              <span className="hidden sm:inline">Cerrar turno</span>
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
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {displayProducts.map(p => <ProductCard key={p.id} product={p} onAdd={handleAddToCart} />)}
              </div>
            )}
          </div>
        </div>

        {/* Carrito */}
        <div className="w-full md:w-80 lg:w-96 flex flex-col border-t md:border-t-0 md:border-l"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              <ShoppingCart size={15} style={{ color: "var(--brand)" }} />
              <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{active?.label || "Carrito"}</span>
              {items.length > 0 && <span className="badge text-white text-xs px-1.5" style={{ background: "var(--brand)" }}>{items.reduce((s, i) => s + i.quantity, 0)}</span>}
            </div>
            {items.length > 0 && <button onClick={clearActive} className="text-xs btn-ghost px-2 py-1 rounded" style={{ color: "var(--danger)" }}>Limpiar</button>}
          </div>

          <div className="flex-1 overflow-y-auto px-4">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 py-12">
                <ShoppingCart size={28} style={{ color: "var(--bg-tertiary)" }} />
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Carrito vacío</p>
              </div>
            ) : items.map(item => <CartItem key={item.id} item={item} onUpdate={updateQuantity} onRemove={removeItem} />)}
          </div>

          <div className="p-4 border-t space-y-3" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Total</span>
              <span className="font-display font-bold text-2xl font-mono" style={{ color: "var(--text-primary)" }}>${total.toFixed(2)}</span>
            </div>

            {!showPayment ? (
              <button onClick={() => setShowPayment(true)} disabled={items.length === 0} className="btn-primary btn-lg w-full">
                <CreditCard size={17} /> Cobrar
              </button>
            ) : (
              <div className="space-y-2.5 animate-slide-up">
                {paymentMethods.filter(m => m.active).map(method => {
                  const p = payments.find(x => x.paymentMethodId === method.id)
                  return (
                    <div key={method.id} className="flex items-center gap-2">
                      <label className="text-xs w-20 shrink-0 font-medium" style={{ color: "var(--text-secondary)" }}>{method.name}</label>
                      <input type="number" className="input text-sm font-mono" placeholder="0.00" min="0" step="0.01"
                        value={p?.amount || ""}
                        onChange={e => {
                          const val = e.target.value
                          setPayments(prev => {
                            const exists = prev.find(x => x.paymentMethodId === method.id)
                            if (exists) return prev.map(x => x.paymentMethodId === method.id ? { ...x, amount: val } : x)
                            return [...prev, { paymentMethodId: method.id, amount: val }]
                          })
                        }} />
                    </div>
                  )
                })}
                {(() => {
                  const paid = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
                  const change = paid - total
                  return paid > 0 ? (
                    <div className="flex justify-between text-sm pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                      <span style={{ color: "var(--text-muted)" }}>Cambio</span>
                      <span className="font-mono font-bold" style={{ color: change >= 0 ? "var(--brand)" : "var(--danger)" }}>${change.toFixed(2)}</span>
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
    </div>
  )
}