import { useQuery } from "@tanstack/react-query"
import { ordersService } from "@/services/orders.service"
import { inventoryService } from "@/services/inventory.service"
import { TrendingUp, ShoppingCart, AlertTriangle, DollarSign, Loader2 } from "lucide-react"

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
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="font-display font-bold text-xl" style={{ color: "var(--text-primary)" }}>Dashboard</h1>
        <p className="text-sm capitalize" style={{ color: "var(--text-muted)" }}>{today}</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--text-muted)" }} />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={DollarSign} label="Ventas del día" value={`$${Number(summary?.totalRevenue || 0).toFixed(2)}`} color="var(--brand)" />
          <StatCard icon={ShoppingCart} label="Transacciones" value={summary?.totalOrders || 0} color="var(--info)" sub="órdenes completadas" />
          <StatCard icon={TrendingUp} label="Ticket promedio"
            value={summary?.totalOrders > 0 ? `$${(summary.totalRevenue / summary.totalOrders).toFixed(2)}` : "$0.00"}
            color="var(--warning)" />
          <StatCard icon={AlertTriangle} label="Stock bajo" value={lowStock.length} color="var(--danger)"
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
    </div>
  )
}