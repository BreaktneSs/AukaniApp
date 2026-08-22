import { useState, useMemo, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { ordersService } from "@/services/orders.service"
import { inventoryService } from "@/services/inventory.service"
import {
  TrendingUp, ShoppingCart, AlertTriangle, DollarSign, Loader2,
  CreditCard, Banknote, XCircle, BarChart2, Calendar, ArrowUpRight,
  Percent, Award, ChevronRight,
} from "lucide-react"
import { formatCOP } from "@/utils/currency"

// ── Helpers ───────────────────────────────────────────────
function toInputDate(date) {
  return date.toISOString().split("T")[0]
}

const PERIODS = [
  { label: "Hoy",       days: 0 },
  { label: "7 días",    days: 6 },
  { label: "30 días",   days: 29 },
  { label: "Personalizado", days: null },
]

const PAYMENT_COLORS = [
  "var(--brand)",
  "var(--info)",
  "var(--warning)",
  "#a855f7",
  "#f43f5e",
]

const PAYMENT_ICONS = { Efectivo: Banknote, Tarjeta: CreditCard }

// ── StatCard ──────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="card p-5 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{label}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}22` }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      <p className="font-display font-bold text-3xl font-mono" style={{ color: "var(--text-primary)" }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{sub}</p>}
    </div>
  )
}

