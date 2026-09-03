import { app, BrowserWindow, ipcMain, session } from "electron"
import { fileURLToPath } from "url"
import path from "path"
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "fs"
import { execSync } from "child_process"
import { tmpdir } from "os"
import net from "net"
import { Client as SSHClient } from "ssh2"
import electronUpdater from "electron-updater"
const { autoUpdater } = electronUpdater

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = !app.isPackaged

// ── Config en userData ────────────────────────────────────

function configPath() {
  return path.join(app.getPath("userData"), "config.json")
}

// Valores por defecto embebidos al construir el instalador (ver scripts/set-default-config.js).
// Solo se usan la primerísima vez que arranca la app en un equipo — una vez que existe
// config.json en userData, ese es el que manda, y este archivo ya no se vuelve a leer.
function defaultConfigPath() {
  return path.join(__dirname, "default-config.json")
}

function readConfig() {
  try {
    if (existsSync(configPath())) return JSON.parse(readFileSync(configPath(), "utf-8"))
  } catch {}

  try {
    if (existsSync(defaultConfigPath())) {
      const defaults = JSON.parse(readFileSync(defaultConfigPath(), "utf-8"))
      writeConfig(defaults)
      return defaults
    }
  } catch {}

  return {}
}

function writeConfig(cfg) {
  writeFileSync(configPath(), JSON.stringify(cfg, null, 2), "utf-8")
}

ipcMain.on("config:get", (event) => {
  event.returnValue = readConfig()
})

ipcMain.handle("config:set-server-url", (_, url) => {
  const cfg = readConfig()
  cfg.serverUrl = url
  writeConfig(cfg)
})

ipcMain.on("config:relaunch", () => {
  app.relaunch()
  app.exit(0)
})

// ── Impresora — helpers nativos ───────────────────────────

// ESC p 0 25 250 — pulso 50ms en pin 2 (estándar cajón POS)
const DRAWER_BYTES = [0x1B, 0x70, 0x00, 0x19, 0xFA]

function listSystemPrinters() {
  try {
    if (process.platform === "win32") {
      const out = execSync(
        'powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"',
        { encoding: "utf-8", timeout: 5000 }
      )
      return out.trim().split(/\r?\n/).map(n => n.trim()).filter(Boolean)
    } else {
      const out = execSync("lpstat -a 2>/dev/null", { encoding: "utf-8", timeout: 5000 })
      return out.trim().split(/\r?\n/).map(l => l.split(" ")[0]).filter(Boolean)
    }
  } catch {
    return []
  }
}

function buildDrawerScript(printerName) {
  // Sanitizar: solo permitir caracteres seguros en el nombre de impresora
  const safe = printerName.replace(/[^a-zA-Z0-9 _\-]/g, "")
  return (
    'Add-Type -TypeDefinition @"\n' +
    "using System;\n" +
    "using System.Runtime.InteropServices;\n" +
    "public class RawPrinterHelper {\n" +
    "    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]\n" +
    "    public class DOCINFOA {\n" +
    "        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;\n" +
    "        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;\n" +
    "        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;\n" +
    "    }\n" +
    '    [DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true)]\n' +
    "    public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);\n" +
    '    [DllImport("winspool.Drv", SetLastError=true)]\n' +
    "    public static extern bool ClosePrinter(IntPtr hPrinter);\n" +
    '    [DllImport("winspool.Drv", SetLastError=true)]\n' +
    "    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In] DOCINFOA di);\n" +
    '    [DllImport("winspool.Drv", SetLastError=true)]\n' +
    "    public static extern bool EndDocPrinter(IntPtr hPrinter);\n" +
    '    [DllImport("winspool.Drv", SetLastError=true)]\n' +
    "    public static extern bool StartPagePrinter(IntPtr hPrinter);\n" +
    '    [DllImport("winspool.Drv", SetLastError=true)]\n' +
    "    public static extern bool EndPagePrinter(IntPtr hPrinter);\n" +
    '    [DllImport("winspool.Drv", SetLastError=true)]\n' +
    "    public static extern bool WritePrinter(IntPtr hPrinter, byte[] bytes, int count, out int written);\n" +
    "}\n" +
    '"@\n' +
    '$printerName = "' + safe + '"\n' +
    "$bytes = [byte[]](27,112,0,25,250)\n" +
    "$doc = New-Object RawPrinterHelper+DOCINFOA\n" +
    '$doc.pDocName = "OpenDrawer"\n' +
    '$doc.pDataType = "RAW"\n' +
    "$hPrinter = [IntPtr]::Zero\n" +
    "if ([RawPrinterHelper]::OpenPrinter($printerName, [ref]$hPrinter, [IntPtr]::Zero)) {\n" +
    "    [RawPrinterHelper]::StartDocPrinter($hPrinter, 1, $doc) | Out-Null\n" +
    "    [RawPrinterHelper]::StartPagePrinter($hPrinter) | Out-Null\n" +
    "    $written = 0\n" +
    "    [RawPrinterHelper]::WritePrinter($hPrinter, $bytes, $bytes.Length, [ref]$written) | Out-Null\n" +
    "    [RawPrinterHelper]::EndPagePrinter($hPrinter) | Out-Null\n" +
    "    [RawPrinterHelper]::EndDocPrinter($hPrinter) | Out-Null\n" +
    "    [RawPrinterHelper]::ClosePrinter($hPrinter) | Out-Null\n" +
    "    exit 0\n" +
    "} else { exit 1 }"
  )
}

