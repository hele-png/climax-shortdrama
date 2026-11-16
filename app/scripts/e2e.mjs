// Comprobación headless: carga cada ruta, recoge errores JS y hace capturas móviles
import puppeteer from 'puppeteer-core';
const BASE = process.env.BASE || 'http://localhost:4173/';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
const shot = async (name) => page.screenshot({ path: `/tmp/shots/${name}.png` });
const go = async (hash, wait = 900) => { await page.goto(BASE + hash, { waitUntil: 'networkidle0' }); await new Promise(r => setTimeout(r, wait)); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
await go('#/'); await shot('01-home');
console.log('home rows:', await page.$$eval('.row h2', e => e.map(x => x.textContent)));
await go('#/serie/esposa-del-mar'); await shot('02-series');
console.log('locks:', await page.$$eval('.ep.locked', e => e.length), 'free:', await page.$$eval('.ep.free', e => e.length));
await go('#/ver/esposa-del-mar/1', 3500); await shot('03-player');
console.log('sub:', await page.$eval('.pl-subs', e => e.textContent.trim().slice(0, 80)));
await page.click('.pl-tapzones [data-z=next]'); await page.click('.pl-tapzones [data-z=next]'); await sleep(600); await shot('03b-player-dialog');
await page.click('[data-c=skip]'); await sleep(1200); await shot('04-endcard');
console.log('end card:', await page.$eval('.pl-end', e => !e.hidden));
await go('#/ver/esposa-del-mar/10', 1200); await shot('05-paywall');
console.log('paywall opts:', await page.$$eval('.pw-opt', e => e.length));
// desbloquear con coins (50 iniciales, coste 30)
await page.click('[data-a=coins]'); await sleep(800);
console.log('after coins hash:', await page.evaluate(() => location.hash), 'coins:', await page.evaluate(() => JSON.parse(localStorage.sd_wallet_v1).coins));
await go('#/ver/esposa-del-mar/11', 1200);
await page.click('[data-a=coins]'); await sleep(600); await shot('06-insufficient');
console.log('packs visible:', await page.$eval('.pw-packs', e => !e.hidden));
await go('#/feed', 2500); await shot('07-feed');
console.log('feed items:', await page.$$eval('.feed-item', e => e.length), 'player in feed:', !!(await page.$('.feed-item .player')));
await page.evaluate(() => document.querySelector('.feed').scrollBy(0, innerHeight)); await sleep(1500); await shot('07b-feed2');
await go('#/', 900); await shot('08-home-after');
console.log('home rows after:', await page.$$eval('.row h2', e => e.map(x => x.textContent)));
await go('#/perfil'); await shot('09-profile');
await page.click('#ci'); await sleep(500);
console.log('coins after checkin:', await page.evaluate(() => JSON.parse(localStorage.sd_wallet_v1).coins));
await go('#/admin'); await shot('10-admin');
await page.click('[data-edit]'); await sleep(300); await page.click('[data-ep="2"]'); await sleep(300); await shot('10b-admin-ep');
await page.click('[data-tab=money]'); await sleep(200);
await page.$eval('input[name=freeEpisodes]', e => e.value = '8'); await page.click('#mf button.btn.red'); await sleep(300);
console.log('cfg freeEpisodes:', await page.evaluate(() => JSON.parse(localStorage.sd_config_v1).freeEpisodes));
await go('#/dashboard', 1200); await shot('11-dashboard');
console.log('kpis:', await page.$$eval('.kpi b', e => e.slice(0, 4).map(x => x.textContent)));
// rewarded ad
await page.evaluate(() => { localStorage.clear(); }); await go('#/ver/repartidor-heredero/12', 1000);
await page.click('[data-a=ad]'); await sleep(3000); await shot('12-ad');
await sleep(13500); await page.click('.ad-screen button'); await sleep(1500);
console.log('after ad hash:', await page.evaluate(() => location.hash), 'unlocked:', await page.evaluate(() => JSON.stringify(JSON.parse(localStorage.sd_wallet_v1).unlocked)));
// subscription
await go('#/ver/repartidor-heredero/20', 1000); await page.click('[data-a=sub]'); await sleep(500); await page.click('[data-m=apple]'); await sleep(2800);
console.log('after sub hash:', await page.evaluate(() => location.hash), 'sub:', await page.evaluate(() => JSON.parse(localStorage.sd_wallet_v1).subscription?.status));
// PWA
const man = await page.evaluate(async () => (await fetch('./manifest.webmanifest')).ok);
const sw = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return !!r; });
console.log('manifest ok:', man, 'sw registered:', sw);
console.log('ERRORS:', errors.length ? errors : 'none');
await browser.close();
