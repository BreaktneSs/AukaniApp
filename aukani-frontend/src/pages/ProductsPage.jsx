import { useState, useRef, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { productsService } from "@/services/products.service"
import { categoriesService } from "@/services/catalog.service"
import { Plus, Search, Edit2, Trash2, Loader2, Package, X, Camera,
         Upload, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react"
import toast from "react-hot-toast"
import { formatCOP } from "@/utils/currency"

// ── SVG Placeholder ───────────────────────────────────────
function ProductImagePlaceholder({ size = "md" }) {
  const cls = size === "sm" ? "w-9 h-9" : size === "lg" ? "w-full h-32" : "w-full h-24"
  const iconCls = size === "sm" ? "w-4 h-4" : "w-8 h-8"
  return (
    <div className={`${cls} rounded-lg flex items-center justify-center`}
      style={{ background: "var(--bg-tertiary)" }}>
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={iconCls}>
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

function ProductImage({ imageUrl, name, size = "md" }) {
  const [error, setError] = useState(false)
  if (!imageUrl || error) return <ProductImagePlaceholder size={size} />
  const cls = size === "sm" ? "w-9 h-9" : size === "lg" ? "w-full h-32" : "w-full h-24"
  return <img src={`/api${imageUrl}`} alt={name} onError={() => setError(true)}
    className={`${cls} rounded-lg object-cover`} />
}

// ── ImageUploader ─────────────────────────────────────────
function ImageUploader({ currentUrl, productId, onUploaded }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(currentUrl || null)
  const inputRef = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Solo JPG, PNG o WEBP"); return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Máximo 2MB"); return
    }
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target.result)
    reader.readAsDataURL(file)

    if (productId) {
      setUploading(true)
      try {
        const result = await productsService.uploadImage(productId, file)
        onUploaded?.(result.imageUrl)
        toast.success("Imagen actualizada")
      } catch { toast.error("Error al subir imagen"); setPreview(currentUrl || null) }
      finally { setUploading(false) }
    } else {
      onUploaded?.(file)
    }
  }

  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
        Imagen del producto
      </label>
      <div className="relative rounded-lg border-2 border-dashed transition-all duration-150 cursor-pointer overflow-hidden"
        style={{ borderColor: dragging ? "var(--brand)" : "var(--border)", background: "var(--bg-primary)" }}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
        onClick={() => inputRef.current?.click()}>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp"
          className="hidden" onChange={e => handleFile(e.target.files[0])} />
        {preview ? (
          <div className="relative">
            <img src={preview.startsWith("/") ? `/api${preview}` : preview}
              alt="Preview" className="w-full h-32 object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Camera size={16} className="text-white" />
              <span className="text-white text-xs font-medium">Cambiar</span>
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 size={20} className="animate-spin text-white" />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-5">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--bg-tertiary)" }}>
              <Upload size={15} style={{ color: "var(--text-muted)" }} />
            </div>
            <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Arrastra o haz clic</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>JPG, PNG, WEBP · máx 2MB</p>
          </div>
        )}
      </div>
      {preview && (
        <button type="button"
          onClick={e => { e.stopPropagation(); setPreview(null); onUploaded?.(null) }}
          className="mt-1 text-xs btn-ghost px-2 py-1 rounded" style={{ color: "var(--danger)" }}>
          Quitar imagen
        </button>
      )}
    </div>
  )
}

// ── ProductModal ──────────────────────────────────────────
function ProductModal({ product, categories, onClose, onSave }) {
  const [form, setForm] = useState({
    name: product?.name || "", price: product?.price || "",
    cost: product?.cost || "", stock: product?.stock || 0,
    minStock: product?.minStock || 0, barcode: product?.barcode || "",
    sku: product?.sku || "", categoryId: product?.categoryId || "",
  })
  const [pendingImage, setPendingImage] = useState(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      ...form,
      price: Number(form.price),
      cost: form.cost ? Number(form.cost) : undefined,
      stock: Number(form.stock),
      minStock: Number(form.minStock),
      categoryId: form.categoryId ? Number(form.categoryId) : undefined,
    }, pendingImage)
  }

  const field = (label, key, type = "text", props = {}) => (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>{label}</label>
      <input type={type} className="input" value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} {...props} />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="card p-6 w-full max-w-md animate-slide-up overflow-y-auto max-h-[90vh]"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg" style={{ color: "var(--text-primary)" }}>
            {product ? "Editar producto" : "Nuevo producto"}
          </h2>
          <button onClick={onClose} className="btn-ghost w-7 h-7 rounded flex items-center justify-center">
            <X size={15} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <ImageUploader currentUrl={product?.imageUrl} productId={product?.id}
            onUploaded={(v) => setPendingImage(v instanceof File ? v : null)} />
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
            <select className="input" value={form.categoryId}
              onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
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

