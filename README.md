# CLÍMAX: app de mini dramas verticales con IA

**Prototipo (PWA instalable):** https://hele-png.github.io/climax-shortdrama/
**Código del prototipo:** https://github.com/hele-png/climax-shortdrama
**Descarga de guiones e imágenes:** https://hele-png.github.io/climax-shortdrama/descargas/climax-guiones-e-imagenes.zip

---

## 1. Qué se ha creado

### Concepto
App tipo ReelShort/PineDrama en español de España: mini series verticales (9:16) con episodios de **90-120 s** y un **cliffhanger obligatorio** al final de cada uno. Tono de melodrama intenso (humillación → revelación → revancha), con romance con tensión pero nunca explícito. El concepto completo está en `content/concepto.md`.

**4 nichos** (los más rentables del género):
1. Venganza de la esposa traicionada
2. Millonario secreto / CEO (identidad oculta y matrimonio por contrato)
3. Renacer / segunda oportunidad
4. Fantasía de hombres lobo (loba rechazada / Rey Alfa)

Estructura de cada episodio: hook (0-5 s) → recap invisible → escalada → giro → cliffhanger, con 8 tipos de cliffhanger que se van alternando.

### 5 series originales (166 episodios planificados, 50 guiones completos)

| Serie | Nicho | Episodios |
|---|---|---|
| **La esposa que volvió del mar** | Venganza de la esposa | 30 |
| **El repartidor era el heredero** | Millonario secreto | 36 |
| **Cien días siendo suya** | CEO / matrimonio por contrato | 32 |
| **Renací para no amarte** | Renacer | 28 |
| **La loba rechazada del Rey Alfa** | Hombres lobo | 40 |

Cada serie incluye:
- **Biblia** (`biblia.md`): logline, sinopsis, personajes con descripción visual fija y arco de temporada.
- **Lista de episodios** (`episodios.md`): **todos** los episodios con título viral y hook/cliffhanger.
- **Los 10 primeros guiones completos** (`ep01.md` … `ep10.md`): escenas, diálogos, textos en pantalla y cliffhanger.
- **Prompts de imagen** (`imagenes.md`).

### Imágenes generadas con IA: 57
Por serie: **1 portada** tipo póster con el título, **un retrato por cada personaje principal** (27 en total) y **5 escenas clave** (cliffhangers) asociadas a su episodio.

Cómo se ha conseguido la coherencia: hay un *style string* fijo por serie (paleta, luz y lente) y una descripción física fija para cada personaje. Las portadas y las escenas se han generado **usando los retratos como imágenes de referencia**, para que los personajes se reconozcan de una imagen a otra.

- Originales (JPG): `images/<serie>/`
- Versiones optimizadas para la app (WebP de unos 60 KB): `app/public/img/<serie>/`

### Prototipo PWA (CLÍMAX)
- **Feed vertical tipo TikTok/Reels**, con autoplay del episodio visible, likes, Mi lista y compartir.
- **Reproductor de episodios**: las imágenes de la serie se muestran con efecto Ken Burns (zoom lento) y el guion aparece como subtítulos y bocadillos de diálogo con la cara del personaje. Incluye textos en pantalla, barra de progreso, velocidad 1x/1,5x/2x, toques para avanzar o retroceder y una **tarjeta de cliffhanger** con «Siguiente episodio» y reproducción automática. Al final de cada episodio aparece la escena clave de ese episodio.
- **Inicio**: portadas destacadas, «Continuar viendo», «Recomendado para ti» (según los nichos y series que ves y cuánto completas cada episodio), Top 10 y filas por nicho.
- **Ficha de serie**: personajes con retrato, parrilla de episodios con candados, momentos clave y acceso a los guiones.
- **Perfil**: progreso por serie, historial, saldo de coins, estado VIP, check-in diario, movimientos y botón «Reiniciar demo».
- **Guiones** (`#/guiones`): biblia, episodios y los 50 guiones de las 5 series se pueden leer dentro de la app, y se pueden descargar en .zip.
- **Panel de administración** (`#/admin`): crear y editar series y episodios (incluido el guion), configurar los episodios gratis, el precio en coins, los anuncios por día y el precio VIP, y exportar el data.json.
- **Dashboard** (`#/dashboard`): series, episodios y guiones reales, imágenes generadas por tipo y por serie, y **métricas simuladas** (marcadas como tales): curva de retención por episodio con la caída en el paywall, episodios más vistos, embudo de conversión del paywall, ingresos por fuente, MRR, ARPU y ARPPU.
- **Instalable en el móvil**: manifest, iconos, apple-touch-icon y service worker con modo sin conexión. En Android: menú ⋮ → «Instalar aplicación». En iPhone: Safari → Compartir → «Añadir a pantalla de inicio».

---

## 2. Monetización implementada (resumen)

| Palanca | Regla |
|---|---|
| Gratis | Episodios **1 a 9** de cada serie (configurable) |
| VIP | **9,99 €/mes**: todo desbloqueado y sin anuncios |
| Coins | 50 de bienvenida · **30 coins por episodio** · packs de 1,99 € a 19,99 € con bonus · check-in diario con racha de 7 días |
| Anuncio rewarded | 15 s que no se pueden saltar = 1 episodio gratis (máx. 5 al día) |

Al intentar abrir un episodio bloqueado (del 10 en adelante, justo después del cliffhanger más fuerte) aparece un **paywall** con las 3 opciones. En el prototipo los pagos son simulados, pero el módulo `monetization.js` tiene una interfaz pensada para conectarlo a un backend real. Cómo se haría en producción (servidor que controla los accesos, Stripe / App Store / Google Play, recibos validados en el servidor, AdMob/AppLovin con verificación del servidor, antifraude y por qué este paywall y estos precios): **`docs/monetizacion.md`**.

---

## 3. Contenido del .zip
```
content/            concepto + por serie: biblia, episodios, ep01-ep10, imagenes (prompts)
content/data.json   todos los datos estructurados (series, personajes, episodios, guiones, prompts)
images/<serie>/     57 imágenes originales (portadas, personajes, escenas)
docs/monetizacion.md
RESUMEN.md
```
