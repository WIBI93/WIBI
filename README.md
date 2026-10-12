# WIBI

App personal para el móvil, instalable desde el navegador (PWA).

Se construye por secciones independientes: cada una vive en su propia carpeta dentro de `js/modules/`
y guarda sus datos bajo su propia clave. Los datos se quedan en el móvil; la copia de seguridad es un
archivo `.json` que se guarda donde quiera el usuario (por ejemplo, Google Drive).

## Estructura

- `index.html`: página única de la app.
- `css/styles.css`: estilos y colores (tema claro y oscuro).
- `js/core/`: piezas comunes (almacenamiento, ajustes, navegación, copia de seguridad).
- `js/screens/`: pantallas generales (inicio, ajustes, color de las secciones).
- `js/modules/`: una carpeta por sección (`economy`, `calendar`...).
- `sw.js` y `manifest.webmanifest`: permiten instalar la app y usarla sin conexión.
- `icons/`: iconos de la app.
