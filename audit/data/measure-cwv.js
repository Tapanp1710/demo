// Lab CWV measurement over CDP using only Page/Runtime/Emulation domains
// (the host WAF 403s Lighthouse's instrumented navigations; plain navigations pass).
// Usage: node measure-cwv.js mobile|desktop <outfile> [url]
// v2 (Phase 1.5): optional url arg + per-element CLS source attribution. Metric math unchanged.
const { spawn, execSync } = require('child_process');
const fs = require('fs');
let CDP;
try { CDP = require('chrome-remote-interface'); }
catch (e) {
  try { CDP = require(require('path').join(__dirname, 'ffp', 'node_modules', 'chrome-remote-interface')); }
  catch (e2) { console.error('Run once first:  npm i chrome-remote-interface  (in this folder)'); process.exit(1); }
}

const MODE = process.argv[2] || 'mobile';
const OUTFILE = process.argv[3];
const URL = process.argv[4] || 'https://bricksmarvella.in/';
const PORT = 9333;
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PROFILE = require('path').join(__dirname, 'cwv-profile-' + MODE + '-' + Date.now());

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--mute-audio', '--no-first-run',
  '--remote-debugging-port=' + PORT,
  '--user-data-dir=' + PROFILE,
  'about:blank',
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let client;
  for (let i = 0; i < 30; i++) { // wait for the debug port
    await sleep(500);
    try { client = await CDP({ port: PORT }); break; } catch (e) {}
  }
  if (!client) throw new Error('could not connect to Chrome');
  const { Page, Runtime, Emulation } = client;
  await Page.enable();
  await Runtime.enable();
  const cdpExceptions = [];
  Runtime.exceptionThrown(e => {
    const d = e.exceptionDetails;
    cdpExceptions.push(((d.exception && (d.exception.description || d.exception.value)) || d.text || '?').split('\n')[0].slice(0, 200));
  });

  if (MODE === 'mobile') {
    await Emulation.setDeviceMetricsOverride({ width: 412, height: 823, deviceScaleFactor: 1.75, mobile: true });
    await Emulation.setTouchEmulationEnabled({ enabled: true });
    await Emulation.setCPUThrottlingRate({ rate: 4 });
  } else {
    await Emulation.setDeviceMetricsOverride({ width: 1350, height: 940, deviceScaleFactor: 1, mobile: false });
    await Emulation.setCPUThrottlingRate({ rate: 1 });
  }

  // Buffered observers are queried after load, but register collectors early via
  // Page.addScriptToEvaluateOnNewDocument so long tasks are captured from the start.
  await Page.addScriptToEvaluateOnNewDocument({
    source: `
      window.__lt = []; window.__errs = [];
      try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push({ start: e.startTime, dur: e.duration }); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
      addEventListener('error', e => window.__errs.push(String(e.message || e.type).slice(0, 160)));
      addEventListener('unhandledrejection', e => window.__errs.push('rejection: ' + String(e.reason).slice(0, 140)));
    `});

  const loaded = Page.loadEventFired();
  await Page.navigate({ url: URL });
  await Promise.race([loaded, sleep(90000)]);
  await sleep(12000); // settle: lazyload, fonts, widgets

  const { result } = await Runtime.evaluate({
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const out = { title: document.title, docStatus: null };
      const nav = performance.getEntriesByType('navigation')[0];
      if (nav) out.nav = { ttfb: nav.responseStart, domContentLoaded: nav.domContentLoadedEventEnd, load: nav.loadEventEnd, transferSize: nav.transferSize, responseStatus: nav.responseStatus };
      const fcp = performance.getEntriesByName('first-contentful-paint')[0];
      out.fcp = fcp ? fcp.startTime : null;
      out.lcp = await new Promise(res => {
        let last = null;
        try {
          new PerformanceObserver(l => { const es = l.getEntries(); if (es.length) last = es[es.length - 1]; })
            .observe({ type: 'largest-contentful-paint', buffered: true });
        } catch (e) {}
        setTimeout(() => res(last ? {
          time: last.startTime, size: last.size,
          element: last.element ? (last.element.tagName + (last.element.id ? '#' + last.element.id : '') + (last.element.className && typeof last.element.className === 'string' ? '.' + last.element.className.split(' ').slice(0, 3).join('.') : '')) : null,
          url: last.url || null
        } : null), 300);
      });
      out.cls = await new Promise(res => {
        let sum = 0, worst = 0, win = 0, winStart = 0, winLast = 0;
        const byNode = {};
        const desc = n => {
          if (!n) return '(removed node)';
          if (!n.tagName) {
            if (n.nodeName && n.parentNode) return n.nodeName + ' of ' + desc(n.parentNode);
            return '(removed node)';
          }
          let s = n.tagName.toLowerCase();
          if (n.id) s += '#' + n.id;
          else if (n.className && typeof n.className === 'string') s += '.' + n.className.trim().split(/\s+/).slice(0, 4).join('.');
          return s.slice(0, 140);
        };
        const detail = [];
        try {
          new PerformanceObserver(l => {
            for (const e of l.getEntries()) {
              if (e.hadRecentInput) continue;
              if (detail.length < 14 && e.value > 0.002) detail.push({
                t: Math.round(e.startTime), v: +e.value.toFixed(4),
                sources: (e.sources || []).slice(0, 5).map(s => ({
                  n: desc(s.node),
                  prev: s.previousRect && [s.previousRect.x, s.previousRect.y, s.previousRect.width, s.previousRect.height],
                  cur: s.currentRect && [s.currentRect.x, s.currentRect.y, s.currentRect.width, s.currentRect.height]
                }))
              });
              sum += e.value;
              if (e.startTime - winLast > 1000 || e.startTime - winStart > 5000) { win = 0; winStart = e.startTime; }
              win += e.value; winLast = e.startTime; if (win > worst) worst = win;
              // attribute the entry to its largest source rect
              let best = null, bestArea = -1;
              for (const s of (e.sources || [])) {
                const r = s.currentRect, area = r ? r.width * r.height : 0;
                if (area > bestArea) { bestArea = area; best = s; }
              }
              const k = best ? desc(best.node) : '(no source)';
              byNode[k] = (byNode[k] || 0) + e.value;
            }
          }).observe({ type: 'layout-shift', buffered: true });
        } catch (e) {}
        setTimeout(() => res({
          total: sum, worstWindow: worst,
          bySource: Object.entries(byNode).sort((a, b) => b[1] - a[1]).slice(0, 15)
            .map(([node, v]) => ({ node, value: +v.toFixed(4) })),
          detail
        }), 300);
      });
      const lt = (window.__lt || []);
      out.longTasks = { count: lt.length, totalMs: Math.round(lt.reduce((s, t) => s + t.dur, 0)), blockingMsAfterFcp: Math.round(lt.filter(t => !out.fcp || t.start > out.fcp).reduce((s, t) => s + Math.max(0, t.dur - 50), 0)) };
      const res2 = performance.getEntriesByType('resource');
      out.resources = { count: res2.length, transferBytes: res2.reduce((s, r) => s + (r.transferSize || 0), 0) };
      const heavy = res2.slice().sort((a, b) => (b.transferSize || 0) - (a.transferSize || 0)).slice(0, 8)
        .map(r => ({ url: r.name.replace(/^https?:\\/\\/[^/]+/, '').slice(0, 90), kb: Math.round((r.transferSize || 0) / 1024), type: r.initiatorType }));
      out.heaviest = heavy;
      const v = document.querySelector('rs-module video, .edgtf-slider video, video');
      out.heroVideo = v ? { present: true, src: (v.currentSrc || '').slice(-40), readyState: v.readyState } : { present: false };
      out.pageErrors = (window.__errs || []).slice(0, 12);
      return out;
    })()`
  });

  if (OUTFILE) {
    try {
      const shot = await Page.captureScreenshot({ format: 'png', captureBeyondViewport: true });
      fs.writeFileSync(OUTFILE.replace(/\.json$/, '') + '.png', Buffer.from(shot.data, 'base64'));
    } catch (e) {}
  }
  result.value.cdpExceptions = cdpExceptions.slice(0, 12);

  const data = { mode: MODE, measuredAt: new Date().toISOString(), url: URL, chrome: 'HeadlessChrome/152 (installed Chrome 152.0.7977.65)', cpuThrottle: MODE === 'mobile' ? 4 : 1, network: 'unthrottled (see method note)', ...result.value };
  const json = JSON.stringify(data, null, 2);
  if (OUTFILE) fs.writeFileSync(OUTFILE, json);
  console.log(json);

  await client.close();
  chrome.kill();
  await sleep(1000);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  process.exit(0);
})().catch(e => { console.error('FAILED:', e.message); try { chrome.kill(); } catch (_) {} process.exit(1); });
