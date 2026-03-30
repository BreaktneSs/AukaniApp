import { useState, useRef, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { inventoryService } from "@/services/inventory.service"
import { productsService } from "@/services/products.service"
import { categoriesService } from "@/services/catalog.service"
import { useAuthStore } from "@/store/auth.store"
import { formatCOP } from "@/utils/currency"
import {
  Plus, Minus, Loader2, Package, X, ChevronRight,
  TrendingUp, ShoppingCart, AlertTriangle, Search,
  Edit2, Trash2, Upload, Camera, SlidersHorizontal,
  ChevronDown, ChevronUp
} from "lucide-react"
import toast from "react-hot-toast"
import { confirm } from "@/components/ui/ConfirmDialog"

// ── Tipos de movimiento ───────────────────────────────────
const TYPE = {
  ENTRY: { label: "Entrada", color: "var(--brand)",  bg: "var(--brand-light)" },
  EXIT:  { label: "Salida",  color: "var(--danger)", bg: "var(--danger-light)" },
  SALE:  { label: "Venta",   color: "var(--info)",   bg: "#dbeafe" },
}

// ── SVG Placeholder ───────────────────────────────────────
function ImgPlaceholder({ size = "md" }) {
  const cls = size === "sm" ? "w-9 h-9" : "w-full h-28"
  const iconCls = size === "sm" ? "w-4 h-4" : "w-8 h-8"
  return (
    <div className={`${cls} rounded-lg flex items-center justify-center`} style={{ background: "var(--bg-tertiary)" }}>
      <svg viewBox="0 0 48 48" fill="none" className={iconCls}>
        <rect x="4" y="10" width="40" height="28" rx="3" stroke="currentColor" strokeWidth="2" fill="none" style={{ color: "var(--border)" }} />
        <circle cx="16" cy="20" r="4" stroke="currentColor" strokeWidth="2" fill="none" style={{ color: "var(--border)" }} />
        <path d="M4 32 L14 22 L22 30 L30 22 L44 36" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" style={{ color: "var(--border)" }} />
      </svg>
    </div>
  )
}

function ProductImg({ imageUrl, name, size = "md" }) {
  const [err, setErr] = useState(false)
  if (!imageUrl || err) return <ImgPlaceholder size={size} />
  const cls = size === "sm" ? "w-9 h-9" : "w-full h-28"
  return <img src={`/api${imageUrl}`} alt={name} onError={() => setErr(true)} className={`${cls} rounded-lg object-cover`} />
}

// ── ImageUploader ─────────────────────────────────────────
function ImageUploader({ currentUrl, productId, onUploaded }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(currentUrl || null)
  const inputRef = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { toast.error("Solo JPG, PNG o WEBP"); return }
    if (file.size > 2 * 1024 * 1024) { toast.error("Máximo 2MB"); return }
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target.result)
    reader.readAsDataURL(file)
    if (productId) {
      setUploading(true)
      try { const r = await productsService.uploadImage(productId, file); onUploaded?.(r.imageUrl); toast.success("Imagen actualizada") }
      catch { toast.error("Error al subir imagen"); setPreview(currentUrl || null) }
      finally { setUploading(false) }
    } else { onUploaded?.(file) }
  }

  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Imagen</label>
      <div className="relative rounded-lg border-2 border-dashed transition-all duration-150 cursor-pointer overflow-hidden"
        style={{ borderColor: dragging ? "var(--brand)" : "var(--border)", background: "var(--bg-primary)" }}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
        onClick={() => inputRef.current?.click()}>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => handleFile(e.target.files[0])} />
        {preview ? (
          <div className="relative">
            <img src={preview.startsWith("/") ? `/api${preview}` : preview} alt="Preview" className="w-full h-28 object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Camera size={16} className="text-white" /><span className="text-white text-xs font-medium">Cambiar</span>
            </div>
            {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 size={20} className="animate-spin text-white" /></div>}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-4">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--bg-tertiary)" }}>
              <Upload size={14} style={{ color: "var(--text-muted)" }} />
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Arrastra o haz clic · JPG/PNG/WEBP · 2MB</p>
          </div>
        )}
      </div>
      {preview && <button type="button" onClick={e => { e.stopPropagation(); setPreview(null); onUploaded?.(null) }} className="mt-1 text-xs btn-ghost px-2 py-1 rounded" style={{ color: "var(--danger)" }}>Quitar imagen</button>}
    </div>
  )
}

