import { useState, useEffect } from "react"
import { Download, CheckCircle2 } from "lucide-react"

// Se activa cuando electron/main.js detecta una versión nueva (chequeo silencioso al
// abrir la app, o desde "Buscar actualizaciones" en Configuración). A propósito NO
// tiene botón de cerrar ni se cierra clickeando afuera — no se puede saltar. Una vez
// que el usuario le da "Descargar", se muestra el progreso y al terminar se instala
// sola (main.js llama quitAndInstall automáticamente).
export default function UpdateModal() {
  const [update, setUpdate] = useState(null)     // { version } | null — hay novedad
  const [percent, setPercent] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  useEffect(() => {
    if (!window.electronAPI?.isElectron) return
    window.electronAPI.onUpdateAvailable(info => setUpdate(info))
    window.electronAPI.onUpdateProgress(({ percent }) => setPercent(percent))
    window.electronAPI.onUpdateDownloaded(() => setDownloaded(true))
  }, [])

  if (!update) return null

  const handleDownload = () => {
    setDownloading(true)
    window.electronAPI.startUpdateDownload()
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="card p-6 w-full max-w-sm space-y-4 animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--brand-light)" }}>
            {downloaded ? <CheckCircle2 size={20} style={{ color: "var(--brand)" }} /> : <Download size={20} style={{ color: "var(--brand)" }} />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-base" style={{ color: "var(--text-primary)" }}>
              {downloaded ? "Instalando actualización" : "Actualización disponible"}
            </h3>
            {update.version && (
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Versión {update.version}</p>
            )}
          </div>
        </div>

        {downloaded ? (
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
