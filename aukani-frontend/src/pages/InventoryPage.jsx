import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { inventoryService } from "@/services/inventory.service"
import { productsService } from "@/services/products.service"
import { useAuthStore } from "@/store/auth.store"
import { formatCOP } from "@/utils/currency"
import {
  Plus, Minus, Loader2, Package, X, ChevronRight,
  TrendingUp, TrendingDown, ShoppingCart, AlertTriangle
} from "lucide-react"
import toast from "react-hot-toast"

// ── Tipos de movimiento ───────────────────────────────────
const TYPE = {
  ENTRY: { label: "Entrada", color: "var(--brand)",   bg: "var(--brand-light)" },
  EXIT:  { label: "Salida",  color: "var(--danger)",  bg: "var(--danger-light)" },
  SALE:  { label: "Venta",   color: "var(--info)",    bg: "#dbeafe" },
}

// ── Modal entrada/salida ──────────────────────────────────
function MovementModal({ type, products, onClose, onSave }) {
  const [form, setForm] = useState({ productId: "", quantity: 1, reason: "" })
  const isEntry = type === "ENTRY"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="card p-6 w-full max-w-sm animate-slide-up" onClick={e => e.stopPropagation()}>
        <h2 className="font-display font-bold text-lg mb-4" style={{ color: "var(--text-primary)" }}>
          {isEntry ? "📦 Entrada de stock" : "📤 Salida manual"}
        </h2>
        <form onSubmit={e => { e.preventDefault(); if (!form.productId) return; onSave({ ...form, productId: Number(form.productId), quantity: Number(form.quantity) }) }}
          className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Producto *</label>
            <select className="input" required value={form.productId}
              onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}>
              <option value="">Seleccionar producto...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} — stock: {p.stock}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Cantidad *</label>
            <input type="number" className="input" min={1} required value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Motivo</label>
            <input type="text" className="input"
              placeholder={isEntry ? "Compra a proveedor..." : "Producto dañado..."}
              value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-outline btn-md flex-1">Cancelar</button>
            <button type="submit" className="btn-md flex-1 text-white"
              style={{ background: isEntry ? "var(--brand)" : "var(--danger)" }}>
              {isEntry ? "Registrar entrada" : "Registrar salida"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Drawer de detalle de producto ─────────────────────────
function ProductDrawer({ product, onClose, canExit, onEntry, onExit }) {
  const { data, isLoading } = useQuery({
    queryKey: ["movements-product", product.id],
    queryFn: () => inventoryService.getMovements({ productId: product.id, limit: 50 }),
  })

  const movements = data?.movements || []
  const totalEntries = movements.filter(m => m.type === "ENTRY").reduce((s, m) => s + m.quantity, 0)
  const totalExits   = movements.filter(m => m.type === "EXIT").reduce((s, m) => s + m.quantity, 0)
  const totalSales   = movements.filter(m => m.type === "SALE").reduce((s, m) => s + m.quantity, 0)

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div className="h-full w-full max-w-md flex flex-col animate-slide-in-right"
        style={{ background: "var(--bg-secondary)", borderLeft: "1px solid var(--border)" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            {product.imageUrl ? (
              <img src={`/api${product.imageUrl}`} alt={product.name} className="w-12 h-12 rounded-lg object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: "var(--bg-tertiary)" }}>
                <Package size={20} style={{ color: "var(--text-muted)" }} />
              </div>
            )}
            <div>
              <h2 className="font-display font-bold text-base" style={{ color: "var(--text-primary)" }}>
                {product.name}
              </h2>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {product.category?.name || "Sin categoría"} · {product.barcode || "Sin código"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost w-7 h-7 rounded flex items-center justify-center shrink-0">
            <X size={15} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 p-4 border-b" style={{ borderColor: "var(--border)" }}>
          {/* Stock actual */}
          <div className="col-span-2 rounded-xl p-4 text-center"
            style={{ background: product.stock <= product.minStock ? "var(--warning-light)" : "var(--brand-light)" }}>
            <p className="text-xs font-medium mb-1"
              style={{ color: product.stock <= product.minStock ? "var(--warning)" : "var(--brand)" }}>
              {product.stock <= product.minStock ? "⚠ Stock bajo" : "Stock actual"}
            </p>
            <p className="font-display font-bold text-4xl"
              style={{ color: product.stock <= product.minStock ? "var(--warning)" : "var(--brand)" }}>
              {product.stock}
            </p>
            <p className="text-xs mt-1"
              style={{ color: product.stock <= product.minStock ? "var(--warning)" : "var(--brand)" }}>
              mínimo: {product.minStock} unidades
            </p>
          </div>

          <div className="rounded-lg p-3 text-center" style={{ background: "var(--bg-primary)" }}>
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Precio venta</p>
            <p className="font-mono font-bold text-sm" style={{ color: "var(--brand)" }}>{formatCOP(product.price)}</p>
          </div>
          <div className="rounded-lg p-3 text-center" style={{ background: "var(--bg-primary)" }}>
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Costo</p>
            <p className="font-mono font-bold text-sm" style={{ color: "var(--text-primary)" }}>
              {product.cost ? formatCOP(product.cost) : "—"}
            </p>
          </div>

          <div className="rounded-lg p-3 text-center" style={{ background: "var(--bg-primary)" }}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp size={11} style={{ color: "var(--brand)" }} />
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Entradas</p>
            </div>
            <p className="font-mono font-bold text-sm" style={{ color: "var(--brand)" }}>+{totalEntries}</p>
          </div>
          <div className="rounded-lg p-3 text-center" style={{ background: "var(--bg-primary)" }}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <ShoppingCart size={11} style={{ color: "var(--info)" }} />
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Vendidas</p>
            </div>
            <p className="font-mono font-bold text-sm" style={{ color: "var(--info)" }}>-{totalSales}</p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <button onClick={() => onEntry(product.id)}
            className="btn-primary btn-sm flex-1">
            <Plus size={13} /> Registrar entrada
          </button>
          {canExit && (
            <button onClick={() => onExit(product.id)}
              className="btn-sm flex-1 text-white" style={{ background: "var(--danger)" }}>
              <Minus size={13} /> Registrar salida
            </button>
          )}
        </div>

        {/* Historial de movimientos */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
              Historial de movimientos ({movements.length})
            </p>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-muted)" }} />
            </div>
          ) : movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Sin movimientos registrados</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {movements.map(m => (
                <div key={m.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="badge text-xs shrink-0"
                      style={{ background: TYPE[m.type]?.bg, color: TYPE[m.type]?.color }}>
                      {TYPE[m.type]?.label}
                    </span>
                    <div>
                      <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                        {m.user?.name}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {m.reason || "—"} · {new Date(m.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-sm shrink-0"
                    style={{ color: m.type === "ENTRY" ? "var(--brand)" : "var(--danger)" }}>
                    {m.type === "ENTRY" ? "+" : "-"}{m.quantity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── InventoryPage ─────────────────────────────────────────
export default function InventoryPage() {
  const [modal, setModal] = useState(null)           // "ENTRY" | "EXIT" | null
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [prefilledProductId, setPrefilledProductId] = useState(null)
  const [search, setSearch] = useState("")
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const canExit = ["ADMIN", "JEFE"].includes(user?.role)

  const { data: productsData, isLoading } = useQuery({
    queryKey: ["products-inventory", search],
    queryFn: () => productsService.getAll({ limit: 200, search: search || undefined }),
  })
  const products = productsData?.products || []

  const entry = useMutation({
    mutationFn: inventoryService.entry,
    onSuccess: () => {
      toast.success("Entrada registrada")
      qc.invalidateQueries({ queryKey: ["products-inventory"] })
      qc.invalidateQueries({ queryKey: ["products-all"] })
      qc.invalidateQueries({ queryKey: ["movements-product"] })
      setModal(null)
      setPrefilledProductId(null)
    },
    onError: e => toast.error(e.response?.data?.error || "Error"),
  })

  const exit = useMutation({
    mutationFn: inventoryService.exit,
    onSuccess: () => {
      toast.success("Salida registrada")
      qc.invalidateQueries({ queryKey: ["products-inventory"] })
      qc.invalidateQueries({ queryKey: ["products-all"] })
      qc.invalidateQueries({ queryKey: ["movements-product"] })
      setModal(null)
      setPrefilledProductId(null)
    },
    onError: e => toast.error(e.response?.data?.error || "Error"),
  })

  const handleEntry = (productId = null) => {
    setPrefilledProductId(productId)
    setModal("ENTRY")
    setSelectedProduct(null)
  }

  const handleExit = (productId = null) => {
    setPrefilledProductId(productId)
    setModal("EXIT")
    setSelectedProduct(null)
  }

  // Productos con prefiltro si viene de un producto específico
  const modalProducts = prefilledProductId
    ? products.filter(p => p.id === prefilledProductId)
    : products

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-xl" style={{ color: "var(--text-primary)" }}>Inventario</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {isLoading ? "Cargando..." : `${products.length} productos`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleEntry()} className="btn-primary btn-md">
            <Plus size={15} /> Entrada
          </button>
          {canExit && (
            <button onClick={() => handleExit()}
              className="btn-md text-white" style={{ background: "var(--danger)" }}>
              <Minus size={15} /> Salida
            </button>
          )}
        </div>
      </div>

      {/* Búsqueda */}
      <div className="relative max-w-sm">
        <Package size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
        <input className="input pl-9" placeholder="Buscar producto..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Lista de productos */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--text-muted)" }} />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs font-medium"
                  style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                  <th className="text-left px-4 py-3">Producto</th>
                  <th className="text-center px-4 py-3">Stock</th>
                  <th className="text-center px-4 py-3">Mínimo</th>
                  <th className="text-right px-4 py-3">Precio</th>
                  <th className="text-left px-4 py-3">Categoría</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => {
                  const lowStock = p.stock <= p.minStock
                  return (
                    <tr key={p.id}
                      className="border-b transition-colors cursor-pointer hover:opacity-80"
                      style={{ borderColor: "var(--border)", background: i % 2 === 0 ? "transparent" : "var(--bg-primary)" }}
                      onClick={() => setSelectedProduct(p)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {p.imageUrl ? (
                            <img src={`/api${p.imageUrl}`} alt={p.name} className="w-8 h-8 rounded object-cover shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded flex items-center justify-center shrink-0" style={{ background: "var(--bg-tertiary)" }}>
                              <Package size={13} style={{ color: "var(--text-muted)" }} />
                            </div>
                          )}
                          <span className="font-medium" style={{ color: "var(--text-primary)" }}>{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="badge font-mono font-bold text-sm px-3 py-1"
                          style={{
                            background: lowStock ? "var(--danger-light)" : "var(--brand-light)",
                            color: lowStock ? "var(--danger)" : "var(--brand)",
                          }}>
                          {lowStock && <AlertTriangle size={11} className="inline mr-1" />}
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                        {p.minStock}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold" style={{ color: "var(--brand)" }}>
                        {formatCOP(p.price)}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                        {p.category?.name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight size={15} style={{ color: "var(--text-muted)" }} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drawer de detalle */}
      {selectedProduct && (
        <ProductDrawer
          product={selectedProduct}
          canExit={canExit}
          onClose={() => setSelectedProduct(null)}
          onEntry={(id) => handleEntry(id)}
          onExit={(id) => handleExit(id)}
        />
      )}

      {/* Modal de movimiento */}
      {modal && (
        <MovementModal
          type={modal}
          products={prefilledProductId ? products.filter(p => p.id === prefilledProductId) : products}
          onClose={() => { setModal(null); setPrefilledProductId(null) }}
          onSave={(data) => modal === "ENTRY" ? entry.mutate(data) : exit.mutate(data)}
        />
      )}
    </div>
  )
}