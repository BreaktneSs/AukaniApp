// Reemplaza agentService para Electron — usa IPC nativo, sin servidor HTTP externo

const STORAGE_KEY = "aukani_printer"

function getConfig() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") } catch { return {} }
}

function saveConfig(cfg) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
}

export const printerService = {
  getConfig,
  saveConfig,

  list: () => window.electronAPI.printerList(),

  openDrawer: () => {
    const { name } = getConfig()
    return window.electronAPI.printerOpenDrawer(name || null)
  },

  print: (html) => {
    const { name } = getConfig()
    return window.electronAPI.printerPrint(html, name || null)
  },

  preview: (html) => window.electronAPI.printerPreview(html),
}