function openDrawerNative(printerName) {
  if (process.platform === "win32") {
    if (!printerName) throw new Error("Nombre de impresora requerido")
    const script = buildDrawerScript(printerName)
    const tmp = path.join(tmpdir(), `aukani-drawer-${Date.now()}.ps1`)
    try {
      writeFileSync(tmp, script, "utf-8")
      execSync(`powershell -ExecutionPolicy Bypass -File "${tmp}"`, { timeout: 5000 })
    } finally {
      try { unlinkSync(tmp) } catch {}
    }
  } else {
    // Linux/Mac: escribir ESC/POS directo al dispositivo USB
    const candidates = ["/dev/usb/lp0", "/dev/usb/lp1", "/dev/ttyUSB0"]
    const dev = candidates.find(d => existsSync(d))
    if (!dev) throw new Error("No se encontró dispositivo de impresora en /dev/usb/lp*")
    writeFileSync(dev, Buffer.from(DRAWER_BYTES))
  }
}

// ── Impresora — IPC handlers ──────────────────────────────

ipcMain.handle("printer:list", () => {
  try {
    return { ok: true, printers: listSystemPrinters(), platform: process.platform }
  } catch (err) {
    return { ok: false, error: err.message, printers: [] }
  }
})

ipcMain.handle("printer:open-drawer", (_, printerName) => {
  try {
    openDrawerNative(printerName)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

ipcMain.handle("printer:print", async (_, { html, printerName }) => {
  const tmp = path.join(tmpdir(), `aukani-receipt-${Date.now()}.html`)
  writeFileSync(tmp, html, "utf-8")

  return new Promise((resolve) => {
    const printWin = new BrowserWindow({
      show: false,
      skipTaskbar: true,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    })

    printWin.loadFile(tmp)

    printWin.webContents.once("did-finish-load", () => {
      printWin.webContents.print(
        { silent: true, deviceName: printerName || "" },
        (success, reason) => {
          printWin.close()
          try { unlinkSync(tmp) } catch {}
          resolve({ ok: success, error: success ? null : reason })
        }
      )
    })
  })
})

// Vista previa: muestra el HTML tal cual se imprimiría, en una ventana visible —
// útil para revisar el diseño sin necesitar una impresora física conectada.
ipcMain.handle("printer:preview", async (_, html) => {
  const tmp = path.join(tmpdir(), `aukani-preview-${Date.now()}.html`)
  writeFileSync(tmp, html, "utf-8")

  const previewWin = new BrowserWindow({
    width: 420,
    height: 750,
    title: "Vista previa de impresión",
    autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  })

  previewWin.loadFile(tmp)
  previewWin.on("closed", () => { try { unlinkSync(tmp) } catch {} })

  return { ok: true }
})

// ── Acceso remoto — túnel SSH + SOCKS5 (solo ADMIN, desde la UI) ──

let sshClient = null
let socksServer = null
let activeConnectionInfo = null

// Servidor SOCKS5 mínimo: solo CMD CONNECT, sin autenticación (escucha únicamente
// en 127.0.0.1 — el único "cliente" real es la propia sesión de Electron).
function startSocksServer(client) {
  return new Promise((resolve, reject) => {
    const server = net.createServer((socket) => {
      let stage = "greeting"
      let buffer = Buffer.alloc(0)
      socket.on("error", () => {})

      const onData = (chunk) => {
        buffer = Buffer.concat([buffer, chunk])

        if (stage === "greeting") {
          if (buffer.length < 2) return
          const nMethods = buffer[1]
          if (buffer.length < 2 + nMethods) return
          buffer = buffer.subarray(2 + nMethods)
          socket.write(Buffer.from([0x05, 0x00])) // versión 5, sin autenticación
          stage = "request"
        }

        if (stage === "request") {
          if (buffer.length < 4) return
          const atyp = buffer[3]
          let addr, offset

          if (atyp === 0x01) { // IPv4
            if (buffer.length < 10) return
            addr = `${buffer[4]}.${buffer[5]}.${buffer[6]}.${buffer[7]}`
            offset = 8
          } else if (atyp === 0x03) { // dominio
            if (buffer.length < 5) return
            const len = buffer[4]
            if (buffer.length < 5 + len + 2) return
            addr = buffer.subarray(5, 5 + len).toString("utf-8")
            offset = 5 + len
          } else if (atyp === 0x04) { // IPv6
            if (buffer.length < 22) return
            const parts = []
            for (let i = 0; i < 16; i += 2) parts.push(buffer.readUInt16BE(4 + i).toString(16))
            addr = parts.join(":")
            offset = 20
          } else {
            socket.end(Buffer.from([0x05, 0x08, 0x00, 0x01, 0, 0, 0, 0, 0, 0]))
            return
          }

          const dstPort = buffer.readUInt16BE(offset)
          socket.removeListener("data", onData)
          stage = "streaming"

          client.forwardOut("127.0.0.1", socket.remotePort, addr, dstPort, (err, stream) => {
            if (err) {
              try { socket.end(Buffer.from([0x05, 0x01, 0x00, 0x01, 0, 0, 0, 0, 0, 0])) } catch {}
              return
            }
            socket.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 0, 0, 0, 0, 0, 0]))
            socket.pipe(stream)
            stream.pipe(socket)
            stream.on("error", () => socket.destroy())
            socket.on("error", () => stream.destroy())
          })
        }
      }

      socket.on("data", onData)
    })

    server.on("error", reject)
    server.listen(0, "127.0.0.1", () => resolve(server))
  })
}

