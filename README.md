# Agent Medical CRM + Bot IA

Sistema tipo mini n8n + CRM + chatbot IA para vender cursos médicos con Groq/OpenRouter y conexiones sociales.

## Qué ya queda funcionando

- Panel web con conversaciones, leads, flujos, conocimiento y configuración.
- Guardado/verificación de API key Groq/OpenRouter.
- Lista de modelos disponibles al registrar la API key.
- Base de conocimiento para alimentar respuestas del bot.
- Webhook de Telegram conectado al CRM: guarda conversación, crea/actualiza lead y responde con IA.
- Despliegue local con Node.js y despliegue web compatible con Netlify/Next.

## Requisitos

- Node.js 20+
- npm 10+
- SQLite local (ya va embebido por Prisma con `DATABASE_URL=file:./prisma/dev.db`)

## Instalación local

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Abrir:

- Panel: `http://localhost:3000`
- Webhook Telegram info: `http://localhost:3000/api/webhook/telegram`

## Variables recomendadas

Crea `.env`:

```env
DATABASE_URL="file:./prisma/dev.db"
APP_DATA_DIR="./data"
TURSO_AUTH_TOKEN="tu_token_de_app_turso"
```

## Paso a paso de uso del sistema

### 1. Iniciar el panel

1. Ejecuta `npm run dev`.
2. Entra a `http://localhost:3000`.
3. Ve a **Configuración > IA**.

### 2. Cargar API key de Groq

1. Pega tu key `gsk_...`.
2. Presiona **Guardar y Verificar**.
3. Si la validación es correcta, el sistema guarda la key y muestra los modelos disponibles.
4. Elige el modelo activo desde la lista.

### 3. Cargar conocimiento para el bot

1. Ve a **Conocimiento**.
2. Crea entradas con:
   - nombre del curso
   - precio
   - modalidad
   - duración
   - fechas
   - certificación
   - preguntas frecuentes
3. Todo eso será usado por el bot al responder.

### 4. Conectar Telegram

#### Crear bot

1. Abre Telegram.
2. Busca `@BotFather`.
3. Ejecuta `/newbot`.
4. Copia el token.

#### Guardar conexión en el sistema

Debes crear un registro en `SocialConnection` para Telegram. Puedes hacerlo desde el panel cuando completes el módulo de conexión o por API:

```bash
curl -X POST http://localhost:3000/api/social \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "name": "Telegram Cursos Medicos",
    "botToken": "TU_BOT_TOKEN"
  }'
```

Luego activa la conexión con el `id` devuelto:

```bash
curl -X PATCH http://localhost:3000/api/social/TU_ID \
  -H "Content-Type: application/json" \
  -d '{"isActive": true}'
```

#### Configurar webhook

Con local puedes usar ngrok o Cloudflare Tunnel. Ejemplo con ngrok:

```bash
ngrok http 3000
```

Luego registra el webhook:

```bash
curl "https://api.telegram.org/bot<TU_BOT_TOKEN>/setWebhook?url=https://TU_URL_PUBLICA/api/webhook/telegram"
```

### 5. Prueba real de Telegram

1. Escribe al bot desde tu cuenta personal.
2. El webhook recibirá el mensaje.
3. El sistema:
   - guardará la conversación
   - clasificará interés del lead
   - guardará o actualizará el lead
   - responderá usando Groq/OpenRouter y la base de conocimiento
4. Revisa el panel en **Conversaciones** y **Leads**.

## Cómo conectar otras redes después

- **WhatsApp Business Cloud API**: usar `phoneNumberId`, token y webhook Meta.
- **Facebook / Instagram**: usar app Meta, page access token y webhook.
- **TikTok**: requerirá app/business API oficial o middleware.

La arquitectura ya está orientada a eso con `SocialConnection`, `Conversation`, `Message`, `Lead` y `Flow`.

## Instalar en PC, web y celular

- **PC**: correr local con `npm run dev` o `npm run build && npm run start`.
- **Web**: desplegar en Netlify.
- **Celular**: usar la app web responsive o instalarla como acceso directo/PWA cuando agregues manifest/service worker.

## Despliegue en Netlify

1. Conecta el repo en Netlify.
2. Build command: `npm run build`.
3. Node version: `20`.
4. Variables:
   - `DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `APP_DATA_DIR` (opcional; en Netlify se usa `/tmp/agentmedical-data` por defecto)
5. Despliega.

## Siguiente paso recomendado

Haz primero una prueba real completa en Telegram. Una vez validado el flujo real, conecta Meta WhatsApp/Instagram/Facebook con el mismo patrón.
