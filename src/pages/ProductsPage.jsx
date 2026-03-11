import { useState, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { productsService } from "@/services/products.service"
import { categoriesService } from "@/services/catalog.service"
import { Plus, Search, Edit2, Trash2, Upload, Loader2, Package, X, Camera } from "lucide-react"
import toast from "react-hot-toast"

// ── SVG placeholder genérico ──────────────────────────────
function ProductImagePlaceholder({ size = "md" }) {
  const dims = size === "sm" ? "w-8 h-8" : size === "lg" ? "w-full h-32" : "w-full h-24"
  return (
    <div className={`${dims} rounded-lg flex items-center justify-center`}
      style={{ background: "var(--bg-tertiary)" }}>
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"
        className={size === "sm" ? "w-4 h-4" : "w-10 h-10"}>
        <rect x="4" y="10" width="40" height="28" rx="3"
          stroke="currentColor" strokeWidth="2" fill="none"
          style={{ color: "var(--border)" }} />
        <circle cx="16" cy="20" r="4"
          stroke="currentColor" strokeWidth="2" fill="none"
          style={{ color: "var(--border)" }} />
        <path d="M4 32 L14 22 L22 30 L30 22 L44 36"
          stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
          style={{ color: "var(--border)" }} />
      </svg>
    </div>
  )
}

// ── ProductImage — muestra imagen o placeholder ───────────
function ProductImage({ imageUrl, name, size = "md" }) {
  const [error, setError] = useState(false)
  if (!imageUrl || error) return <ProductImagePlaceholder size={size} />
  return (
    <img
      src={`/api${imageUrl}`}
      alt={name}
      onError={() => setError(true)}
      className={`rounded-lg object-cover ${size === "sm" ? "w-8 h-8" : size === "lg" ? "w-full h-32" : "w-full h-24"}`}
    />
  )
}

// ── ImageUploader — zona de carga de imagen ───────────────
function ImageUploader({ currentUrl, productId, onUploaded }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(currentUrl || null)
  const inputRef = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Solo se permiten imágenes JPG, PNG o WEBP")
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen no puede superar 2MB")
      return
    }

    // Preview local inmediato
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target.result)
    reader.readAsDataURL(file)

    // Si ya hay productId, subir directo
    if (productId) {
      setUploading(true)
      try {
        const result = await productsService.uploadImage(productId, file)
        onUploaded?.(result.imageUrl)
        toast.success("Imagen actualizada")
      } catch {
        toast.error("Error al subir imagen")
        setPreview(currentUrl || null)
      } finally {
        setUploading(false)
      }
    } else {
      // Producto nuevo — guardar archivo para subir después del create
      onUploaded?.(file)
    }
  }

  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
        Imagen del producto
      </label>

      <div
        className="relative rounded-lg border-2 border-dashed transition-all duration-150 cursor-pointer overflow-hidden"
        style={{
          borderColor: dragging ? "var(--brand)" : "var(--border)",
          background: dragging ? "var(--brand-light)" : "var(--bg-primary)",
        }}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp"
          className="hidden" onChange={e => handleFile(e.target.files[0])} />

        {preview ? (
          <div className="relative">
            <img src={preview.startsWith("/") ? `/api${preview}` : preview}
              alt="Preview" className="w-full h-32 object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Camera size={16} className="text-white" />
              <span className="text-white text-xs font-medium">Cambiar imagen</span>
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 size={20} className="animate-spin text-white" />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-6">
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "var(--bg-tertiary)" }}>
              <Upload size={16} style={{ color: "var(--text-muted)" }} />
            </div>
            <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              Arrastra o haz clic para subir
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              JPG, PNG, WEBP · máx 2MB
            </p>
          </div>
        )}
      </div>

      {preview && (
        <button type="button"
          onClick={e => { e.stopPropagation(); setPreview(null); onUploaded?.(null) }}
          className="mt-1 text-xs btn-ghost px-2 py-1 rounded"
          style={{ color: "var(--danger)" }}>
          Quitar imagen
        </button>
      )}
    </div>
  )
}

