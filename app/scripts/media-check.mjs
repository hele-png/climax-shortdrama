// Comprueba reproducción de audio/vídeo en el reproductor
import puppeteer from 'puppeteer-core';
const BASE = process.env.BASE || 'http://localhost:4173/';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--autoplay-policy=user-gesture-required'] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
// vídeo
await p.goto(BASE + '#/ver/esposa-del-mar/1', { waitUntil: 'domcontentloaded' }); await sleep(5000);
const v = await p.evaluate(() => { const m = document.querySelector('.pl-video'); return m && { rs: m.readyState, t: m.currentTime.toFixed(1), paused: m.paused, muted: m.muted, d: m.duration, unmute: !document.querySelector('.pl-unmute').hidden, tag: !!document.querySelector('.pl-tag'), sub: document.querySelector('.pl-subs').textContent.slice(0, 50) }; });
console.log('video (sin gesto):', JSON.stringify(v)); await p.screenshot({ path: '/tmp/shots/m1-video.png' });
await p.click('.pl-unmute').catch(() => {}); await sleep(1500);
console.log('tras tocar:', await p.evaluate(() => { const m = document.querySelector('.pl-video'); return { muted: m.muted, paused: m.paused, t: m.currentTime.toFixed(1) }; }));
await p.evaluate(() => { const m = document.querySelector('.pl-video'); m.currentTime = 33; }); await sleep(2500);
console.log('seek 33 sub:', await p.evaluate(() => document.querySelector('.pl-subs').textContent.slice(0, 70)));
await p.screenshot({ path: '/tmp/shots/m2-video-dialog.png' });
// audio
await p.goto(BASE + '#/ver/cien-dias/1', { waitUntil: 'domcontentloaded' }); await sleep(1500);
await p.click('.pl-tapzones [data-z=toggle]'); await p.click('.pl-tapzones [data-z=toggle]'); await sleep(4000);
console.log('audio:', await p.evaluate(() => ({ time: document.querySelector('.pl-time').textContent, sub: document.querySelector('.pl-subs').textContent.slice(0, 60), unmute: !document.querySelector('.pl-unmute').hidden, mute: !!document.querySelector('[data-c=mute]') })));
await p.screenshot({ path: '/tmp/shots/m3-audio.png' });
await p.click('[data-c=skip]'); await sleep(2000);
console.log('audio end card:', await p.$eval('.pl-end', e => !e.hidden));
console.log('series vid tags:', await (async () => { await p.goto(BASE + '#/serie/repartidor-heredero', { waitUntil: 'domcontentloaded' }); await sleep(1200); return p.$$eval('.ep-vid', e => e.length); })());
await p.screenshot({ path: '/tmp/shots/m4-serie.png' });
console.log('ERRORS:', errs.length ? errs : 'none'); await b.close();
