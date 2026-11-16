# Créditos de diseño y recursos (CLÍMAX v2)

El rediseño v2 se ha construido sobre plantillas y recursos de diseñadores con licencia abierta. No se ha copiado código ni recursos de apps propietarias (ReelShort, Netflix, DramaBox…); de ellas solo se toman patrones de interfaz habituales del sector (carrusel a pantalla completa, filas con ranking numerado, rejilla de episodios, barra inferior y paywall en hoja inferior).

| Recurso | Autor | Licencia | URL | Uso en CLÍMAX |
|---|---|---|---|---|
| **Tabler** 1.7.5 (plantilla de panel de administración) | Paweł Kuna / codecalm | MIT | https://github.com/tabler/tabler · https://tabler.io | Sistema de diseño de base: escala de grises, radios (4/6/8 px), sombras, paleta de color, tarjetas KPI, tablas, badges, formularios, controles segmentados y list-groups. El Dashboard y el Admin reproducen el tema claro de Tabler; la app de consumo usa su escala de grises oscura. |
| **Tabler Icons** 3.52 | Paweł Kuna y colaboradores | MIT | https://github.com/tabler/tabler-icons · https://tabler.io/icons | Todos los iconos de la app (barra inferior, reproductor, paywall, perfil, admin). Generados en `src/icons.js` con `scripts/gen-icons-js.mjs`. |
| **Inter** (variable) | Rasmus Andersson | SIL Open Font License 1.1 | https://rsms.me/inter · https://github.com/rsms/inter | Tipografía de interfaz (autoalojada vía `@fontsource-variable/inter`, funciona sin conexión). |
| **Barlow Condensed** | Jeremy Tribby | SIL Open Font License 1.1 | https://github.com/jpt/barlow · https://fonts.google.com/specimen/Barlow+Condensed | Tipografía display: logotipo, títulos de serie, números del Top y textos en pantalla (autoalojada vía `@fontsource/barlow-condensed`). |

Las imágenes de las series, los guiones y el logotipo son originales de este proyecto.

Textos completos de licencia: `node_modules/@tabler/icons/LICENSE`, `node_modules/@fontsource-variable/inter/LICENSE`, `node_modules/@fontsource/barlow-condensed/LICENSE`; Tabler: https://github.com/tabler/tabler/blob/main/LICENSE

## Audio y vídeo (v3)
- **Voces:** síntesis de voz neuronal de Microsoft (edge-tts, voces es-ES Álvaro, Elvira y Ximena), con variaciones de tono y velocidad por personaje. El reparto está en `content/voces.json`. Los audios se generan con `scripts/gen_audio.py`.
- **Música, ambientes y efectos** (pads, latido, olas, ciudad, viento, fuego, reloj, whoosh y sting del cliffhanger): sintetizados a mano con numpy/ffmpeg en `scripts/gen_audio.py`. No usan muestras de terceros y son obra original del proyecto.
- **Vídeo piloto** (ep. 1 de "La esposa que volvió del mar" y de "El repartidor era el heredero"): planos generados con Grok Imagine a partir de las ilustraciones del proyecto, montados con ffmpeg (`/workspace/shortdrama/video/stitch.py`).