// ── LineChart (SVG puro, interactivo) ────────────────────
function LineChart({ data }) {
  const [active, setActive] = useState(null)
  const svgRef = useRef(null)

  const W = 600, H = 135
  const PAD = { top: 16, right: 20, bottom: 28, left: 52 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const maxRevenue = Math.max(...data.map(d => d.revenue), 1)
  const n = data.length

  const fmt = (v) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`
    return `$${v}`
  }

  const formatLabel = (dateStr) => {
    const d = new Date(dateStr + "T12:00:00")
    if (n <= 1)  return d.toLocaleDateString("es-CO", { day: "numeric", month: "short" })
    if (n <= 7)  return d.toLocaleDateString("es-CO", { weekday: "short" })
    return d.toLocaleDateString("es-CO", { day: "numeric", month: "short" })
  }

  const formatFull = (dateStr) => {
    const d = new Date(dateStr + "T12:00:00")
    return d.toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" })
  }

  // Coordenadas de cada punto
  const pts = data.map((d, i) => ({
    x: n === 1 ? PAD.left + chartW / 2 : PAD.left + (i / (n - 1)) * chartW,
    y: PAD.top + chartH - (d.revenue / maxRevenue) * chartH,
    ...d,
  }))

  // Path de la línea
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")

  // Path del área (cierra por abajo)
  const areaPath = pts.length > 0
    ? `${linePath} L ${pts[pts.length - 1].x} ${PAD.top + chartH} L ${pts[0].x} ${PAD.top + chartH} Z`
    : ""

  // Hover: convertir coordenadas de pantalla → espacio SVG con getScreenCTM
  const handleMouseMove = (e) => {
    const svg = svgRef.current
    if (!svg) return
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse())
    let closest = null, minDist = Infinity
    pts.forEach((p, i) => {
      const dist = Math.abs(p.x - svgPt.x)
      if (dist < minDist) { minDist = dist; closest = i }
    })
    setActive(closest)
  }

  const ap = active !== null ? pts[active] : null

  // Tooltip: no salirse del SVG
  const tooltipW = 148, tooltipH = 62
  const tooltipX = ap ? Math.min(Math.max(ap.x - tooltipW / 2, PAD.left), W - PAD.right - tooltipW) : 0
  const tooltipY = ap ? (ap.y - tooltipH - 12 < PAD.top ? ap.y + 14 : ap.y - tooltipH - 12) : 0

  return (
    <div className="w-full select-none" style={{ position: "relative", paddingBottom: `${(H / W) * 100}%` }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "crosshair" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setActive(null)}
      >
        <defs>
          <linearGradient id="lineAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.02" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Líneas guía horizontales */}
        {[0.25, 0.5, 0.75, 1].map(pct => {
          const y = PAD.top + chartH - pct * chartH
          return (
            <g key={pct}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
                stroke="var(--border)" strokeWidth="0.6" strokeDasharray="5,5" />
              <text x={PAD.left - 6} y={y + 3} fontSize="9" fill="var(--text-muted)" textAnchor="end">
                {fmt(maxRevenue * pct)}
              </text>
            </g>
          )
        })}

        {/* Área bajo la curva */}
        {areaPath && <path d={areaPath} fill="url(#lineAreaGrad)" />}

        {/* Línea principal */}
        {linePath && (
          <path d={linePath} fill="none" stroke="var(--brand)" strokeWidth="2"
            strokeLinejoin="round" strokeLinecap="round" />
        )}

        {/* Puntos siempre visibles */}
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.revenue > 0 ? 3 : 2}
            fill={p.revenue > 0 ? "var(--brand)" : "var(--border)"}
            stroke="var(--bg-secondary)" strokeWidth="1.5" />
        ))}

        {/* Línea vertical + punto activo */}
        {ap && (
          <g>
            <line x1={ap.x} y1={PAD.top} x2={ap.x} y2={PAD.top + chartH}
              stroke="var(--brand)" strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
            <circle cx={ap.x} cy={ap.y} r="7"
              fill="var(--brand)" stroke="var(--bg-secondary)" strokeWidth="2.5"
              filter="url(#glow)" />

            {/* Tooltip */}
            <rect x={tooltipX} y={tooltipY} width={tooltipW} height={tooltipH}
              rx="8" fill="var(--bg-secondary)"
              stroke="var(--brand)" strokeWidth="1.2" opacity="0.98" />
            <text x={tooltipX + 12} y={tooltipY + 17} fontSize="10"
              fill="var(--text-muted)" fontWeight="500">
              {formatFull(ap.date)}
            </text>
            <text x={tooltipX + 12} y={tooltipY + 36} fontSize="14"
              fill="var(--brand)" fontWeight="bold" fontFamily="monospace">
              {fmt(ap.revenue)}
            </text>
            <text x={tooltipX + 12} y={tooltipY + 52} fontSize="10" fill="var(--text-muted)">
              {ap.orders} {ap.orders === 1 ? "venta" : "ventas"}
            </text>
          </g>
        )}

        {/* Etiquetas eje X */}
        {pts.map((p, i) => {
          const skip = n > 14 && i % 3 !== 0
          if (skip) return null
          return (
            <text key={i} x={p.x} y={H - 6} textAnchor="middle"
              fontSize="9" fill={active === i ? "var(--brand)" : "var(--text-muted)"}
              fontWeight={active === i ? "700" : "400"}>
              {formatLabel(p.date)}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

// ── PaymentBar ────────────────────────────────────────────
function PaymentBar({ name, amount, pct, count, color }) {
  const Icon = PAYMENT_ICONS[name] || CreditCard
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${color}22` }}>
            <Icon size={12} style={{ color }} />
          </div>
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{name}</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>
            {count} ventas
          </span>
        </div>
        <div className="text-right">
          <span className="font-mono font-bold text-sm" style={{ color }}>{formatCOP(amount)}</span>
          <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>{pct}%</span>
        </div>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

