import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { useCartStore } from "@/store/cart.store"
import { useAuthStore } from "@/store/auth.store"
import { productsService } from "@/services/products.service"
import { ordersService } from "@/services/orders.service"
import { shiftsService } from "@/services/shifts.service"
import { dispatchService } from "@/services/dispatch.service"
import { accountsService } from "@/services/accounts.service"
import { paymentMethodsService, categoriesService } from "@/services/catalog.service"
import { useUiStore } from "@/store/ui.store"
import NumPad from "@/components/ui/NumPad"
import {
  Search, X, Plus, Minus, Trash2, ShoppingCart,
  CreditCard, Banknote, Loader2, Package,
  PlusCircle, LogIn, LogOut, Bell, User, UserPlus, AlertTriangle, Pencil,
  ChevronLeft, ChevronRight,
} from "lucide-react"
import toast from "react-hot-toast"
import { formatCOP, formatNumber } from "@/utils/currency"

// ── Modal edición de precio de servicio ───────────────────
function PriceEditModal({ item, onConfirm, onClose }) {
  const { touchMode } = useUiStore()
  const catalogPrice = Number(item.originalPrice ?? item.price)
  const [raw, setRaw] = useState(String(Math.round(Number(item.price))))
  const [note, setNote] = useState(item.priceNote || "")
  const [step, setStep] = useState("price") // "price" | "note" (touch mode)
  const numValue = Number(raw) || 0
  const display = raw ? formatNumber(numValue) : ""

  const noteValid = note.trim().length > 0
  const handleConfirm = () => { if (numValue > 0 && noteValid) onConfirm(numValue, note.trim()) }

  // Touch mode: dos pasos — primero precio, luego motivo
  if (touchMode) {
    if (step === "price") {
      return (
        <NumPad
          mode="currency"
          initialValue={Math.round(Number(item.price))}
          label={item.name}
          subtitle={`Catálogo: ${formatCOP(catalogPrice)}`}
          onConfirm={(val) => { if (val > 0) { setRaw(String(val)); setStep("note") } }}
          onClose={onClose}
        />
      )
    }
    return (
      <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
        onClick={onClose}>
        <div className="card w-full max-w-[320px] rounded-b-none sm:rounded-2xl animate-slide-up p-5 space-y-4"
          onClick={e => e.stopPropagation()}>
          <div>
            <p className="font-display font-bold text-sm" style={{ color: "var(--text-primary)" }}>Motivo del ajuste</p>
            <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{item.name} → {formatCOP(numValue)}</p>
          </div>
          <textarea
            autoFocus rows={3}
            className="input w-full resize-none text-sm"
            placeholder="Ej: descuento cliente frecuente, promoción del día..."
            value={note}
            onChange={e => setNote(e.target.value)}
          />
          {!noteValid && <p className="text-xs" style={{ color: "var(--danger)" }}>El motivo es obligatorio</p>}
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-outline btn-md flex-1">Cancelar</button>
            <button
              onClick={() => noteValid && onConfirm(numValue, note.trim())}
              disabled={!noteValid}
              className="btn-md flex-1 font-semibold"
              style={{ background: "var(--brand)", color: "#fff", opacity: noteValid ? 1 : 0.4 }}>
              Confirmar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <div className="card w-full max-w-xs animate-slide-up p-5 space-y-4"
        onClick={e => e.stopPropagation()}>
        <div>
          <p className="font-display font-bold text-sm" style={{ color: "var(--text-primary)" }}>
            Ajustar precio
          </p>
          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{item.name}</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Catálogo: <span className="font-mono font-semibold">{formatCOP(catalogPrice)}</span>
          </p>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-lg"
            style={{ color: "var(--text-muted)" }}>$</span>
          <input
            type="text" inputMode="numeric" autoFocus
            className="input pl-8 text-xl font-mono font-bold text-right"
            placeholder="0"
            value={display}
            onChange={e => setRaw(e.target.value.replace(/\D/g, ""))}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); document.getElementById("price-note-input")?.focus() } }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
            Motivo <span style={{ color: "var(--danger)" }}>*</span>
          </label>
          <input
            id="price-note-input"
            type="text"
            className="input text-sm"
            placeholder="Ej: descuento cliente frecuente..."
            value={note}
            onChange={e => setNote(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleConfirm() }}
          />
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-outline btn-md flex-1">Cancelar</button>
          <button
            onClick={handleConfirm}
            disabled={numValue <= 0 || !noteValid}
            className="btn-md flex-1 font-semibold"
            style={{ background: "var(--brand)", color: "#fff", opacity: (numValue <= 0 || !noteValid) ? 0.4 : 1 }}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

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
        style={{ background: "rgba(0,0,0,0.28)", backdropFilter: "blur(6px)" }}>
        <p className="text-xs font-semibold leading-tight line-clamp-1"
          style={{ color: "var(--product-label-color)" }}>
          {product.name}
        </p>
        <div className="flex items-center justify-between mt-0.5">
          <p className="font-mono font-bold text-xs"
            style={{ color: "var(--product-label-color)" }}>
            {formatCOP(product.price)}
          </p>
          {product.type === "SERVICE" ? (
            <p className="text-xs" style={{ color: "var(--product-label-color)", opacity: 0.6 }}>Servicio</p>
          ) : (
            <p className="text-xs font-semibold" style={{ color: product.stock <= product.minStock ? "var(--warning)" : "var(--product-stock-color)" }}>
              {product.stock} uds
            </p>
          )}
        </div>
      </div>
    </button>
  )
}

