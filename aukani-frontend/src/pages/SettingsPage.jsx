import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { usersService } from "@/services/users.service"
import { categoriesService, paymentMethodsService } from "@/services/catalog.service"
import { useAuthStore } from "@/store/auth.store"
import { Plus, Loader2, CheckCircle, XCircle, Sun, Moon, Touchpad } from "lucide-react"
import { formatCOP } from "@/utils/currency"
import toast from "react-hot-toast"
import { agentService } from "@/services/agent.service"
import { confirm } from "@/components/ui/ConfirmDialog"
import Checkbox from "@/components/ui/Checkbox"
import { useThemeStore } from "@/store/theme.store"
import { useUiStore } from "@/store/ui.store"

const ALL_TABS = [
  { name: "General",         roles: ["ADMIN", "JEFE", "VENDEDOR"] },
  { name: "Negocio",         roles: ["ADMIN", "JEFE"] },
  { name: "Impresora",       roles: ["ADMIN", "JEFE", "VENDEDOR"] },
  { name: "Usuarios",        roles: ["ADMIN"] },
  { name: "Categorías",      roles: ["ADMIN", "JEFE"] },
  { name: "Métodos de pago", roles: ["ADMIN", "JEFE"] },
]

// ── General ───────────────────────────────────────────────
function GeneralTab() {
  const { theme, toggle } = useThemeStore()
  const { touchMode, setTouchMode } = useUiStore()

  return (
    <div className="max-w-sm space-y-5">

      {/* Apariencia */}
      <div className="card p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Apariencia
        </p>
        <button
          onClick={toggle}
          className="w-full flex items-center justify-between gap-3 p-3 rounded-xl transition-all"
          style={{ background: "var(--bg-tertiary)" }}>
          <div className="flex items-center gap-3">
            {theme === "dark"
              ? <Moon size={18} style={{ color: "var(--brand)" }} />
              : <Sun  size={18} style={{ color: "var(--warning)" }} />}
            <div className="text-left">
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {theme === "dark" ? "Modo oscuro" : "Modo claro"}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {theme === "dark" ? "Cambia a modo claro" : "Cambia a modo oscuro"}
              </p>
            </div>
          </div>
          {/* Toggle pill */}
          <div className="relative w-11 h-6 rounded-full shrink-0 transition-colors duration-200"
            style={{ background: theme === "dark" ? "var(--brand)" : "var(--bg-secondary)", border: "1.5px solid var(--border)" }}>
            <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
              style={{ transform: theme === "dark" ? "translateX(1.25rem)" : "translateX(0.1rem)" }} />
          </div>
        </button>
      </div>

      {/* Pantalla táctil */}
      <div className="card p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Pantalla táctil
        </p>
        <button
          onClick={() => setTouchMode()}
          className="w-full flex items-center justify-between gap-3 p-3 rounded-xl transition-all"
          style={{ background: "var(--bg-tertiary)" }}>
          <div className="flex items-center gap-3">
            <Touchpad size={18} style={{ color: touchMode ? "var(--brand)" : "var(--text-muted)" }} />
            <div className="text-left">
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Modo táctil
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Toca la cantidad para abrir un teclado numérico
              </p>
            </div>
          </div>
          <div className="relative w-11 h-6 rounded-full shrink-0 transition-colors duration-200"
            style={{ background: touchMode ? "var(--brand)" : "var(--bg-secondary)", border: "1.5px solid var(--border)" }}>
            <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
              style={{ transform: touchMode ? "translateX(1.25rem)" : "translateX(0.1rem)" }} />
          </div>
        </button>
      </div>

    </div>
  )
}

