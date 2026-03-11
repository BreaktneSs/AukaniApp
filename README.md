# Aukani POS — Backend

API REST para el sistema POS Aukani. Construido con Fastify, Prisma 5 y PostgreSQL.

## Requisitos

- Node.js 18+
- Docker y Docker Compose
- npm

## Setup inicial

```bash
# 1. Copiar variables de entorno
cp .env.example .env

# 2. Levantar base de datos
docker compose up -d

# 3. Instalar dependencias
npm install

# 4. Correr migraciones
npm run db:migrate

# 5. Cargar datos de prueba
npm run db:seed

# 6. Iniciar servidor en desarrollo
npm run dev
```

## Endpoints

### Productos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /products | Listar productos (paginado) |
| GET | /products/search?q= | Búsqueda instantánea |
| GET | /products/barcode/:code | Buscar por código de barras |
| GET | /products/:id | Obtener producto |
| POST | /products | Crear producto |
| PUT | /products/:id | Actualizar producto |
| PATCH | /products/:id/stock | Ajustar stock |
| DELETE | /products/:id | Desactivar producto |

### Ventas

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /sale | Registrar venta |
| GET | /orders | Historial de ventas |
| GET | /orders/summary/daily | Resumen del día |
| GET | /orders/:id | Detalle de venta |

## Estructura del proyecto

```
src/
├── config/       # Prisma client y config
├── controllers/  # Manejo de request/response
├── services/     # Lógica de negocio
├── routes/       # Definición de rutas
└── middlewares/  # Error handler, etc.
```