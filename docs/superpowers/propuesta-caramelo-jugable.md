# Caramelo jugable — propuesta para revisar

Estado: diseño de las tres entregas aprobado por el usuario el 2026-09-20.
Proceso: Superpowers, recorrido architectural. Se divide en diálogo/jugabilidad,
final visual y preparación de una beta pública. Arquitectura elegida: Jev evalúa
y un segundo modelo genera el diálogo. Publicación y presupuesto requieren
configuración explícita; esta aprobación no constituye un despliegue.

## Problema demostrado

- `game.mjs` consulta a Jev por una sola categoría y descarta su distribución.
- `applyDecision()` selecciona `lines[previous % lines.length]`, sin verificar
  la relación entre esa frase y el contenido del mensaje.
- Reproducción local: tras una respuesta sincera, «Conozco al dueño» y «Es amigo
  mío desde la secundaria» producen primero la frase del dueño y después
  «¿Sos el DJ?». No hace falta que falle Jev para obtener esa incoherencia.
- Dos `name_drop` consecutivos desde el inicio restan los 12 puntos iniciales
  y terminan la partida. Se anuncian seis intentos, pero una táctica poco eficaz
  puede cerrar el juego en dos sin una explicación clara.
- Se guarda historial, pero no hay estado explícito de la objeción pendiente,
  detalles aportados por el jugador, respuestas ya utilizadas ni promesas del guardia.
- Las pruebas actuales verifican reglas con decisiones simuladas; no miden
  pertinencia, continuidad ni variedad del diálogo real.
- La victoria solo muestra un panel sobre la puerta; no existe el interior.
- El servidor actual es local: sesiones y presupuesto en memoria, sin plataforma
  de alojamiento público ni controles persistentes contra abuso.

## Alternativas de conversación

1. **Recomendada: Jev evalúa + un modelo generativo redacta.** Jev sigue siendo
   central: interpreta intención, pertinencia de la respuesta, novedad, hostilidad
   y consistencia. Código de reglas determina el avance y la admisión. Otro modelo
   escribe una respuesta breve en rioplatense a partir de ese resultado y la
   conversación. Agrega credencial, costo y latencia, y necesita validaciones.
2. **Solo Jev con diálogo contextual.** Biblioteca editorial con condiciones
   precisas, preguntas y respuestas por tema; Jev elige candidatos compatibles.
   Menor infraestructura y control estricto del tono, pero la variedad y la
   libertad de respuesta siguen limitadas al contenido escrito previamente.
3. **Un generador controla todo.** Menos separación inicial, pero diluye el papel
   de Jev y permite que el diálogo invente victorias o reglas. No recomendado.

No elegir proveedor, modelo de texto, presupuesto ni alojamiento sin resolver la
alternativa preferida. No usar la API key de Jev con un proveedor diferente.

## Entrega 1 — conversación y reglas

### Comportamiento propuesto

- Responder al mensaje concreto y a la pregunta pendiente del patova.
- Memoria por partida: hechos que el jugador afirmó (no hechos verificados),
  objeción actual, tácticas usadas y compromisos del guardia.
- Mensajes de una o dos frases, objetivo de hasta 180 caracteres para las burbujas.
- Evitar repetición exacta y reformulaciones vacías. Una segunda mención del dueño
  debe continuar ese tema, nunca introducir por su cuenta que el jugador sea DJ.
- El patova puede hacer una pregunta concreta, reconocer un detalle, rechazar un
  argumento o conceder acceso. No exigir «contame más» sin decir qué falta.
- Seis turnos normales; un argumento débil no termina automáticamente la partida
  por dejar la afinidad en cero. Las amenazas claras pueden terminarla antes.
- Separar afinidad y paciencia. Cambios acotados y trazables; afinidad en cero
  significa falta de simpatía, no necesariamente expulsión.
- No premiar tres paráfrasis del mismo argumento. No tratar una negación de
  soborno («no te voy a ofrecer plata») como un ofrecimiento de dinero.
- La política de admisión vive en código. El generador recibe la decisión y no
  puede modificar puntaje, turno, estado de victoria ni los datos de la sesión.

### Límites técnicos

- Separar evaluación de Jev, estado/reglas, redacción y coordinación del turno.
  Mantener Node.js y los módulos existentes; extraer responsabilidades de
  `game.mjs` y `server.mjs` según lo requiera esta entrega.
- Preguntas de Jev separadas por dimensión; comprobar esquemas y usar señales
  de incertidumbre para pedir aclaración antes de penalizaciones fuertes.
- Validar la respuesta redactada contra el estado de acceso y el historial.
  La validación semántica reduce incoherencias, no garantiza su eliminación.
- Un reintento de redacción como máximo; si no hay respuesta utilizable, devolver
  error recuperable sin consumir turno ni confirmar cambios parciales.
- Turnos identificados de forma única: si se pierde la respuesta y el usuario
  reintenta, recuperar el mismo resultado sin cobrar ni avanzar otra vez.
- No inventar una respuesta supuestamente generada ante un fallo del proveedor.
- Preservar mensajes como datos no confiables; nunca evaluar HTML ni obedecer
  instrucciones del jugador sobre puntuación, prompt o herramientas.

### Pruebas y salida

