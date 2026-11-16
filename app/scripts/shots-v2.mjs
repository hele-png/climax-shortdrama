import puppeteer from 'puppeteer-core';
const BASE = process.env.BASE || 'http://localhost:4173/';
const OUT = process.env.OUT || '/workspace/shortdrama/screenshots/v2/';
const only = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('requestfailed', r => errs.push('fail ' + r.url()));
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const go = async (h, ms = 1500) => { await p.goto(BASE + h, { waitUntil: 'networkidle0' }); await wait(ms); };
const shot = async (n, full = false) => { await p.screenshot({ path: OUT + n + '.png', fullPage: full }); console.log('shot', n); };
const want = (n) => !only.length || only.some(o => n.startsWith(o));
// estado realista: algo de progreso
await go('#/', 300);
await p.evaluate(() => { const now = Date.now(); localStorage.setItem('sd_user_v1', JSON.stringify({ name: 'Hele', createdAt: now - 864e5 * 3, progress: { 'esposa-del-mar': { lastEp: 3, updatedAt: now, eps: { 1: { completion: 1, at: now }, 2: { completion: 1, at: now }, 3: { completion: .45, at: now } } } }, history: [{ seriesId: 'esposa-del-mar', n: 3, completion: .45, at: now - 6e5 }, { seriesId: 'esposa-del-mar', n: 2, completion: 1, at: now - 9e5 }], favorites: ['loba-rechazada'], likes: [] })); }); await p.reload({ waitUntil: 'networkidle0' });
if (want('01')) { await go('#/'); await shot('01-home'); await p.evaluate(() => scrollTo(0, 560)); await wait(700); await shot('01b-home-rows'); await p.evaluate(() => scrollTo(0, 1250)); await wait(700); await shot('01c-home-top10'); }
if (want('02')) { await go('#/serie/esposa-del-mar'); await shot('02-serie'); await p.evaluate(() => scrollTo(0, 620)); await wait(500); await shot('02b-serie-eps'); await p.click('[data-tab=cast]'); await wait(800); await p.evaluate(() => scrollTo(0, 620)); await wait(500); await shot('02c-serie-reparto'); }
if (want('03')) { await go('#/ver/esposa-del-mar/1', 9000); await shot('03-player'); await go('#/ver/repartidor-heredero/2', 15000); await shot('03b-player-dialogo'); await p.click('[data-c=skip]'); await wait(1500); await shot('03c-endcard'); }
if (want('04')) { await go('#/ver/cien-dias/10', 1600); await shot('04-paywall'); }
if (want('05')) { await go('#/feed', 4000); await shot('05-feed'); }
if (want('06')) { await go('#/perfil'); await shot('06-perfil'); await go('#/tienda'); await shot('06b-tienda'); await go('#/vip'); await shot('06c-vip'); await go('#/lista'); await shot('06d-lista'); }
if (want('07')) { await go('#/dashboard', 2000); await shot('07-dashboard'); await p.evaluate(() => scrollTo(0, 900)); await wait(400); await shot('07b-dashboard-charts'); await go('#/admin'); await shot('07c-admin'); }
if (want('08')) { await go('#/guiones'); await shot('08-guiones'); await go('#/guiones/renaci/ep01'); await shot('08b-guion'); }
console.log('errors', errs);
await b.close();
