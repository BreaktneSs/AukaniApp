import { useState, useRef, useEffect } from "react"
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { purchasesService } from "@/services/purchases.service"
import { productsService }  from "@/services/products.service"
import { formatCOP }        from "@/utils/currency"
import { useUiStore }       from "@/store/ui.store"
import NumPad               from "@/components/ui/NumPad"
import {
  Search, X, Plus, Minus, Trash2, ShoppingBag,
  Loader2, Package, ChevronDown, ChevronUp, FileText,
  Calendar, DollarSign, RotateCcw, AlertTriangle,
} from "lucide-react"
import toast from "react-hot-toast"

// ── Helpers ───────────────────────────────────────────────
function getReturnStatus(purchase) {
  const byProduct = {}
  for (const ret of purchase.returns ?? []) {
    for (const ri of ret.items) {
      byProduct[ri.productId] = (byProduct[ri.productId] || 0) + ri.quantity
    }
  }
  const hasReturns   = (purchase.returns?.length ?? 0) > 0
  const isFullReturn = hasReturns && purchase.items.every(
    i => (byProduct[i.productId] || 0) >= i.quantity
  )
  return { byProduct, hasReturns, isFullReturn }
}

// ── Fila de producto en la factura de compra ──────────────
function InvoiceRow({ item, onQty, onCost, onRemove, touchMode, onOpenNumPad }) {
  const lineTotal = item.quantity * Number(item.unitCost)
  const [rawCost, setRawCost] = useState(String(Math.round(Number(item.unitCost))))

  useEffect(() => {
    setRawCost(String(Math.round(Number(item.unitCost))))
  }, [item.unitCost])

  const commitCost = () => {
    const val = Number(rawCost.replace(/\./g, "").replace(",", "."))
    if (!isNaN(val) && val >= 0) onCost(item.productId, val)
    else setRawCost(String(Math.round(Number(item.unitCost))))
  }

  return (
    <tr className="border-b" style={{ borderColor: "var(--border)" }}>
      <td className="py-2 pr-3">
        <p className="text-sm font-medium leading-tight" style={{ color: "var(--text-primary)" }}>{item.name}</p>
        {item.prevCost != null && Number(item.prevCost) > 0 && (
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Anterior: {formatCOP(Number(item.prevCost))}
          </p>
        )}
      </td>

      {/* Cantidad */}
      <td className="py-2 px-2 text-center" style={{ whiteSpace: "nowrap" }}>
        <div className="flex items-center gap-1 justify-center">
          <button onClick={() => onQty(item.productId, item.quantity - 1)}
            className="w-6 h-6 rounded flex items-center justify-center btn-ghost"
            style={{ color: "var(--text-secondary)" }}><Minus size={11} /></button>
          {touchMode ? (
            <button
              className="w-8 text-center text-sm font-mono font-bold rounded-lg border select-none"
              style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)", padding: "3px 0" }}
              onClick={() => onOpenNumPad("qty", item.productId, item.quantity, item.name)}>
              {item.quantity}
            </button>
          ) : (
            <span className="w-6 text-center text-sm font-mono font-semibold"
              style={{ color: "var(--text-primary)" }}>{item.quantity}</span>
          )}
          <button onClick={() => onQty(item.productId, item.quantity + 1)}
            className="w-6 h-6 rounded flex items-center justify-center btn-ghost"
            style={{ color: "var(--text-secondary)" }}><Plus size={11} /></button>
        </div>
      </td>

      {/* Costo */}
      <td className="py-2 px-2" style={{ whiteSpace: "nowrap" }}>
        {touchMode ? (
          <button
            className="rounded-md text-xs font-mono font-semibold text-right px-2 py-1.5 select-none"
            style={{ width: "96px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            onClick={() => onOpenNumPad("cost", item.productId, Math.round(Number(item.unitCost)), item.name)}>
            $ {String(Math.round(Number(item.unitCost))).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
          </button>
        ) : (
          <div className="relative" style={{ width: "96px" }}>
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-mono"
              style={{ color: "var(--text-muted)" }}>$</span>
            <input
              type="text" inputMode="numeric"
              className="w-full rounded-md text-xs font-mono font-semibold text-right pr-2 py-1.5 outline-none"
              style={{ paddingLeft: "16px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              value={rawCost}
              onChange={e => setRawCost(e.target.value)}
              onBlur={commitCost}
              onKeyDown={e => e.key === "Enter" && commitCost()}
            />
          </div>
        )}
      </td>

      <td className="py-2 pl-2 text-right" style={{ whiteSpace: "nowrap" }}>
        <span className="text-sm font-mono font-bold" style={{ color: "var(--brand)" }}>{formatCOP(lineTotal)}</span>
      </td>
      <td className="py-2 pl-2 text-right" style={{ whiteSpace: "nowrap" }}>
        <button onClick={() => onRemove(item.productId)}
          className="w-6 h-6 rounded flex items-center justify-center btn-ghost"
          style={{ color: "var(--danger)" }}><Trash2 size={13} /></button>
      </td>
    </tr>
  )
}

// ── Modal nueva compra ─────────────────────────────────────
function PurchaseModal({ open, onClose, allProducts, onSuccess }) {
  const qc = useQueryClient()
  const { touchMode } = useUiStore()
  const [query, setQuery]         = useState("")
  const [invoiceItems, setInvoiceItems] = useState([])
  const [notes, setNotes]         = useState("")
  const [numPad, setNumPad]       = useState(null) // { field: "qty"|"cost", productId, value, label }
  const searchRef = useRef(null)

  useEffect(() => {
    if (open) {
      setQuery(""); setInvoiceItems([]); setNotes("")
      setTimeout(() => searchRef.current?.focus(), 80)
    }
  }, [open])

  const { mutate: createPurchase, isPending: saving } = useMutation({
    mutationFn: purchasesService.create,
    onSuccess: () => {
      toast.success("Compra registrada")
      qc.invalidateQueries({ queryKey: ["purchases"] })
      qc.invalidateQueries({ queryKey: ["products-all"] })
      onSuccess()
      onClose()
    },
    onError: e => toast.error(e.response?.data?.error || "Error al registrar compra"),
  })

  const q = query.trim().toLowerCase()
  const searchResults = q.length < 1 ? [] : allProducts.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.barcode?.toLowerCase().includes(q) ||
    p.sku?.toLowerCase().includes(q)
  ).slice(0, 8)

  const addProduct = (product) => {
    setInvoiceItems(prev => {
      const exists = prev.find(i => i.productId === product.id)
      if (exists) return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { productId: product.id, name: product.name, quantity: 1, unitCost: Number(product.cost ?? 0), prevCost: product.cost }]
    })
    setQuery("")
    searchRef.current?.focus()
  }

  const updateQty  = (id, qty) => {
    if (qty <= 0) return setInvoiceItems(prev => prev.filter(i => i.productId !== id))
    setInvoiceItems(prev => prev.map(i => i.productId === id ? { ...i, quantity: qty } : i))
  }
  const updateCost = (id, cost) => setInvoiceItems(prev => prev.map(i => i.productId === id ? { ...i, unitCost: cost } : i))
  const removeItem = (id) => setInvoiceItems(prev => prev.filter(i => i.productId !== id))
  const grandTotal = invoiceItems.reduce((s, i) => s + i.quantity * Number(i.unitCost), 0)

  const handleNumPadConfirm = (val) => {
    if (!numPad) return
    if (numPad.field === "qty")  updateQty(numPad.productId, val)
    if (numPad.field === "cost") updateCost(numPad.productId, val)
    setNumPad(null)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
      <div className="flex flex-col rounded-2xl shadow-2xl overflow-hidden w-full"
        style={{ maxWidth: "660px", maxHeight: "90vh", background: "var(--bg-primary)", border: "1px solid var(--border)" }}>

        <div className="flex items-center gap-3 px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--brand-light)" }}>
            <ShoppingBag size={16} style={{ color: "var(--brand)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-display font-bold" style={{ color: "var(--text-primary)" }}>Nueva compra</h2>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Registra la entrada de productos al inventario</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center btn-ghost shrink-0"
            style={{ color: "var(--text-muted)" }}><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="space-y-1">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
              <input ref={searchRef} type="text" className="input pl-9 pr-9 py-2.5"
                placeholder="Buscar producto por nombre, código de barras o SKU..."
                value={query} onChange={e => setQuery(e.target.value)} />
              {query && (
                <button onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 btn-ghost w-5 h-5 rounded"><X size={13} /></button>
              )}
            </div>
            {searchResults.length > 0 && (
              <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                {searchResults.map(p => (
                  <button key={p.id} onClick={() => addProduct(p)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left border-b last:border-b-0 hover:opacity-80"
                    style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{p.name}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        Stock: {p.stock} · Costo actual: {p.cost ? formatCOP(Number(p.cost)) : "—"}
                      </p>
                    </div>
                    <Plus size={14} style={{ color: "var(--brand)" }} />
                  </button>
                ))}
              </div>
            )}
            {q.length >= 1 && searchResults.length === 0 && (
              <p className="text-xs text-center py-2" style={{ color: "var(--text-muted)" }}>Sin resultados para "{query}"</p>
            )}
          </div>

          {invoiceItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl py-10"
              style={{ background: "var(--bg-tertiary)" }}>
              <Package size={28} style={{ color: "var(--border)" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Busca productos para agregar a la factura</p>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
              <table className="w-full border-collapse" style={{ background: "var(--bg-secondary)" }}>
                <thead>
                  <tr style={{ background: "var(--bg-tertiary)" }}>
                    {[
                      { label: "Descripción", align: "left"   },
                      { label: "Cant.",        align: "center" },
                      { label: "Costo unit.",  align: "right"  },
                      { label: "Total",        align: "right"  },
                      { label: "",             align: "right"  },
                    ].map(h => (
                      <th key={h.label} className={`px-3 py-2 text-xs font-semibold border-b text-${h.align}`}
                        style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>{h.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoiceItems.map(item => (
                    <InvoiceRow
                      key={item.productId} item={item}
                      onQty={updateQty} onCost={updateCost} onRemove={removeItem}
                      touchMode={touchMode}
                      onOpenNumPad={(field, productId, value, label) => setNumPad({ field, productId, value, label })}
                    />
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "var(--bg-tertiary)" }}>
                    <td colSpan={3} className="px-3 py-2.5 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Total compra</td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-base" style={{ color: "var(--brand)" }}>{formatCOP(grandTotal)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <input type="text" className="input text-sm"
            placeholder="Notas (opcional): proveedor, # factura, etc."
            value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <div className="px-5 py-4 border-t shrink-0 flex gap-3" style={{ borderColor: "var(--border)" }}>
          <button onClick={onClose} className="btn-outline btn-md flex-1">Cancelar</button>
          <button onClick={() => {
            if (invoiceItems.length === 0) return toast.error("Agrega al menos un producto")
            createPurchase({
              items: invoiceItems.map(i => ({ productId: i.productId, quantity: i.quantity, unitCost: i.unitCost })),
              notes: notes.trim() || undefined,
            })
          }} disabled={saving || invoiceItems.length === 0} className="btn-primary btn-md flex-1">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <ShoppingBag size={15} />}
            {saving ? "Registrando..." : `Registrar · ${formatCOP(grandTotal)}`}
          </button>
        </div>
      </div>

      {numPad && (
        <NumPad
          mode={numPad.field === "cost" ? "currency" : "quantity"}
          initialValue={numPad.value}
          label={numPad.label}
          subtitle={numPad.field === "cost" ? "Costo unitario" : "Cantidad"}
          minValue={numPad.field === "cost" ? 0 : 1}
          onConfirm={handleNumPadConfirm}
          onClose={() => setNumPad(null)}
        />
      )}
    </div>
  )
}

// ── Modal de devolución ───────────────────────────────────
function ReturnModal({ purchase, onClose, onSuccess }) {
  const qc = useQueryClient()
  const { touchMode } = useUiStore()
  const [qtys, setQtys]   = useState({})
  const [notes, setNotes] = useState("")
  const [numPad, setNumPad] = useState(null) // { productId, max }

  const { byProduct } = getReturnStatus(purchase)

  const rows = purchase.items.map(item => {
    const alreadyReturned = byProduct[item.productId] || 0
    const maxReturnable   = item.quantity - alreadyReturned
    const qty = qtys[item.productId] ?? 0
    return { ...item, alreadyReturned, maxReturnable, qty }
  }).filter(r => r.maxReturnable > 0)

  const setQty = (productId, val) => {
    const row = rows.find(r => r.productId === productId)
    const v   = Math.max(0, Math.min(row.maxReturnable, Number(val) || 0))
    setQtys(prev => ({ ...prev, [productId]: v }))
  }

  const returnItems = rows.filter(r => (qtys[r.productId] ?? 0) > 0).map(r => ({
    productId: r.productId,
    quantity:  qtys[r.productId],
  }))

  const returnTotal = rows.reduce((s, r) => {
    const qty = qtys[r.productId] ?? 0
    return s + qty * Number(r.unitCost)
  }, 0)

  const { mutate: createReturn, isPending: saving } = useMutation({
    mutationFn: () => purchasesService.createReturn(purchase.id, { items: returnItems, notes: notes.trim() }),
    onSuccess: () => {
      toast.success("Devolución registrada")
      qc.invalidateQueries({ queryKey: ["purchases"] })
      qc.invalidateQueries({ queryKey: ["products-all"] })
      onSuccess()
      onClose()
    },
    onError: e => toast.error(e.response?.data?.error || "Error al registrar devolución"),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}>
      <div className="flex flex-col rounded-2xl shadow-2xl overflow-hidden w-full"
        style={{ maxWidth: "580px", maxHeight: "88vh", background: "var(--bg-primary)", border: "1px solid var(--border)" }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "rgba(239,68,68,0.12)" }}>
            <RotateCcw size={16} style={{ color: "#ef4444" }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-display font-bold" style={{ color: "var(--text-primary)" }}>
              Devolución — Compra #{purchase.id}
            </h2>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Selecciona los productos y cantidades a devolver
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center btn-ghost shrink-0"
            style={{ color: "var(--text-muted)" }}><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
            <table className="w-full border-collapse" style={{ background: "var(--bg-secondary)" }}>
              <thead>
                <tr style={{ background: "var(--bg-tertiary)" }}>
                  <th className="px-3 py-2 text-left text-xs font-semibold border-b"
                    style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>Producto</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold border-b"
                    style={{ borderColor: "var(--border)", color: "var(--text-muted)", width: "72px" }}>Comprado</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold border-b"
                    style={{ borderColor: "var(--border)", color: "var(--text-muted)", width: "72px" }}>Devuelto</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold border-b"
                    style={{ borderColor: "var(--border)", color: "var(--text-muted)", width: "100px" }}>A devolver</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold border-b"
                    style={{ borderColor: "var(--border)", color: "var(--text-muted)", width: "100px" }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const qty = qtys[row.productId] ?? 0
                  const sub = qty * Number(row.unitCost)
                  return (
                    <tr key={row.productId} className="border-b"
                      style={{ borderColor: "var(--border)", background: idx % 2 === 0 ? "var(--bg-secondary)" : "var(--bg-tertiary)" }}>
                      <td className="px-3 py-2.5">
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{row.product.name}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{formatCOP(Number(row.unitCost))}/u</p>
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono text-sm"
                        style={{ color: "var(--text-secondary)" }}>{row.quantity}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-sm"
                        style={{ color: row.alreadyReturned > 0 ? "#ef4444" : "var(--text-muted)" }}>
                        {row.alreadyReturned > 0 ? row.alreadyReturned : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center gap-1 justify-center">
                          <button onClick={() => setQty(row.productId, qty - 1)}
                            className="w-6 h-6 rounded flex items-center justify-center btn-ghost"
                            style={{ color: "var(--text-secondary)" }}><Minus size={11} /></button>
                          {touchMode ? (
                            <button
                              className="w-8 text-center text-sm font-mono font-bold rounded-lg border select-none"
                              style={{ background: "var(--bg-primary)", borderColor: qty > 0 ? "#ef4444" : "var(--border)", color: qty > 0 ? "#ef4444" : "var(--text-muted)", padding: "3px 0" }}
                              onClick={() => setNumPad({ productId: row.productId, max: row.maxReturnable, name: row.product.name })}>
                              {qty}
                            </button>
                          ) : (
                            <span className="w-6 text-center text-sm font-mono font-bold"
                              style={{ color: qty > 0 ? "#ef4444" : "var(--text-muted)" }}>{qty}</span>
                          )}
                          <button onClick={() => setQty(row.productId, qty + 1)}
                            disabled={qty >= row.maxReturnable}
                            className="w-6 h-6 rounded flex items-center justify-center btn-ghost"
                            style={{ color: "var(--text-secondary)" }}><Plus size={11} /></button>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>máx. {row.maxReturnable}</p>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-sm font-semibold"
                        style={{ color: qty > 0 ? "#ef4444" : "var(--text-muted)" }}>
                        {qty > 0 ? formatCOP(sub) : "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {returnTotal > 0 && (
                <tfoot>
                  <tr style={{ background: "var(--bg-tertiary)" }}>
                    <td colSpan={4} className="px-3 py-2.5 text-sm font-semibold text-right"
                      style={{ color: "var(--text-secondary)" }}>Total a devolver</td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-base"
                      style={{ color: "#ef4444" }}>{formatCOP(returnTotal)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <input type="text" className="input text-sm"
            placeholder="Motivo de devolución *"
            value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t shrink-0 flex gap-3" style={{ borderColor: "var(--border)" }}>
          <button onClick={onClose} className="btn-outline btn-md flex-1">Cancelar</button>
          <button
            onClick={() => {
              if (!notes.trim()) return toast.error("El motivo de devolución es obligatorio")
              createReturn()
            }}
            disabled={saving || returnItems.length === 0}
            className="btn-md flex-1 flex items-center justify-center gap-2 font-semibold rounded-xl"
            style={{ background: returnItems.length > 0 ? "#ef4444" : "var(--bg-tertiary)", color: returnItems.length > 0 ? "#fff" : "var(--text-muted)", opacity: saving ? 0.7 : 1 }}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}
            {saving ? "Registrando..." : `Devolver · ${formatCOP(returnTotal)}`}
          </button>
        </div>
      </div>

      {numPad && (
        <NumPad
          mode="quantity"
          initialValue={qtys[numPad.productId] ?? 0}
          label={numPad.name}
          subtitle={`Máx. ${numPad.max} unidades`}
          minValue={0}
          onConfirm={(val) => { setQty(numPad.productId, val); setNumPad(null) }}
          onClose={() => setNumPad(null)}
        />
      )}
    </div>
  )
}

// ── Tarjeta de compra en historial ────────────────────────
function PurchaseCard({ purchase }) {
  const [expanded,     setExpanded]     = useState(false)
  const [returnOpen,   setReturnOpen]   = useState(false)
  const [refreshKey,   setRefreshKey]   = useState(0)

  const { byProduct, hasReturns, isFullReturn } = getReturnStatus(purchase)

  const date    = new Date(purchase.createdAt)
  const dateStr = date.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })
  const timeStr = date.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })

  return (
    <>
      <div className="rounded-xl overflow-hidden border transition-all"
        style={{
          borderColor: isFullReturn ? "#ef4444" : hasReturns ? "#f97316" : "var(--border)",
          background:  isFullReturn ? "rgba(239,68,68,0.05)" : "var(--bg-secondary)",
          opacity:     isFullReturn ? 0.75 : 1,
        }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => setExpanded(e => !e)} className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: isFullReturn ? "rgba(239,68,68,0.15)" : "var(--brand-light)" }}>
              {isFullReturn
                ? <AlertTriangle size={15} style={{ color: "#ef4444" }} />
                : <FileText size={15} style={{ color: "var(--brand)" }} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold"
                  style={{ color: isFullReturn ? "#ef4444" : "var(--text-primary)", textDecoration: isFullReturn ? "line-through" : "none" }}>
                  Compra #{purchase.id}
                </span>
                {isFullReturn && (
                  <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
                    style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
                    ANULADA
                  </span>
                )}
                {!isFullReturn && hasReturns && (
                  <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
                    style={{ background: "rgba(249,115,22,0.15)", color: "#f97316" }}>
                    DEV. PARCIAL
                  </span>
                )}
                <span className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>
                  {purchase.items.length} {purchase.items.length === 1 ? "producto" : "productos"}
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {purchase.user.name} · {dateStr} {timeStr}
              </p>
            </div>
            <span className="text-sm font-mono font-bold shrink-0"
              style={{ color: isFullReturn ? "#ef4444" : "var(--brand)", textDecoration: isFullReturn ? "line-through" : "none" }}>
              {formatCOP(Number(purchase.total))}
            </span>
            {expanded
              ? <ChevronUp size={14} className="shrink-0" style={{ color: "var(--text-muted)" }} />
              : <ChevronDown size={14} className="shrink-0" style={{ color: "var(--text-muted)" }} />}
          </button>

          {/* Botón devolver */}
          {!isFullReturn && (
            <button
              onClick={() => setReturnOpen(true)}
              className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
              <RotateCcw size={12} /> Devolver
            </button>
          )}
        </div>

        {/* Detalle expandido */}
        {expanded && (
          <div className="border-t" style={{ borderColor: "var(--border)" }}>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr style={{ background: "var(--bg-tertiary)" }}>
                    <th className="px-4 py-2 text-left text-xs font-semibold border-b"
                      style={{ borderColor: "var(--border)", color: "var(--text-muted)", minWidth: "150px" }}>Descripción</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold border-b"
                      style={{ borderColor: "var(--border)", color: "var(--text-muted)", width: "70px" }}>Cant.</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold border-b"
                      style={{ borderColor: "var(--border)", color: "var(--text-muted)", width: "80px" }}>Devuelto</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold border-b"
                      style={{ borderColor: "var(--border)", color: "var(--text-muted)", width: "110px" }}>Costo unit.</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold border-b"
                      style={{ borderColor: "var(--border)", color: "var(--text-muted)", width: "110px" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {purchase.items.map((item, idx) => {
                    const retQty   = byProduct[item.productId] || 0
                    const fullItem = retQty >= item.quantity
                    const partItem = retQty > 0 && retQty < item.quantity
                    return (
                      <tr key={item.id}
                        style={{ background: idx % 2 === 0 ? "var(--bg-secondary)" : "var(--bg-tertiary)" }}>
                        <td className="px-4 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
                          <span style={{
                            color: fullItem ? "#ef4444" : "var(--text-primary)",
                            textDecoration: fullItem ? "line-through" : "none",
                          }}>
                            {item.product.name}
                          </span>
                          {partItem && (
                            <span className="ml-2 text-xs px-1.5 py-0.5 rounded"
                              style={{ background: "rgba(249,115,22,0.15)", color: "#f97316" }}>
                              parcial
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 border-b text-center font-mono"
                          style={{ borderColor: "var(--border)", color: fullItem ? "#ef4444" : "var(--text-secondary)", textDecoration: fullItem ? "line-through" : "none" }}>
                          {item.quantity}
                        </td>
                        <td className="px-4 py-2.5 border-b text-center font-mono font-semibold"
                          style={{ borderColor: "var(--border)", color: retQty > 0 ? "#ef4444" : "var(--text-muted)" }}>
                          {retQty > 0 ? retQty : "—"}
                        </td>
                        <td className="px-4 py-2.5 border-b text-right font-mono"
                          style={{ borderColor: "var(--border)", color: fullItem ? "#ef4444" : "var(--text-secondary)", textDecoration: fullItem ? "line-through" : "none" }}>
                          {formatCOP(Number(item.unitCost))}
                        </td>
                        <td className="px-4 py-2.5 border-b text-right font-mono font-semibold"
                          style={{ borderColor: "var(--border)", color: fullItem ? "#ef4444" : "var(--text-primary)", textDecoration: fullItem ? "line-through" : "none" }}>
                          {formatCOP(Number(item.unitCost) * item.quantity)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: "var(--bg-tertiary)" }}>
                    <td colSpan={4} className="px-4 py-2.5 text-right font-semibold text-sm"
                      style={{ color: "var(--text-secondary)" }}>Total compra</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-base"
                      style={{ color: isFullReturn ? "#ef4444" : "var(--brand)", textDecoration: isFullReturn ? "line-through" : "none" }}>
                      {formatCOP(Number(purchase.total))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Historial de devoluciones */}
            {purchase.returns?.length > 0 && (
              <div className="border-t px-4 py-3" style={{ borderColor: "var(--border)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#ef4444" }}>
                  Devoluciones registradas
                </p>
                <div className="space-y-1.5">
                  {purchase.returns.map(ret => {
                    const rd = new Date(ret.createdAt)
                    return (
                      <div key={ret.id} className="flex items-start justify-between gap-4 text-xs rounded-lg px-3 py-2"
                        style={{ background: "rgba(239,68,68,0.07)" }}>
                        <div>
                          <span className="font-semibold" style={{ color: "#ef4444" }}>
                            Dev. #{ret.id}
                          </span>
                          <span className="mx-1.5" style={{ color: "var(--text-muted)" }}>·</span>
                          <span style={{ color: "var(--text-secondary)" }}>{ret.user.name}</span>
                          <span className="mx-1.5" style={{ color: "var(--text-muted)" }}>·</span>
                          <span style={{ color: "var(--text-muted)" }}>
                            {rd.toLocaleDateString("es-CO", { day: "2-digit", month: "short" })} {rd.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {ret.notes && (
                            <span className="ml-2 italic" style={{ color: "var(--text-muted)" }}>"{ret.notes}"</span>
                          )}
                        </div>
                        <span className="font-mono font-bold shrink-0" style={{ color: "#ef4444" }}>
                          -{formatCOP(Number(ret.total))}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {purchase.notes && (
              <p className="px-4 py-2 text-xs italic border-t"
                style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                Nota: {purchase.notes}
              </p>
            )}
          </div>
        )}
      </div>

      {returnOpen && (
        <ReturnModal
          purchase={purchase}
          onClose={() => setReturnOpen(false)}
          onSuccess={() => setRefreshKey(k => k + 1)}
        />
      )}
    </>
  )
}

// ── Página principal ──────────────────────────────────────
export default function PurchasesPage() {
  const [modalOpen,      setModalOpen]      = useState(false)
  const [filterProduct,  setFilterProduct]  = useState("")
  const [filterFrom,     setFilterFrom]     = useState("")
  const [filterTo,       setFilterTo]       = useState("")
  const [filterMin,      setFilterMin]      = useState("")
  const [filterMax,      setFilterMax]      = useState("")
  const [filterReturns,  setFilterReturns]  = useState(false)
  const [filterReturnUser, setFilterReturnUser] = useState("")
  const [histPage,       setHistPage]       = useState(1)

  const { data: productsData } = useQuery({
    queryKey: ["products-all"],
    queryFn:  () => productsService.getAll({ limit: 1000, active: true }),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })
  const allProducts = (productsData?.products ?? []).filter(p => p.type === "PHYSICAL")

  const histParams = {
    page:  histPage,
    limit: 15,
    ...(filterFrom      && { from: filterFrom }),
    ...(filterTo        && { to: filterTo }),
    ...(filterMin       && { minTotal: Number(filterMin) }),
    ...(filterMax       && { maxTotal: Number(filterMax) }),
    ...(filterReturns   && { hasReturns: true }),
  }

  const { data: histData, isLoading: histLoading } = useQuery({
    queryKey:        ["purchases", histParams],
    queryFn:         () => purchasesService.getAll(histParams),
    placeholderData: keepPreviousData,
  })

  const histPurchases = (histData?.purchases ?? []).filter(p => {
    if (filterProduct && !p.items.some(i => i.product.name.toLowerCase().includes(filterProduct.toLowerCase()))) return false
    if (filterReturnUser && !p.returns?.some(r => r.user.name.toLowerCase().includes(filterReturnUser.toLowerCase()))) return false
    return true
  })

  const clearFilters = () => {
    setFilterProduct(""); setFilterFrom(""); setFilterTo("")
    setFilterMin(""); setFilterMax(""); setFilterReturns(false); setFilterReturnUser("")
    setHistPage(1)
  }
  const hasFilters = filterProduct || filterFrom || filterTo || filterMin || filterMax || filterReturns || filterReturnUser

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Header */}
      <div className="px-5 pt-4 pb-3 shrink-0 border-b flex items-center gap-3" style={{ borderColor: "var(--border)" }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--brand-light)" }}>
          <ShoppingBag size={16} style={{ color: "var(--brand)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-display font-bold" style={{ color: "var(--text-primary)" }}>Compras</h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Historial de entradas de inventario</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary btn-sm flex items-center gap-2 shrink-0">
          <Plus size={14} /> Nueva compra
        </button>
      </div>

      {/* Filtros */}
      <div className="px-5 py-3 shrink-0 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex flex-wrap gap-2 items-center">

          {/* Producto */}
          <div className="relative" style={{ flex: "1 1 170px" }}>
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
            <input type="text" className="input pl-8 text-xs py-2 w-full" placeholder="Filtrar por producto"
              value={filterProduct} onChange={e => { setFilterProduct(e.target.value); setHistPage(1) }} />
          </div>

          {/* Desde */}
          <div className="relative" style={{ flex: "1 1 130px" }}>
            <Calendar size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
            <input type="date" className="input pl-8 text-xs py-2 w-full"
              value={filterFrom} onChange={e => { setFilterFrom(e.target.value); setHistPage(1) }} />
          </div>

          {/* Hasta */}
          <div className="relative" style={{ flex: "1 1 130px" }}>
            <Calendar size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
            <input type="date" className="input pl-8 text-xs py-2 w-full"
              value={filterTo} onChange={e => { setFilterTo(e.target.value); setHistPage(1) }} />
          </div>

          {/* Mín */}
          <div className="relative" style={{ flex: "1 1 100px" }}>
            <DollarSign size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
            <input type="number" className="input pl-7 text-xs py-2 w-full" placeholder="Valor mín."
              value={filterMin} onChange={e => { setFilterMin(e.target.value); setHistPage(1) }} />
          </div>

          {/* Máx */}
          <div className="relative" style={{ flex: "1 1 100px" }}>
            <DollarSign size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
            <input type="number" className="input pl-7 text-xs py-2 w-full" placeholder="Valor máx."
              value={filterMax} onChange={e => { setFilterMax(e.target.value); setHistPage(1) }} />
          </div>

          {/* Responsable devolución */}
          <div className="relative" style={{ flex: "1 1 150px" }}>
            <RotateCcw size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: filterReturnUser ? "#ef4444" : "var(--text-muted)" }} />
            <input type="text" className="input pl-8 text-xs py-2 w-full" placeholder="Responsable devolución"
              value={filterReturnUser} onChange={e => { setFilterReturnUser(e.target.value); setHistPage(1) }} />
          </div>

          {/* Solo con devoluciones */}
          <label className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer shrink-0"
            style={{ background: filterReturns ? "rgba(239,68,68,0.1)" : "var(--bg-tertiary)", border: "1px solid", borderColor: filterReturns ? "#ef4444" : "var(--border)" }}>
            <input type="checkbox" className="w-3.5 h-3.5 accent-red-500"
              checked={filterReturns} onChange={e => { setFilterReturns(e.target.checked); setHistPage(1) }} />
            <span className="text-xs font-medium" style={{ color: filterReturns ? "#ef4444" : "var(--text-secondary)" }}>
              Solo con devoluciones
            </span>
          </label>

          {/* Limpiar */}
          {hasFilters && (
            <button onClick={clearFilters} className="btn-ghost btn-sm flex items-center gap-1.5 shrink-0"
              style={{ color: "var(--text-muted)" }}>
              <X size={13} /> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
        {histLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin" style={{ color: "var(--text-muted)" }} />
          </div>
        ) : histPurchases.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20" style={{ color: "var(--text-muted)" }}>
            <ShoppingBag size={36} style={{ color: "var(--border)" }} />
            <p className="text-sm">Sin compras registradas</p>
            <button onClick={() => setModalOpen(true)} className="btn-primary btn-sm flex items-center gap-2 mt-1">
              <Plus size={13} /> Registrar primera compra
            </button>
          </div>
        ) : (
          histPurchases.map(p => <PurchaseCard key={p.id} purchase={p} />)
        )}
      </div>

      {/* Paginación */}
      {histData && histData.total > 15 && (
        <div className="flex items-center justify-between px-5 py-3 border-t shrink-0" style={{ borderColor: "var(--border)" }}>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {histData.total} compras · página {histPage}
          </p>
          <div className="flex gap-1">
            <button onClick={() => setHistPage(p => Math.max(1, p - 1))} disabled={histPage === 1} className="btn-outline btn-sm">Anterior</button>
            <button onClick={() => setHistPage(p => p + 1)} disabled={histPage * 15 >= histData.total} className="btn-outline btn-sm">Siguiente</button>
          </div>
        </div>
      )}

      {/* Modal nueva compra */}
      <PurchaseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        allProducts={allProducts}
        onSuccess={() => setHistPage(1)}
      />
    </div>
  )
}
