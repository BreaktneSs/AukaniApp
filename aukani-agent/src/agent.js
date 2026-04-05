const http = require("http")
const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")
const os = require("os")

const PORT = 9876
const VERSION = "1.0.0"
const CONFIG_FILE = path.join(os.homedir(), ".aukani-agent.json")

// ── Configuración ─────────────────────────────────────────
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"))
    }
  } catch {}
  return { port: "", mode: "auto" } // port vacío = autodetectar
}

function saveConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2))
  } catch (e) {
    console.error("Error guardando config:", e.message)
  }
}

// ── Detección automática de impresora ─────────────────────
function detectPrinterPort() {
  const platform = process.platform

  if (platform === "linux") {
    const candidates = ["/dev/usb/lp0", "/dev/usb/lp1", "/dev/ttyUSB0", "/dev/ttyUSB1"]
    for (const p of candidates) {
      if (fs.existsSync(p)) return p
    }
  }

  if (platform === "win32") {
    try {
      // Buscar puertos COM con impresora
      const result = execSync("wmic printer get portname /format:list 2>nul", { encoding: "utf8" })
      const ports = result.match(/COM\d+/g)
      if (ports && ports.length > 0) return ports[0]
    } catch {}
    return "COM1" // fallback
  }

  if (platform === "darwin") {
    const candidates = ["/dev/tty.usbserial*", "/dev/cu.usbserial*"]
    try {
      const result = execSync("ls /dev/cu.* 2>/dev/null", { encoding: "utf8" })
      const ports = result.trim().split("\n").filter(p => p.includes("usb") || p.includes("serial"))
      if (ports.length > 0) return ports[0]
    } catch {}
  }

  return null
}

// ── Comando ESC/POS para abrir cajón ─────────────────────
// ESC p 0 25 250 — pulso estándar de 50ms en pin 2
const DRAWER_CMD = Buffer.from([0x1B, 0x70, 0x00, 0x19, 0xFA])

function openDrawer(port) {
  if (!port) throw new Error("Puerto no configurado")

  if (process.platform === "win32") {
    // Windows: usar modo binario via PowerShell
    const bytes = Array.from(DRAWER_CMD).join(",")
    const cmd = `powershell -Command "& { $port = New-Object System.IO.Ports.SerialPort('${port}',9600); $port.Open(); $port.Write([byte[]]@(${bytes}),0,${DRAWER_CMD.length}); $port.Close() }"`
    execSync(cmd, { timeout: 3000 })
  } else {
    // Linux/Mac: escribir directo al device
    if (!fs.existsSync(port)) throw new Error(`Puerto no encontrado: ${port}`)
    const fd = fs.openSync(port, "w")
    fs.writeSync(fd, DRAWER_CMD)
    fs.closeSync(fd)
  }
}

// ── Imprimir via sistema operativo ────────────────────────
function printHTML(htmlContent, printerName) {
  const tmpFile = path.join(os.tmpdir(), `aukani-receipt-${Date.now()}.html`)
  fs.writeFileSync(tmpFile, htmlContent, "utf8")

  try {
    if (process.platform === "win32") {
      // Windows: usar el navegador predeterminado para imprimir
      if (printerName) {
        execSync(`powershell -Command "Start-Process -FilePath '${tmpFile}' -Verb Print"`, { timeout: 5000 })
      } else {
        execSync(`start "" "${tmpFile}"`, { timeout: 3000 })
      }
    } else if (process.platform === "linux") {
      // Linux: usar lp o cups
      const cmd = printerName
        ? `lp -d "${printerName}" "${tmpFile}"`
        : `lp "${tmpFile}"`
      execSync(cmd, { timeout: 5000 })
    } else if (process.platform === "darwin") {
      const cmd = printerName
        ? `lp -d "${printerName}" "${tmpFile}"`
        : `lp "${tmpFile}"`
      execSync(cmd, { timeout: 5000 })
    }
  } finally {
    // Limpiar archivo temporal después de un delay
    setTimeout(() => { try { fs.unlinkSync(tmpFile) } catch {} }, 10000)
  }
}

