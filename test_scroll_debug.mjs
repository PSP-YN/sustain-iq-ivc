import fs from 'node:fs';

async function testScrolls() {
  const vres = await fetch('http://127.0.0.1:9222/json').catch(() => null);
  if (!vres) return console.log('Need chrome');
  const tabs = await vres.json();
  const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);
  ws.onopen = async () => {
    let id = 1;
    const send = (method, params = {}) => new Promise((resolve) => {
      const curId = id++;
      const handler = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.id === curId) {
          ws.removeEventListener('message', handler);
          resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });

    const testPoints = [
      { name: 'hero_start', s: 0 },
      { name: 'hero_mid_scrub', s: 1500 },
      { name: 'last_frame_reached', s: 3100 },
      { name: 'about_sliding_midway', s: 3750 },
      { name: 'about_full_view', s: 4400 },
      { name: 'cavern_view', s: 5100 }
    ];

    for (const pt of testPoints) {
      await send('Runtime.evaluate', { expression: `window.scrollTo(0, ${pt.s});` });
      await new Promise(r => setTimeout(r, 700));
      const res = await send('Runtime.evaluate', { 
        expression: `(() => {
          const a = document.getElementById("about").getBoundingClientRect();
          const canvas = document.getElementById("canvas").getBoundingClientRect();
          const heroSticky = document.getElementById("hero-sticky").getBoundingClientRect();
          const cavern = document.getElementById("cavern").getBoundingClientRect();
          return {
            name: "${pt.name}",
            scroll: window.scrollY,
            heroSticky: { top: heroSticky.top, bottom: heroSticky.bottom },
            about: { top: a.top, bottom: a.bottom },
            cavern: { top: cavern.top, bottom: cavern.bottom }
          };
        })()`, 
        returnByValue: true 
      });
      console.log(JSON.stringify(res.result.value, null, 2));

      const shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(`c:/sus/test_${pt.name}.png`, Buffer.from(shot.data, 'base64'));
    }
    console.log('All test screenshots completed successfully!');
    ws.close();
  };
}
testScrolls();