// ── Usuarios ─────────────────────────────────────────────
function UsersTab() {
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "VENDEDOR" })
  const qc = useQueryClient()

  const { data: users = [], isLoading } = useQuery({ queryKey: ["users"], queryFn: usersService.getAll })
  const create = useMutation({
    mutationFn: usersService.create,
    onSuccess: () => { toast.success("Usuario creado"); qc.invalidateQueries({ queryKey: ["users"] }); setModal(false); setForm({ name: "", email: "", password: "", role: "VENDEDOR" }) },
    onError: e => toast.error(e.response?.data?.error || "Error"),
  })
  const deactivate = useMutation({
    mutationFn: usersService.deactivate,
    onSuccess: () => { toast.success("Usuario desactivado"); qc.invalidateQueries({ queryKey: ["users"] }) },
    onError: e => toast.error(e.response?.data?.error || "Error"),
  })

  const ROLES = { ADMIN: { label: "Admin", color: "var(--danger)" }, JEFE: { label: "Jefe", color: "var(--warning)" }, VENDEDOR: { label: "Vendedor", color: "var(--brand)" } }

  return (
    <div className="space-y-4">
      <button onClick={() => setModal(true)} className="btn-primary btn-md"><Plus size={15} /> Nuevo usuario</button>
      {isLoading ? <Loader2 className="animate-spin" style={{ color: "var(--text-muted)" }} /> : (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="card p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0"
                style={{ background: "var(--brand)" }}>{u.name[0].toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{u.name}</p>
                <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{u.email}</p>
              </div>
              <span className="badge text-xs" style={{ color: ROLES[u.role]?.color, background: `${ROLES[u.role]?.color}22` }}>{ROLES[u.role]?.label}</span>
              {u.active && (
                <button onClick={() => { confirm({ title: `¿Desactivar a ${u.name}?`, message: "El usuario no podrá iniciar sesión.", confirmLabel: "Desactivar" }).then(ok => { if (ok) deactivate.mutate(u.id) }) }}
                  className="btn-ghost w-7 h-7 rounded flex items-center justify-center text-xs"
                  style={{ color: "var(--danger)" }}>✕</button>
              )}
            </div>
          ))}
        </div>
      )}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setModal(false)}>
          <div className="card p-6 w-full max-w-sm animate-slide-up" onClick={e => e.stopPropagation()}>
            <h2 className="font-display font-bold text-lg mb-4" style={{ color: "var(--text-primary)" }}>Nuevo usuario</h2>
            <form onSubmit={e => { e.preventDefault(); create.mutate(form) }} className="space-y-3">
              {[["Nombre", "name", "text"], ["Email", "email", "email"], ["Contraseña", "password", "password"]].map(([label, key, type]) => (
                <div key={key}>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>{label}</label>
                  <input type={type} required className="input" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Rol</label>
                <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="VENDEDOR">Vendedor</option>
                  <option value="JEFE">Jefe</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setModal(false)} className="btn-outline btn-md flex-1">Cancelar</button>
                <button type="submit" className="btn-primary btn-md flex-1" disabled={create.isPending}>Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Catálogos simples (categorías y métodos de pago) ──────
function SimpleListTab({ queryKey, fetchFn, createFn, deleteFn, label, minItems = 0 }) {
  const [name, setName] = useState("")
  const qc = useQueryClient()
  const { data = [], isLoading } = useQuery({ queryKey: [queryKey], queryFn: fetchFn })

  const activeItems = data.filter(item => item.active !== false)

  const create = useMutation({
    mutationFn: () => createFn(name),
    onSuccess: () => {
      toast.success(`${label} creado`)
      qc.invalidateQueries({ queryKey: [queryKey] })
      qc.invalidateQueries({ queryKey: ["payment-methods"] })
      setName("")
    },
    onError: e => toast.error(e.response?.data?.error || "Error"),
  })

  const remove = useMutation({
    mutationFn: deleteFn,
    onSuccess: () => {
      toast.success(`${label} eliminado`)
      qc.invalidateQueries({ queryKey: [queryKey] })
      qc.invalidateQueries({ queryKey: ["payment-methods"] })
    },
    onError: e => toast.error(e.response?.data?.error || "Error"),
  })

  const handleDelete = (item) => {
    if (activeItems.length <= minItems) {
      toast.error(`Debe haber al menos ${minItems} ${label.toLowerCase()}`)
      return
    }
    confirm({ title: `¿Eliminar "${item.name}"?`, message: "Esta acción no se puede deshacer.", confirmLabel: "Eliminar" }).then(ok => { if (ok) remove.mutate(item.id) })
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && name.trim()) create.mutate()
  }

  return (
    <div className="space-y-3 max-w-sm">
      <div className="flex gap-2">
        <input
          className="input"
          placeholder={`Nuevo ${label.toLowerCase()}...`}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          onClick={() => create.mutate()}
          disabled={!name.trim() || create.isPending}
          className="btn-primary btn-md shrink-0">
          {create.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={15} />}
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 size={18} className="animate-spin" style={{ color: "var(--text-muted)" }} />
        </div>
      ) : activeItems.length === 0 ? (
        <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
          No hay {label.toLowerCase()}s registradas
        </p>
      ) : (
        <div className="space-y-1.5">
          {activeItems.map((item, idx) => {
            const isLast = activeItems.length <= minItems
            return (
              <div key={item.id} className="card px-3 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {item.name}
                  </span>
                  {isLast && (
                    <span className="badge text-xs px-1.5"
                      style={{ background: "var(--brand-light)", color: "var(--brand)" }}>
                      requerido
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(item)}
                  disabled={isLast || remove.isPending}
                  title={isLast ? `Debe haber al menos ${minItems}` : `Eliminar ${item.name}`}
                  className="w-6 h-6 rounded flex items-center justify-center transition-opacity"
                  style={{
                    color: "var(--danger)",
                    opacity: isLast ? 0.3 : 1,
                    cursor: isLast ? "not-allowed" : "pointer",
                  }}>
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}

      {minItems > 0 && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          * Debe haber al menos {minItems} {label.toLowerCase()} activo
        </p>
      )}
    </div>
  )
}

// ── Configuración de impresora / agente ──────────────────
function PrinterTab() {
  const [status, setStatus] = useState(null)
  const [checking, setChecking] = useState(false)
  const [printers, setPrinters] = useState([])
  const [selectedPrinter, setSelectedPrinter] = useState("")
  const [useAgent, setUseAgent] = useState(true)

  // Cargar config guardada
  useState(() => {
    const cfg = JSON.parse(localStorage.getItem("aukani_agent") || "{}")
    setUseAgent(cfg.useAgent !== false)
    setSelectedPrinter(cfg.printer || "")
  })

  const checkAgent = async () => {
    setChecking(true)
    const result = await agentService.status()
    setStatus(result)
    if (result.ok) {
      const p = await agentService.printers()
      setPrinters(p.printers || [])
      toast.success("✅ Agente conectado")
    } else {
      toast.error("Agente no disponible — ¿está corriendo?")
    }
    setChecking(false)
  }

  const testDrawer = async () => {
    const result = await agentService.openDrawer()
    if (result.ok) toast.success("✅ Cajón abierto correctamente")
    else toast.error(`Error: ${result.error}`)
  }

  const saveAgentConfig = (cfg) => {
    localStorage.setItem("aukani_agent", JSON.stringify(cfg))
    toast.success("Configuración guardada")
  }

  const platform = navigator.platform.toLowerCase().includes("win") ? "windows" :
                   navigator.platform.toLowerCase().includes("mac") ? "mac" : "linux"

  const downloadName = platform === "windows" ? "aukani-agent-windows.exe" :
                       platform === "mac" ? "aukani-agent-mac" : "aukani-agent-linux"

  return (
    <div className="max-w-sm space-y-5">

      {/* Estado del agente */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Aukani Agent</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Controla impresora y cajón de efectivo</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: status?.ok ? "var(--brand)" : "var(--text-muted)" }} />
            <span className="text-xs font-medium" style={{ color: status?.ok ? "var(--brand)" : "var(--text-muted)" }}>
              {status === null ? "Sin verificar" : status?.ok ? `v${status.version}` : "No disponible"}
            </span>
          </div>
        </div>

        {status?.ok && (
          <div className="space-y-1 text-xs" style={{ color: "var(--text-muted)" }}>
            <p>Sistema: {status.platform}</p>
            <p>Puerto detectado: {status.detectedPort || "No detectado"}</p>
            {status.configuredPort && <p>Puerto configurado: {status.configuredPort}</p>}
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={checkAgent} disabled={checking} className="btn-outline btn-sm flex-1">
            {checking ? <Loader2 size={13} className="animate-spin" /> : null}
            {checking ? "Verificando..." : "Verificar conexión"}
          </button>
          {status?.ok && (
            <button onClick={testDrawer} className="btn-sm flex-1"
              style={{ background: "var(--brand-light)", color: "var(--brand)", border: "1px solid var(--brand)" }}>
              Probar cajón
            </button>
          )}
        </div>
      </div>

      {/* Impresora */}
      {status?.ok && printers.length > 0 && (
        <div className="space-y-2">
          <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Impresora del sistema</label>
          <select className="input" value={selectedPrinter}
            onChange={e => {
              setSelectedPrinter(e.target.value)
              saveAgentConfig({ useAgent: true, printer: e.target.value })
            }}>
            <option value="">Impresora predeterminada</option>
            {printers.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      )}

      {/* Toggle usar agente */}
      <Checkbox
        checked={useAgent}
        onChange={e => {
          setUseAgent(e.target.checked)
          saveAgentConfig({ useAgent: e.target.checked, printer: selectedPrinter })
        }}
        label="Usar agente local"
        sublabel="Si está desactivado, se abrirá una ventana del navegador para imprimir"
      />

      {/* Descarga del agente */}
      <div className="card p-4 space-y-3" style={{ background: "var(--bg-primary)" }}>
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          ¿No tienes el agente instalado?
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Descarga e instala el agente en el computador donde está conectada la impresora.
          Deja el programa abierto mientras usas Aukani POS.
        </p>
        <div className="flex flex-col gap-2">
          <a href="/api/downloads/aukani-agent-windows.exe" download="aukani-agent-windows.exe"
            className="btn-outline btn-sm text-center">
            ⬇ Descargar para Windows (.exe)
          </a>
          <a href="/api/downloads/aukani-agent-linux" download="aukani-agent-linux"
            className="btn-outline btn-sm text-center">
            ⬇ Descargar para Linux
          </a>
        </div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Versión 1.0.0 · Compatible con impresoras ESC/POS de 80mm
        </p>
      </div>
    </div>
  )
}

// ── Configuración del negocio ─────────────────────────────
function BusinessTab() {
  const STORAGE_KEY = "aukani_business"
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
  const [form, setForm] = useState({
    name:    stored.name    || "Aukani POS",
    nit:     stored.nit     || "",
    address: stored.address || "",
    phone:   stored.phone   || "",
    footer:  stored.footer  || "¡Gracias por su compra!",
  })
  const [saved, setSaved] = useState(false)

  const handleSave = (e) => {
    e.preventDefault()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const field = (label, key, placeholder, multiline = false) => (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>{label}</label>
      {multiline
        ? <textarea className="input resize-none" rows={2} value={form[key]} placeholder={placeholder}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
        : <input type="text" className="input" value={form[key]} placeholder={placeholder}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
      }
    </div>
  )

  return (
    <div className="max-w-sm space-y-4">
      <div className="card p-4 space-y-1" style={{ background: "var(--brand-light)", borderColor: "var(--brand)" }}>
        <p className="text-xs font-semibold" style={{ color: "var(--brand)" }}>Datos de la factura</p>
        <p className="text-xs" style={{ color: "var(--brand)" }}>Esta información aparecerá en el encabezado de cada recibo impreso.</p>
      </div>
      <form onSubmit={handleSave} className="space-y-3">
        {field("Nombre del negocio *", "name", "Mi Tienda")}
        {field("NIT / RUT", "nit", "123456789-0")}
        {field("Dirección", "address", "Calle 123 #45-67")}
        {field("Teléfono", "phone", "300 123 4567")}
        {field("Mensaje de pie de página", "footer", "¡Gracias por su compra!", true)}
        <button type="submit" className="btn-primary btn-md w-full">
          {saved ? "✅ Guardado" : "Guardar configuración"}
        </button>
      </form>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────
export default function SettingsPage() {
  const [tab, setTab] = useState(0)
  const { user } = useAuthStore()

  const visibleTabs = ALL_TABS.filter(t => t.roles.includes(user?.role))
  const activeTab = visibleTabs[tab]?.name

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="font-display font-bold text-xl" style={{ color: "var(--text-primary)" }}>Configuración</h1>

      <div className="flex gap-1 border-b overflow-x-auto" style={{ borderColor: "var(--border)" }}>
        {visibleTabs.map((t, i) => (
          <button key={t.name} onClick={() => setTab(i)}
            className="px-4 py-2 text-sm transition-colors border-b-2 -mb-px shrink-0"
            style={{ borderColor: tab === i ? "var(--brand)" : "transparent", color: tab === i ? "var(--brand)" : "var(--text-muted)", fontWeight: tab === i ? 600 : 400 }}>
            {t.name}
          </button>
        ))}
      </div>

      <div className="animate-fade-in">
        {activeTab === "General"         && <GeneralTab />}
        {activeTab === "Negocio"         && <BusinessTab />}
        {activeTab === "Impresora"       && <PrinterTab />}
        {activeTab === "Usuarios"        && <UsersTab />}
        {activeTab === "Categorías"      && <SimpleListTab queryKey="categories" fetchFn={categoriesService.getAll} createFn={categoriesService.create} deleteFn={categoriesService.delete} label="Categoría" />}
        {activeTab === "Métodos de pago" && <SimpleListTab queryKey="payment-methods" fetchFn={paymentMethodsService.getAll} createFn={paymentMethodsService.create} deleteFn={paymentMethodsService.delete} label="Método de pago" minItems={1} />}
      </div>
    </div>
  )
}