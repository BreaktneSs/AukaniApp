import { useEffect } from "react"
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from "react-router-dom"

const Router = window.electronAPI?.isElectron ? HashRouter : BrowserRouter
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "react-hot-toast"
import MainLayout from "@/layouts/MainLayout"
import TitleBar from "@/components/ui/TitleBar"
import UpdateModal from "@/components/ui/UpdateModal"
import { ConfirmProvider, confirm } from "@/components/ui/ConfirmDialog"
import ProtectedRoute from "@/components/ui/ProtectedRoute"
import { useAuthStore } from "@/store/auth.store"
import LoginPage from "@/pages/LoginPage"
import SetupPage from "@/pages/SetupPage"
import POSPage from "@/pages/POSPage"
import ProductsPage from "@/pages/ProductsPage"
import InventoryPage from "@/pages/InventoryPage"
import SalesPage from "@/pages/SalesPage"
import DashboardPage from "@/pages/DashboardPage"
import SettingsPage from "@/pages/SettingsPage"
import ShiftsPage from "@/pages/ShiftsPage"
import WaiterPage from "@/pages/WaiterPage"
import DispatchPage from "@/pages/DispatchPage"
import AuditPage from "@/pages/AuditPage"
import ReservationsPage from "@/pages/ReservationsPage"
import PurchasesPage from "@/pages/PurchasesPage"

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } })

const needsSetup = (window.electronAPI?.isElectron ?? false) && !window.electronAPI?.serverUrl

// Al cerrar con la X / Alt+F4: pide confirmación y, si se acepta, cierra sesión
// antes de dejar salir de verdad — por seguridad en terminales compartidas. Si no
// hay sesión iniciada (ej. está en la pantalla de login) no hay nada que proteger,
// así que se cierra directo sin preguntar nada.
function CloseConfirmGate() {
  useEffect(() => {
    if (!window.electronAPI?.isElectron) return
    window.electronAPI.onBeforeClose(async () => {
      if (!useAuthStore.getState().token) {
        window.electronAPI.confirmClose()
        return
      }
      const ok = await confirm({
        title: "¿Cerrar Aukani POS?",
        message: "Se cerrará tu sesión por seguridad. La próxima persona que abra la app tendrá que iniciar sesión de nuevo.",
        confirmLabel: "Cerrar sesión y salir",
        cancelLabel: "Cancelar",
        variant: "warning",
      })
      if (ok) {
        useAuthStore.getState().logout()
        window.electronAPI.confirmClose()
      }
    })
  }, [])
  return null
}

export default function App() {
  if (needsSetup) return (
    <>
      <TitleBar />
      <UpdateModal />
      <ConfirmProvider>
        <CloseConfirmGate />
        <SetupPage />
      </ConfirmProvider>
    </>
  )

  return (
    <>
    <UpdateModal />
    <QueryClientProvider client={qc}>
      <ConfirmProvider>
      <CloseConfirmGate />
      <Router>
        <Routes>
          {/* Sin sesión: la barra de título la pone esta ruta directamente — una vez
              logueado, MainLayout dibuja su propia barra unificada y deja de usar esta. */}
          <Route path="/login" element={<><TitleBar /><LoginPage /></>} />
          <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/pos" replace />} />
            <Route path="/pos"       element={<ProtectedRoute roles={["ADMIN","JEFE","VENDEDOR"]}><POSPage /></ProtectedRoute>} />
            <Route path="/waiter"    element={<ProtectedRoute roles={["ADMIN","JEFE","VENDEDOR"]}><WaiterPage /></ProtectedRoute>} />
            <Route path="/dispatch"  element={<ProtectedRoute roles={["ADMIN","JEFE","VENDEDOR"]}><DispatchPage /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute roles={["ADMIN","JEFE","VENDEDOR"]}><InventoryPage /></ProtectedRoute>} />
            <Route path="/purchases" element={<ProtectedRoute roles={["ADMIN","JEFE","VENDEDOR"]}><PurchasesPage /></ProtectedRoute>} />
            <Route path="/sales"     element={<ProtectedRoute roles={["ADMIN","JEFE","VENDEDOR"]}><SalesPage /></ProtectedRoute>} />
            <Route path="/shifts"    element={<ProtectedRoute roles={["ADMIN","JEFE"]}><ShiftsPage /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute roles={["ADMIN","JEFE"]}><DashboardPage /></ProtectedRoute>} />
            <Route path="/reservations" element={<ProtectedRoute roles={["ADMIN","JEFE","VENDEDOR"]}><ReservationsPage /></ProtectedRoute>} />
            <Route path="/settings"  element={<ProtectedRoute roles={["ADMIN","JEFE","VENDEDOR"]}><SettingsPage /></ProtectedRoute>} />
            <Route path="/audit"     element={<ProtectedRoute roles={["ADMIN"]}><AuditPage /></ProtectedRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/pos" replace />} />
        </Routes>
      </Router>
      </ConfirmProvider>
      <Toaster position="top-right" toastOptions={{
        style: { background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border)", fontSize: "13px" },
        duration: 3000,
      }} />
    </QueryClientProvider>
    </>
  )
}