// ── CartItem ──────────────────────────────────────────────
function CartItem({ item, onUpdate, onRemove, onEditQty, onEditPrice, maxQty }) {
  const busy = item._busy
  const [raw, setRaw] = useState(String(item.quantity))
  useEffect(() => { setRaw(String(item.quantity)) }, [item.quantity])

  const commit = () => {
    const val = parseInt(raw, 10)
    if (val > 0) {
      if (maxQty !== undefined && val > maxQty) {
        toast.error("Stock insuficiente")
        setRaw(String(item.quantity))
        return
      }
      onUpdate(item.id, val)
    } else setRaw(String(item.quantity))
  }

  const priceAltered = item.originalPrice != null && Number(item.originalPrice) !== Number(item.price)

  return (
    <div className="flex items-center gap-2 py-2.5 border-b animate-fade-in" style={{ borderColor: "var(--border)", opacity: busy ? 0.6 : 1 }}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{item.name}</p>
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-mono" style={{ color: priceAltered ? "var(--brand)" : "var(--text-muted)" }}>
            {formatCOP(item.price)}
          </p>
          {priceAltered && (
            <p className="text-xs font-mono line-through" style={{ color: "var(--text-muted)" }}>
              {formatCOP(item.originalPrice)}
            </p>
          )}
          {onEditPrice && (
            <button type="button" onClick={() => onEditPrice(item)} disabled={busy}
              className="flex items-center justify-center rounded-md transition-all active:scale-90"
              style={{
                width: "1.25rem", height: "1.25rem",
                background: priceAltered ? "var(--brand)" : "var(--brand-light)",
                color: priceAltered ? "white" : "var(--brand)",
              }}
              title="Ajustar precio">
              <Pencil size={9} />
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => !busy && onUpdate(item.id, item.quantity - 1)} className="w-6 h-6 rounded flex items-center justify-center btn-ghost"><Minus size={11} /></button>
        {onEditQty ? (
          <span className="w-8 text-center text-sm font-mono font-bold cursor-pointer rounded px-1 py-0.5 transition-colors active:scale-95"
            style={{ color: "var(--brand)", background: "var(--brand-light)" }}
            onClick={() => !busy && onEditQty(item.id, item.quantity, item.name)}>
            {busy ? <Loader2 size={11} className="animate-spin mx-auto block" /> : item.quantity}
          </span>
        ) : (
          <input type="text" inputMode="numeric" value={raw} disabled={busy}
            onChange={e => setRaw(e.target.value.replace(/\D/g, ""))}
            onBlur={commit} onKeyDown={e => e.key === "Enter" && e.currentTarget.blur()}
            className="font-mono font-bold text-sm text-center rounded-md"
            style={{ width: "2.25rem", height: "1.75rem", background: "var(--bg-tertiary)", border: "1.5px solid var(--border)", color: "var(--text-primary)", outline: "none", transition: "border-color 0.15s" }}
            onFocus={e => { e.target.style.borderColor = "var(--brand)"; e.target.select() }}
            onBlurCapture={e => { e.target.style.borderColor = "var(--border)" }} />
        )}
        <button onClick={() => {
          if (busy) return
          if (maxQty !== undefined && item.quantity >= maxQty) { toast.error("Stock insuficiente"); return }
          onUpdate(item.id, item.quantity + 1)
        }} className="w-6 h-6 rounded flex items-center justify-center btn-ghost"><Plus size={11} /></button>
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

// ── Modal pago parcial ────────────────────────────────────
function PartialPayModal({ items, remoteItems, onConfirm, onClose }) {
  const [localQty, setLocalQty] = useState(() =>
    Object.fromEntries(items.map(i => [i.id, 0]))
  )
  const [remoteQty, setRemoteQty] = useState(() =>
    Object.fromEntries(remoteItems.filter(i => i.accountItemId).map(i => [i.accountItemId, 0]))
  )

  const payingLocal = items
    .filter(i => (localQty[i.id] || 0) > 0)
    .map(i => ({ ...i, quantity: localQty[i.id] }))
  const payingRemote = remoteItems
    .filter(i => i.accountItemId && (remoteQty[i.accountItemId] || 0) > 0)
    .map(i => ({ ...i, quantity: remoteQty[i.accountItemId] }))

  const subtotal = payingLocal.reduce((s, i) => s + Number(i.price) * i.quantity, 0)
                 + payingRemote.reduce((s, i) => s + Number(i.price) * i.quantity, 0)
  const hasAny = payingLocal.length > 0 || payingRemote.length > 0

  const renderRow = (item, qty, maxQty, onMinus, onPlus) => {
    const active = qty > 0
    return (
      <div key={item.id ?? item.accountItemId}
        className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{ background: active ? "var(--brand-light)" : "var(--bg-tertiary)", marginBottom: "4px" }}>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate leading-tight"
            style={{ color: active ? "var(--text-primary)" : "var(--text-muted)" }}>{item.name}</p>
          <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
            {formatCOP(item.price)} · {maxQty}u
          </p>
        </div>
        {/* precio: siempre reserva espacio para evitar saltos de layout */}
        <p className="text-xs font-mono font-bold shrink-0 w-14 text-right"
          style={{ color: "var(--brand)", visibility: active ? "visible" : "hidden" }}>
          {formatCOP(Number(item.price) * qty)}
        </p>
        <div className="flex items-center gap-1.5 shrink-0">
          <button type="button" onClick={onMinus}
            className="w-7 h-7 rounded-md flex items-center justify-center font-bold select-none transition-all active:scale-90"
            style={{ background: "var(--bg-secondary)", border: "1.5px solid var(--border)", color: "var(--text-primary)", fontSize: "1.1rem" }}>−</button>
          <span className="text-sm font-mono font-bold w-5 text-center"
            style={{ color: active ? "var(--brand)" : "var(--text-muted)" }}>{qty}</span>
          <button type="button" onClick={onPlus}
            className="w-7 h-7 rounded-md flex items-center justify-center font-bold select-none transition-all active:scale-90"
            style={{ background: active ? "var(--brand)" : "var(--bg-secondary)", border: `1.5px solid ${active ? "var(--brand)" : "var(--border)"}`, color: active ? "white" : "var(--text-primary)", fontSize: "1.1rem" }}>+</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
      onPointerDown={onClose} onClick={onClose}>
      <div className="card w-full rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-secondary)", maxWidth: "30%", maxHeight: "70vh", display: "flex", flexDirection: "column" }}
        onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
          <div>
            <p className="font-display font-bold text-sm" style={{ color: "var(--text-primary)" }}>Pago parcial</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>¿Cuánto paga esta persona?</p>
          </div>
          <button type="button" onPointerDown={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center btn-ghost shrink-0">
            <X size={14} style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-3 pb-2">
          {items.length > 0 && (
            <>
              {remoteItems.filter(i => i.accountItemId).length > 0 && (
                <p className="text-xs font-bold uppercase tracking-wider mb-1.5 mt-1" style={{ color: "var(--text-muted)" }}>
                  En caja
                </p>
              )}
              {items.map(item => renderRow(
                item, localQty[item.id] || 0, item.quantity,
                () => setLocalQty(p => ({ ...p, [item.id]: Math.max(0, (p[item.id] || 0) - 1) })),
                () => setLocalQty(p => ({ ...p, [item.id]: Math.min(item.quantity, (p[item.id] || 0) + 1) }))
              ))}
            </>
          )}
          {remoteItems.filter(i => i.accountItemId).length > 0 && (
            <>
              {items.length > 0 && (
                <p className="text-xs font-bold uppercase tracking-wider mb-1.5 mt-2" style={{ color: "var(--text-muted)" }}>
                  Mesero
                </p>
              )}
              {remoteItems.filter(i => i.accountItemId).map(item => renderRow(
                { ...item, id: item.accountItemId },
                remoteQty[item.accountItemId] || 0, item.quantity,
                () => setRemoteQty(p => ({ ...p, [item.accountItemId]: Math.max(0, (p[item.accountItemId] || 0) - 1) })),
                () => setRemoteQty(p => ({ ...p, [item.accountItemId]: Math.min(item.quantity, (p[item.accountItemId] || 0) + 1) }))
              ))}
            </>
          )}
        </div>

        {/* Footer: subtotal + botón */}
        <div className="px-3 pb-4 pt-2 border-t shrink-0" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {hasAny ? `${payingLocal.length + payingRemote.length} ítem${payingLocal.length + payingRemote.length !== 1 ? "s" : ""}` : "Sin selección"}
            </span>
            <span className="font-mono font-bold text-base" style={{ color: hasAny ? "var(--brand)" : "var(--text-muted)" }}>
              {formatCOP(subtotal)}
            </span>
          </div>
          <button type="button"
            onClick={() => hasAny && onConfirm({ payingLocal, payingRemote, subtotal })}
            className="w-full rounded-xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] select-none"
            style={{
              height: "2.75rem", fontSize: "0.95rem",
              background: hasAny ? "var(--brand)" : "var(--bg-tertiary)",
              border: `1.5px solid ${hasAny ? "var(--brand)" : "var(--border)"}`,
              color: hasAny ? "white" : "var(--text-muted)",
            }}>
            <CreditCard size={16} />
            {hasAny ? `Cobrar ${formatCOP(subtotal)}` : "Selecciona ítems"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── SaleTabs ──────────────────────────────────────────────
function SaleTabs({ sales, activeId, onSwitch, onNew, onClose, onNewAccount, flashingId }) {
  const genericSales = sales.filter(s => s.type !== "account")
  const accounts     = sales.filter(s => s.type === "account")
  const scrollRef    = useRef(null)
  const [canLeft,  setCanLeft]  = useState(false)
  const [canRight, setCanRight] = useState(false)

  const checkScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener("scroll", checkScroll, { passive: true })
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    return () => { el.removeEventListener("scroll", checkScroll); ro.disconnect() }
  }, [sales.length])

  const scrollBy = (dir) => scrollRef.current?.scrollBy({ left: dir * 160, behavior: "smooth" })

  const renderTab = (sale) => {
    const isActive   = sale.id === activeId
    const isFlashing = sale.id === flashingId
    const isAccount  = sale.type === "account"
    const count = sale.items.reduce((s, i) => s + i.quantity, 0)
    return (
      <div key={sale.id} onClick={() => onSwitch(sale.id)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-t-md cursor-pointer shrink-0 select-none border-t border-l border-r -mb-px transition-all duration-150"
        style={{
          background: isActive ? "var(--bg-primary)" : "var(--bg-tertiary)",
          borderColor: isActive ? "var(--border)" : "transparent",
          borderBottomColor: isActive ? "var(--bg-primary)" : "transparent",
          minWidth: "90px", maxWidth: "150px",
          animation: isFlashing ? "tab-blink 0.75s ease-in-out infinite" : "none",
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
    <div className="relative flex items-center shrink-0 border-b"
      style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>

      {/* Botón scroll izquierda */}
      {canLeft && (
        <button
          onClick={() => scrollBy(-1)}
          className="absolute left-0 z-10 h-full px-1 flex items-center justify-center"
          style={{ background: "linear-gradient(to right, var(--bg-secondary) 60%, transparent)" }}>
          <ChevronLeft size={16} style={{ color: "var(--text-muted)" }} />
        </button>
      )}

      {/* Contenedor scrollable */}
      <div
        ref={scrollRef}
        className="tabs-no-scrollbar flex items-center gap-1 px-2 pt-2 overflow-x-auto flex-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>

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

      {/* Botón scroll derecha */}
      {canRight && (
        <button
          onClick={() => scrollBy(1)}
          className="absolute right-0 z-10 h-full px-1 flex items-center justify-center"
          style={{ background: "linear-gradient(to left, var(--bg-secondary) 60%, transparent)" }}>
          <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
        </button>
      )}
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
// ── Contador de billetes y monedas ───────────────────────
const BILLS = [100000, 50000, 20000, 10000, 5000, 2000]
const COINS = [1000, 500, 200, 100, 50]

function BillCounter({ onChange, storageKey }) {
  const { touchMode } = useUiStore()

  const [counts, setCounts] = useState(() => {
    if (storageKey) {
      try {
        const stored = sessionStorage.getItem(storageKey)
        if (stored) return JSON.parse(stored).counts || Object.fromEntries(BILLS.map(b => [b, 0]))
      } catch {}
    }
    return Object.fromEntries(BILLS.map(b => [b, 0]))
  })

  const [coinCounts, setCoinCounts] = useState(() => {
    if (storageKey) {
      try {
        const stored = sessionStorage.getItem(storageKey)
        if (stored) return JSON.parse(stored).coinCounts || Object.fromEntries(COINS.map(c => [c, 0]))
      } catch {}
    }
    return Object.fromEntries(COINS.map(c => [c, 0]))
  })

  const [numPad, setNumPad] = useState(null) // { denom: number, isCoin: bool }

  const billsTotal = BILLS.reduce((s, b) => s + b * (counts[b] || 0), 0)
  const coinsTotal = COINS.reduce((s, c) => s + c * (coinCounts[c] || 0), 0)
  const total = billsTotal + coinsTotal

  useEffect(() => { onChange(total) }, [total])

  useEffect(() => {
    if (!storageKey) return
    try { sessionStorage.setItem(storageKey, JSON.stringify({ counts, coinCounts })) } catch {}
  }, [counts, coinCounts, storageKey])

  const adjustBill = (bill, delta) =>
    setCounts(prev => ({ ...prev, [bill]: Math.max(0, (prev[bill] || 0) + delta) }))
  const setBillCount = (bill, val) => {
    const n = parseInt(String(val).replace(/\D/g, "")) || 0
    setCounts(prev => ({ ...prev, [bill]: n }))
  }

  const adjustCoin = (coin, delta) =>
    setCoinCounts(prev => ({ ...prev, [coin]: Math.max(0, (prev[coin] || 0) + delta) }))
  const setCoinCount = (coin, val) => {
    const n = parseInt(String(val).replace(/\D/g, "")) || 0
    setCoinCounts(prev => ({ ...prev, [coin]: n }))
  }

  const DenomRow = ({ denom, qty, subtotal, onMinus, onPlus, onInput, onTouchTap, small }) => (
    <div className="flex items-center gap-2 py-1 rounded-lg px-1"
      style={{ background: qty > 0 ? "var(--brand-light)" : "transparent" }}>
      <span className={`font-mono font-semibold text-right shrink-0 ${small ? "w-16 text-xs" : "w-20 text-xs"}`}
        style={{ color: "var(--text-secondary)" }}>
        {formatCOP(denom)}
      </span>
      <button type="button" onClick={onMinus}
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold text-base select-none"
        style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border)" }}>
        −
      </button>
      {touchMode ? (
        <button type="button"
          className="w-12 text-center text-sm font-mono font-bold rounded-lg border select-none"
          style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)", padding: "4px 0" }}
          onClick={onTouchTap}>
          {qty || "0"}
        </button>
      ) : (
        <input
          type="text" inputMode="numeric"
          className="w-12 text-center text-sm font-mono font-bold rounded-lg border"
          style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)", padding: "4px 0" }}
          value={qty || ""}
          placeholder="0"
          onChange={e => onInput(e.target.value)}
          onFocus={e => e.target.select()}
        />
      )}
      <button type="button" onClick={onPlus}
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold text-base select-none"
        style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border)" }}>
        +
      </button>
      <span className="text-xs font-mono ml-auto shrink-0"
        style={{ color: qty > 0 ? "var(--brand)" : "var(--text-muted)" }}>
        {qty > 0 ? formatCOP(subtotal) : "—"}
      </span>
    </div>
  )

  return (
    <div className="space-y-1">
      {/* Billetes */}
      {BILLS.map(bill => (
        <DenomRow
          key={bill}
          denom={bill}
          qty={counts[bill] || 0}
          subtotal={bill * (counts[bill] || 0)}
          onMinus={() => adjustBill(bill, -1)}
          onPlus={() => adjustBill(bill, 1)}
          onInput={v => setBillCount(bill, v)}
          onTouchTap={() => setNumPad({ denom: bill, isCoin: false })}
        />
      ))}

      {/* Monedas */}
      <div className="pt-2 mt-1 border-t space-y-1" style={{ borderColor: "var(--border)" }}>
        <p className="text-xs font-bold uppercase tracking-widest px-1 pb-0.5" style={{ color: "var(--text-muted)" }}>
          Monedas
        </p>
        {COINS.map(coin => (
          <DenomRow
            key={coin}
            denom={coin}
            qty={coinCounts[coin] || 0}
            subtotal={coin * (coinCounts[coin] || 0)}
            onMinus={() => adjustCoin(coin, -1)}
            onPlus={() => adjustCoin(coin, 1)}
            onInput={v => setCoinCount(coin, v)}
            onTouchTap={() => setNumPad({ denom: coin, isCoin: true })}
            small
          />
        ))}
      </div>

      {/* NumPad touch */}
      {numPad && (
        <NumPad
          mode="quantity"
          minValue={0}
          initialValue={numPad.isCoin ? (coinCounts[numPad.denom] || 0) : (counts[numPad.denom] || 0)}
          label={formatCOP(numPad.denom)}
          subtitle={`Subtotal: ${formatCOP(numPad.denom * (numPad.isCoin ? (coinCounts[numPad.denom] || 0) : (counts[numPad.denom] || 0)))}`}
          onConfirm={(val) => {
            if (numPad.isCoin) setCoinCount(numPad.denom, val)
            else setBillCount(numPad.denom, val)
            setNumPad(null)
          }}
          onClose={() => setNumPad(null)}
        />
      )}

      {/* Total */}
      <div className="flex items-center justify-between pt-3 mt-1 border-t" style={{ borderColor: "var(--border)" }}>
        <span className="text-sm font-bold" style={{ color: "var(--text-secondary)" }}>Total en caja</span>
        <span className="font-mono font-bold text-2xl" style={{ color: "var(--brand)" }}>{formatCOP(total)}</span>
      </div>
    </div>
  )
}

// ── Pantalla apertura de turno ────────────────────────────
function OpenShiftScreen({ onOpen, loading }) {
  const [total, setTotal] = useState(0)
  const { user } = useAuthStore()

  return (
    <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
      <div className="card p-6 w-full max-w-sm animate-slide-up space-y-5">
        <div className="text-center space-y-1">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "var(--brand-light)" }}>
            <LogIn size={28} style={{ color: "var(--brand)" }} />
          </div>
          <h2 className="font-display font-bold text-xl" style={{ color: "var(--text-primary)" }}>Abrir turno</h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Hola, <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{user?.name}</span>
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
            Cuenta el efectivo inicial
          </p>
          <BillCounter onChange={setTotal} storageKey="aukani-open-shift" />
        </div>
        <button
          type="button"
          onClick={() => { if (total >= 0) onOpen(total) }}
          disabled={loading}
          className="btn-primary btn-lg w-full">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
          Abrir turno
        </button>
      </div>
    </div>
  )
}

// ── Modal cierre de turno ─────────────────────────────────
// Tipografía numérica: DM Sans + tabular-nums (sin JetBrains Mono que confunde 0/8)
const NUM = { fontFamily: "'DM Sans', sans-serif", fontVariantNumeric: "tabular-nums" }

function CloseShiftModal({ shift, onClose, onConfirm, loading }) {
  const [closingCash, setClosingCash] = useState(0)
  const [notes, setNotes] = useState("")

  const cashPayment = shift?.shiftPayments?.find(p => p.paymentMethod?.name === "Efectivo")
  const cashSales = Number(cashPayment?.total || 0)
  const openingCash = Number(shift?.openingCash || 0)
  const cashExpenses = (shift?.expenses || [])
    .filter(e => e.paymentMethod?.name === "Efectivo")
    .reduce((s, e) => s + Number(e.amount), 0)
  const totalExpenses = (shift?.expenses || []).reduce((s, e) => s + Number(e.amount), 0)
  const expectedCash = openingCash + cashSales - cashExpenses
  const difference = closingCash > 0 ? closingCash - expectedCash : null
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

        {/* ── Egresos ── */}
        {totalExpenses > 0 && (
          <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
              Egresos del turno
            </p>
            <div className="space-y-1.5">
              {shift.expenses.map(e => (
                <div key={e.id} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{e.concept}</span>
                    <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>· {e.paymentMethod?.name}</span>
                  </div>
                  <span className="text-sm font-bold shrink-0 ml-3" style={{ color: "var(--danger)", ...NUM }}>
                    −{formatCOP(e.amount)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                <span className="text-sm font-bold" style={{ color: "var(--danger)" }}>Total egresos</span>
                <span className="text-base font-bold" style={{ color: "var(--danger)", ...NUM }}>−{formatCOP(totalExpenses)}</span>
              </div>
            </div>
          </div>
        )}

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
                {cashExpenses > 0 && (
                  <> {" − "}
                    <span style={{ color: "var(--danger)" }}>{formatCOP(cashExpenses)}</span>
                    {" egresos"}
                  </>
                )}
              </p>
            </div>
            <p className="text-xl font-bold" style={{ color: "var(--brand)", ...NUM }}>
              {formatCOP(expectedCash)}
            </p>
          </div>
        </div>

        {/* ── Formulario ── */}
        <form onSubmit={e => {
          e.preventDefault()
          const isNegative = difference !== null && difference < -0.01
          if (isNegative && !notes.trim()) {
            toast.error("Debes explicar el faltante en las notas")
            return
          }
          onConfirm({ closingCash, notes })
        }} className="px-6 py-4 space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-secondary)" }}>
              Conteo de efectivo en caja
            </label>
            <BillCounter onChange={(val) => setClosingCash(val)} />
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

          {/* Aviso cuando hay faltante */}
          {difference !== null && difference < -0.01 && (
            <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 animate-fade-in"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid var(--danger)" }}>
              <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: "var(--danger)" }} />
              <p className="text-xs font-medium" style={{ color: "var(--danger)" }}>
                Hay un faltante de {formatCOP(Math.abs(difference))}. Debes explicar el motivo en las notas para poder cerrar el turno.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-1.5"
              style={{ color: difference !== null && difference < -0.01 ? "var(--danger)" : "var(--text-secondary)" }}>
              Notas{difference !== null && difference < -0.01 ? " *" : ""}
            </label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder={difference !== null && difference < -0.01
                ? "Obligatorio: explica el motivo del faltante..."
                : "Observaciones del turno..."}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={difference !== null && difference < -0.01 && !notes.trim()
                ? { borderColor: "var(--danger)" }
                : {}}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-outline btn-md flex-1">Cancelar</button>
            <button type="submit" disabled={loading}
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
  const [confirmCloseAccount, setConfirmCloseAccount] = useState(null)
  const [payments, setPayments] = useState([])
  const [numPad, setNumPad] = useState(null) // { id, value, label }
  const [priceEdit, setPriceEdit] = useState(null) // item being price-edited
  const [showPartialPay, setShowPartialPay] = useState(false)
  const [partialSelection, setPartialSelection] = useState(null) // { payingLocal, payingRemote } | null
  const partialPayCtxRef = useRef(null)
  const { touchMode } = useUiStore()
  const { user } = useAuthStore()
  const searchRef = useRef(null)
  const qc = useQueryClient()

  const navigate = useNavigate()
  const { sales, activeId, shiftId, flashingTabId, resetForNewShift, newSale, newAccount, switchSale, closeSale, closeSaleAndNew, clearFlashingTab, addItem, removeItem, updateQuantity, updateItemPrice, clearActive, getActive, getTotal, setAccountBackendId, updateAccountRemoteItems } = useCartStore()
  const active = getActive()
  const items = active?.items || []
  const remoteItems = active?.type === "account" ? (active?.remoteItems || []) : []
  const isAccount = active?.type === "account"

  const payingLocalItems = (isAccount && partialSelection) ? partialSelection.payingLocal : items
  const payingRemoteItems = (isAccount && partialSelection) ? partialSelection.payingRemote : remoteItems
  const willBeFullyPaid = !isAccount || !partialSelection
  const clearPartial = () => { setPartialSelection(null); setShowPartialPay(false) }

  const total = payingLocalItems.reduce((s, i) => s + Number(i.price) * i.quantity, 0)
              + payingRemoteItems.reduce((s, i) => s + Number(i.price) * i.quantity, 0)
  const openAccounts = sales.filter(s => s.type === "account")

  // Turno
  const { data: shift, isLoading: shiftLoading, refetch: refetchShift } = useQuery({
    queryKey: ["shift-active"],
    queryFn: shiftsService.getActive,
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: 60_000,
  })
  const canCloseShift = user?.role === "ADMIN" || user?.role === "JEFE" || shift?.userId === user?.id
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
        addedByUserId: i.addedBy?.id ?? null,
        addedByName: i.addedBy?.name ?? null,
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
    placeholderData: keepPreviousData,
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

  // Limpiar el parpadeo cuando el usuario agrega un producto o escribe en la búsqueda
  useEffect(() => {
    if (flashingTabId && (items.length > 0 || query.length > 0)) clearFlashingTab()
  }, [items.length, query])

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") { setQuery(""); setShowPayment(false); searchRef.current?.focus() } }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [])

  // Abrir turno
  const openShift = useMutation({
    mutationFn: (cash) => shiftsService.open(cash),
    onSuccess: (data) => {
      sessionStorage.removeItem("aukani-open-shift")
      resetForNewShift(data.id)
      qc.setQueryData(["shift-active"], { ...data, shiftPayments: [], expenses: [], _count: { orders: 0 } })
      qc.invalidateQueries({ queryKey: ["shift-active"] })
      toast.success("Turno abierto")
    },
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
      qc.removeQueries({ queryKey: ["shift-active"] })
      qc.invalidateQueries({ queryKey: ["shift-active"] })
      toast.success("Turno cerrado correctamente")
    },
    onError: (e) => {
      const msg = e.response?.data?.error || ""
      if (e.response?.status === 409 && msg.includes("cerrado")) {
        // El turno ya estaba cerrado — limpiar UI igual que en onSuccess
        useCartStore.setState({ shiftId: null })
        setShowCloseShift(false)
        setShowPayment(false)
        qc.removeQueries({ queryKey: ["shift-active"] })
        qc.invalidateQueries({ queryKey: ["shift-active"] })
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
      qc.invalidateQueries({ queryKey: ["products-all"] })
    },
    onError: e => toast.error(e.response?.data?.error || "Error al cerrar cuenta"),
  })

  const invalidateAccount = () => {
    qc.invalidateQueries({ queryKey: ["accounts-shift", shift?.id] })
    qc.invalidateQueries({ queryKey: ["products-all"] })
  }

  // Agregar +1 producto a cuenta (desde tarjeta de producto)
  const { mutate: incrementAccountItem } = useMutation({
    mutationFn: ({ accountBackendId, productId, price }) =>
      accountsService.addItem(accountBackendId, { productId, price }),
    onSuccess: invalidateAccount,
    onError: e => toast.error(e.response?.data?.error || "Sin stock disponible"),
  })

  // Actualizar cantidad o precio de AccountItem
  const { mutate: updateAccountItem, isPending: isUpdatingAccount, variables: updatingVars } = useMutation({
    mutationFn: ({ accountBackendId, accountItemId, ...body }) =>
      accountsService.updateItem(accountBackendId, accountItemId, body),
    onSuccess: invalidateAccount,
    onError: e => toast.error(e.response?.data?.error || "Error al actualizar item"),
  })

  // Eliminar item completo de cuenta
  const { mutate: removeAccountItem, isPending: isRemovingAccount, variables: removingVars } = useMutation({
    mutationFn: ({ accountBackendId, accountItemId }) => accountsService.removeItem(accountBackendId, accountItemId),
    onSuccess: invalidateAccount,
    onError: e => toast.error(e.response?.data?.error || "Error al eliminar item"),
  })

  // Venta
  const { mutate: createSale, isPending: selling } = useMutation({
    mutationFn: ordersService.createSale,
    onSuccess: (data) => {
      const change = data.change || 0
      toast.success(`✅ Venta registrada${change > 0 ? ` · Cambio: ${formatCOP(change)}` : ""}`)
      const ctx = partialPayCtxRef.current
      partialPayCtxRef.current = null
      if (!ctx || ctx.willBeFullyPaid) {
        if (ctx?.capturedBackendId) {
          qc.setQueryData(["accounts-shift", shift?.id], (old = []) =>
            (old || []).filter(a => a.id !== ctx.capturedBackendId)
          )
        }
        closeSaleAndNew(ctx?.capturedActiveId ?? activeId)
      } else {
        // Pago parcial: reducir cantidades locales pagadas
        ctx.localItemsContext.forEach(({ id, paidQty, totalQty }) => {
          const remaining = totalQty - paidQty
          if (remaining <= 0) removeItem(id)
          else updateQuantity(id, remaining)
        })
        clearPartial()
      }
      setShowPayment(false)
      qc.invalidateQueries({ queryKey: ["products-all"] })
      qc.invalidateQueries({ queryKey: ["shift-active"] })
      qc.invalidateQueries({ queryKey: ["accounts-shift", shift?.id] })
    },
    onError: e => toast.error(e.response?.data?.error || "Error al registrar venta"),
  })

  const handleAddToCart = (product) => {
    if (product.type !== "SERVICE") {
      // Calcula cuánto hay ya comprometido entre carrito local + remoteItems de esta pestaña
      const inLocal  = items.find(i => i.id === product.id)?.quantity || 0
      const inRemote = remoteItems.find(i => i.id === product.id)?.quantity || 0
      const available = product.stock - inLocal - inRemote
      if (available <= 0) {
        toast.error("Sin stock disponible")
        return
      }
    }

    // En pestañas de cuenta: registrar inmediatamente en backend (descuenta stock al instante)
    if (isAccount && active?.backendId) {
      incrementAccountItem({ accountBackendId: active.backendId, productId: product.id, price: product.price })
      return
    }

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
    if (payingLocalItems.length === 0 && payingRemoteItems.length === 0) return
    const paid = payments.reduce((s, p) => s + (p.amount || 0), 0)
    if (paid < total) { toast.error(`Falta ${formatCOP(total - paid)} por pagar`); return }
    const allItems = [
      ...payingLocalItems.map(i => ({
        productId: i.id,
        quantity: i.quantity,
        ...(i.originalPrice != null && { customPrice: i.price }),
        ...(i.priceNote && { priceNote: i.priceNote }),
      })),
      ...payingRemoteItems.map(i => ({ productId: i.id, quantity: i.quantity, alreadyDecremented: true, customPrice: i.price, addedByUserId: i.addedByUserId ?? null })),
    ]
    const accountItemUpdates = payingRemoteItems
      .filter(i => i.accountItemId)
      .map(i => ({ id: i.accountItemId, quantityPaid: i.quantity }))
    partialPayCtxRef.current = {
      capturedActiveId: activeId,
      capturedBackendId: isAccount ? active?.backendId : null,
      localItemsContext: payingLocalItems.map(pi => {
        const orig = items.find(i => i.id === pi.id)
        return { id: pi.id, paidQty: pi.quantity, totalQty: orig?.quantity || pi.quantity }
      }),
      willBeFullyPaid,
    }
    createSale({
      shiftId,
      items: allItems,
      payments: payments.filter(p => (p.amount || 0) > 0).map(p => ({ paymentMethodId: p.paymentMethodId, amount: p.amount })),
      ...(active?.type === "account" && active?.backendId && {
        accountId: active.backendId,
        accountItemUpdates,
        closeAccount: willBeFullyPaid,
      }),
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
        sales={sales} activeId={activeId} flashingId={flashingTabId}
        onSwitch={(id) => { switchSale(id); setShowPayment(false); setQuery(""); clearPartial(); clearFlashingTab() }}
        onNew={() => { newSale(); setShowPayment(false); setQuery(""); clearFlashingTab() }}
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

            {canCloseShift && (
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
            )}
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
                {/* Items locales — solo en ventas genéricas (no cuentas) */}
                {!isAccount && items.length > 0 && (
                  <>
                    <div className="flex justify-end py-1">
                      <button onClick={clearActive} className="text-xs btn-ghost px-2 py-0.5 rounded" style={{ color: "var(--danger)" }}>Limpiar</button>
                    </div>
                    {items.map(item => {
                      const cartProduct = allProducts.find(p => p.id === item.id)
                      return (
                        <CartItem key={item.id} item={item} onUpdate={updateQuantity} onRemove={removeItem}
                          onEditQty={touchMode ? (id, val, name) => setNumPad({ id, value: val, label: name }) : undefined}
                          onEditPrice={(it) => setPriceEdit(it)}
                          maxQty={cartProduct?.type !== "SERVICE" ? cartProduct?.stock : undefined}
                        />
                      )
                    })}
                  </>
                )}
                {/* Items de cuenta — mismo CartItem que ventas normales, callbacks apuntan al backend */}
                {isAccount && remoteItems.map(item => {
                  const availableStock = allProducts.find(p => p.id === item.id)?.stock ?? 0
                  const isBusy = (isUpdatingAccount && updatingVars?.accountItemId === item.accountItemId) ||
                                 (isRemovingAccount && removingVars?.accountItemId === item.accountItemId)
                  return (
                    <CartItem
                      key={item.accountItemId ?? item.id}
                      item={{ ...item, _busy: isBusy }}
                      maxQty={item.quantity + availableStock}
                      onUpdate={(id, newQty) => {
                        const ri = remoteItems.find(i => i.id === id)
                        if (ri?.accountItemId) updateAccountItem({ accountBackendId: active.backendId, accountItemId: ri.accountItemId, quantity: newQty })
                      }}
                      onRemove={(id) => {
                        const ri = remoteItems.find(i => i.id === id)
                        if (ri?.accountItemId) removeAccountItem({ accountBackendId: active.backendId, accountItemId: ri.accountItemId })
                      }}
                      onEditQty={touchMode ? (id, val, name) => {
                        const ri = remoteItems.find(i => i.id === id)
                        setNumPad({ id, value: val, label: name,
                          onConfirm: ri?.accountItemId ? (newQty) => updateAccountItem({ accountBackendId: active.backendId, accountItemId: ri.accountItemId, quantity: newQty }) : null,
                        })
                      } : undefined}
                      onEditPrice={(it) => {
                        const ri = remoteItems.find(i => i.id === it.id)
                        setPriceEdit({ ...it,
                          _onConfirm: ri?.accountItemId ? (newPrice) => updateAccountItem({ accountBackendId: active.backendId, accountItemId: ri.accountItemId, price: newPrice }) : null,
                        })
                      }}
                    />
                  )
                })}
              </>
            )}
          </div>

          <div className="p-4 border-t space-y-3" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                  {isAccount && partialSelection ? "Pago parcial" : "Total"}
                </span>
                {isAccount && partialSelection && (
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {partialSelection.payingLocal.length + partialSelection.payingRemote.length} ítem{(partialSelection.payingLocal.length + partialSelection.payingRemote.length) !== 1 ? "s" : ""} seleccionados
                  </p>
                )}
              </div>
              <span className="font-display font-bold text-2xl font-mono" style={{ color: "var(--text-primary)" }}>{formatCOP(total)}</span>
            </div>

            {!showPayment ? (
              <div className="space-y-2">
                <button onClick={() => setShowPayment(true)}
                  disabled={payingLocalItems.length === 0 && payingRemoteItems.length === 0}
                  className="btn-primary btn-lg w-full">
                  <CreditCard size={17} />
                  {isAccount && partialSelection ? "Cobrar selección" : "Cobrar"}
                </button>
                {isAccount && (items.length > 0 || remoteItems.length > 0) && (
                  partialSelection ? (
                    <button type="button" onClick={clearPartial}
                      className="w-full text-xs font-semibold py-1.5 rounded-lg transition-all active:scale-[0.98]"
                      style={{ color: "var(--danger)", border: "1px solid var(--danger)", background: "var(--danger-light)" }}>
                      Cancelar selección parcial
                    </button>
                  ) : (
                    <button type="button" onClick={() => setShowPartialPay(true)}
                      className="w-full text-sm font-semibold py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                      style={{ color: "white", border: "none", background: "var(--warning)" }}>
                      <CreditCard size={14} />
                      Dividir cuenta
                    </button>
                  )
                )}
              </div>
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

      {numPad && (
        <NumPad
          initialValue={numPad.value}
          label={numPad.label}
          onConfirm={(val) => {
            if (numPad.onConfirm) numPad.onConfirm(val)
            else updateQuantity(numPad.id, val)
            setNumPad(null)
          }}
          onClose={() => setNumPad(null)}
        />
      )}

      {priceEdit && (
        <PriceEditModal
          item={priceEdit}
          onConfirm={(newPrice, note) => {
            if (priceEdit._onConfirm) priceEdit._onConfirm(newPrice, note)
            else updateItemPrice(priceEdit.id, newPrice, note)
            setPriceEdit(null)
          }}
          onClose={() => setPriceEdit(null)}
        />
      )}

      {showPartialPay && (
        <PartialPayModal
          items={items}
          remoteItems={remoteItems}
          onConfirm={({ payingLocal, payingRemote }) => {
            setPartialSelection({ payingLocal, payingRemote })
            setShowPartialPay(false)
            setShowPayment(true)
          }}
          onClose={() => setShowPartialPay(false)}
        />
      )}
    </div>
  )
}