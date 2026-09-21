# Capítulo 2: la mesa VIP

Después de la invitación del primer final aparece **Continuar · El VIP**. La
premisa ficticia: Clavicular tiene una mesa rodeada de gente pidiendo selfies;
el jugador debe aportar humor, una historia honesta o un plan para el grupo.
No se gana por apariencia, seguidores o dinero. Las invitadas son adultas y
participantes de la noche, no recompensas ni personas reales identificadas.

Seis turnos, 12 puntos iniciales, victoria a 80. Mismas reglas de repetición,
incertidumbre y agresión; criterios y contexto de Jev específicos para amistad
y acceso a la mesa, no para entrar nuevamente al edificio. Un insulto directo
cierra el VIP. Perder no implica ser expulsado de Caramelo. El escritor recibe
una personalidad distinta y la condición ganada/perdida es siempre autoritativa.

Los cierres del VIP (victoria o derrota) son frases de guion deliberadas: una vez
que Jev y las reglas deciden el resultado, otro modelo no puede impedir aplicarlo.
Durante la conversación, las réplicas se generan y validan en cada turno.
Si el escritor o el validador falla dos veces, se usa una frase de respaldo
de guion acorde a la reacción y decisión ya calculadas por Jev. No se inventan
evaluaciones ni se acepta el texto que fue rechazado. Esta recuperación también
aplica al patova. Los finales de ambos capítulos son autoritativos.

## Integración y seguridad

- `/api/continue` comprueba la victoria en servidor, con lock y guardado CAS en
  Redis. Una transición repetida devuelve el capítulo actual sin resetearlo.
- La versión crece al cambiar de capítulo; envíos atrasados del patova no se
  aplican a Clavicular. El historial del capítulo nuevo comienza vacío.
- `/api/resume` recupera estado público y última respuesta; nunca expone
  evaluaciones, operaciones internas ni secretos. No genera texto ni gasta APIs.
- Nuevas rutas requieren la misma autenticación, origen, límites por IP y
  contabilidad de uso. No hay parámetro público para forzar capítulo, puntaje o victoria.
- Sin tope diario de gasto en producción, por decisión del propietario. Las imágenes son estáticas y
  se generan una vez, nunca con cada partida.

## Arte y referencias

Se usó **GPT Image integrado**, no la API/CLI facturada con la clave del proyecto.
Dos PNG originales se convirtieron a WebP (calidad 88) sin alterar la composición:

- `public/assets/vip/clavicular-vip.webp`: encuentro frente al VIP.
- `public/assets/vip/vip-table.webp`: victoria, sentado con el grupo.

Ambos son 1086 × 1448, total aproximado 1,3 MB. El retrato es una representación
estilizada reconocible, no una fotografía ni una escena real atribuida al influencer.
Referencia de identidad: [retrato y artículo de NSS G-Club](https://www.nssgclub.com/en/lifestyle/44485/who-is-clavicular-braden-peters-looksmaxxing).
La fotografía de referencia no se redistribuye en el repositorio.
[Ficha biográfica consultada](https://www.famousbirthdays.com/people/clavicular.html):
Braden Peters, nacido en diciembre de 2005, adulto al crear esta escena.
Referencia de estilo: `public/assets/ending/06-table.webp`, arte original del juego.

El idle reutiliza el shader a 6 FPS, con la región de cabeza ajustada al nuevo
personaje. El cambio de capítulo lleva un fade de opacidad de 200 ms, solo para
clic/tap y sin movimiento reducido; indica cambio de estado, no bloquea controles.
El final es un montaje de dos cuadros durante cuatro segundos, no video ni
animación facial generada. Puede pausarse o saltarse; respeta pestañas ocultas y
movimiento reducido. Si falla el arte, los controles siguen funcionando.

## Prompts finales (verbatim)

### Encuentro

Use case: stylized-concept. Create a NEW portrait 3:4 high-resolution game background for chapter 2 of CARAMELO, not a UI mockup. Image 1 is identity reference of adult public influencer Clavicular (Braden Peters, age 20): recognizably preserve his specific angular square jaw, thick straight brows, greenish eyes, full lips, wavy curly brown swept hair, clean-shaven face, lean wide-shouldered build. Image 2 is STYLE and nightclub continuity reference only. ENTIRE image formed from extremely fine, legible monospaced ASCII characters on near-black, dense high-definition amber/gold terminal art with restrained burgundy and pink lights, matching image 2; no ordinary painted or photographic areas. Scene: fictional satirical encounter inside lavish Buenos Aires nightclub Caramelo at a VIP balcony entrance. Main Clavicular on right-center foreground, head centered around x68% y30%, big enough to recognize face, wearing fitted elegant black open-collar shirt and thin chain. Confident slightly amused expression looking toward player. Player seen from behind at bottom-left, small, dark jacket. Behind and around Clavicular are five distinct beautiful clearly ADULT blonde women aged 25-35 in glamorous daring mini evening dresses: gold sequins, black satin with slit, burgundy fitted dresses, tasteful plunging necklines, high heels, fully clothed non-explicit nightclub fashion. Natural social poses, women talking and smiling, no sexual acts. Velvet rope and ornate brass balustrade, VIP booths, chandelier, dancefloor depth. Upper 18% contains architectural darkness and a small readable CARAMELO / VIP sign, not faces, to leave room for an overlaid speech bubble. Bottom 22% darker unimportant floor/jacket area for game input overlay. Main faces between y25%-52%, no heads cut off, especially the distinctive Clavicular face. Do not draw UI, speech bubbles, captions, watermarks, or any text except the small venue sign. Fictional comedy illustration, not an actual photograph or endorsement. Make the whole scene coherent with the existing ASCII game.

### Victoria

Use case: illustration-story. Generate the VICTORY scene for chapter 2 of the Caramelo ASCII nightclub game, portrait 3:4. Image 1 is the face identity reference for adult public figure Clavicular, Braden Peters age20. Image 2 is the exact ASCII style, clothes, characters and nightclub continuity reference. A clearly fictional parody illustration, not an actual photo or endorsement. Same recognizably angular clean-shaven Clavicular with thick eyebrows, wavy curly brown hair, full lips, black open-collar shirt and thin gold chain. He is now seated at the curved burgundy VIP booth on the right, smiling naturally, making a welcoming open-hand gesture toward an empty place at the table. The player, an adult dark-haired man in the same dark jacket from image2, now sits in foreground-left with his back three-quarter to camera, accepted as part of the friend group. Surround them with five clearly adult blonde women aged25-35, distinct faces and hairstyles, in the same glamorous short evening dresses in gold sequins, black satin and burgundy, tasteful plunging necklines and high heels, fully clothed, relaxed sociable smiles and conversation. A beautiful blonde adult woman closer to the viewer gestures toward the empty seat, no sexual contact. Ornate small round brass table, drinks, warm lamps, chandelier and Caramelo sign distant above the dancefloor. Entire image made of tiny crisp monospaced ASCII symbols, dense high-definition amber gold on near-black, restrained burgundy and pink highlights, like image2. Preserve facial likeness strongly while keeping ASCII medium visible. Characters' faces mainly between25%-58% of height, lower22% low-detail dark seating/table edge for UI; top16% architecture with subdued detail for overlay. Cinematic warmth, social victory, not a posed celebrity photograph. No UI, speech bubbles, captions or watermark; only distant CARAMELO venue sign allowed. Must look like the next frame of the same game's night.
