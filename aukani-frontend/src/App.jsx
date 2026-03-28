import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "react-hot-toast"
import MainLayout from "@/layouts/MainLayout"
import ProtectedRoute from "@/components/ui/ProtectedRoute"
import LoginPage from "@/pages/LoginPage"
import POSPage from "@/pages/POSPage"
import ProductsPage from "@/pages/ProductsPage"
import InventoryPage from "@/pages/InventoryPage"
import SalesPage from "@/pages/SalesPage"
import DashboardPage from "@/pages/DashboardPage"
import SettingsPage from "@/pages/SettingsPage"
import ShiftsPage from "@/pages/ShiftsPage"

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } })

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/pos" replace />} />
            <Route path="/pos"       element={<ProtectedRoute roles={["ADMIN","JEFE","VENDEDOR"]}><POSPage /></ProtectedRoute>} />
            <Route path="/products"  element={<ProtectedRoute roles={["ADMIN","JEFE"]}><ProductsPage /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute roles={["ADMIN","JEFE","VENDEDOR"]}><InventoryPage /></ProtectedRoute>} />
            <Route path="/sales"     element={<ProtectedRoute roles={["ADMIN","JEFE"]}><SalesPage /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute roles={["ADMIN","JEFE"]}><DashboardPage /></ProtectedRoute>} />
            <Route path="/shifts"    element={<ProtectedRoute roles={["ADMIN","JEFE"]}><ShiftsPage /></ProtectedRoute>} />
            <Route path="/settings"  element={<ProtectedRoute roles={["ADMIN"]}><SettingsPage /></ProtectedRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/pos" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" toastOptions={{ style: { background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border)", fontSize: "13px" }, duration: 3000 }} />
    </QueryClientProvider>
  )
}