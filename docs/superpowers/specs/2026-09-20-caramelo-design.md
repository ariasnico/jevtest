# Caramelo jugable — diseño aprobado

El usuario aprobó las tres entregas y la arquitectura híbrida el 2026-09-20.
Este documento concreta la [propuesta revisada](../propuesta-caramelo-jugable.md).
Las cifras de balance y calidad siguientes son valores iniciales para evaluar,
no resultados ya obtenidos ni promesas sobre latencia o costos.

## Restricciones globales

- Node.js >=22.9; JavaScript ESM; frontend HTML/CSS/JS existente.
- Jev evalúa; código determina la admisión; otro modelo redacta.
- Seis turnos normales; respuesta de hasta 180 caracteres.
- Claves solo en servidor; no guardar ni publicar mensajes de jugadores por defecto.
- No agregar frameworks ni un segundo juego dentro del boliche.
- Móvil primero: 320 px como ancho mínimo; entrada de 16 px y objetivos táctiles de 44 px.
- Arte ASCII con GPT Image; animación de 6 FPS; movimiento reducido y omitir secuencia.
- Tests deterministas sin red; evaluación real separada con presupuesto explícito.
- No publicar, desplegar ni contratar servicios con esta tarea de planificación.

## A. Conversación

### Estado y contratos

`Game`: `{id, version, turns, affinity, patience, status, history}`.
`status`: `playing | won | lost`. Valores iniciales: version=0, turns=0,
affinity=12, patience=6. `history` conserva los seis intercambios completos durante
la sesión; así las afirmaciones y preguntas previas se preservan literalmente,
sin convertir afirmaciones del jugador en hechos verificados.

`Evaluation`: `{reaction, novelty, relevance, contradiction, threat, confidence}`.
Las cinco dimensiones posteriores a `reaction` son números finitos en [0,1].
`reaction` conserva las nueve categorías actuales. Jev recibe toda la conversación
y preguntas independientes: intención, información nueva, respuesta a la objeción,
contradicción y amenaza real. La confianza pertenece a Choice; los otros valores
son Noul. No confundir probabilidad de una propiedad con confianza global.

`Decision`: `{status, affinity, patience, action}`.
`action`: `ask_detail | acknowledge | challenge | admit | refuse`.
Se rechazan campos extra y valores inválidos del proveedor.

El historial completo incluye la última pregunta del guardia: no hace falta otro
resumen libre capaz de inventar datos. `action` representa la objeción operativa;
la respuesta visible final se almacena junto al turno que la produjo.

### Reglas iniciales

Afinidad siempre en [0,100]. Para reaction sincere/funny/convincing, sumar
25/23/30 solo si novelty>=0.6, relevance>=0.5, contradiction<0.7 y confidence>=0.5.
Para repeat/name_drop/bribe/manipulation restar 10/6/15/12; neutral no suma.
Incertidumbre (confidence<0.5) solicita aclaración sin sumar ni restar afinidad.
Cada respuesta completada consume un turno y un punto de paciencia: aquí paciencia
es el número de oportunidades restantes, no un segundo puntaje oculto.
Solo amenaza con threat>=0.95 y confidence>=0.8 permite pérdida anticipada.
Afinidad>=80 gana; agotamiento de seis turnos pierde si no ganó. Afinidad=0 no
termina anticipadamente. Una repetición exacta normalizada fuerza `repeat`.

### Turno transaccional

Entrada HTTP: `{turnId, expectedVersion, message}`; identificador UUID y mensaje
de 1–280 caracteres. El servidor almacena el hash del payload con ese identificador.
Reintento idéntico devuelve el resultado existente; mismo ID con otro payload
devuelve 409. Doble petición simultánea no inicia dos cadenas de modelos.

Pipeline: evaluar → proyectar reglas sin mutar → redactar → validar → confirmar.
La redacción recibe texto/contexto, Decision y restricciones de personaje. Devuelve
solo una frase, nunca estado. Validación local de longitud, duplicado normalizado
y texto vacío; Jev verifica pertinencia, compatibilidad con admisión e invenciones
respecto al historial. Exigir >=0.85 en cada verificación semántica como valor inicial.
Un único segundo intento de redacción con causas de rechazo. Si vuelve a fallar,
502 recuperable, sin confirmar turno. Se conserva la evaluación para el reintento
del mismo turnId, con límite de dos redacciones por operación; una nueva operación
de reintento requiere intervención explícita del jugador y nuevo ID.