function connectRemoteTunnel({ host, port, username, password }) {
  if (sshClient) throw new Error("Ya hay una conexión remota activa")

  return new Promise((resolve, reject) => {
    const client = new SSHClient()

    client.on("ready", async () => {
      try {
        const server = await startSocksServer(client)
        const socksPort = server.address().port
        await session.defaultSession.setProxy({ proxyRules: `socks5://127.0.0.1:${socksPort}` })

        sshClient = client
        socksServer = server
        activeConnectionInfo = { host, port: Number(port) || 22, username }

        client.on("close", () => {
          if (sshClient === client) disconnectRemoteTunnel().catch(() => {})
        })

        resolve({ ok: true })
      } catch (err) {
        client.end()
        reject(err)
      }
    })

    client.on("error", (err) => reject(err))

    client.connect({
      host, port: Number(port) || 22, username, password,
      readyTimeout: 15000, tryKeyboardInteractive: false,
    })
  })
}

async function disconnectRemoteTunnel() {
  try { await session.defaultSession.setProxy({ mode: "direct" }) } catch {}
  if (socksServer) { try { socksServer.close() } catch {}; socksServer = null }
  if (sshClient) { try { sshClient.end() } catch {}; sshClient = null }
  activeConnectionInfo = null
  return { ok: true }
}

