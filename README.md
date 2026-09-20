# Caramelo

**La noche promete. El patova, no.**

Un pequeño juego de chamuyo en ASCII. Estás en la puerta del boliche Caramelo,
no figurás en la lista y tenés seis intentos para convencer al patova.
Hecho con JavaScript, caracteres y decisiones de [Jev](https://typesafe.ai).

**Beta para amigos:** [caramelo-jev.vercel.app](https://caramelo-jev.vercel.app).
Requiere la contraseña de tu invitación; funciona en celular y escritorio.
El acceso conserva la estética ASCII/dorada del juego.

## Jugar en tu máquina

Requiere Node.js 22.9 o superior, una API key de TypeSafe con acceso a Jev
y una API key de OpenAI con acceso a GPT-5.6 Luna.
No requiere instalar dependencias.

```sh
cp .env.example .env
chmod 600 .env
# Editá .env localmente y completá JEV_API_KEY y OPENAI_API_KEY.
npm start
```

Abrí http://127.0.0.1:3000. Con `npm run dev`, el servidor se reinicia al editar.
El servidor escucha exclusivamente en la interfaz local. No es un despliegue público.

## Cómo funciona

Jev evalúa la intención, novedad, relevancia, contradicciones y amenazas del
chamuyo, considerando el historial. El código aplica las reglas y determina si
entrás; **GPT-5.6 Luna redacta** una respuesta original de una o dos frases
(máximo 180 caracteres). Jev verifica que sea relevante, coherente con la decisión
y que no invente hechos. Si no pasa, se regenera una vez. Una falla no consume
el turno ni se oculta detrás de frases prefabricadas.

Se usa la Responses API con `reasoning.effort: none` y `store: false`.
El modelo se configura con `OPENAI_DIALOGUE_MODEL`; cambiarlo exige verificar
compatibilidad y calidad. [Ficha oficial de Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna).
Cada turno normalmente hace tres llamadas (dos a Jev y una a OpenAI), hasta cinco
con regeneración. Los envíos tienen identificador y versión: repetir un envío
ya completado devuelve la misma respuesta sin cobrar ni aplicar otro turno.
Un fallo definitivo requiere un nuevo envío; una desconexión conserva el ID para
recuperar el resultado. En local viven en memoria; en Vercel se persisten en Redis
con bloqueo distribuido para evitar turnos/cobros duplicados.

El medidor muestra puntos del juego, **no probabilidades del modelo**. Arrancás
con 12 y necesitás 80 en seis intentos. Llegar a cero no termina la charla;
una amenaza seria detectada con alta confianza sí. La incertidumbre no suma puntos.
La escena es una imagen de alta densidad visual ASCII, generada con GPT Image
a partir de un sketch del usuario. El juego usa el archivo incluido en el repo;
no genera imágenes durante la partida. El [prompt del arte](docs/art-direction.md)
documenta cómo se generó.

La ilustración tiene un ciclo de movimiento a **6 FPS**: respiración y cambios
leves de postura, con luz tenue en el cartel. Un shader WebGL desplaza zonas de
la imagen original sin descargar video ni hacer llamadas adicionales a modelos.
El botón de pausa congela el cuadro. Se detiene fuera de pantalla, en pestañas
ocultas y al terminar la partida. Con movimiento reducido o sin WebGL se muestra
la imagen estática; el juego sigue funcionando.

Al ganar, la última respuesta queda visible y aparece **Entrar**. El final recorre
la puerta, la soga y el interior del boliche, donde dos invitadas adultas te invitan
a su mesa y a bailar. Son seis ilustraciones ASCII de GPT Image en un montaje de
ocho segundos, con reloj y movimiento de cámara a 6 FPS: no una animación de
personajes fluida. Podés pausar, saltar o empezar otra noche. La pestaña oculta y
salir de pantalla pausan el reloj; movimiento reducido muestra el final estático.
Los recursos se precargan al ganar (menos de 5 MB), sin llamadas a modelos durante
el final. Si una imagen falla, se conserva la victoria y el reinicio.
Los [prompts exactos y archivos del final](docs/art-ending.md) quedan documentados.

La interfaz está pensada primero para celular: escena vertical, personajes en
primer plano, controles táctiles y cuadro de texto dentro de la ilustración.
Al enviar, tu mensaje aparece en una burbuja negra junto al personaje y la
respuesta en otra junto al patova. El diálogo validado aparece progresivamente
(no es streaming de tokens del proveedor). Tocarlo o presionar Enter sobre él
lo completa. Con movimiento reducido aparece inmediatamente; los lectores de
pantalla reciben la frase completa una sola vez. Los mensajes largos se pueden desplazar en
su burbuja y también consultar completos en el historial. El texto de entrada
usa 16 px para evitar el zoom
automático de iOS. Enter envía; Shift+Enter agrega una línea en escritorio.
La dirección `localhost` se abre en la máquina que ejecuta el servidor: para
acceder desde un teléfono físico hace falta configurar acceso de red o alojamiento.

Los mensajes y el historial se envían a TypeSafe y OpenAI para evaluar y redactar.
No escribas información privada. En local las partidas viven en memoria; en Vercel
se guardan en Redis con vencimiento de una hora. La aplicación no registra su contenido en logs.

## Verificación

```sh
npm test
```

Pruebas de navegador del final, sin consumir APIs:

```sh
npm ci
npx playwright install chromium
npm run test:e2e
# Alternativa con Chrome instalado:
# CHROME_PATH=/usr/bin/google-chrome npm run test:e2e
```

El servidor de pruebas usa el puerto 3041 y credenciales ficticias; los resultados
de las partidas están simulados. Esto no sustituye probar en un teléfono físico.

Para entender el contrato real de Jev y las reglas, consultá
[cómo decide el patova](docs/jev-explained.md).

Las pruebas usan respuestas simuladas y no consumen la API. El uso del juego sí.
Hay un límite global local de 100 llamadas a proveedores por hora, cuerpo de petición limitado,
validación de origen y sesiones con cookies HttpOnly/SameSite. Antes de alojarlo
en internet no uses el servidor local por un túnel público con una clave personal.
La versión Vercel agrega contraseña hasheada, cookies firmadas, límites por IP y
presupuesto global persistente de US$2/día con reservas conservadoras.
Ver [despliegue, límites y operación](docs/deployment.md).

## Desarrollo

Después de clonar, activá el control local de secretos (requiere Python 3):

```sh
git config --local core.hooksPath .githooks
```

Usá `.env.example` como referencia y guardá tu propia
credencial en `.env`, que Git ignora. La API key debe usarse exclusivamente desde
el servidor; nunca en código de navegador ni en variables públicas del frontend.

## Seguridad

El hook de commit y el workflow de GitHub revisan nombres de archivos sensibles y
algunos formatos habituales de secretos sin imprimir sus valores. Son una defensa
adicional, no una garantía: revisá siempre el diff antes de publicar.

No incluyas credenciales, respuestas privadas del proveedor ni datos personales
en commits, issues, capturas o logs. Consultá [SECURITY.md](SECURITY.md).
