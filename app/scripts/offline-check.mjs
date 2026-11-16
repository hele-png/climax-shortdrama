import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle0' }); await new Promise(r => setTimeout(r, 2500));
await p.reload({ waitUntil: 'networkidle0' });
await p.setOfflineMode(true); await p.reload({ waitUntil: 'domcontentloaded' }); await new Promise(r => setTimeout(r, 1500));
console.log('offline cards:', await p.$$eval('.card', e => e.length), 'errors:', errs);
for (const r of ['admin/', 'dashboard/']) { await p.setOfflineMode(false); await p.goto('http://localhost:4173/' + r, { waitUntil: 'networkidle0' }); await new Promise(r => setTimeout(r, 800)); console.log(r, '->', p.url(), await p.$eval('.tb-title', e => e.textContent).catch(() => '?')); }
await b.close();
