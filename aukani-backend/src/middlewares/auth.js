import { verifyToken } from "../utils/jwt.js"

// Verifica que el token JWT sea válido
export async function authenticate(req, reply) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Token requerido" })
  }

  try {
    const token = auth.split(" ")[1]
    req.user = verifyToken(token)
  } catch {
    return reply.status(401).send({ error: "Token inválido o expirado" })
  }
}

// Verifica que el usuario tenga uno de los roles permitidos
export function authorize(...roles) {
  return async function (req, reply) {
    if (!roles.includes(req.user?.role)) {
      return reply.status(403).send({ error: "No tienes permiso para esta acción" })
    }
  }
}

// Hooks combinados por rol - para usar en rutas
export const onlyAdmin = [authenticate, authorize("ADMIN")]
export const adminOrJefe = [authenticate, authorize("ADMIN", "JEFE")]
export const allRoles = [authenticate, authorize("ADMIN", "JEFE", "VENDEDOR")]