import { createWriteStream, mkdirSync, existsSync, unlinkSync } from "fs"
import { pipeline } from "stream/promises"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads", "products")

// Crear carpeta si no existe
if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true })

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_SIZE_MB = 2

export async function saveProductImage(file) {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw { statusCode: 400, message: "Formato no permitido. Usa JPG, PNG o WEBP." }
  }

  const ext = file.filename.split(".").pop().toLowerCase()
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const filepath = path.join(UPLOADS_DIR, filename)

  let bytes = 0
  const chunks = []

  // Leer stream y validar tamaño
  for await (const chunk of file.file) {
    bytes += chunk.length
    if (bytes > MAX_SIZE_MB * 1024 * 1024) {
      throw { statusCode: 400, message: `La imagen no puede superar ${MAX_SIZE_MB}MB.` }
    }
    chunks.push(chunk)
  }

  // Escribir archivo
  const writeStream = createWriteStream(filepath)
  for (const chunk of chunks) writeStream.write(chunk)
  writeStream.end()

  return `/uploads/products/${filename}`
}

export function deleteProductImage(imageUrl) {
  if (!imageUrl) return
  try {
    const filename = imageUrl.split("/uploads/products/")[1]
    if (filename) {
      const filepath = path.join(UPLOADS_DIR, filename)
      if (existsSync(filepath)) unlinkSync(filepath)
    }
  } catch {
    // Silenciar error si el archivo no existe
  }
}