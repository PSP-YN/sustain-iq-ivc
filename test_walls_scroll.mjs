import fs from 'node:fs';

async function testWalls() {
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

    const scrollSteps = [4200, 4600, 5000, 5400];
    const results = [];

    for (const s of scrollSteps) {
      await send('Runtime.evaluate', { expression: `window.scrollTo(0, ${s});` });
      await new Promise(r => setTimeout(r, 600));
      const res = await send('Runtime.evaluate', { 
        expression: `(() => {
          const w = document.getElementById("cavernWalls");
          const c = document.getElementById("cavern");
          const wRect = w.getBoundingClientRect();
          const cRect = c.getBoundingClientRect();
          return {
            scroll: window.scrollY,
            cavernTop: cRect.top,
            wallsTop: wRect.top,
            wallsTransform: w.style.transform,
            wallsRelativeY: wRect.top - cRect.top
          };
        })()`, 
        returnByValue: true 
      });
      results.push(res.result.value);
      console.log(`Scroll ${s}:`, res.result.value);

      const shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(`c:/sus/test_walls_scroll_${s}.png`, Buffer.from(shot.data, 'base64'));
    }

    console.log('Results summary:\n', JSON.stringify(results, null, 2));
    ws.close();
  };
}
testWalls();
