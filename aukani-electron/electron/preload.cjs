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
  printerPreview:   (html)           => ipcRenderer.invoke("printer:preview", html),

  // ── Acceso remoto (túnel SSH + SOCKS5) ────────────────
  remoteAccessConfig: config.remoteAccess || null,
  remoteConnect:      (cfg)          => ipcRenderer.invoke("remote:connect", cfg),
  remoteDisconnect:   ()             => ipcRenderer.invoke("remote:disconnect"),
  remoteStatus:       ()             => ipcRenderer.invoke("remote:status"),

  // ── Cierre de la app (confirmación + logout obligatorio) ──
  onBeforeClose: (callback) => ipcRenderer.on("app:before-close", callback),
  confirmClose:  ()         => ipcRenderer.send("app:confirm-close"),

  // ── Auto-actualización ────────────────────────────────
  checkForUpdates: () => ipcRenderer.invoke("app:check-for-updates"),
  getVersion:      () => ipcRenderer.invoke("app:get-version"),

  // ── Controles de ventana (sin marco nativo — barra propia) ──
  windowMinimize:         () => ipcRenderer.send("window:minimize"),
  windowMaximize:         () => ipcRenderer.send("window:maximize"),
  windowClose:            () => ipcRenderer.send("window:close"),
  windowIsMaximized:      () => ipcRenderer.invoke("window:is-maximized"),
  onWindowMaximizedChange:(callback) => ipcRenderer.on("window:maximized-changed", (_e, isMaximized) => callback(isMaximized)),
})