// ── AccountingSection ─────────────────────────────────────
function AccountingSection() {
  const today = new Date()
  const [activePeriod, setActivePeriod] = useState(1)
  const [customFrom, setCustomFrom] = useState(toInputDate(today))
  const [customTo,   setCustomTo]   = useState(toInputDate(today))

  const { from, to } = useMemo(() => {
    if (activePeriod === 3) return { from: customFrom, to: customTo }
    const days = PERIODS[activePeriod].days
    const f = new Date(today); f.setDate(today.getDate() - days); f.setHours(0,0,0,0)
    return { from: toInputDate(f), to: toInputDate(today) }
  }, [activePeriod, customFrom, customTo])

  const { data, isLoading } = useQuery({
    queryKey: ["accounting", from, to],
    queryFn: () => ordersService.getAccounting({ from, to }),
    staleTime: 60_000,
  })

  const [trendFilter, setTrendFilter] = useState("all")

  const s = data?.summary
  const rawTrend = data?.dailyTrend || []
  const trend = rawTrend.map(d => ({
    ...d,
    revenue: trendFilter === "services" ? (d.revenueServices ?? 0)
           : trendFilter === "products" ? (d.revenueProducts ?? 0)
           : d.revenue,
  }))
  const pmts   = data?.paymentBreakdown || []
  const tops   = data?.topProducts     || []
  const maxTop = Math.max(...tops.map(p => p.revenue), 1)

  const TREND_FILTERS = [
    { key: "all",      label: "Todo" },
    { key: "services", label: "Servicios" },
    { key: "products", label: "Productos" },
  ]

  return (
    <div className="space-y-4">
      {/* Encabezado + selector de período */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--brand-light)" }}>
            <BarChart2 size={16} style={{ color: "var(--brand)" }} />
          </div>
          <div>
            <h2 className="font-display font-bold text-base" style={{ color: "var(--text-primary)" }}>Contabilidad</h2>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Resumen de ventas por período</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {PERIODS.map((p, i) => (
            <button key={i} onClick={() => setActivePeriod(i)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
              style={{
                background: activePeriod === i ? "var(--brand)" : "transparent",
                borderColor: activePeriod === i ? "var(--brand)" : "var(--border)",
                color: activePeriod === i ? "#fff" : "var(--text-secondary)",
              }}>
              {p.label}
            </button>
          ))}
          {activePeriod === 3 && (
            <div className="flex items-center gap-1.5">
              <Calendar size={12} style={{ color: "var(--text-muted)" }} />
              <input type="date" className="input text-xs py-1 px-2 h-7"
                value={customFrom} max={customTo}
                onChange={e => setCustomFrom(e.target.value)} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
              <input type="date" className="input text-xs py-1 px-2 h-7"
                value={customTo} min={customFrom} max={toInputDate(today)}
                onChange={e => setCustomTo(e.target.value)} />
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={22} className="animate-spin" style={{ color: "var(--text-muted)" }} />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                icon: DollarSign, label: "Ingresos",
                value: formatCOP(s?.totalRevenue || 0),
                sub: `${s?.totalOrders || 0} órdenes completadas`,
                color: "var(--brand)",
              },
              {
                icon: TrendingUp, label: "Ticket promedio",
                value: formatCOP(s?.avgTicket || 0),
                sub: "por transacción",
                color: "var(--info)",
              },
              {
                icon: ShoppingCart, label: "Transacciones",
                value: s?.totalOrders || 0,
                sub: "ventas completadas",
                color: "var(--warning)",
              },
              {
                icon: XCircle, label: "Cancelaciones",
                value: s?.cancelledCount || 0,
                sub: s?.cancelledCount > 0 ? "órdenes canceladas" : "sin cancelaciones",
                color: "var(--danger)",
              },
            ].map((k, i) => (
              <div key={i} className="card p-4 animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-start justify-between mb-3">
                  <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{k.label}</p>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${k.color}22` }}>
                    <k.icon size={14} style={{ color: k.color }} />
                  </div>
                </div>
                <p className="font-display font-bold text-2xl font-mono leading-none mb-1"
                  style={{ color: "var(--text-primary)" }}>{k.value}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Tendencia diaria — ancho completo */}
          <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Tendencia de ventas</h3>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {TREND_FILTERS.map(f => (
                      <button key={f.key} onClick={() => setTrendFilter(f.key)}
                        className="px-2.5 py-1 rounded text-xs font-medium transition-all border"
                        style={{
                          background: trendFilter === f.key ? "var(--brand)" : "transparent",
                          borderColor: trendFilter === f.key ? "var(--brand)" : "var(--border)",
                          color: trendFilter === f.key ? "#fff" : "var(--text-muted)",
                        }}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-xs font-medium" style={{ color: "var(--brand)" }}>
                    <ArrowUpRight size={13} />
                    <span>{trend.filter(d => d.revenue > 0).length} días activos</span>
                  </div>
                </div>
              </div>

              {trend.every(d => d.revenue === 0) ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <BarChart2 size={24} style={{ color: "var(--text-muted)" }} />
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>Sin ventas en este período</p>
                </div>
              ) : (
                <>
                  <LineChart data={trend} />
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                    {(() => {
                      const best  = trend.reduce((a, b) => b.revenue > a.revenue ? b : a, trend[0])
                      const active = trend.filter(d => d.revenue > 0).length
                      const fmt = (d) => new Date(d + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" })
                      return [
                        { label: "Mejor día", value: best?.revenue > 0 ? fmt(best.date) : "—", color: "var(--brand)" },
                        { label: "Días con ventas", value: active, color: "var(--info)" },
                      ].map(item => (
                        <div key={item.label} className="text-center">
                          <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>{item.label}</p>
                          <p className="font-mono font-bold text-sm" style={{ color: item.color }}>{item.value}</p>
                        </div>
                      ))
                    })()}
                  </div>
                </>
              )}
          </div>

          {/* Métodos de pago */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Por método de pago</h3>
              <Percent size={14} style={{ color: "var(--text-muted)" }} />
            </div>

            {pmts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <CreditCard size={24} style={{ color: "var(--text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Sin pagos registrados</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                {pmts.map((p, i) => (
                  <PaymentBar key={p.name} {...p} color={PAYMENT_COLORS[i % PAYMENT_COLORS.length]} />
                ))}
                <div className="sm:col-span-2 lg:col-span-3 pt-2 border-t flex items-center justify-between"
                  style={{ borderColor: "var(--border)" }}>
                  <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Total recaudado</span>
                  <span className="font-mono font-bold text-sm" style={{ color: "var(--brand)" }}>
                    {formatCOP(pmts.reduce((s, p) => s + p.amount, 0))}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Top productos */}
          {tops.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3.5 border-b flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
                <Award size={14} style={{ color: "var(--warning)" }} />
                <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Top productos del período</h3>
              </div>
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {tops.map((p, i) => (
                  <div key={p.name} className="px-5 py-3 flex items-center gap-4">
                    <span className="font-display font-bold text-lg w-6 text-center"
                      style={{ color: i === 0 ? "var(--warning)" : "var(--text-muted)" }}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{p.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="h-1.5 rounded-full flex-1" style={{ background: "var(--bg-tertiary)" }}>
                          <div className="h-1.5 rounded-full"
                            style={{ width: `${(p.revenue / maxTop) * 100}%`, background: i === 0 ? "var(--warning)" : "var(--brand)" }} />
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono font-bold text-sm" style={{ color: "var(--brand)" }}>{formatCOP(p.revenue)}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{p.quantity} uds vendidas</p>
                    </div>
                    {i === 0 && <ChevronRight size={14} style={{ color: "var(--warning)" }} />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── DashboardPage ─────────────────────────────────────────
export default function DashboardPage() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ["daily-summary"],
    queryFn: ordersService.getDailySummary,
    refetchInterval: 30000,
  })

  const { data: lowStock = [] } = useQuery({
    queryKey: ["low-stock"],
    queryFn: inventoryService.getLowStock,
  })

  const today = new Date().toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })

  return (
    <div className="p-4 md:p-6 space-y-8">
      <div>
        <h1 className="font-display font-bold text-xl" style={{ color: "var(--text-primary)" }}>Dashboard</h1>
        <p className="text-sm capitalize" style={{ color: "var(--text-muted)" }}>{today}</p>
      </div>

      {/* KPIs del día */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--text-muted)" }} />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={DollarSign} label="Ventas del día"   value={formatCOP(summary?.totalRevenue || 0)} color="var(--brand)" />
          <StatCard icon={ShoppingCart} label="Transacciones"  value={summary?.totalOrders || 0} color="var(--info)" sub="órdenes completadas" />
          <StatCard icon={TrendingUp} label="Ticket promedio"
            value={summary?.totalOrders > 0 ? formatCOP(summary.totalRevenue / summary.totalOrders) : formatCOP(0)}
            color="var(--warning)" />
          <StatCard icon={AlertTriangle} label="Stock bajo"    value={lowStock.length} color="var(--danger)"
            sub={lowStock.length > 0 ? "productos bajo mínimo" : "todo en orden"} />
        </div>
      )}

      {/* Productos con stock bajo */}
      {lowStock.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
            <AlertTriangle size={14} style={{ color: "var(--warning)" }} />
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Productos con stock bajo</h2>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {lowStock.map(p => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm" style={{ color: "var(--text-primary)" }}>{p.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>mín. {p.minStock}</span>
                  <span className="badge font-mono" style={{ background: "var(--warning-light)", color: "var(--warning)" }}>
                    {p.stock} unidades
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sección contabilidad */}
      <AccountingSection />
    </div>
  )
}
