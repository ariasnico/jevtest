# Verificación de la beta — 2026-09-20

- Vercel: `https://caramelo-jev.vercel.app`, proyecto `caramelo-jev`.
- 19 pruebas unitarias/HTTP y 10 de navegador aprobadas.
- Redis real: reenvío persistente, conflictos, bloqueo entre workers, fallas y
  operaciones interrumpidas sin repetir proveedores; ocho reservas concurrentes
  cerca del tope permiten exactamente dos y dejan el contador en US$2.
- HTTP público: página/login 200; `.env`, `.env.production.local`, `.git/config`
  y `server.mjs` 404; start/talk sin cookie 401; endpoint interno directo 404.
- Login real y partida real en navegador Chromium, viewport móvil 390 × 844.
  Victoria confirmada, carga de las seis imágenes, invitación visible y sin
  desborde horizontal. Esto no sustituye una prueba en un iPhone/Android físico.
- Dos partidas reales ganadas. Las decisiones no son deterministas: el primer
  argumento obtuvo 0 puntos de bonificación por relevancia baja; los siguientes
  argumentos sinceros sumaron 25. Victoria a 87 puntos en cuatro turnos válidos.
- Se observaron respuestas rechazadas por el pipeline de generación/validación:
  muestran un error recuperable, no consumen turno, no inventan una respuesta
  de reemplazo. Sus llamadas sí cuentan para el presupuesto. No se promete
  disponibilidad perfecta ni una secuencia que siempre gane.

Secuencia que ganó una partida real:

1. Cobré mi primer sueldo después de ocho meses sin trabajo. Quiero festejar acá
   con mi hermana, que me bancó todo ese tiempo.
2. Ella me prestó plata para ir a las entrevistas. Hoy quiero devolverle el gesto
   invitándola a bailar y pagando yo la primera ronda.
3. Conseguí trabajo en una panadería. Arranco a las seis; hoy tengo franco y por
   una vez quiero ver amanecer bailando.
4. Mi hermana eligió Caramelo porque le encanta bailar pop. Después volvemos
   juntos en taxi: mañana invito yo el desayuno.

En la prueba de navegador, un envío falló sin consumir turno; el siguiente detalle
permitió completar la victoria: «La pobre me aguantó practicar entrevistas en la
cocina; esta noche merece escuchar música y no mi currículum».
