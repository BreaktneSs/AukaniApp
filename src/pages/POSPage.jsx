import { useState, useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useCartStore } from "@/store/cart.store"
import { productsService } from "@/services/products.service"
import { ordersService } from "@/services/orders.service"
import { shiftsService } from "@/services/shifts.service"
import { paymentMethodsService } from "@/services/catalog.service"
import {
  Search, X, Plus, Minus, Trash2, ShoppingCart,
  CreditCard, Banknote, Loader2, AlertTriangle,
  Package, PlusCircle, Edit2, Check
} from "lucide-react"
import toast from "react-hot-toast"

// ── ProductImagePlaceholder ──────────────────────────────
function ProductImagePlaceholder() {
  return (
    <div className="w-full h-20 rounded-md mb-2 flex items-center justify-center"
      style={{ background: "var(--bg-tertiary)" }}>
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
        <rect x="4" y="10" width="40" height="28" rx="3"
          stroke="currentColor" strokeWidth="2" fill="none" style={{ color: "var(--border)" }} />
        <circle cx="16" cy="20" r="4"
          stroke="currentColor" strokeWidth="2" fill="none" style={{ color: "var(--border)" }} />
        <path d="M4 32 L14 22 L22 30 L30 22 L44 36"
          stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
          style={{ color: "var(--border)" }} />
      </svg>
    </div>
  )
}

// ── ProductCard ───────────────────────────────────────────
function ProductCard({ product, onAdd }) {
  const [imgError, setImgError] = useState(false)
  return (
    <button onClick={() => onAdd(product)}
      className="card p-3 text-left transition-all duration-150 animate-fade-in active:scale-95 w-full group"
      style={{ borderColor: "var(--border)" }}>
      {product.imageUrl && !imgError ? (
        <img src={`/api${product.imageUrl}`} alt={product.name}
          onError={() => setImgError(true)}
          className="w-full h-20 object-cover rounded-md mb-2" />
      ) : (
        <ProductImagePlaceholder />
      )}
      <p className="text-xs font-semibold leading-tight line-clamp-2 group-hover:text-green-500 transition-colors"
        style={{ color: "var(--text-primary)" }}>
        {product.name}
      </p>
      <p className="font-mono font-bold text-sm mt-1" style={{ color: "var(--brand)" }}>
        ${Number(product.price).toFixed(2)}
      </p>
      <p className="text-xs mt-0.5"
        style={{ color: product.stock <= product.minStock ? "var(--warning)" : "var(--text-muted)" }}>
        Stock: {product.stock}
      </p>
    </button>
  )
}

// ── CartItemRow ───────────────────────────────────────────
function CartItemRow({ item, onUpdate, onRemove }) {
  return (
    <div className="flex items-center gap-2 py-2.5 border-b animate-fade-in"
      style={{ borderColor: "var(--border)" }}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{item.name}</p>
        <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>${Number(item.price).toFixed(2)}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => onUpdate(item.id, item.quantity - 1)}
          className="w-6 h-6 rounded flex items-center justify-center btn-ghost">
          <Minus size={11} />
        </button>
        <span className="w-7 text-center text-sm font-mono font-bold" style={{ color: "var(--text-primary)" }}>
          {item.quantity}
        </span>
        <button onClick={() => onUpdate(item.id, item.quantity + 1)}
          className="w-6 h-6 rounded flex items-center justify-center btn-ghost">
          <Plus size={11} />
        </button>
      </div>
      <p className="font-mono text-sm font-bold w-14 text-right shrink-0" style={{ color: "var(--text-primary)" }}>
        ${(Number(item.price) * item.quantity).toFixed(2)}
      </p>
      <button onClick={() => onRemove(item.id)}
        className="btn-ghost w-6 h-6 rounded flex items-center justify-center shrink-0"
        style={{ color: "var(--danger)" }}>
        <Trash2 size={11} />
      </button>
    </div>
  )
}

