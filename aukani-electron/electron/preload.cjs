const { contextBridge, ipcRenderer } = require("electron")

// Lectura síncrona: disponible antes de que React monte cualquier componente
const config = ipcRenderer.sendSync("config:get")

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,

  // ── Servidor ──────────────────────────────────────────
  serverUrl:    config.serverUrl || null,
  setServerUrl: (url) => ipcRenderer.invoke("config:set-server-url", url),
  relaunch:     () => ipcRenderer.send("config:relaunch"),

  // ── Impresora (nativo — sin agente externo) ───────────
  printerList:      ()               => ipcRenderer.invoke("printer:list"),
  printerOpenDrawer:(name)           => ipcRenderer.invoke("printer:open-drawer", name),
  printerPrint:     (html, name)     => ipcRenderer.invoke("printer:print", { html, name }),
})
