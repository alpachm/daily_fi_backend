# AGENTS.md — Guidelines for daily_fi_back

Este documento define las reglas de desarrollo, arquitectura y estándares de calidad para la construcción del backend de **Daily Fi** (`daily_fi_back`).

---

## 1. Misión y Pila Tecnológica

- **Entorno:** Node.js (v18+) + TypeScript.
- **Framework:** Express.js.
- **Validación:** Zod.
- **Seguridad:** Helmet, CORS, HPP, Express-Rate-Limit, Cookie-Parser.
- **Ejecución y Build:** `tsx` (desarrollo), `tsup` (compilación).
- **Almacenamiento de Archivos:** Presigned URLs (Cloudflare R2 / AWS S3 SDK).

---

## 2. Arquitectura de Carpetas Estricta

Todo el código fuente debe residir dentro de `src/` respetando los siguientes módulos:

\`\`\`text
src/
├── controllers/ # Manejo de Request/Response y respuestas HTTP
├── database/ # Configuración de base de datos y migraciones/modelos
├── enums/ # Enums de TypeScript (ej. tipos de comprobante, roles)
├── interfaces/ # Tipados e interfaces globales del dominio
├── middlewares/ # Middlewares Express (Auth, Error handler, Rate limit)
├── routes/ # Definición de endpoints y enrutamiento
├── utils/ # Utilidades puras, helpers y manejo de errores (AppError)
├── validations/ # Esquemas de validación con Zod
├── app.ts # Instancia y configuración global de Express
└── server.ts # Punto de entrada y arranque del servidor HTTP
\`\`\`

---

## 3. Reglas de Desarrollo y Buenas Prácticas

### Rutas y Versionado de API

1. **Prefijo Único de Versionado:** Todos los endpoints de negocio deben estar expuestos bajo la estructura `/api/v1/` (ejemplo: `/api/v1/auth/login`, `/api/v1/receipts`).
2. **Excepción de Health check:** El endpoint de monitoreo mantendrá su ruta raíz `GET /health`.

### TypeScript & Tipado Estricto

1. **Sin `any` implícito ni explícito:** Habilita y respeta `"strict": true` en `tsconfig.json`.
2. **Uso de Interfaces y DTOs:** Define esquemas de Zod en `src/validations/` y extrae los tipos usando `z.infer<typeof schema>` dentro de `src/interfaces/`.
3. **Manejo de Errores:** Nunca dejes promesas sin capturar. Utiliza bloques `try/catch` o wrappers de funciones asíncronas y redirige los errores al middleware centralizado a través de `next(error)`.

### Seguridad e Integridad

1. **Sanitización Obligatoria:** Todas las peticiones con `body`, `params` o `query` deben ser validadas con un esquema de Zod en el middleware antes de tocar el controlador.
2. **Sin Exposición de Secretos:** No agregues credenciales o claves privadas directamente en el código. Lee siempre desde `process.env` y valida las variables necesarias al arrancar.
3. **Respuestas de Error:** No envíes _stack traces_ ni detalles técnicos internos al cliente en producción. Usa la clase `AppError` con mensajes limpios y códigos de estado HTTP adecuados (`400`, `401`, `403`, `404`, `500`).

### Desacoplamiento de Archivos (Storage)

1. **Cero almacenamiento local de archivos:** El backend no debe guardar imágenes/archivos en disco local ni procesar subidas pesadas en RAM.
2. **Generación de Presigned URLs:** El backend solo autoriza y genera URLs firmadas para subida directa desde el frontend hacia el almacenamiento en la nube (Cloudflare R2).

---

## 4. Estándares de Respuestas HTTP

Mantén una estructura unificada para todas las respuestas de la API:

### Respuesta Exitosa (`200 OK`, `201 Created`)

\`\`\`json
{
"status": "success",
"data": { ... }
}
\`\`\`

### Respuesta de Error (`4xx`, `5xx`)

\`\`\`json
{
"status": "fail",
"message": "Descripción amigable del error"
}
\`\`\`

---

## 5. Protocolo de Verificación Obligatorio

Antes de dar por completado cualquier ticket o cambio en el código:

1. **Chequeo de Compilación:** Ejecuta `npx tsc --noEmit` para garantizar 0 errores de TypeScript.
2. **Verificación de Servidor:** Ejecuta `npm run dev` y confirma que el servidor arranca correctamente.
3. **Prueba de Salud:** Verifica la ruta `GET http://localhost:4000/health`.
4. **Verificación de Build:** Ejecuta `npm run build` y asegura la generación de la carpeta `dist/`.

### Mantenimiento Obligatorio de Documentación API (Postman)

1. **Sincronización en Tiempo Real:** La colección de Postman ubicada en `documentation.postman_collection.json` es la fuente de verdad de la API. Todo cambio en el código de rutas/endpoints debe reflejarse inmediatamente en este archivo:
    - **Nuevo Endpoint:** Crear la petición correspondiente con su método, ruta, headers, body de ejemplo y posibles respuestas (éxito y errores).
    - **Modificación de Endpoint:** Actualizar la documentación **únicamente** si el cambio altera la firma del contrato (parámetros de entrada, headers, esquema del body o estructura de respuesta).
    - **Eliminación de Endpoint:** Remover completamente la petición de la colección.
2. **Restricción de Comandos de Publicación:** Queda **estrictamente prohibido** ejecutar el comando `npm run docs:push` (o cualquier script automatizado de sincronización remota). La actualización de la documentación debe ser local en el archivo JSON. El desarrollador/revisor ejecutará la publicación manualmente tras la inspección correspondiente.
