# Caramelo

**La noche promete. El patova, no.**

Un pequeño juego de chamuyo en ASCII. Estás en la puerta del boliche Caramelo,
no figurás en la lista y tenés seis intentos para convencer al patova.
Hecho con JavaScript, caracteres y decisiones de [Jev](https://typesafe.ai).

## Jugar en tu máquina

Requiere Node.js 22.9 o superior y una API key de TypeSafe con acceso a Jev.
No requiere instalar dependencias.

```sh
cp .env.example .env
chmod 600 .env
# Editá .env localmente y completá JEV_API_KEY.
npm start
```

Abrí http://127.0.0.1:3000. Con `npm run dev`, el servidor se reinicia al editar.
El servidor escucha exclusivamente en la interfaz local. No es un despliegue público.

## Cómo funciona

Cada mensaje hace una llamada real a `jev-latest` usando el endpoint oficial
`https://api.typesafe.ai/v1/systemone`. Jev clasifica la reacción del patova entre
nueve opciones, teniendo en cuenta la conversación. El código aplica puntos,
selecciona una frase escrita de antemano y decide si entrás.

El medidor muestra puntos del juego, **no probabilidades del modelo**. Arrancás
con 12 y necesitás 80 en seis intentos. La agresión termina la partida.
No hay otro modelo generando diálogo ni simulación oculta cuando falla la API.
La escena es una imagen de alta densidad visual ASCII, generada con GPT Image
a partir de un sketch del usuario. El juego usa el archivo incluido en el repo;
no necesita una clave de OpenAI para jugar. El [prompt del arte](docs/art-direction.md)
documenta cómo se generó.

La ilustración tiene un ciclo de movimiento a **6 FPS**: respiración y cambios
leves de postura, con luz tenue en el cartel. Un shader WebGL desplaza zonas de
la imagen original sin descargar video ni hacer llamadas adicionales a modelos.
El botón de pausa congela el cuadro. Se detiene fuera de pantalla, en pestañas
ocultas y al terminar la partida. Con movimiento reducido o sin WebGL se muestra
la imagen estática; el juego sigue funcionando.

La interfaz está pensada primero para celular: escena vertical, personajes en
primer plano, controles táctiles y cuadro de texto de 16 px para evitar el zoom
automático de iOS. Enter envía; Shift+Enter agrega una línea en escritorio.
La dirección `localhost` se abre en la máquina que ejecuta el servidor: para
acceder desde un teléfono físico hace falta configurar acceso de red o alojamiento.

Los mensajes y el historial de la partida se envían a TypeSafe para su evaluación.
No escribas información privada. El servidor guarda las partidas en memoria
durante una hora; no persiste conversaciones ni registra su contenido.

## Verificación

```sh
npm test
```

Las pruebas usan respuestas simuladas y no consumen la API. El uso del juego sí.
Hay un límite global local de 100 mensajes por hora, cuerpo de petición limitado,
validación de origen y sesiones con cookies HttpOnly/SameSite. Antes de alojarlo
en internet hacen falta HTTPS, autenticación o controles de abuso, presupuestos
persistentes y una configuración de origen adecuada. No expongas este servidor
por un túnel público con una clave personal.

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
