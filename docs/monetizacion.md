# Monetización de CLÍMAX

Este documento explica **qué hay implementado en el prototipo** (todo simulado en el cliente) y **cómo se llevaría a producción** con backend, tiendas de apps y redes publicitarias.

---

## 1. Modelo de negocio (resumen)

| Palanca | Regla en el prototipo | Para qué sirve |
|---|---|---|
| **Episodios gratis** | Episodios **1-9** gratis en todas las series (configurable en `/admin`) | Enganchar: el usuario invierte tiempo y emoción antes de ver el muro de pago |
| **Suscripción VIP** | **9,99 €/mes**, desbloquea todo, sin anuncios | Ingreso recurrente (MRR), el usuario más fiel |
| **Coins (moneda virtual)** | 50 coins de bienvenida · **30 coins por episodio** · packs de 1,99 € a 19,99 € con bonus · check-in diario (+10…+40 con racha de 7 días) | Compra por impulso de quien no quiere suscribirse |
| **Anuncio rewarded** | Ver 15 s de anuncio = 1 episodio desbloqueado · máx. 5/día | Monetizar a quien nunca pagará y mantenerlo en la app |

El paywall aparece **al intentar abrir un episodio bloqueado** (episodio 10 en adelante), justo después del cliffhanger del episodio 9, y siempre muestra las **3 opciones** a la vez.

### Packs de coins (precios por defecto)

| Pack | Coins | Bonus | Precio | Episodios aprox. |
|---|---|---|---|---|
| p100 | 100 | — | 1,99 € | 3 |
| p300 | 300 | +30 (10 %) | 4,99 € | 11 |
| p700 | 700 | +140 (20 %) · *Mejor valor* | 9,99 € | 28 |
| p1500 | 1500 | +450 (30 %) | 19,99 € | 65 |

Desbloquear una serie de 30 episodios con coins (21 episodios de pago × 30 = 630 coins) cuesta unos 9-10 €. Así la suscripción (9,99 € por **todo** el catálogo) parece una ganga, que es lo que buscamos: los coins sirven de **ancla de precio** para el VIP.

---

## 2. Implementación en el prototipo

Código: `app/src/monetization.js` (lógica), `app/src/views/paywall.js` (UI del paywall, checkout y anuncio).

### 2.1 Interfaz del módulo

Toda la UI habla con un único objeto `monetization` que expone una **interfaz asíncrona**, pensada para poder cambiar la implementación local por una remota sin tocar las pantallas:

```js
monetization.getConfig() / setConfig(patch)
monetization.getWallet()                    // { coins, subscription, unlocked, transactions, ... }
monetization.canWatch(series, n)            // { allowed, reason: 'free'|'subscription'|'unlocked'|'locked' }
monetization.unlockWithCoins(series, n)     // { ok, balance } | { ok:false, error:'insufficient_coins', needed }
monetization.startSubscription('monthly')   // { ok, subscription }
monetization.cancelSubscription()
monetization.purchaseCoinPack('p700')       // { ok, balance }
monetization.requestRewardedAd(series, n)   // { adSessionId, durationSec }
monetization.completeRewardedAd(sessionId)  // { ok }
monetization.dailyCheckIn()                 // { ok, reward, streak }
monetization.trackPaywall(event, meta)      // analítica del embudo
```

`accessSync()` es una variante síncrona que solo sirve para pintar candados en la parrilla de episodios.

### 2.2 Reglas de acceso (orden de evaluación)

1. `n <= config.freeEpisodes` (o `freeEpisode: true` en data.json si se activa `useEpisodeFlags`) → **gratis**
2. Suscripción activa (`renewsAt > ahora`) → **VIP**
3. Episodio en `wallet.unlocked[seriesId]` (comprado con coins o con anuncio) → **desbloqueado**
4. Si no → **bloqueado** → se abre el paywall

### 2.3 Persistencia

- `localStorage.sd_wallet_v1`: saldo, suscripción, episodios desbloqueados, movimientos, contador de anuncios del día, racha de check-in y eventos del paywall.
- `localStorage.sd_config_v1`: configuración editada desde `/admin` (episodios gratis, precio en coins, coins de bienvenida, anuncios/día, precio VIP).
- «Reiniciar demo» (Perfil) lo borra todo.

