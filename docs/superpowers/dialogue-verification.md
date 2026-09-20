# Diálogo híbrido — verificación del 20 de septiembre de 2026

Implementado en `feat/contextual-dialogue`, desde `main` (`92e718c`).

- Jev evalúa significado y contexto; reglas puras determinan puntos y estado.
- GPT-5.6 Luna escribe una o dos frases, máximo 180 caracteres; Jev valida
  pertinencia, ausencia de hechos inventados y compatibilidad con el estado.
- Se comprueba incompatibilidad con una pregunta específica para cada estado:
  el primer prompt condicional de validación rechazaba diálogos válidos y se corrigió.
- Un turno se confirma únicamente tras validar. ID/version permiten recuperar
  respuestas sin repetir llamadas ni puntos. Los fallos definitivos requieren un ID
  nuevo; los errores de red conservan el ID. Hasta 24 operaciones por sesión.
- Se reutilizó el Map de sesiones existente en lugar de introducir un MemoryStore.
  La idempotencia y el presupuesto no sobreviven reinicios: pendiente para beta.
- Escritura local de texto ya validado, interrumpible con toque/Enter/espacio,
  inmediata con movimiento reducido, anuncio completo para lectores de pantalla.

## Evidencia

- `npm test`: 12 pruebas pasan, incluyendo repetición, incertidumbre, atomicidad,
  reintentos, concurrencia, validación semántica simulada y límites HTTP.
- `git diff --check`: sin errores.
- API real: acceso a Luna confirmado. Prueba «soy amigo del dueño» respondió
  sobre el dueño, no sobre el DJ.
- Chromium emulando iPhone 13: envío real, escritura, completar con toque y segundo
  turno con movimiento reducido; sin errores JS ni desbordamiento horizontal.
- Tras ajustar validación, conversación real primer sueldo/hermana que ayudó a
  buscar empleo: 3 turnos, puntuaciones 37/62/87, victoria con invitación explícita.
  Duraciones 2696/2202/1742 ms, tres llamadas por turno. Es una muestra pequeña,
  no un benchmark ni una garantía de latencia/calidad.
- `.env` ignorado por Git, permisos 600; ambas claves solo se usan en servidor.

## Pendiente (no presentar como resuelto)

Corpus editorial de 60 casos y 10 partidas humanas del plan de diálogo, pruebas
en teléfono físico, animación de entrada/final y controles para beta pública.
Las validaciones también son probabilísticas: no garantizan diálogo perfecto.
El servidor sigue siendo exclusivamente local. No se publicó ni desplegó esta rama.
