// Genera electron/default-config.json antes de empaquetar. Este archivo se deja
// desempacado del .asar (ver "asarUnpack" en package.json) precisamente para que el
// instalador NSIS (ver installer.nsh) pueda sobrescribirlo con lo que el admin
// escriba en la página custom del wizard — así queda como archivo real en disco,
// no sellado dentro del .asar.
//
// Las variables de entorno son un atajo opcional para pre-llenar un valor por defecto
// sin depender de la página del instalador (útil para builds automatizados/CI o para
// dejar todo precargado de una — el instalador sigue preguntando igual, y si el admin
// no escribe nada ahí, queda lo que ya traía este archivo):
//
//   AUKANI_SERVER_URL         → URL del backend (config.json → serverUrl)
//   AUKANI_REMOTE_HOST        → host SSH por defecto para Acceso remoto
//   AUKANI_REMOTE_PORT        → puerto SSH por defecto (default 22 si se da host sin puerto)
//   AUKANI_IGNORE_CERT_ERRORS → "true" para aceptar certificados HTTPS autofirmados
//                                (redes locales con proxy propio sin CA pública)
//
// El instalador es "assisted" (oneClick:false, con wizard y página propia) — esto es
// compatible con actualizaciones automáticas silenciosas: NSIS salta TODAS sus
// páginas (incluida la nuestra) cuando corre en modo /S, que es como electron-updater
// ejecuta el instalador al actualizar (ver quitAndInstall(true, true) en main.js). La
// página del wizard solo se ve en una instalación manual real, nunca en un auto-update.
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
