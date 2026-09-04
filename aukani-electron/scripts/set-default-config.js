// Genera electron/default-config.json antes de empaquetar. Este archivo se deja
// desempacado del .asar (ver "asarUnpack" en package.json) para que quede como
// archivo real en disco (resources/app.asar.unpacked/electron/default-config.json),
// legible por electron/main.js (readConfig -> defaultConfigPath) sin tener que abrir
// el .asar.
//
// El instalador es oneClick (sin wizard, sin páginas custom) para que las
// actualizaciones automáticas de electron-updater sean realmente silenciosas — un
// instalador "assisted" (oneClick:false) vuelve a mostrar su UI completa cada vez
// que se reinstala, incluida cualquier página propia, que es justo lo que pasaba
// antes. Por eso toda esta configuración es solo por variable de entorno (para
// builds ya armados con los datos del cliente) o, si no se define nada acá, la app
// la pide sola en su primer arranque (SetupPage.jsx) y desde Configuración.
//
//   AUKANI_SERVER_URL         → URL del backend (config.json → serverUrl)
//   AUKANI_REMOTE_HOST        → host SSH por defecto para Acceso remoto
//   AUKANI_REMOTE_PORT        → puerto SSH por defecto (default 22 si se da host sin puerto)
//   AUKANI_IGNORE_CERT_ERRORS → "true" para aceptar certificados HTTPS autofirmados
//                                (redes locales con proxy propio sin CA pública)
import { writeFileSync } from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outPath = path.join(__dirname, "..", "electron", "default-config.json")

const { AUKANI_SERVER_URL, AUKANI_REMOTE_HOST, AUKANI_REMOTE_PORT, AUKANI_IGNORE_CERT_ERRORS } = process.env

const defaults = {}
if (AUKANI_SERVER_URL) defaults.serverUrl = AUKANI_SERVER_URL
if (AUKANI_REMOTE_HOST) defaults.remoteAccess = { host: AUKANI_REMOTE_HOST, port: AUKANI_REMOTE_PORT || "22" }
if (AUKANI_IGNORE_CERT_ERRORS === "true") defaults.ignoreCertErrors = true

writeFileSync(outPath, JSON.stringify(defaults, null, 2), "utf-8")
console.log(
  Object.keys(defaults).length
    ? `[set-default-config] Configuración por defecto embebida: ${JSON.stringify(defaults)}`
    : "[set-default-config] Sin variables de entorno — la app pedirá la configuración sola en el primer arranque."
)
