# Qué hace Jev en Caramelo

Nosotros definimos las preguntas, las opciones y sus descripciones; no sus
probabilidades. En cada llamada enviamos `state` (situación, historial y mensaje)
y `questions` (las preguntas tipadas). Jev interpreta el significado del texto
según esas instrucciones y devuelve valores estructurados. No memoriza la partida
por sí solo: el servidor vuelve a enviar el historial en cada turno. No es una
tabla de palabras clave ni un generador de frases del personaje.

En `lib/evaluation.mjs`, `reaction` es Choice con nueve opciones:
`sincere`, `funny`, `convincing`, `name_drop`, `bribe`, `hostile`, `repeat`,
`manipulation`, `neutral`. Cada opción tiene una descripción: por ejemplo,
`bribe` exige ofrecer un soborno, no meramente mencionar o rechazar uno.

Las preguntas Noul separadas consultan si el mensaje aporta algo nuevo,
es pertinente, contradice al jugador o contiene una amenaza seria.

La categoría `hostile` cierra la partida inmediatamente: un insulto directo al
patova no se compensa con puntos previos ni se acepta por presentarlo como un
chiste. El código fija `status: "lost"` y `action: "refuse"`; el modelo de diálogo
debe comunicar ese rechazo. Jev distingue agresión real de citas o lunfardo
amistoso; no hay una lista de palabras prohibidas. Una disculpa posterior no
reabre esa partida.

## Respuesta real

Extracto completo de `answers` obtenido el 20/09/2026 con la integración actual,
para «No conozco al dueño. Cobré mi primer sueldo y quiero festejar.»
Se omiten únicamente campos externos a `answers` del envelope HTTP. No son
valores fijos ni una garantía de repetir el mismo resultado.

```json
{
  "reaction": {
    "type": "choice",
    "choice": "sincere",
    "confidence": 0.74,
    "probabilities": {
      "hostile": 0,
      "neutral": 0.08,
      "funny": 0.05,
      "name_drop": 0,
      "manipulation": 0,
      "bribe": 0,
      "sincere": 0.77,
      "repeat": 0,
      "convincing": 0.1
    }
  },
  "novelty": { "type": "noul", "noul": 0.86 },
  "relevance": { "type": "noul", "noul": 0.51 },
  "contradiction": { "type": "noul", "noul": 0.09 },
  "threat": { "type": "noul", "noul": 0.01 }
}
```

`probabilities.sincere` es la probabilidad de esa opción dentro de Choice;
`confidence` resume cuán concentrada está la distribución y no es el mismo número.
`novelty.noul` es probabilidad de que la respuesta a «¿aporta algo nuevo?» sea sí,
no una nota de creatividad ni porcentaje de probabilidades de entrar al boliche.

Referencias oficiales: [Choice](https://docs.typesafe.ai/primitives/choice),
[Noul](https://docs.typesafe.ai/primitives/noul) y
[Confidence](https://docs.typesafe.ai/confidence).

## Cómo se convierte en juego

`lib/rules.mjs` toma la opción ganadora, su confianza y los cuatro Nouls. No usa
la distribución completa para mezclar respuestas. En el ejemplo: confianza>=0.5,
novedad>=0.6, relevancia>=0.5 y contradicción<0.7 permiten sumar 25 por `sincere`.
Se parte de 12; se gana con 80 dentro de seis turnos. `funny` puede sumar 23 y
`convincing` 30 bajo las mismas condiciones. Hay penalizaciones para repetición,
soborno, manipulación y contactos sin sustento; la repetición exacta se detecta
también en código. La afinidad es un puntaje nuestro, no una probabilidad de Jev.

Luna recibe la decisión calculada y redacta hasta 180 caracteres. Otra llamada a
Jev valida pertinencia, incompatibilidad con el resultado e invención de hechos.
Una respuesta inválida se regenera una vez; si sigue fallando no se consume turno.
Todo esto es probabilístico y requiere evaluación editorial: no garantiza buen
humor, balance perfecto ni ausencia de fallos. El final visual usa únicamente el
`status: won` confirmado, sin nuevas llamadas a Jev ni OpenAI.

## Una estrategia que ganó en una prueba real

1. «No conozco al dueño. Cobré mi primer sueldo y quiero festejar.»
2. «Vengo con mi hermana, que me bancó mientras buscaba laburo. Quiero invitarle la primera ronda.»
3. «Ella me prestó plata para ir a las entrevistas. Hoy quiero devolverle el gesto, sin hacer lío.»

Esa partida alcanzó 37/62/87 puntos. No es una contraseña: adaptá cada mensaje a
la pregunta del guardia, agregá detalles consistentes y no repitas argumentos.
La prueba posterior en navegador también ganó en tres turnos y completó el final;
otra repetición quedó en 37/37/62. Si pregunta por el plan después de brindar,
contestá eso, por ejemplo: «Después de brindar queremos bailar pop, que a mi
hermana le encanta. Hace meses que no salimos juntos; volvemos en taxi.»
