import { useState, useEffect, useRef } from "react"
import { Download, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react"

// Se activa cuando electron/main.js detecta una versión nueva (chequeo silencioso al
// abrir la app, o desde "Buscar actualizaciones" en Configuración). A propósito NO
// tiene botón de cerrar ni se cierra clickeando afuera — no se puede saltar. Una vez
// que el usuario le da "Descargar", se muestra el progreso y al terminar se instala
// sola (main.js llama quitAndInstall automáticamente).
//
// Si la descarga o la instalación fallan (se cortó la red, o en Linux el AppImage
// está en una carpeta sin permiso de escritura), se muestra el error con un botón
// de reintentar — sin esto el modal quedaba trabado para siempre y la caja inutilizable.
export default function UpdateModal() {
  const [update, setUpdate] = useState(null)     // { version } | null — hay novedad
  const [percent, setPercent] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [error, setError] = useState(null)       // mensaje si falló la descarga/instalación
  // Los listeners se registran una sola vez — el ref evita leer "downloading" viejo
  // del closure. Errores sin descarga en curso (ej. el chequeo silencioso al abrir
  // la app sin internet) se ignoran.
  const inProgress = useRef(false)

  useEffect(() => {
    if (!window.electronAPI?.isElectron) return
    window.electronAPI.onUpdateAvailable(info => setUpdate(info))
    window.electronAPI.onUpdateProgress(({ percent }) => setPercent(percent))
    window.electronAPI.onUpdateDownloaded(() => setDownloaded(true))
    window.electronAPI.onUpdateError?.(({ message }) => {
      if (!inProgress.current) return
      inProgress.current = false
      setDownloading(false)
      setDownloaded(false)
      setError(message || "No se pudo completar la actualización.")
    })
  }, [])

  if (!update) return null

  const handleDownload = () => {
    inProgress.current = true
    setError(null)
    setPercent(0)
    setDownloading(true)
    window.electronAPI.startUpdateDownload()
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="card p-6 w-full max-w-sm space-y-4 animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--brand-light)" }}>
            {error ? <AlertTriangle size={20} style={{ color: "var(--danger)" }} />
              : downloaded ? <CheckCircle2 size={20} style={{ color: "var(--brand)" }} />
              : <Download size={20} style={{ color: "var(--brand)" }} />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-base" style={{ color: "var(--text-primary)" }}>
              {error ? "No se pudo actualizar" : downloaded ? "Instalando actualización" : "Actualización disponible"}
            </h3>
            {update.version && (
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Versión {update.version}</p>
            )}
          </div>
        </div>

        {error ? (
          <>
            <p className="text-sm p-3 rounded-lg" style={{ color: "var(--danger)", background: "var(--danger-light)" }}>
              {error}
            </p>
            <button onClick={handleDownload}
              className="btn-md w-full text-white font-semibold flex items-center justify-center gap-2"
              style={{ background: "var(--brand)" }}>
              <RefreshCw size={15} /> Reintentar
            </button>
          </>
        ) : downloaded ? (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Descarga completa — la app se va a reiniciar sola en un momento.
          </p>
        ) : downloading ? (
          <div className="space-y-2">
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${percent}%`, background: "var(--brand)" }} />
            </div>
            <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>Descargando... {percent}%</p>
          </div>
        ) : (
          <>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Hay una nueva versión de Aukani POS lista para instalar.
            </p>
            <button onClick={handleDownload}
              className="btn-md w-full text-white font-semibold flex items-center justify-center gap-2"
              style={{ background: "var(--brand)" }}>
              <Download size={15} /> Descargar actualización
            </button>
          </>
        )}
      </div>
    </div>
  )
}
