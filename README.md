# 🍌 Nano Banana Studio · Community App Store de umbrelOS

Este repositorio es a la vez:

1. **El código fuente** de Nano Banana Studio (React + Vite). Ver [DOCUMENTACION_FUNCIONALIDADES.md](DOCUMENTACION_FUNCIONALIDADES.md).
2. **Una Community App Store de umbrelOS** (`umbrel-app-store.yml` + la carpeta `mcruces-nano-banana-studio/`) desde la que instalar la app en tu Umbrel.

```text
umbrel-app-store.yml                  # id y nombre de la store
mcruces-nano-banana-studio/
  umbrel-app.yml                      # ficha de la app (nombre, versión, puerto…)
  docker-compose.yml                  # servicios que ejecuta umbrelOS
assets/icon.svg                       # icono que muestra umbrelOS
Dockerfile + docker/nginx.conf        # imagen: build de Vite servido por nginx
.github/workflows/docker-publish.yml  # compila y publica la imagen en GHCR
src/ public/ index.html package.json  # código de la app
```

umbrelOS solo lee las carpetas de primer nivel que contienen un `umbrel-app.yml`, así que el código fuente puede convivir en el mismo repo.

## Instalar en umbrelOS

1. En umbrelOS abre **App Store** → menú `⋯` (arriba a la derecha) → **Community App Stores**.
2. Pega la URL de este repositorio y pulsa **Add**.
3. Abre la store **Mike Cruces** e instala **Nano Banana Studio**.
4. La app queda en `http://umbrel.local:4747`. Al abrirla por primera vez te pedirá tu API key de [Google AI Studio](https://aistudio.google.com/apikey).

## Publicar una nueva versión

1. Haz tus cambios en `src/` y pruébalos con `npm run dev`.
2. Sube `version` en [`mcruces-nano-banana-studio/umbrel-app.yml`](mcruces-nano-banana-studio/umbrel-app.yml) (y, si quieres, rellena `releaseNotes`).
3. Haz `git push` a `main`.

La GitHub Action compila la imagen para `linux/amd64` y `linux/arm64`, la publica en `ghcr.io/<usuario>/nano-banana-studio:<version>` y fija `tag@sha256:digest` en `docker-compose.yml` con un commit automático. Cuando termine, umbrelOS ofrecerá la actualización (lo detecta al cambiar `version`).

> La primera vez que se publique la imagen, comprueba en GitHub → **Packages** → `nano-banana-studio` → **Package settings** que su visibilidad sea **Public**. Si es privada, umbrelOS no podrá descargarla.

## Probar la imagen en local

```bash
docker build -t nano-banana-studio .
docker run --rm -p 8080:8080 nano-banana-studio
```

## Notas

- **Los datos viven en el navegador.** La galería y los estilos van en IndexedDB y la API key en `localStorage`, no en el servidor. Cada dirección desde la que abras la app (`umbrel.local`, la IP, Tailscale…) tiene su propia galería. Usa **Base de datos → Exportar** para hacer copias de seguridad.
- **Acceso protegido.** La app queda detrás del login de umbrelOS (auth de `app_proxy`).
- **HTTP.** umbrelOS sirve las apps por HTTP, así que algunas APIs del navegador que requieren HTTPS no están disponibles (por ejemplo, el diálogo "Guardar como…" de `showSaveFilePicker`). La app recurre automáticamente a la descarga normal.
- El script `src/tests/comprehensiveApiAudit.js` lee la clave de la variable de entorno `GOOGLE_AI_API_KEY`: `GOOGLE_AI_API_KEY=... node src/tests/comprehensiveApiAudit.js`.
