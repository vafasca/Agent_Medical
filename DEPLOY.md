# 🚀 Guía de Despliegue en Netlify

Esta guía te explica cómo alojar tu SalesBot AI en Netlify de forma gratuita.

## 📋 Requisitos Previos

- Cuenta de GitHub (gratis)
- Cuenta de Netlify (gratis)
- Cuenta de Turso para la base de datos (gratis)

---

## Paso 1: Crear Base de Datos en Turso (Gratis)

1. Ve a [turso.tech](https://turso.tech) y crea una cuenta gratuita
2. Crea una nueva base de datos:
   ```bash
   # Instala la CLI de Turso (opcional, o usa la web)
   # En la web, haz clic en "Create Database"
   ```
3. Obtén las credenciales:
   - Ve a tu base de datos → Settings
   - Copia la **URL** de la base de datos (ej: `libsql://tu-db.turso.io`)
   - Crea un **Auth Token** y cópialo

4. Anota estas variables:
   ```
   DATABASE_URL="libsql://tu-db.turso.io?authToken=tu-token"
   ```

---

## Paso 2: Subir a GitHub

1. Crea un nuevo repositorio en GitHub

2. Inicializa git y sube el código:
   ```bash
   cd /home/z/my-project
   
   # Crear .gitignore
   cat > .gitignore << 'EOF'
   node_modules/
   .next/
   .env
   .env.local
   *.db
   *.db-journal
   prisma/dev.db
   data/
   upload/
   download/
   dev.log
   .bun/
   EOF
   
   # Inicializar y subir
   git init
   git add .
   git commit -m "Initial commit - SalesBot AI"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
   git push -u origin main
   ```

---

## Paso 3: Desplegar en Netlify

1. Ve a [netlify.com](https://netlify.com) y haz login con GitHub

2. Haz clic en **"Add new site"** → **"Import an existing project"**

3. Selecciona tu repositorio de GitHub

4. Configura el build:
   - **Build command**: `bun run build && bunx prisma migrate deploy --schema=./prisma/schema.prisma`
   - **Publish directory**: `.next`

5. Agrega las variables de entorno:
   - `DATABASE_URL` → Tu URL de Turso
   - `BUN_VERSION` → `latest`

6. Haz clic en **"Deploy site"**

---

## Paso 4: Configurar Variables de Entorno en Netlify

Ve a **Site settings** → **Environment variables** y agrega:

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `DATABASE_URL` | `libsql://tu-db.turso.io?authToken=tu-token` | URL de tu base de datos Turso |
| `BUN_VERSION` | `latest` | Versión de Bun |

---

## Paso 5: Configurar Webhook de Telegram

Una vez desplegado, tendrás una URL como:
```
https://tu-app-xxxxx.netlify.app
```

Configura el webhook:
```bash
curl "https://api.telegram.org/bot8616959739:AAE0bb4-O7Xfuc41Yi3vs9Dq2hCFUkmOYx0/setWebhook?url=https://tu-app-xxxxx.netlify.app/api/webhook/telegram"
```

---

## 🔄 Alternativa: Usar Neon (PostgreSQL)

Si prefieres PostgreSQL:

1. Ve a [neon.tech](https://neon.tech) y crea una cuenta
2. Crea un proyecto y copia la conexión string
3. Cambia el `provider` en `prisma/schema.prisma` a `"postgresql"`
4. Usa la URL de Neon como `DATABASE_URL`

---

## 📱 Estructura del Proyecto

```
├── src/app/              # Páginas y APIs de Next.js
│   ├── api/              # Endpoints de la API
│   │   ├── chat/         # Chat con IA
│   │   ├── webhook/      # Webhooks de redes sociales
│   │   └── groq-keys/    # Gestión de API keys
│   └── page.tsx          # Interfaz principal
├── prisma/               # Esquema de base de datos
├── netlify.toml          # Configuración de Netlify
└── package.json          # Dependencias
```

---

## ⚠️ Notas Importantes

1. **Base de datos**: Netlify es serverless, por eso necesitamos Turso/Neon
2. **Archivos JSON**: Ya no se usan, todo va a la base de datos
3. **API Keys**: Se guardan en la base de datos de forma segura
4. **Webhooks**: Solo funcionan con URL pública (no localhost)

---

## 🆘 Solución de Problemas

### Error de build
- Verifica que `DATABASE_URL` esté configurado
- Asegúrate de que el schema de Prisma sea válido

### Error de base de datos
- Verifica que el token de Turso sea correcto
- Asegúrate de que la URL termine con `?authToken=...`

### Webhook no funciona
- Verifica que la URL de Netlify sea accesible
- Revisa los logs en Netlify → Functions