// Listar impresoras disponibles en el sistema
function listPrinters() {
  try {
    if (process.platform === "win32") {
      const result = execSync("wmic printer get name /format:list", { encoding: "utf8" })
      return result.match(/(?<=Name=).+/g)?.map(n => n.trim()).filter(Boolean) || []
    } else {
      const result = execSync("lpstat -a 2>/dev/null || lpstat -p 2>/dev/null", { encoding: "utf8" })
      return result.match(/^printer\s+(\S+)/gm)?.map(l => l.split(/\s+/)[1]) || []
    }
  } catch {
    return []
  }
}

// ── HTTP Server ───────────────────────────────────────────
function respond(res, status, data) {
  const body = JSON.stringify(data)
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Length": Buffer.byteLength(body),
  })
  res.end(body)
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = ""
    req.on("data", chunk => { body += chunk.toString() })
    req.on("end", () => {
      try { resolve(JSON.parse(body || "{}")) }
      catch { resolve({}) }
    })
  })
}

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    })
    res.end()
    return
  }

  const url = req.url.split("?")[0]
  const cfg = loadConfig()

  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${url}`)

  // ── GET /status ─────────────────────────────────────────
  if (req.method === "GET" && url === "/status") {
    const detectedPort = detectPrinterPort()
    const printers = listPrinters()
    return respond(res, 200, {
      ok: true,
      version: VERSION,
      platform: process.platform,
      configuredPort: cfg.port || null,
      detectedPort,
      printers,
      drawerPort: cfg.port || detectedPort || null,
    })
  }

  // ── POST /config ─────────────────────────────────────────
  if (req.method === "POST" && url === "/config") {
    const body = await readBody(req)
    const newCfg = { ...cfg, ...body }
    saveConfig(newCfg)
    return respond(res, 200, { ok: true, config: newCfg })
  }

  // ── POST /open-drawer ─────────────────────────────────────
  if (req.method === "POST" && url === "/open-drawer") {
    const port = cfg.port || detectPrinterPort()
    if (!port) {
      return respond(res, 400, { ok: false, error: "No se encontró puerto de impresora. Configúralo en el agente." })
    }
    try {
      openDrawer(port)
      console.log(`[Cajón] Abierto via ${port}`)
      return respond(res, 200, { ok: true, port })
    } catch (err) {
      console.error("[Cajón] Error:", err.message)
      return respond(res, 500, { ok: false, error: err.message })
    }
  }

  // ── POST /print ───────────────────────────────────────────
  if (req.method === "POST" && url === "/print") {
    const body = await readBody(req)
    if (!body.html) return respond(res, 400, { ok: false, error: "Falta el campo html" })
    try {
      printHTML(body.html, body.printer || cfg.printer || null)
      console.log("[Impresora] Trabajo enviado")
      return respond(res, 200, { ok: true })
    } catch (err) {
      console.error("[Impresora] Error:", err.message)
      return respond(res, 500, { ok: false, error: err.message })
    }
  }

  // ── GET /printers ─────────────────────────────────────────
  if (req.method === "GET" && url === "/printers") {
    return respond(res, 200, { printers: listPrinters() })
  }

  respond(res, 404, { error: "Ruta no encontrada" })
})

server.listen(PORT, "127.0.0.1", () => {
  console.log("╔══════════════════════════════════════╗")
  console.log("║      Aukani Agent v" + VERSION + "            ║")
  console.log("╠══════════════════════════════════════╣")
  console.log(`║  Puerto: http://localhost:${PORT}      ║`)
  console.log(`║  Sistema: ${process.platform.padEnd(27)}║`)

  const detected = detectPrinterPort()
  const cfg = loadConfig()
  const activePort = cfg.port || detected
  console.log(`║  Puerto impresora: ${(activePort || "No detectado").padEnd(19)}║`)
  console.log("╠══════════════════════════════════════╣")
  console.log("║  Deja esta ventana abierta           ║")
  console.log("║  mientras usas Aukani POS            ║")
  console.log("╚══════════════════════════════════════╝")

  if (!activePort) {
    console.log("\n⚠ No se detectó impresora automáticamente.")
    console.log("  Configúrala desde Aukani POS > Configuración > Impresora\n")
  } else {
    console.log(`\n✓ Impresora detectada en: ${activePort}\n`)
  }
})

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n❌ El puerto ${PORT} ya está en uso.`)
    console.error("   El agente ya puede estar corriendo. Revisa la bandeja del sistema.\n")
  } else {
    console.error("Error del servidor:", err.message)
  }
  process.exit(1)
})