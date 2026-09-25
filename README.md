# Mike Cruces · Community App Store de umbrelOS

Este repositorio es a la vez:

1. **El código fuente** de Nano Banana Studio (React + Vite). Ver [DOCUMENTACION_FUNCIONALIDADES.md](DOCUMENTACION_FUNCIONALIDADES.md).
2. **Una Community App Store de umbrelOS** (`umbrel-app-store.yml` + una carpeta `mcruces-*` por app) desde la que instalar apps en tu Umbrel.

| App | Puerto | Origen |
| --- | --- | --- |
| 🍌 Nano Banana Studio | 4747 | Código de este repo |
| 🌍 God's Eye View | 4748 | [bilawalsidhu/gods-eye-view](https://github.com/bilawalsidhu/gods-eye-view) (MIT), empaquetado en `apps-src/gods-eye-view/` |

```text
umbrel-app-store.yml                  # id y nombre de la store
mcruces-nano-banana-studio/
  umbrel-app.yml                      # ficha de la app (nombre, versión, puerto…)
  docker-compose.yml                  # servicios que ejecuta umbrelOS
mcruces-gods-eye-view/                # paquete umbrelOS de God's Eye View
apps-src/gods-eye-view/               # Dockerfile que empaqueta God's Eye View desde upstream
assets/                               # iconos que muestra umbrelOS
Dockerfile + docker/nginx.conf        # imagen: build de Vite servido por nginx
.github/workflows/*.yml               # compilan y publican las imágenes en GHCR
src/ public/ index.html package.json  # código de la app
```

umbrelOS solo lee las carpetas de primer nivel que contienen un `umbrel-app.yml`, así que el código fuente puede convivir en el mismo repo.

## Instalar en umbrelOS

1. En umbrelOS abre **App Store** → menú `⋯` (arriba a la derecha) → **Community App Stores**.
2. Pega la URL de este repositorio y pulsa **Add**.
3. Abre la store **Mike Cruces** e instala la app que quieras.
4. Nano Banana Studio queda en `http://umbrel.local:4747`. Al abrirla por primera vez te pedirá tu API key de [Google AI Studio](https://aistudio.google.com/apikey).
5. God's Eye View queda en `http://umbrel.local:4748`. Funciona sin claves; las opcionales se configuran en los ajustes de la app en umbrelOS (ver más abajo).

## Publicar una nueva versión de Nano Banana Studio

1. Haz tus cambios en `src/` y pruébalos con `npm run dev`.
2. Sube `version` en [`mcruces-nano-banana-studio/umbrel-app.yml`](mcruces-nano-banana-studio/umbrel-app.yml) (y, si quieres, rellena `releaseNotes`).
3. Haz `git push` a `main`.

La GitHub Action compila la imagen para `linux/amd64` y `linux/arm64`, la publica en `ghcr.io/<usuario>/nano-banana-studio:<version>` y fija `tag@sha256:digest` en `docker-compose.yml` con un commit automático. Cuando termine, umbrelOS ofrecerá la actualización (lo detecta al cambiar `version`).

> La primera vez que se publique la imagen, comprueba en GitHub → **Packages** → `nano-banana-studio` → **Package settings** que su visibilidad sea **Public**. Si es privada, umbrelOS no podrá descargarla.

## God's Eye View

Upstream no publica imagen Docker, así que [`apps-src/gods-eye-view/Dockerfile`](apps-src/gods-eye-view/Dockerfile) la construye a partir de un commit fijado del repo original:

- Compila el bundle con `vite build` y lo sirve con `vite preview`, que además monta los proxies de servidor de la app (son middleware de Vite). Es el modo producción de upstream, sin el servidor de desarrollo.
- `GOOGLE_MAPS_API_KEY` y `CESIUM_ION_TOKEN` se incrustan en el JS al compilar. Para no meter claves en una imagen pública, se compila con marcadores y [`inject-client-keys.mjs`](apps-src/gods-eye-view/inject-client-keys.mjs) los sustituye al arrancar el contenedor por los valores configurados en umbrelOS.
- Las claves se introducen en umbrelOS → ajustes de la app → **Environment variables** (declaradas en `environment:` del manifiesto). El panel "Provider Settings" de la app solo existe en el modo desarrollo de upstream y no aparece aquí.
- Las cachés del servidor (`.gev-cache`, incluido el presupuesto de TomTom) persisten en `${APP_DATA_DIR}/data/cache` y quedan fuera de las copias de seguridad.
- Por HTTP, el micrófono (control por voz) y WebUSB (SDR) no están disponibles, porque el navegador exige HTTPS para esas APIs.

**Actualizar a un commit nuevo de upstream:** cambia `GEV_COMMIT` en el Dockerfile y `version` (`0.1.1-<sha corto>`) en [`mcruces-gods-eye-view/umbrel-app.yml`](mcruces-gods-eye-view/umbrel-app.yml), y haz push.

## Probar la imagen de Nano Banana en local

```bash
docker build -t nano-banana-studio .
docker run --rm -p 8080:8080 nano-banana-studio
```

## Notas

- **Los datos viven en el navegador.** La galería y los estilos van en IndexedDB y la API key en `localStorage`, no en el servidor. Cada dirección desde la que abras la app (`umbrel.local`, la IP, Tailscale…) tiene su propia galería. Usa **Base de datos → Exportar** para hacer copias de seguridad.
- **Acceso protegido.** La app queda detrás del login de umbrelOS (auth de `app_proxy`).
- **HTTP.** umbrelOS sirve las apps por HTTP, así que algunas APIs del navegador que requieren HTTPS no están disponibles (por ejemplo, el diálogo "Guardar como…" de `showSaveFilePicker`). La app recurre automáticamente a la descarga normal.
- El script `src/tests/comprehensiveApiAudit.js` lee la clave de la variable de entorno `GOOGLE_AI_API_KEY`: `GOOGLE_AI_API_KEY=... node src/tests/comprehensiveApiAudit.js`.
