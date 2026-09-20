# jevtest

Un laboratorio para construir algo creativo, divertido y útil con Jev, de TypeSafe AI.

Estamos explorando la idea. Todavía no hay una aplicación ni integración con el modelo.

## Desarrollo

Después de clonar, activá el control local de secretos (requiere Python 3):

```sh
git config --local core.hooksPath .githooks
```

Cuando exista una integración, usá `.env.example` como referencia y guardá tu propia
credencial en `.env`, que Git ignora. La API key debe usarse exclusivamente desde
el servidor; nunca en código de navegador ni en variables públicas del frontend.

## Seguridad

El hook de commit y el workflow de GitHub revisan nombres de archivos sensibles y
algunos formatos habituales de secretos sin imprimir sus valores. Son una defensa
adicional, no una garantía: revisá siempre el diff antes de publicar.

No incluyas credenciales, respuestas privadas del proveedor ni datos personales
en commits, issues, capturas o logs. Consultá [SECURITY.md](SECURITY.md).