// ── Modal crear/editar producto ───────────────────────────
function ProductModal({ product, categories, onClose, onSave }) {
  const [form, setForm] = useState({
    name: product?.name || "", price: product?.price || "", cost: product?.cost || "",
    stock: product?.stock || 0, minStock: product?.minStock || 0,
    barcode: product?.barcode || "", sku: product?.sku || "", categoryId: product?.categoryId || "",
  })
  const [pendingImage, setPendingImage] = useState(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({ ...form, price: Number(form.price), cost: form.cost ? Number(form.cost) : undefined, stock: Number(form.stock), minStock: Number(form.minStock), categoryId: form.categoryId ? Number(form.categoryId) : undefined }, pendingImage)
  }

  const field = (label, key, type = "text", props = {}) => (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>{label}</label>
      <input type={type} className="input" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} {...props} />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="card p-6 w-full max-w-md animate-slide-up overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg" style={{ color: "var(--text-primary)" }}>{product ? "Editar producto" : "Nuevo producto"}</h2>
          <button onClick={onClose} className="btn-ghost w-7 h-7 rounded flex items-center justify-center"><X size={15} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <ImageUploader currentUrl={product?.imageUrl} productId={product?.id} onUploaded={v => setPendingImage(v instanceof File ? v : null)} />
          {field("Nombre *", "name", "text", { required: true, autoFocus: true })}
          <div className="grid grid-cols-2 gap-3">
            {field("Precio *", "price", "number", { required: true, min: 0, step: "1" })}
            {field("Costo", "cost", "number", { min: 0, step: "1" })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("Stock inicial", "stock", "number", { min: 0 })}
            {field("Stock mínimo", "minStock", "number", { min: 0 })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("Código de barras", "barcode")}
            {field("SKU", "sku")}
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Categoría</label>
            <select className="input" value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
              <option value="">Sin categoría</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-outline btn-md flex-1">Cancelar</button>
            <button type="submit" className="btn-primary btn-md flex-1">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal entrada/salida ──────────────────────────────────
function MovementModal({ type, products, prefilledId, onClose, onSave }) {
  const isEntry = type === "ENTRY"
  const [form, setForm] = useState({ productId: prefilledId ? String(prefilledId) : "", quantity: 1, reason: "" })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="card p-6 w-full max-w-sm animate-slide-up" onClick={e => e.stopPropagation()}>
        <h2 className="font-display font-bold text-lg mb-4" style={{ color: "var(--text-primary)" }}>{isEntry ? "📦 Entrada de stock" : "📤 Salida manual"}</h2>
        <form onSubmit={e => { e.preventDefault(); if (!form.productId) return; onSave({ ...form, productId: Number(form.productId), quantity: Number(form.quantity) }) }} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Producto *</label>
            <select className="input" required value={form.productId} onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}>
              <option value="">Seleccionar...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} — stock: {p.stock}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Cantidad *</label>
            <input type="number" className="input" min={1} required value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Motivo</label>
            <input type="text" className="input" placeholder={isEntry ? "Compra a proveedor..." : "Producto dañado..."} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-outline btn-md flex-1">Cancelar</button>
            <button type="submit" className="btn-md flex-1 text-white" style={{ background: isEntry ? "var(--brand)" : "var(--danger)" }}>{isEntry ? "Registrar entrada" : "Registrar salida"}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Drawer detalle de producto ────────────────────────────
