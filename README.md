Daily Fi API

Backend API para el sistema de gestión y control financiero Daily Fi.

📋 Requisitos Previos

Node.js: v20.x o superior (se requiere soporte nativo para --env-file).

npm: v9.x o superior.

Una cuenta en Postman con una API Key configurada.

🚀 Inicio Rápido

1. Variables de Entorno

Asegúrate de contar con el archivo .env en la raíz del proyecto configurado con las variables correspondientes, incluyendo las de sincronización con Postman:

# Server
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Database
DB_NAME=daily_fi_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432

# Auth (JWT)
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d

R2_ACCOUNT_ID=account_id
R2_ACCESS_KEY_ID=access_key_id
R2_SECRET_ACCESS_KEY=secret_access_key
R2_BUCKET_NAME=bucket_name
R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
R2_REGION=auto

POSTMAN_API_KEY=tu_api_key_aqui
POSTMAN_COLLECTION_ID=tu_collection_id_aqui


2. Instalación de Dependencias

npm install


3. Ejecutar el Proyecto

Para iniciar el servidor de desarrollo, ejecuta:

npm run dev


Nota: Si tu proyecto utiliza otro script para producción, puedes ejecutar npm start.

📚 Sincronización de Documentación de la API

La documentación de la API se mantiene localmente en el archivo documentation.postman_collection.json (esquema Postman v2.1) y se sincroniza automáticamente con la nube de Postman.

¿Cómo actualizar la documentación en Postman?

Cada vez que realices cambios en el archivo documentation.postman_collection.json o le pidas a tu asistente que actualice los endpoints/respuestas, ejecuta el siguiente comando en tu terminal:

npm run docs:push


¿Qué hace este comando?

Lee el archivo documentation.postman_collection.json ubicado en la raíz del proyecto.

Carga las credenciales POSTMAN_API_KEY y POSTMAN_COLLECTION_ID desde tu archivo .env.

Ejecuta el script scripts/sync-docs.js que envía la versión actualizada de la colección a la API de Postman mediante una petición PUT.

Refleja los cambios instantáneamente en la aplicación o versión web de Postman para todos los colaboradores.