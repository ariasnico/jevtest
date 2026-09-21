# Caramelo: beta en Vercel

El despliegue usa `public/` + `api/index.mjs`, no el servidor local de desarrollo.
Todas las rutas que pueden gastar requieren la cookie de invitación, Origin y Host
exactos. La contraseña se guarda como scrypt con salt, nunca como texto en Git o
en el navegador. Cookie firmada, Secure, HttpOnly, SameSite=Strict, vence en 8 horas.
Los mensajes se envían a TypeSafe y OpenAI. Las partidas en Redis vencen en 1 hora;
no se registran textos ni credenciales en los logs de la aplicación.

## Presupuesto y límites

- **Sin tope diario de gasto**, por autorización del propietario. Se retiró el
  corte de US$2/día; no hace falta borrar el contador anterior ni esperar su reinicio.
- Contabilidad conservadora de **US$0,01 por llamada** antes de cada petición externa,
  incluidos reintentos y validaciones, usualmente 3–5 por turno. No se descuenta
  una llamada fallida o de resultado incierto. El contador persiste en Redis.
- No es una lectura de la factura ni un límite de gasto.
  Modelos restringidos a Jev y GPT-5.6 Luna; requests ≤12 KB, salida Luna ≤180
  tokens sin razonamiento. Revisar reservas al cambiar modelos o tarifas.
- Referencias verificadas 2026-09-20: [Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
  US$0,042/M input, output gratis; [Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna)
  US$0,20/M input, US$1,20/M output. La reserva incluye margen amplio y entrada
  repetida por pregunta de Jev. No se permiten herramientas ni parámetros del cliente.
- Si Redis falla o falta configuración, no se llama a ningún proveedor.
- Redis gratuito, sin auto-upgrade ni eviction. No borrar contadores manualmente.
- Login: 10 intentos/15 min/IP, 100/min global. Inicio: 15 partidas/h/IP.
  Conversación: 60 peticiones/min/IP. IP pseudonimizada con HMAC.
- Lease distribuido de 45 s, operación persistida antes de llamar, commit con
  comparación de propietario; un reenvío recupera la respuesta sin gastar otra vez.
  Una operación interrumpida no se vuelve a ejecutar silenciosamente.

La contabilidad cubre únicamente llamadas de **esta app**: no usos externos de las mismas
keys, cargos de hosting, impuestos ni cambios futuros de tarifas. Contraseña
compartida + rate limiting no equivalen a protección absoluta contra bots/DDoS.
Conviene usar claves dedicadas y configurar también topes en los proveedores.

## Variables de producción (Vercel, nunca NEXT_PUBLIC)

`JEV_API_KEY`, `OPENAI_API_KEY`, `OPENAI_DIALOGUE_MODEL=gpt-5.6-luna`,
`ACCESS_PASSWORD_HASH` (salt:hash scrypt), `SESSION_SECRET` (32 bytes hex),
`PUBLIC_ORIGIN` (URL canónica HTTPS), `CARAMELO_ENABLED=1`.
Redis: `KV_REST_API_URL` + `KV_REST_API_TOKEN`, conectadas por Marketplace.

Para pausar, cambiar `CARAMELO_ENABLED=0` y volver a desplegar. Para revocar
invitaciones/cookies, rotar password hash y SESSION_SECRET y volver a desplegar.
Si una key se expuso, revocarla en el proveedor; un deploy no invalida una key.
Los despliegues viejos pueden mantener su configuración: eliminarlos o protegerlos
al rotar credenciales. No habilitar producción en previews.

## Verificación

`npm test`, `CHROME_PATH=/usr/bin/google-chrome npm run test:e2e`.
`node --env-file=.env.production.local scripts/test-redis.mjs` comprueba concurrencia
y contabilidad sin tope con Redis real, namespace temporal separado, sin llamadas a modelos.
`python3 scripts/check_secrets.py` revisa el índice de Git antes de publicar.

Esta implementación reemplaza el plan previo SQLite: Vercel requiere estado y
contabilidad compartidos entre invocaciones, no contadores en memoria/disco local.