function ProductDrawer({ product, onClose, canExit, canEdit, onEntry, onExit, onEdit, onDelete }) {
  const { data, isLoading } = useQuery({
    queryKey: ["movements-product", product.id],
    queryFn: () => inventoryService.getMovements({ productId: product.id, limit: 50 }),
  })
  const movements = data?.movements || []
  const totalEntries = movements.filter(m => m.type === "ENTRY").reduce((s, m) => s + m.quantity, 0)
  const totalSales   = movements.filter(m => m.type === "SALE").reduce((s, m) => s + m.quantity, 0)
  const totalExits   = movements.filter(m => m.type === "EXIT").reduce((s, m) => s + m.quantity, 0)

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div className="h-full w-full max-w-md flex flex-col animate-slide-in-right"
        style={{ background: "var(--bg-secondary)", borderLeft: "1px solid var(--border)" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
              <ProductImg imageUrl={product.imageUrl} name={product.name} size="sm" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base" style={{ color: "var(--text-primary)" }}>{product.name}</h2>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{product.category?.name || "Sin categoría"} · {product.barcode || "Sin código"}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {canEdit && (
              <>
                <button onClick={() => onEdit(product)} className="btn-ghost w-7 h-7 rounded flex items-center justify-center"><Edit2 size={13} /></button>
                <button onClick={() => { confirm({ title: `¿Desactivar producto?`, message: `"${product.name}" quedará inactivo.`, confirmLabel: "Desactivar" }).then(ok => { if (ok) onDelete(product.id) }) }} className="btn-ghost w-7 h-7 rounded flex items-center justify-center" style={{ color: "var(--danger)" }}><Trash2 size={13} /></button>
              </>
            )}
            <button onClick={onClose} className="btn-ghost w-7 h-7 rounded flex items-center justify-center ml-1"><X size={15} /></button>
          </div>
        </div>

        {/* Stats */}
        <div className="p-4 border-b space-y-3" style={{ borderColor: "var(--border)" }}>
          <div className="col-span-2 rounded-xl p-4 text-center"
            style={{ background: product.stock <= product.minStock ? "var(--danger-light)" : "var(--brand-light)" }}>
            <p className="text-xs font-medium mb-1" style={{ color: product.stock <= product.minStock ? "var(--danger)" : "var(--brand)" }}>
              {product.stock <= product.minStock ? "⚠ Stock bajo" : "Stock actual"}
            </p>
            <p className="font-display font-bold text-5xl" style={{ color: product.stock <= product.minStock ? "var(--danger)" : "var(--brand)" }}>
              {product.stock}
            </p>
            <p className="text-xs mt-1" style={{ color: product.stock <= product.minStock ? "var(--danger)" : "var(--brand)" }}>mínimo: {product.minStock}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Precio", value: formatCOP(product.price), color: "var(--brand)" },
              { label: "Entradas", value: `+${totalEntries}`, color: "var(--brand)" },
              { label: "Vendidas", value: `-${totalSales}`, color: "var(--info)" },
            ].map(s => (
              <div key={s.label} className="rounded-lg p-2 text-center" style={{ background: "var(--bg-primary)" }}>
                <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                <p className="font-mono font-bold text-sm" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <button onClick={() => onEntry(product.id)} className="btn-primary btn-sm flex-1"><Plus size={13} /> Entrada</button>
          {canExit && <button onClick={() => onExit(product.id)} className="btn-sm flex-1 text-white" style={{ background: "var(--danger)" }}><Minus size={13} /> Salida</button>}
        </div>

        {/* Historial */}
        <div className="px-4 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
          <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Historial ({movements.length})</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 size={20} className="animate-spin" style={{ color: "var(--text-muted)" }} /></div>
          ) : movements.length === 0 ? (
            <div className="flex items-center justify-center py-10"><p className="text-sm" style={{ color: "var(--text-muted)" }}>Sin movimientos</p></div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {movements.map(m => (
                <div key={m.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="badge text-xs shrink-0" style={{ background: TYPE[m.type]?.bg, color: TYPE[m.type]?.color }}>{TYPE[m.type]?.label}</span>
                    <div>
                      <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{m.user?.name}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{m.reason || "—"} · {new Date(m.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-sm shrink-0" style={{ color: m.type === "ENTRY" ? "var(--brand)" : "var(--danger)" }}>
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

// ── InventoryPage (fusión) ────────────────────────────────
const EMPTY_FILTERS = { categoryId: "", minPrice: "", maxPrice: "", lowStock: "", sortBy: "name_asc" }

function sortProducts(products, sortBy) {
  return [...products].sort((a, b) => {
    if (sortBy === "name_asc")   return a.name.localeCompare(b.name)
    if (sortBy === "name_desc")  return b.name.localeCompare(a.name)
    if (sortBy === "price_asc")  return Number(a.price) - Number(b.price)
    if (sortBy === "price_desc") return Number(b.price) - Number(a.price)
    if (sortBy === "stock_asc")  return a.stock - b.stock
    return 0
  })
}

export default function InventoryPage() {
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const [modal, setModal] = useState(null)         // "ENTRY" | "EXIT" | "new" | product
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [prefilledId, setPrefilledId] = useState(null)
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const canExit = ["ADMIN", "JEFE"].includes(user?.role)
  const canEdit = ["ADMIN", "JEFE"].includes(user?.role)

  const setFilter = useCallback((key, val) => setFilters(f => ({ ...f, [key]: val })), [])
  const activeFilterCount = [filters.categoryId, filters.minPrice, filters.maxPrice, filters.lowStock].filter(Boolean).length

  const { data, isLoading } = useQuery({
    queryKey: ["products-inventory", search, filters],
    queryFn: () => productsService.getAll({
      limit: 200, search: search || undefined,
      categoryId: filters.categoryId || undefined,
      minPrice: filters.minPrice || undefined,
      maxPrice: filters.maxPrice || undefined,
      lowStock: filters.lowStock || undefined,
    }),
  })

  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: categoriesService.getAll })
  const rawProducts = data?.products || []
  const products = sortProducts(rawProducts, filters.sortBy)

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["products-inventory"] })
    qc.invalidateQueries({ queryKey: ["products-all"] })
  }

  const createProduct = useMutation({
    mutationFn: async ({ data, image }) => {
      const p = await productsService.create(data)
      if (image instanceof File) await productsService.uploadImage(p.id, image)
      return p
    },
    onSuccess: () => { toast.success("Producto creado"); invalidate(); setModal(null) },
    onError: e => toast.error(e.response?.data?.error || "Error"),
  })

  const updateProduct = useMutation({
    mutationFn: ({ id, data }) => productsService.update(id, data),
    onSuccess: () => { toast.success("Producto actualizado"); invalidate(); setModal(null) },
    onError: e => toast.error(e.response?.data?.error || "Error"),
  })

  const deleteProduct = useMutation({
    mutationFn: productsService.delete,
    onSuccess: () => { toast.success("Producto desactivado"); invalidate(); setSelectedProduct(null) },
    onError: e => toast.error(e.response?.data?.error || "Error"),
  })

  const entry = useMutation({
    mutationFn: inventoryService.entry,
    onSuccess: () => {
      toast.success("Entrada registrada")
      invalidate()
      qc.invalidateQueries({ queryKey: ["movements-product"] })
      setModal(null); setPrefilledId(null)
    },
    onError: e => toast.error(e.response?.data?.error || "Error"),
  })

  const exit = useMutation({
    mutationFn: inventoryService.exit,
    onSuccess: () => {
      toast.success("Salida registrada")
      invalidate()
      qc.invalidateQueries({ queryKey: ["movements-product"] })
      setModal(null); setPrefilledId(null)
    },
    onError: e => toast.error(e.response?.data?.error || "Error"),
  })

  const handleEntry = (id = null) => { setPrefilledId(id); setModal("ENTRY"); setSelectedProduct(null) }
  const handleExit  = (id = null) => { setPrefilledId(id); setModal("EXIT");  setSelectedProduct(null) }
  const handleEdit  = (p) => { setSelectedProduct(null); setModal(p) }

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
        <div className="flex gap-2 flex-wrap">
          {canEdit && (
            <button onClick={() => setModal("new")} className="btn-primary btn-md">
              <Plus size={15} /> Nuevo producto
            </button>
          )}
          <button onClick={() => handleEntry()} className="btn-md" style={{ background: "var(--brand-light)", color: "var(--brand)", border: "1px solid var(--brand)" }}>
            <Plus size={15} /> Entrada
          </button>
          {canExit && (
            <button onClick={() => handleExit()} className="btn-md text-white" style={{ background: "var(--danger)" }}>
              <Minus size={15} /> Salida
            </button>
          )}
        </div>
      </div>

      {/* Búsqueda + Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input className="input pl-9 pr-8" placeholder="Buscar por nombre, SKU o código de barras..."
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 btn-ghost w-5 h-5 rounded flex items-center justify-center"><X size={12} /></button>}
        </div>

        <button onClick={() => setShowFilters(f => !f)}
          className="btn-outline btn-md flex items-center gap-2"
          style={{ borderColor: activeFilterCount > 0 ? "var(--brand)" : "var(--border)", color: activeFilterCount > 0 ? "var(--brand)" : "var(--text-secondary)" }}>
          <SlidersHorizontal size={15} />
          Filtros
          {activeFilterCount > 0 && <span className="w-4 h-4 rounded-full text-white flex items-center justify-center" style={{ background: "var(--brand)", fontSize: "10px" }}>{activeFilterCount}</span>}
          {showFilters ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* Panel de filtros */}
      {showFilters && (
        <div className="card p-4 grid grid-cols-2 md:grid-cols-4 gap-3 animate-slide-up">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Categoría</label>
            <select className="input text-sm" value={filters.categoryId} onChange={e => setFilter("categoryId", e.target.value)}>
              <option value="">Todas</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Precio mín.</label>
            <input type="number" className="input text-sm" placeholder="0" min={0} value={filters.minPrice} onChange={e => setFilter("minPrice", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Precio máx.</label>
            <input type="number" className="input text-sm" placeholder="∞" min={0} value={filters.maxPrice} onChange={e => setFilter("maxPrice", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Ordenar</label>
            <select className="input text-sm" value={filters.sortBy} onChange={e => setFilter("sortBy", e.target.value)}>
              <option value="name_asc">Nombre A→Z</option>
              <option value="name_desc">Nombre Z→A</option>
              <option value="price_asc">Precio ↑</option>
              <option value="price_desc">Precio ↓</option>
              <option value="stock_asc">Stock ↑</option>
            </select>
          </div>
          <div className="col-span-2 md:col-span-4 flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={filters.lowStock === "true"} onChange={e => setFilter("lowStock", e.target.checked ? "true" : "")} className="w-4 h-4 rounded" />
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Solo stock bajo</span>
            </label>
            {activeFilterCount > 0 && <button onClick={() => setFilters(EMPTY_FILTERS)} className="text-xs btn-ghost px-2 py-1 rounded" style={{ color: "var(--danger)" }}>Limpiar filtros</button>}
          </div>
        </div>
      )}

      {/* Tabla */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin" style={{ color: "var(--text-muted)" }} /></div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Package size={32} style={{ color: "var(--text-muted)" }} />
          <p style={{ color: "var(--text-muted)" }}>No hay productos</p>
          {(search || activeFilterCount > 0) && <button onClick={() => { setSearch(""); setFilters(EMPTY_FILTERS) }} className="btn-outline btn-sm">Limpiar búsqueda</button>}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs font-medium" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                  <th className="text-left px-4 py-3">Producto</th>
                  <th className="text-center px-4 py-3">Stock</th>
                  <th className="text-center px-4 py-3">Mínimo</th>
                  <th className="text-right px-4 py-3">Precio</th>
                  <th className="text-right px-4 py-3">Costo</th>
                  <th className="text-left px-4 py-3">Categoría</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => {
                  const low = p.stock <= p.minStock
                  return (
                    <tr key={p.id} onClick={() => setSelectedProduct(p)}
                      className="border-b transition-colors cursor-pointer hover:opacity-80"
                      style={{ borderColor: "var(--border)", background: i % 2 === 0 ? "transparent" : "var(--bg-primary)" }}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0"><ProductImg imageUrl={p.imageUrl} name={p.name} size="sm" /></div>
                          <span className="font-medium" style={{ color: "var(--text-primary)" }}>{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="badge font-mono font-bold px-3 py-1"
                          style={{ background: low ? "var(--danger-light)" : "var(--brand-light)", color: low ? "var(--danger)" : "var(--brand)" }}>
                          {low && <AlertTriangle size={11} className="inline mr-1" />}{p.stock}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono text-xs" style={{ color: "var(--text-muted)" }}>{p.minStock}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold" style={{ color: "var(--brand)" }}>{formatCOP(p.price)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs" style={{ color: "var(--text-muted)" }}>{p.cost ? formatCOP(p.cost) : "—"}</td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: "var(--text-muted)" }}>{p.category?.name || "—"}</td>
                      <td className="px-4 py-2.5"><ChevronRight size={15} style={{ color: "var(--text-muted)" }} /></td>
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
          product={selectedProduct} canExit={canExit} canEdit={canEdit}
          onClose={() => setSelectedProduct(null)}
          onEntry={handleEntry} onExit={handleExit}
          onEdit={handleEdit}
          onDelete={(id) => deleteProduct.mutate(id)}
        />
      )}

      {/* Modales */}
      {(modal === "new" || (modal && typeof modal === "object")) && (
        <ProductModal
          product={modal === "new" ? null : modal}
          categories={categories}
          onClose={() => setModal(null)}
          onSave={(data, img) => modal === "new" ? createProduct.mutate({ data, image: img }) : updateProduct.mutate({ id: modal.id, data })}
        />
      )}
      {(modal === "ENTRY" || modal === "EXIT") && (
        <MovementModal
          type={modal}
          products={prefilledId ? products.filter(p => p.id === prefilledId) : products}
          prefilledId={prefilledId}
          onClose={() => { setModal(null); setPrefilledId(null) }}
          onSave={d => modal === "ENTRY" ? entry.mutate(d) : exit.mutate(d)}
        />
      )}
    </div>
  )
}