Timeout total 20 s; timeout por llamada 6 s; hasta 5 llamadas por operación
(evaluación, redacción, validación, segunda redacción, segunda validación), siempre
respetando el deadline total. Cada llamada consume presupuesto, aunque falle.
El frontend espera 23 s y usa el mismo turnId para recuperar un resultado ambiguo.

### Modelo generador

El proveedor/modelo concreto se elige antes de implementar su adaptador. Exponer
la interfaz `generateDialogue({history,message,decision,feedback,signal})`.
La selección debe verificar API oficial, salida breve en español, latencia y costo;
no usar un endpoint supuesto ni asumir que la clave de Jev sirve para otro proveedor.
Las pruebas de dominio usan una implementación inyectada de esa interfaz.

### Aceptación

60 fixtures repartidos en 12 familias de 5 casos. Al menos 54/60 pertinentes,
cero admisiones incompatibles y cero frases idénticas dentro de una partida.
El juicio de pertinencia y continuidad es editorial, no una igualdad de strings.
Registrar también fallos/timeouts para no mejorar artificialmente la tasa filtrándolos.
Medir p50/p95 y costo real; p95<4 s es objetivo, no gate que deba ocultar datos.
Completar diez partidas externas con participantes coordinados por el usuario.

## B. Final visual

Estado de servidor `won` permanece inmutable. Estado visual independiente:
`door → admitted → entering → inside → invitation → complete`.
Al ganar se conserva la última burbuja y se ofrece «Entrar».
Seis imágenes ancla: guardia apartándose, soga levantada, protagonista en umbral,
interior, dos invitadas acercándose y mesa/pista. Adultos reconocibles y coherentes
con la referencia original; dos mujeres rubias atractivas con ropa de fiesta
extravagante y provocativa, sin desnudez ni escena sexual.

Generar fotogramas intermedios auténticos cuando cambie una pose; no fingir caminar
con un zoom sobre una sola imagen. Si GPT Image no conserva bien la continuidad,
usar montaje de poses clave con cortes deliberados, sin presentarlo como animación
de personajes fluida. Duración 8 s a 6 FPS; pausas de lectura fuera de ese tiempo.
Invitación fija: «Vení, tenemos lugar en la mesa. Después te sacamos a bailar.»
No llamar a modelos durante la reproducción. Carga total objetivo <=5 MB, arte
comprimido conservando nitidez. Sonido solo por consentimiento ya dado.
Saltar lleva a invitación; movimiento reducido muestra el interior estático;
fallo de carga conserva felicitación legible y reinicio. Reinicio cancela timers.

## C. Beta

Diseño inicial de un solo proceso con volumen persistente y SQLite; no serverless
efímero ni varias réplicas. Elegir dependencia SQLite compatible con Node >=22.9
antes de implementación; verificar documentación y mantenimiento actuales.
Guardar estado activo, resultados idempotentes y presupuestos; TTL de sesión 1 h.
El historial de diálogo es estado transitorio de sesión, no telemetría: eliminarlo
con el TTL, sin conservarlo en logs, backups de larga duración ni reportes.
Las transacciones cortas reservan operación/presupuesto; jamás retener una transacción
SQLite durante una llamada a un modelo. Locks con lease y recuperación tras reinicio.

Origen HTTPS explícito, cookie HttpOnly/SameSite/ Secure, proxy de confianza
configurado explícitamente. No confiar indiscriminadamente en X-Forwarded-For.
Límites iniciales: 10 partidas/IP/h, 12 peticiones de turno/sesión/min, seis turnos
completados/partida. Mismo turno recuperado no consume otro presupuesto de modelos.
Tope monetario diario en unidades enteras, con tarifas de modelos configuradas y
reservas conservadoras por tokens máximos; ausencia de tarifas/tope bloquea modo público.
El monto lo decide el usuario. Métricas sin contenido: proveedor, latencia, uso,
error, resultado. Sesiones y presupuesto sobreviven un reinicio.

Pruebas en Safari/iPhone y Chrome/Android físicos son una verificación pendiente
de ejecución humana, no sustituible por emulación. El servidor local continúa
operativo hasta que se autorice un despliegue concreto con costo y dominio visibles.