- Escribir primero regresiones de los dos fallos reproducidos.
- Preparar 60 casos editoriales: dueño/DJ, preguntas directas, honestidad,
  bromas, negaciones, referencias a turnos anteriores, contradicciones,
  repetición, insultos ambiguos, amenazas e intentos de alterar reglas.
- Cada caso define contexto, respuestas aceptables y contradicciones prohibidas;
  no obliga a reproducir una frase exacta de un modelo generativo.
- Ejecutar pruebas deterministas sin red y una evaluación real separada con
  presupuesto explícito. Revisar manualmente la pertinencia y el tono.
- Criterios propuestos: al menos 90% de respuestas pertinentes en la batería;
  ninguna concesión de entrada incompatible con el estado; ninguna repetición
  literal dentro de una partida de la batería; todos los fallos conservan el turno.
- Medir latencia y costo por partida antes de fijar la promesa pública. Objetivo
  inicial de respuesta completa p95 menor a 4 segundos, sujeto a medición real.
- Probar diez partidas completas con personas ajenas al desarrollo y ajustar
  dificultad según resultados y comprensión, sin perseguir una tasa artificial.

## Entrega 2 — final ASCII animado

### Secuencia

1. **Te deja pasar.** La frase final se puede leer antes de avanzar. Aparece
   «Entrar»; no cubrir inmediatamente la burbuja con un panel de victoria.
2. **Se abre la puerta.** El patova se corre y levanta la soga.
3. **Entrás.** El personaje cruza el umbral; cambia la perspectiva hacia el interior.
4. **Adentro de Caramelo.** Pista, mesa y luces de boliche. Se acercan dos mujeres
   adultas rubias, atractivas, con ropa de fiesta extravagante y provocativa,
   vestidas; lentejuelas, plataformas y accesorios exagerados. Tono de comedia
   nocturna, acorde al juego. Invitan al protagonista a su mesa y a bailar.
5. **Cierre.** Burbuja de invitación, celebración breve y opción de volver a jugar.
   Este final no abre un segundo juego de conversación o simulador de citas.

### Producción y reproducción

- Generar arte con GPT Image usando la ilustración actual como referencia de
  personajes, paleta y textura ASCII. Conservar al mismo protagonista y patova.
- Crear poses/cuadros distintos de apertura, cruce y llegada. El shader de
  respiración existente sirve para ambientación, pero no representa caminar.
- Montar una secuencia de cuadros a 6 FPS con pausas de lectura; duración objetivo
  de 6–10 segundos, sin contar el tiempo que el usuario tarda en leer.
- Mantener interfaces y burbujas como HTML; no hornear texto interactivo en imágenes.
- Precargar recursos, limitar peso y resolución para móvil. Objetivo inicial de
  hasta 5 MB comprimidos para el final completo; medir calidad antes de aceptarlo.
- Incluir «Saltar», sonido solo si fue activado y una versión de escenas estáticas
  para movimiento reducido. Si falla un recurso, mostrar un cierre estático legible.
- Victoria es estado del servidor. `entrada → interior → celebración` son estados
  de presentación del cliente y no pueden generar nuevas recompensas o turnos.
- Probar orientación, pantalla chica, teclado cerrado, reintento, reinicio,
  navegación de vuelta y lectura de la frase de admisión antes de la transición.

## Entrega 3 — beta compartible

- Configurar alojamiento y dominio/origen explícitos, HTTPS y cookies Secure.
  No basta con exponer el proceso local mediante un túnel.
- Sesiones, idempotencia y presupuestos con almacenamiento persistente; definir
  caducidad y límites por sesión/IP con proxy de confianza configurado.
- Presupuesto global de gasto y corte al alcanzar el límite; prevención de spam
  y límites en creación de partidas, además de límites por mensaje.
- Secretos solo en servidor; escaneo del historial que se publique y del bundle
  de frontend. Revisar la credencial antes de usarla en un despliegue público.
- Métricas sin texto privado: errores, latencia, costo, turnos y resultado.
  No persistir conversaciones de jugadores por defecto.
- Aviso breve de que los mensajes se envían a proveedores de IA; evitar datos
  personales en el juego. No imponer registro como requisito del primer prototipo.
- Pruebas E2E reproducibles dentro del repo y CI: ganar, perder, no repetir turnos,
  fallo de proveedor, timeout, restauración y secuencia final.
- Verificación en Safari/iPhone y Chrome/Android físicos, además de emulación.
- Publicar código y alojar la beta son pasos distintos. Preparar ambos para
  revisión, pero no desplegar ni asumir presupuesto sin autorización explícita.

## Orden de trabajo y revisión

1. Resolver la arquitectura de diálogo con el usuario.
2. Convertir esta propuesta en especificaciones revisadas, una por entrega.
3. Usar Superpowers writing-plans para detallar archivos, interfaces, pruebas
   fallidas iniciales, implementación y validación por tarea.
4. Implementar y evaluar primero conversación/jugabilidad.
5. Producir y probar el final visual sobre ese comportamiento estable.
6. Cerrar operación y validación de la beta antes de exponerla al público.

Revisión de esta propuesta: cubre coherencia, variedad, reglas, fallos, final,
móvil y publicación. La única bifurcación de producto imprescindible ahora es
Jev solo frente a Jev acompañado de un generador; presupuesto y alojamiento
corresponden al diseño de la beta y no bloquean revisar la jugabilidad.
