// Genera electron/default-config.json antes de empaquetar. Este archivo se deja
// desempacado del .asar (ver "asarUnpack" en package.json) precisamente para que el
// instalador NSIS (ver installer.nsh) pueda sobrescribirlo con lo que el admin
// escriba en la página custom del wizard — así queda como archivo real en disco,
// no sellado dentro del .asar.
//
// Las variables de entorno son un atajo opcional para pre-llenar un valor por defecto
// sin depender de la página del instalador (útil para builds automatizados/CI):
//   AUKANI_SERVER_URL    → URL del backend (config.json → serverUrl)
//   AUKANI_REMOTE_HOST   → host SSH por defecto para Acceso remoto
//   AUKANI_REMOTE_PORT   → puerto SSH por defecto (default 22 si se da host sin puerto)
// Si no se define ninguna, se deja un archivo vacío "{}" — la página del instalador
// sigue funcionando igual, y si el admin no escribe nada ahí tampoco, la app cae al
// flujo normal de SetupPage en el primer arranque.
import { writeFileSync } from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outPath = path.join(__dirname, "..", "electron", "default-config.json")

const { AUKANI_SERVER_URL, AUKANI_REMOTE_HOST, AUKANI_REMOTE_PORT } = process.env

const defaults = {}
if (AUKANI_SERVER_URL) defaults.serverUrl = AUKANI_SERVER_URL
if (AUKANI_REMOTE_HOST) defaults.remoteAccess = { host: AUKANI_REMOTE_HOST, port: AUKANI_REMOTE_PORT || "22" }

writeFileSync(outPath, JSON.stringify(defaults, null, 2), "utf-8")
console.log(
  Object.keys(defaults).length
    ? `[set-default-config] Valor por defecto para la página del instalador: ${JSON.stringify(defaults)}`
    : "[set-default-config] Sin variables de entorno — el instalador preguntará la URL vacía (el admin la escribe durante la instalación)."
)