// ── SaleTabs ──────────────────────────────────────────────
function SaleTabs({ sales, activeId, onSwitch, onNew, onClose, onRename }) {
  const [editing, setEditing] = useState(null)
  const [editValue, setEditValue] = useState("")
  const inputRef = useRef(null)

  const startEdit = (sale, e) => {
    e.stopPropagation()
    setEditing(sale.id)
    setEditValue(sale.label)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const confirmEdit = (id) => {
    if (editValue.trim()) onRename(id, editValue.trim())
    setEditing(null)
  }

  return (
    <div className="flex items-center gap-1 px-3 pt-2 overflow-x-auto border-b shrink-0"
      style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
      {sales.map(sale => {
        const isActive = sale.id === activeId
        const itemCount = sale.items.reduce((s, i) => s + i.quantity, 0)
        return (
          <div key={sale.id}
            onClick={() => onSwitch(sale.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-t-md cursor-pointer shrink-0 transition-all duration-150 select-none border-t border-l border-r -mb-px"
            style={{
              background: isActive ? "var(--bg-primary)" : "var(--bg-tertiary)",
              borderColor: isActive ? "var(--border)" : "transparent",
              borderBottomColor: isActive ? "var(--bg-primary)" : "transparent",
              minWidth: "100px", maxWidth: "160px",
            }}>
            {editing === sale.id ? (
              <input
                ref={inputRef}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={() => confirmEdit(sale.id)}
                onKeyDown={e => { if (e.key === "Enter") confirmEdit(sale.id); if (e.key === "Escape") setEditing(null) }}
                onClick={e => e.stopPropagation()}
                className="text-xs w-full outline-none font-medium"
                style={{ background: "transparent", color: "var(--text-primary)" }}
              />
            ) : (
              <>
                <span className="text-xs font-medium truncate flex-1"
                  style={{ color: isActive ? "var(--text-primary)" : "var(--text-muted)" }}>
                  {sale.label}
                </span>
                {itemCount > 0 && (
                  <span className="text-xs font-mono px-1 rounded shrink-0"
                    style={{ background: "var(--brand-light)", color: "var(--brand)", fontSize: "10px" }}>
                    {itemCount}
                  </span>
                )}
                {isActive && (
                  <button onClick={e => startEdit(sale, e)}
                    className="shrink-0 opacity-40 hover:opacity-100 transition-opacity">
                    <Edit2 size={10} />
                  </button>
                )}
                {sales.length > 0 && (
                  <button
                    onClick={e => { e.stopPropagation(); onClose(sale.id) }}
                    className="shrink-0 opacity-30 hover:opacity-100 transition-opacity ml-0.5"
                    style={{ color: "var(--danger)" }}>
                    <X size={11} />
                  </button>
                )}
              </>
            )}
          </div>
        )
      })}

      {/* Botón nueva venta */}
      <button onClick={onNew}
        className="flex items-center gap-1 px-2 py-1.5 rounded-t-md shrink-0 transition-all duration-150 opacity-50 hover:opacity-100"
        style={{ color: "var(--text-muted)" }}
        title="Nueva venta">
        <PlusCircle size={15} />
      </button>
    </div>
  )
}

// ── POSPage ───────────────────────────────────────────────
export default function POSPage() {
  const [query, setQuery] = useState("")
  const [showPayment, setShowPayment] = useState(false)
  const [payments, setPayments] = useState([])
  const searchRef = useRef(null)
  const qc = useQueryClient()

  const {
    sales, activeId, shiftId, setShift,
    newSale, switchSale, closeSale, renameSale,
    addItem, removeItem, updateQuantity, clearActive,
    getActive, getTotal,
  } = useCartStore()

  const active = getActive()
  const items = active?.items || []
  const total = getTotal()

  // Turno activo
  const { data: shift, isLoading: shiftLoading } = useQuery({
    queryKey: ["shift-mine"],
    queryFn: shiftsService.getMine,
    retry: false,
  })
  useEffect(() => { if (shift?.id) setShift(shift.id) }, [shift])

  // Métodos de pago
  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: paymentMethodsService.getAll,
  })

  // Todos los productos
  const { data: allProductsData } = useQuery({
    queryKey: ["products-all"],
    queryFn: () => productsService.getAll({ limit: 200 }).then(r => r.products),
    staleTime: 60_000,
  })
  const allProducts = (allProductsData || []).slice().sort((a, b) => a.name.localeCompare(b.name))

  // Búsqueda
  const { data: searchResults = [], isFetching } = useQuery({
    queryKey: ["products-search", query],
    queryFn: () => productsService.search(query),
    enabled: query.length >= 2,
  })

  const displayProducts = query.length >= 2 ? searchResults : allProducts

  // Inicializar pago
  useEffect(() => {
    if (showPayment && paymentMethods.length > 0) {
      const efectivo = paymentMethods.find(m => m.name === "Efectivo")
      setPayments(efectivo ? [{ paymentMethodId: efectivo.id, amount: "" }] : [])
    }
  }, [showPayment, paymentMethods])

  // Foco en búsqueda
  useEffect(() => { searchRef.current?.focus() }, [activeId])

  // ESC para limpiar
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") { setQuery(""); setShowPayment(false); searchRef.current?.focus() }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  const { mutate: createSale, isPending: selling } = useMutation({
    mutationFn: ordersService.createSale,
    onSuccess: (data) => {
      const change = data.change || 0
      toast.success(`✅ Venta registrada${change > 0 ? ` · Cambio: $${change.toFixed(2)}` : ""}`)
      closeSale(activeId)
      setShowPayment(false)
      qc.invalidateQueries({ queryKey: ["products-all"] })
    },
    onError: (err) => toast.error(err.response?.data?.error || "Error al registrar venta"),
  })

  const handleAddToCart = (product) => {
    if (product.stock <= 0) { toast.error("Sin stock disponible"); return }
    addItem(product)
  }

  const handleSell = () => {
    if (!shiftId) { toast.error("Abre un turno antes de vender"); return }
    if (items.length === 0) return
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
    if (totalPaid < total) { toast.error(`Falta $${(total - totalPaid).toFixed(2)} por pagar`); return }

    createSale({
      shiftId,
      items: items.map(i => ({ productId: i.id, quantity: i.quantity })),
      payments: payments.filter(p => Number(p.amount) > 0).map(p => ({
        paymentMethodId: p.paymentMethodId,
        amount: Number(p.amount),
      })),
    })
  }

  if (!shiftLoading && !shift) return <NoShiftWarning />

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Pestañas de ventas */}
      <SaleTabs
        sales={sales}
        activeId={activeId}
        onSwitch={(id) => { switchSale(id); setShowPayment(false); setQuery("") }}
        onNew={() => { newSale(); setShowPayment(false); setQuery("") }}
        onClose={(id) => { closeSale(id); setShowPayment(false) }}
        onRename={renameSale}
      />

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

        {/* Panel izquierdo — productos */}
        <div className="flex-1 flex flex-col overflow-hidden p-3 gap-3">
          {/* Búsqueda */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-muted)" }} />
            <input
              ref={searchRef}
              type="text"
              className="input pl-9 pr-9 py-2.5"
              placeholder="Buscar o escanear código de barras... (ESC para limpiar)"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && (
              <button onClick={() => { setQuery(""); searchRef.current?.focus() }}
                className="absolute right-3 top-1/2 -translate-y-1/2 btn-ghost w-5 h-5 rounded flex items-center justify-center">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Grid de productos */}
          <div className="flex-1 overflow-y-auto">
            {isFetching ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-muted)" }} />
              </div>
            ) : query.length >= 2 && searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Sin resultados para "{query}"
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                {displayProducts.map(p => (
                  <ProductCard key={p.id} product={p} onAdd={handleAddToCart} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Panel derecho — carrito */}
        <div className="w-full md:w-80 lg:w-96 flex flex-col border-t md:border-t-0 md:border-l"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b"
            style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              <ShoppingCart size={15} style={{ color: "var(--brand)" }} />
              <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                {active?.label || "Carrito"}
              </span>
              {items.length > 0 && (
                <span className="badge text-white text-xs px-1.5" style={{ background: "var(--brand)" }}>
                  {items.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </div>
            {items.length > 0 && (
              <button onClick={clearActive}
                className="text-xs btn-ghost px-2 py-1 rounded"
                style={{ color: "var(--danger)" }}>
                Limpiar
              </button>
            )}
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto px-4">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 py-12">
                <ShoppingCart size={28} style={{ color: "var(--bg-tertiary)" }} />
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Carrito vacío
                </p>
              </div>
            ) : (
              items.map(item => (
                <CartItemRow key={item.id} item={item}
                  onUpdate={updateQuantity} onRemove={removeItem} />
              ))
            )}
          </div>

          {/* Total y pago */}
          <div className="p-4 border-t space-y-3" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Total</span>
              <span className="font-display font-bold text-2xl font-mono"
                style={{ color: "var(--text-primary)" }}>
                ${total.toFixed(2)}
              </span>
            </div>

            {!showPayment ? (
              <button
                onClick={() => setShowPayment(true)}
                disabled={items.length === 0 || !shiftId}
                className="btn-primary btn-lg w-full">
                <CreditCard size={17} />
                Cobrar
              </button>
            ) : (
              <div className="space-y-2.5 animate-slide-up">
                {paymentMethods.filter(m => m.active).map(method => {
                  const p = payments.find(x => x.paymentMethodId === method.id)
                  return (
                    <div key={method.id} className="flex items-center gap-2">
                      <label className="text-xs w-20 shrink-0 font-medium"
                        style={{ color: "var(--text-secondary)" }}>
                        {method.name}
                      </label>
                      <input
                        type="number"
                        className="input text-sm font-mono"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        value={p?.amount || ""}
                        onChange={e => {
                          const val = e.target.value
                          setPayments(prev => {
                            const exists = prev.find(x => x.paymentMethodId === method.id)
                            if (exists) return prev.map(x => x.paymentMethodId === method.id ? { ...x, amount: val } : x)
                            return [...prev, { paymentMethodId: method.id, amount: val }]
                          })
                        }}
                      />
                    </div>
                  )
                })}

                {/* Cambio */}
                {(() => {
                  const paid = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
                  const change = paid - total
                  return paid > 0 ? (
                    <div className="flex justify-between text-sm pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                      <span style={{ color: "var(--text-muted)" }}>Cambio</span>
                      <span className="font-mono font-bold"
                        style={{ color: change >= 0 ? "var(--brand)" : "var(--danger)" }}>
                        ${change.toFixed(2)}
                      </span>
                    </div>
                  ) : null
                })()}

                <div className="flex gap-2 pt-1">
                  <button onClick={() => setShowPayment(false)} className="btn-outline btn-md flex-1">
                    Cancelar
                  </button>
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
    </div>
  )
}

function NoShiftWarning() {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="card p-8 max-w-sm text-center space-y-4">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
          style={{ background: "var(--warning-light)" }}>
          <AlertTriangle size={24} style={{ color: "var(--warning)" }} />
        </div>
        <h2 className="font-display font-bold text-lg" style={{ color: "var(--text-primary)" }}>
          Sin turno activo
        </h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Debes abrir un turno de caja antes de realizar ventas.
        </p>
        <a href="/settings" className="btn-primary btn-md inline-flex">
          Ir a Configuración
        </a>
      </div>
    </div>
  )
}