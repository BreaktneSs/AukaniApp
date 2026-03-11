# Aukani POS — Backend v2.0

## Setup

```bash
cp .env.example .env
docker compose up -d
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

## Roles y permisos

| Acción                        | ADMIN | JEFE | VENDEDOR |
|-------------------------------|:-----:|:----:|:--------:|
| Gestionar usuarios            |  ✅   |  ❌  |    ❌    |
| Gestionar productos           |  ✅   |  ✅  |    ❌    |
| Gestionar categorías/pagos    |  ✅   |  ✅  |    ❌    |
| Realizar ventas               |  ✅   |  ✅  |    ✅    |
| Entrada de inventario         |  ✅   |  ✅  |    ✅    |
| Salida manual de inventario   |  ✅   |  ✅  |    ❌    |
| Cancelar ventas               |  ✅   |  ✅  |    ❌    |
| Ver historial / reportes      |  ✅   |  ✅  |    ❌    |
| Abrir/cerrar turno propio     |  ✅   |  ✅  |    ✅    |
| Ver todos los turnos          |  ✅   |  ✅  |    ❌    |

## Endpoints principales

### Auth
| Método | Ruta        | Descripción         |
|--------|-------------|---------------------|
| POST   | /auth/login | Login → retorna JWT |
| GET    | /auth/me    | Datos del usuario   |

### Turnos de caja
| Método | Ruta               | Descripción       |
|--------|--------------------|-------------------|
| POST   | /shifts/open       | Abrir turno       |
| PATCH  | /shifts/:id/close  | Cerrar turno      |
| GET    | /shifts/mine       | Mi turno activo   |
| GET    | /shifts            | Todos los turnos  |
| GET    | /shifts/:id        | Detalle de turno  |

### Ventas
| Método | Ruta                    | Descripción        |
|--------|-------------------------|--------------------|
| POST   | /sale                   | Registrar venta    |
| PATCH  | /orders/:id/cancel      | Cancelar venta     |
| GET    | /orders                 | Historial          |
| GET    | /orders/summary/daily   | Resumen del día    |

### Inventario
| Método | Ruta                    | Descripción             |
|--------|-------------------------|-------------------------|
| POST   | /inventory/entry        | Entrada de stock        |
| POST   | /inventory/exit         | Salida manual           |
| GET    | /inventory/movements    | Historial movimientos   |
| GET    | /inventory/low-stock    | Productos bajo mínimo   |

## Ejemplo de flujo de venta

```bash
# 1. Login
POST /auth/login
{ "email": "admin@aukani.com", "password": "admin123" }

# 2. Abrir turno
POST /shifts/open
{ "openingCash": 50000 }

# 3. Realizar venta
POST /sale
{
  "shiftId": 1,
  "items": [{ "productId": 1, "quantity": 2 }],
  "payments": [{ "paymentMethodId": 1, "amount": 3000 }]
}

# 4. Cerrar turno
PATCH /shifts/1/close
{ "closingCash": 53000, "notes": "Turno sin novedades" }
```