// ── ProductModal ──────────────────────────────────────────
function ProductModal({ product, categories, onClose, onSave }) {
  const [form, setForm] = useState({
    name: product?.name || "",
    price: product?.price || "",
    cost: product?.cost || "",
    stock: product?.stock || 0,
    minStock: product?.minStock || 0,
    barcode: product?.barcode || "",
    sku: product?.sku || "",
    categoryId: product?.categoryId || "",
  })
  const [pendingImage, setPendingImage] = useState(null) // File para subir tras crear

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(
      {
        ...form,
        price: Number(form.price),
        cost: form.cost ? Number(form.cost) : undefined,
        stock: Number(form.stock),
        minStock: Number(form.minStock),
        categoryId: form.categoryId ? Number(form.categoryId) : undefined,
      },
      pendingImage
    )
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
          {/* Imagen */}
          <ImageUploader
            currentUrl={product?.imageUrl}
            productId={product?.id}
            onUploaded={(fileOrUrl) => {
              if (fileOrUrl instanceof File) setPendingImage(fileOrUrl)
              else setPendingImage(null)
            }}
          />

          {field("Nombre *", "name", "text", { required: true, autoFocus: true })}

          <div className="grid grid-cols-2 gap-3">
            {field("Precio *", "price", "number", { required: true, min: 0, step: "0.01" })}
            {field("Costo", "cost", "number", { min: 0, step: "0.01" })}
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

// ── ProductsPage ──────────────────────────────────────────
export default function ProductsPage() {
  const [query, setQuery] = useState("")
  const [modal, setModal] = useState(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["products", query],
    queryFn: () => query
      ? productsService.search(query)
      : productsService.getAll({ limit: 200 }).then(r => r.products),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesService.getAll,
  })

  const create = useMutation({
    mutationFn: async ({ data, image }) => {
      const product = await productsService.create(data)
      if (image instanceof File) {
        await productsService.uploadImage(product.id, image)
      }
      return product
    },
    onSuccess: () => {
      toast.success("Producto creado")
      qc.invalidateQueries({ queryKey: ["products"] })
      qc.invalidateQueries({ queryKey: ["products-all"] })
      setModal(null)
    },
    onError: e => toast.error(e.response?.data?.error || "Error al crear producto"),
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

  const products = Array.isArray(data) ? data : data?.products || []

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl" style={{ color: "var(--text-primary)" }}>Productos</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{products.length} productos</p>
        </div>
        <button onClick={() => setModal("new")} className="btn-primary btn-md">
          <Plus size={16} /> Nuevo producto
        </button>
      </div>

      {/* Búsqueda */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
        <input className="input pl-9" placeholder="Buscar productos..."
          value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      {/* Tabla */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--text-muted)" }} />
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Package size={32} style={{ color: "var(--text-muted)" }} />
          <p style={{ color: "var(--text-muted)" }}>No hay productos</p>
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
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0">
                          <ProductImage imageUrl={p.imageUrl} name={p.name} size="sm" />
                        </div>
                        <span className="font-medium" style={{ color: "var(--text-primary)" }}>{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold" style={{ color: "var(--brand)" }}>
                      ${Number(p.price).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                      {p.cost ? `$${Number(p.cost).toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="badge font-mono"
                        style={{
                          background: p.stock <= p.minStock ? "var(--warning-light)" : "var(--brand-light)",
                          color: p.stock <= p.minStock ? "var(--warning)" : "var(--brand)"
                        }}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                      {p.category?.name || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                      {p.barcode || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setModal(p)}
                          className="btn-ghost w-7 h-7 rounded flex items-center justify-center">
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => { if (confirm(`¿Desactivar "${p.name}"?`)) remove.mutate(p.id) }}
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

      {/* Modal */}
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