### 2.4 Flujos simulados

- **Checkout** (VIP o packs): hoja con Apple Pay / Google Pay / tarjeta → spinner de 1,2 s → «Pago completado». Genera un recibo `SIM-XXXX`.
- **Anuncio rewarded**: pantalla completa de 15 s **que no se puede cerrar**; al acabar, `completeRewardedAd` comprueba que la sesión existe y que ha durado al menos lo que dura el anuncio (antitrampas básico) y entonces desbloquea el episodio.
- **Check-in diario**: recompensa creciente durante 7 días; si te saltas un día, la racha vuelve a 0.
- **Métricas**: cada acción del paywall (`view`, `dismiss`, `subscribe`, `unlock_coins`, `unlock_ad`, `buy_coins`) se guarda y aparece en `/dashboard` → «Este dispositivo».

---

## 3. Cómo se haría en producción

### 3.1 Arquitectura

```
App (PWA / iOS / Android)
   │  JWT de sesión
   ▼
API (Node/Go) ──► Postgres: users, wallets, ledger, entitlements, purchases, ad_rewards
   ▲   ▲   ▲
   │   │   └── Webhooks Stripe (web)
   │   └────── App Store Server Notifications v2 + Google Play RTDN (Pub/Sub)
   └────────── Callbacks SSV de AdMob / AppLovin MAX
```

**Regla de oro: el cliente nunca decide si un episodio está desbloqueado.** El servidor es la única fuente de verdad, y el contenido (vídeo HLS) solo se entrega con una URL firmada de corta duración si hay derecho de acceso.

- `RemoteEntitlementProvider` implementa la misma interfaz que el módulo local, pero con `fetch` a `/api/...`.
- `GET /api/episodes/:id/play` → comprueba el acceso y devuelve una URL de CDN firmada (CloudFront/Cloudflare, TTL de 5-10 min) o `402 Payment Required` con las opciones del paywall.

### 3.2 Modelo de datos

- `entitlements(user_id, type: 'subscription'|'episode', series_id, episode_n, source: 'iap'|'stripe'|'coins'|'ad'|'promo', expires_at)`
- `wallet_ledger(id, user_id, delta, reason, ref_id, created_at)`: libro contable **solo de inserción**. El saldo es la suma (o una vista materializada), nunca un campo que se edita a mano. Así hay auditoría y no se puede «inventar» saldo.
- `purchases(store, product_id, transaction_id UNIQUE, original_transaction_id, status, raw_receipt)`: la restricción `UNIQUE` evita que un mismo recibo se acredite dos veces.
- Desbloquear con coins = **una transacción SQL**: comprueba el saldo con `SELECT … FOR UPDATE`, inserta el débito en el ledger, inserta el entitlement y usa una *idempotency key* por petición.

### 3.3 Suscripciones

| Plataforma | Herramienta | Validación |
|---|---|---|
| iOS | StoreKit 2, auto-renewable subscription `vip_monthly` (9,99 €) | El cliente envía el `signedTransaction` (JWS); el servidor verifica la firma con la App Store Server API y escucha **App Store Server Notifications v2** (`DID_RENEW`, `EXPIRED`, `REFUND`, `GRACE_PERIOD`…) |
| Android | Google Play Billing v7, `vip_monthly` con base plan mensual | El servidor llama a `purchases.subscriptionsv2.get`, hace `acknowledge` antes de 3 días y escucha **RTDN** vía Pub/Sub |
| Web/PWA | **Stripe Checkout** + Customer Portal (Apple Pay y Google Pay incluidos) | Webhooks `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated/deleted` con verificación de firma |

- Con RevenueCat o Adapty se unifican las tres plataformas en un único webhook y un único estado de entitlement (recomendado para salir rápido).
- Hay que contemplar el periodo de gracia, *billing retry*, reembolsos (que retiran el acceso) y el cross-platform: el entitlement va asociado al `user_id`, no al dispositivo.
- Comisión: Apple/Google se quedan con un 15-30 %. En la web, Stripe cobra ~1,5 % + 0,25 € en la UE. Se puede incentivar la suscripción web donde la normativa lo permita (DMA en la UE).

### 3.4 Coins (IAP consumibles)