ipcMain.handle("remote:connect", async (_, cfg) => {
  const { host, port, username, password } = cfg
  try {
    const stored = readConfig()
    stored.remoteAccess = { host, port, username }
    writeConfig(stored)
    return await connectRemoteTunnel({ host, port, username, password })
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

ipcMain.handle("remote:disconnect", () => disconnectRemoteTunnel())

ipcMain.handle("remote:status", () => ({ connected: !!sshClient, info: activeConnectionInfo }))

// ── Ventana principal ─────────────────────────────────────

let mainWindow = null
let allowClose = false // se pone en true solo tras confirmar el cierre desde el renderer

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: "Aukani POS",
    icon: path.join(__dirname, "icon.png"),
    autoHideMenuBar: true,
    frame: false, // sin marco nativo — la barra de título/controles la dibuja el renderer (TitleBar.jsx)
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow = win

  win.on("maximize",   () => win.webContents.send("window:maximized-changed", true))
  win.on("unmaximize", () => win.webContents.send("window:maximized-changed", false))

  // Intercepta el cierre (X, Alt+F4, o menú) para pedir confirmación en el renderer
  // antes de dejar cerrar de verdad — por seguridad, la confirmación implica logout.
  win.on("close", (e) => {
    if (allowClose) return
    e.preventDefault()
    win.webContents.send("app:before-close")
  })

  win.on("closed", () => {
    if (mainWindow === win) mainWindow = null
  })

  if (isDev) {
    win.loadURL("http://localhost:5173")
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"))
  }
}

// El renderer llama esto tras confirmar (y hacer logout) — recién ahí se deja cerrar.
ipcMain.on("app:confirm-close", () => {
  allowClose = true
  if (mainWindow) mainWindow.close()
})

// ── Controles de ventana (sin marco nativo) ───────────────
// El botón de cerrar dispara mainWindow.close(), que sigue disparando el mismo
// evento "close" interceptado arriba (confirmación + logout) — no se salta esa lógica.
ipcMain.on("window:minimize", () => mainWindow?.minimize())
ipcMain.on("window:maximize", () => {
  if (!mainWindow) return
  if (mainWindow.isMaximized()) mainWindow.unmaximize()
  else mainWindow.maximize()
})
ipcMain.on("window:close", () => mainWindow?.close())
ipcMain.handle("window:is-maximized", () => mainWindow?.isMaximized() ?? false)

// ── Auto-actualización (GitHub Releases) ──────────────────
// Solo tiene sentido empaquetado — en dev no hay metadata de update y tira error.
// Chequeo silencioso al abrir la app: si no hay red o no hay nada nuevo, no pasa
// nada visible (ni error, ni popup). Si SÍ hay una versión nueva, se avisa al
// renderer para que muestre un modal obligatorio (UpdateModal.jsx, no se puede
// cerrar) con el progreso de la descarga; al terminar se instala sola, sin pedir
// otra confirmación.
if (!isDev) {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.on("update-available", (info) => {
    mainWindow?.webContents.send("updater:available", { version: info.version })
  })
  autoUpdater.on("download-progress", (progress) => {
    mainWindow?.webContents.send("updater:progress", { percent: Math.round(progress.percent) })
  })
  autoUpdater.on("update-downloaded", () => {
    mainWindow?.webContents.send("updater:downloaded")
    // Pequeña pausa para que el renderer alcance a mostrar "instalando" antes de
    // que la app se cierre y se reemplace sola.
    setTimeout(() => autoUpdater.quitAndInstall(), 2000)
  })
  autoUpdater.on("error", (err) => {
    console.error("[AutoUpdater] Error:", err?.message)
  })
}

ipcMain.on("updater:start-download", () => {
  if (!isDev) autoUpdater.downloadUpdate()
})

ipcMain.handle("app:check-for-updates", async () => {
  if (isDev) return { ok: false, error: "No aplica en modo desarrollo" }
  try {
    await autoUpdater.checkForUpdates()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

ipcMain.handle("app:get-version", () => app.getVersion())

app.whenReady().then(() => {
  createWindow()
  if (!isDev) autoUpdater.checkForUpdates().catch(() => {}) // silencioso: sin red o sin nada nuevo, no hace nada
})

app.on("window-all-closed", () => {
  disconnectRemoteTunnel().finally(() => {
    if (process.platform !== "darwin") app.quit()
  })
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
