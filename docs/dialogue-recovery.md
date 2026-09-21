# Recuperación de diálogo — 2026-09-21

El error genérico mezclaba fallas del proveedor, timeouts y doble rechazo del
validador. Ahora se separa la evaluación (obligatoria) de la escritura (recuperable).

- Jev sigue evaluando cada jugada. Solo sus resultados válidos alimentan las reglas.
- La evaluación reintenta una vez errores de red, timeout o HTTP transitorios.
  No reintenta autenticación ni esperas Retry-After largas. Cada llamada pasa
  por la misma contabilidad y comprobación de lease.
- Límite por llamada: 8 s; límite total: 30 s, inferior al lease Redis de 45 s.
- El escritor conserva GPT-5.6 Luna y el validador conserva sus umbrales. Recibe
  también la última pregunta del personaje, incluso sin historial previo.
- Tras dos fallas del diálogo (o agotamiento del tiempo), se usa guion de
  respaldo por reacción/acción y capítulo, sin copiar frases anteriores. Solo
  después de una evaluación válida; no fabrica puntajes ni concede acceso.
- Los finales ganados/perdidos no dependen del escritor, en ambos capítulos.
- Si falla la evaluación, no se consume turno y se informa específicamente
  que no se pudo evaluar con Jev. Los errores de seguridad/Redis se propagan.
- Logs estructurados: etapa, proveedor, clase de fallo, estado HTTP y motivos
  de rechazo permitidos. Nunca prompts, respuestas completas, cookies ni claves.
- Reenvíos del mismo identificador recuperan el resultado sin aplicar dos turnos.

No es una promesa de disponibilidad total: una caída de Jev, Redis o la red aún
puede impedir jugar. Las frases de respaldo son excepcionales, no sustituyen la
conversación generativa normal.

Referencia de manejo de errores: [OpenAI Docs](https://developers.openai.com/api/docs/guides/error-codes).