- Productos consumibles `coins_100`, `coins_300`, `coins_700` y `coins_1500` en App Store y Google Play, y `Price` de Stripe para la web.
- Flujo: compra en la tienda → el cliente envía el recibo → **el servidor lo valida** (App Store Server API / `purchases.products.get`) → comprueba que `transaction_id` no se ha usado → inserta un crédito en el ledger → `finishTransaction` / `consume` en el cliente.
- Los coins no se pueden canjear por dinero ni transferir, y los packs muestran el precio en € (normativa de consumo de la UE y guías de las tiendas sobre moneda virtual).

### 3.5 Anuncios rewarded

- **AdMob** o **AppLovin MAX** (con mediación de Meta, Unity, Mintegral, Pangle y otros para subir el eCPM; el eCPM rewarded en España suele estar entre 8 y 20 €).
- **Server-Side Verification (SSV)**:
  1. El cliente pide `POST /api/ads/session {episodeId}` → el servidor crea un `ad_session_id` (nonce) con caducidad.
  2. Se carga el anuncio con `custom_data = ad_session_id` y `user_id`.
  3. Al terminar, la red llama a nuestro **callback SSV** (`GET /api/ads/ssv?...&signature=...&key_id=...`). El servidor verifica la firma ECDSA con las claves públicas de Google (o el hash de AppLovin), comprueba el nonce y que no se haya usado, y **solo entonces** concede el entitlement del episodio.
  4. El cliente consulta el estado (o recibe un push o websocket) y reproduce.
- Límites: X anuncios por día y usuario, tiempo mínimo entre anuncios y tope por dispositivo.

### 3.6 Antifraude

- Validación de **todos** los recibos en el servidor, idempotencia por `transaction_id` y revocación del acceso en reembolsos (y saldo negativo en el ledger si ya se habían gastado los coins).
- Integridad del dispositivo: **Play Integrity API** y **App Attest / DeviceCheck** en iOS. Ante root, jailbreak o emuladores: limitar anuncios y bonus.
- *Rate limiting* por usuario, IP y dispositivo en desbloqueos, check-in y sesiones de anuncios. El check-in se calcula con la hora del servidor, no la del móvil.
- Detección de multicuentas (fingerprint del dispositivo y bonus de bienvenida una sola vez por dispositivo) y alertas de anomalías (muchos desbloqueos con anuncios por minuto, devoluciones en masa).
- URLs de vídeo firmadas y de corta duración + DRM (Widevine/FairPlay) opcional para evitar que se descarguen los episodios de pago.

### 3.7 Por qué este paywall y estos precios

- **9 episodios gratis**: es el estándar del género (ReelShort, DramaBox: 5-10 gratis). Bastan para invertir unos 15 minutos y llegar al **gran giro de trama**. El guion pone el cliffhanger más fuerte justo en el episodio 9, así que el paywall aparece en el pico emocional.
- **Las tres opciones a la vez**: cada perfil encuentra su salida (el *whale* elige VIP, el impulsivo coins y el que no paga el anuncio) y baja el abandono. El VIP va primero y destacado (efecto ancla), los coins en medio y el anuncio al final como red de seguridad.
- **30 coins/episodio con 50 de regalo**: el regalo alcanza para **un** episodio y deja 20 coins sueltos, lo que empuja a recargar o a hacer el check-in diario (hábito de vuelta a la app).
- **9,99 €/mes**: por debajo del umbral psicológico de 10 € y alineado con Netflix Básico o Spotify. Más adelante se puede probar un plan semanal de 4,99 € (muy habitual en el género) y uno anual con descuento como upsell.
- **Bonus crecientes en los packs**: suben el ticket medio (el pack de 9,99 € es el «mejor valor»).
- **Siguiente paso**: A/B tests en el servidor (Remote Config) del número de episodios gratis (8/9/10), del precio en coins (25/30/35) y del orden de las opciones del paywall, midiendo LTV a 30 días y no solo la conversión inicial.

### 3.8 KPIs a vigilar (ver `/dashboard`)

Retención por episodio (y caída en el episodio del paywall), conversión del paywall a VIP, coins o anuncio, ARPU, ARPPU, MRR, churn mensual del VIP, eCPM de los anuncios, LTV/CAC por canal de adquisición y fill rate de los anuncios.