// ── FilterPanel ───────────────────────────────────────────
function FilterPanel({ filters, onChange, categories, onClear, activeCount }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="btn-outline btn-md flex items-center gap-2"
        style={{ borderColor: activeCount > 0 ? "var(--brand)" : "var(--border)",
                 color: activeCount > 0 ? "var(--brand)" : "var(--text-secondary)" }}>
        <SlidersHorizontal size={15} />
        Filtros
        {activeCount > 0 && (
          <span className="w-4 h-4 rounded-full text-white text-xs flex items-center justify-center"
            style={{ background: "var(--brand)", fontSize: "10px" }}>
            {activeCount}
          </span>
        )}
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 w-72 card p-4 space-y-3 animate-slide-up shadow-lg">
          {/* Categoría */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
              Categoría
            </label>
            <select className="input text-sm" value={filters.categoryId}
              onChange={e => onChange("categoryId", e.target.value)}>
              <option value="">Todas las categorías</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Rango de precio */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
              Precio
            </label>
            <div className="flex items-center gap-2">
              <input type="number" className="input text-sm" placeholder="Mín" min={0} step="0.01"
                value={filters.minPrice}
                onChange={e => onChange("minPrice", e.target.value)} />
              <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>—</span>
              <input type="number" className="input text-sm" placeholder="Máx" min={0} step="0.01"
                value={filters.maxPrice}
                onChange={e => onChange("maxPrice", e.target.value)} />
            </div>
          </div>

          {/* Stock */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
              Stock
            </label>
            <div className="flex gap-2">
              {[
                { value: "", label: "Todos" },
                { value: "true", label: "⚠ Stock bajo" },
              ].map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => onChange("lowStock", opt.value)}
                  className="px-3 py-1.5 rounded text-xs font-medium transition-all border"
                  style={{
                    background: filters.lowStock === opt.value ? "var(--brand-light)" : "transparent",
                    color: filters.lowStock === opt.value ? "var(--brand)" : "var(--text-secondary)",
                    borderColor: filters.lowStock === opt.value ? "var(--brand)" : "var(--border)",
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ordenar por */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
              Ordenar por
            </label>
            <select className="input text-sm" value={filters.sortBy}
              onChange={e => onChange("sortBy", e.target.value)}>
              <option value="name_asc">Nombre A→Z</option>
              <option value="name_desc">Nombre Z→A</option>
              <option value="price_asc">Precio menor→mayor</option>
              <option value="price_desc">Precio mayor→menor</option>
              <option value="stock_asc">Stock menor→mayor</option>
            </select>
          </div>

          {/* Limpiar */}
          {activeCount > 0 && (
            <button onClick={() => { onClear(); setOpen(false) }}
              className="w-full btn-ghost btn-sm text-center"
              style={{ color: "var(--danger)" }}>
              Limpiar filtros
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────
const EMPTY_FILTERS = { categoryId: "", minPrice: "", maxPrice: "", lowStock: "", sortBy: "name_asc" }

function sortProducts(products, sortBy) {
  return [...products].sort((a, b) => {
    if (sortBy === "name_asc")    return a.name.localeCompare(b.name)
    if (sortBy === "name_desc")   return b.name.localeCompare(a.name)
    if (sortBy === "price_asc")   return Number(a.price) - Number(b.price)
    if (sortBy === "price_desc")  return Number(b.price) - Number(a.price)
    if (sortBy === "stock_asc")   return a.stock - b.stock
    return 0
  })
}

// ── ProductsPage ──────────────────────────────────────────
export default function ProductsPage() {
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [modal, setModal] = useState(null)
  const qc = useQueryClient()

  const setFilter = useCallback((key, value) => {
    setFilters(f => ({ ...f, [key]: value }))
  }, [])

  const activeFilterCount = [
    filters.categoryId, filters.minPrice, filters.maxPrice, filters.lowStock
  ].filter(Boolean).length

  // Query única — todo pasa por getAll con parámetros
  const { data, isLoading } = useQuery({
    queryKey: ["products", search, filters],
    queryFn: () => productsService.getAll({
      limit: 200,
      search: search || undefined,
      categoryId: filters.categoryId || undefined,
      minPrice: filters.minPrice || undefined,
      maxPrice: filters.maxPrice || undefined,
      lowStock: filters.lowStock || undefined,
    }),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesService.getAll,
  })

  const rawProducts = data?.products || []
  const products = sortProducts(rawProducts, filters.sortBy)

  const create = useMutation({
    mutationFn: async ({ data, image }) => {
      const product = await productsService.create(data)
      if (image instanceof File) await productsService.uploadImage(product.id, image)
      return product
    },
    onSuccess: () => {
      toast.success("Producto creado")
      qc.invalidateQueries({ queryKey: ["products"] })
      qc.invalidateQueries({ queryKey: ["products-all"] })
      setModal(null)
    },
    onError: e => toast.error(e.response?.data?.error || "Error al crear"),
  })

  const update = useMutation({
    mutationFn: ({ id, data }) => productsService.update(id, data),
    onSuccess: () => {
      toast.success("Producto actualizado")
      qc.invalidateQueries({ queryKey: ["products"] })
      qc.invalidateQueries({ queryKey: ["products-all"] })
      setModal(null)
    },
    onError: e => toast.error(e.response?.data?.error || "Error al actualizar"),
  })

  const remove = useMutation({
    mutationFn: productsService.delete,
    onSuccess: () => {
      toast.success("Producto desactivado")
      qc.invalidateQueries({ queryKey: ["products"] })
      qc.invalidateQueries({ queryKey: ["products-all"] })
    },
    onError: e => toast.error(e.response?.data?.error || "Error"),
  })

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl" style={{ color: "var(--text-primary)" }}>Productos</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {isLoading ? "Cargando..." : `${products.length} producto${products.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button onClick={() => setModal("new")} className="btn-primary btn-md">
          <Plus size={16} /> Nuevo producto
        </button>
      </div>

      {/* Búsqueda + Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-muted)" }} />
          <input className="input pl-9 pr-8" placeholder="Buscar por nombre, SKU o código..."
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 btn-ghost w-5 h-5 rounded flex items-center justify-center">
              <X size={12} />
            </button>
          )}
        </div>

        <FilterPanel
          filters={filters}
          onChange={setFilter}
          categories={categories}
          onClear={() => setFilters(EMPTY_FILTERS)}
          activeCount={activeFilterCount}
        />

        {/* Chips de filtros activos */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {filters.categoryId && (
              <span className="badge text-xs px-2 py-1 flex items-center gap-1"
                style={{ background: "var(--brand-light)", color: "var(--brand)" }}>
                {categories.find(c => String(c.id) === String(filters.categoryId))?.name}
                <button onClick={() => setFilter("categoryId", "")}><X size={10} /></button>
              </span>
            )}
            {(filters.minPrice || filters.maxPrice) && (
              <span className="badge text-xs px-2 py-1 flex items-center gap-1"
                style={{ background: "var(--brand-light)", color: "var(--brand)" }}>
                ${filters.minPrice || "0"} – ${filters.maxPrice || "∞"}
                <button onClick={() => { setFilter("minPrice", ""); setFilter("maxPrice", "") }}><X size={10} /></button>
              </span>
            )}
            {filters.lowStock && (
              <span className="badge text-xs px-2 py-1 flex items-center gap-1"
                style={{ background: "var(--warning-light)", color: "var(--warning)" }}>
                ⚠ Stock bajo
                <button onClick={() => setFilter("lowStock", "")}><X size={10} /></button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tabla */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--text-muted)" }} />
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Package size={32} style={{ color: "var(--text-muted)" }} />
          <p style={{ color: "var(--text-muted)" }}>
            {search || activeFilterCount > 0 ? "Sin resultados con estos filtros" : "No hay productos"}
          </p>
          {(search || activeFilterCount > 0) && (
            <button onClick={() => { setSearch(""); setFilters(EMPTY_FILTERS) }}
              className="btn-outline btn-sm">Limpiar búsqueda</button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs font-medium"
                  style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                  <th className="text-left px-4 py-3">Producto</th>
                  <th className="text-right px-4 py-3">Precio</th>
                  <th className="text-right px-4 py-3">Costo</th>
                  <th className="text-right px-4 py-3">Stock</th>
                  <th className="text-left px-4 py-3">Categoría</th>
                  <th className="text-left px-4 py-3">Código</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <tr key={p.id} className="border-b transition-colors hover:opacity-80"
                    style={{ borderColor: "var(--border)", background: i % 2 === 0 ? "transparent" : "var(--bg-primary)" }}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="shrink-0">
                          <ProductImage imageUrl={p.imageUrl} name={p.name} size="sm" />
                        </div>
                        <span className="font-medium" style={{ color: "var(--text-primary)" }}>{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold" style={{ color: "var(--brand)" }}>
                      {formatCOP(p.price)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                      {p.cost ? `${formatCOP(p.cost)}` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="badge font-mono"
                        style={{
                          background: p.stock <= p.minStock ? "var(--warning-light)" : "var(--brand-light)",
                          color: p.stock <= p.minStock ? "var(--warning)" : "var(--brand)",
                        }}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: "var(--text-muted)" }}>
                      {p.category?.name || "—"}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                      {p.barcode || "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setModal(p)}
                          className="btn-ghost w-7 h-7 rounded flex items-center justify-center">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => { if (confirm(`¿Desactivar "${p.name}"?`)) remove.mutate(p.id) }}
                          className="w-7 h-7 rounded flex items-center justify-center btn-ghost"
                          style={{ color: "var(--danger)" }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <ProductModal
          product={modal === "new" ? null : modal}
          categories={categories}
          onClose={() => setModal(null)}
          onSave={(data, image) =>
            modal === "new"
              ? create.mutate({ data, image })
              : update.mutate({ id: modal.id, data })
          }
        />
      )}
    </div>
  )
}