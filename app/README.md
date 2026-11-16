# CLÍMAX · PWA de mini dramas (prototipo)

Stack: **Vite 8 + JavaScript vanilla** (sin framework), sale a ficheros estáticos en `dist/`. Rutas con hash (`#/…`), así que funciona en cualquier hosting estático y en cualquier subruta.

## Comandos
```bash
npm install
npm run dev        # desarrollo
npm run build      # sync de contenido + build + service worker -> dist/
npm run preview    # sirve dist/ en http://localhost:4173
node scripts/e2e.mjs   # prueba headless (Chrome) de todas las rutas y flujos de pago
npm run icons      # regenera los iconos PWA desde SVG
```

## Meter contenido e imágenes reales
1. **Datos**: deja el JSON en `../content/data.json` (array de series con el esquema acordado). `npm run build` lo copia a `public/data.json`. Si no existe o no es válido, usa `src/mock-data.json`.
2. **Imágenes**: `public/img/<slug>/cover.png`, `char-<characterId>.png`, `scene-1.png` … `scene-5.png` (también vale .jpg o .webp). El build genera `public/manifest.json` con la lista (lo usa el dashboard y el service worker para precargarlas).
3. Si falta una imagen, se muestra un degradado cinematográfico con el título.

## Rutas
`#/` inicio · `#/feed` feed vertical · `#/serie/<slug>` ficha · `#/ver/<slug>/<n>` reproductor · `#/lista` · `#/perfil` · `#/admin` · `#/dashboard` (también `/admin/` y `/dashboard/` redirigen).

## Módulos
- `src/monetization.js`: entitlements, coins, VIP, anuncios y check-in (interfaz asíncrona que se puede cambiar por un backend)
- `src/player.js`: Ken Burns + subtítulos temporizados a partir del guion markdown (`src/script.js`)
- `src/recommend.js`: recomendación por contenido · `src/store.js`: progreso del usuario
- `public/sw.js`: caché offline (el postbuild inyecta la lista de precache)

Ver `../docs/monetizacion.md`.
