# Seguridad

- Cada persona debe usar su propia API key, almacenada en variables de entorno o
  en un archivo `.env` local ignorado por Git.
- Nunca expongas claves al navegador, ni las pegues en issues, PRs o logs.
- Una clave compartida accidentalmente debe revocarse y reemplazarse desde el
  proveedor. Borrar el texto o un commit no invalida la credencial.
- Antes de publicar cambios, revisá `git diff --cached` y ejecutá
  `python3 scripts/check_secrets.py`. El chequeo examina el contenido del índice
  de Git y no muestra los valores encontrados.
- El control automático detecta patrones conocidos; no detecta todos los secretos.
  El hook local debe habilitarse en cada clon. El control de GitHub se ejecuta
  después del push y no puede impedir una exposición inicial.

Si encontrás una vulnerabilidad, usá el reporte privado de vulnerabilidades de
GitHub cuando esté disponible. No publiques detalles sensibles en un issue.
