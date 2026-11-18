import fs from 'node:fs';

async function check() {
  const vres = await fetch('http://127.0.0.1:9222/json').catch(() => null);
  if (!vres) return console.log('No CDP');
  const tabs = await vres.json();
  const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);
  ws.onopen = async () => {
    const res = await new Promise(r => {
      ws.onmessage = e => r(JSON.parse(e.data).result);
      ws.send(JSON.stringify({ 
        id: 1, 
        method: 'Runtime.evaluate', 
        params: { 
          expression: `(() => {
            const about = document.getElementById("about").getBoundingClientRect();
            const island = document.getElementById("islandContainer").getBoundingClientRect();
            const h = document.getElementById("cavernHeading").getBoundingClientRect();
            const b = document.getElementById("cavernBanner").getBoundingClientRect();
            const c = document.getElementById("cavern").getBoundingClientRect();
            const cliff = document.getElementById("layerCliffBase").getBoundingClientRect();
            const forest = document.getElementById("layerForestTop").getBoundingClientRect();
            return {
              about: { top: about.top, bottom: about.bottom, height: about.height },
              island: { top: island.top, bottom: island.bottom, height: island.height },
              cliff: { top: cliff.top, bottom: cliff.bottom, height: cliff.height },
              forest: { top: forest.top, bottom: forest.bottom, height: forest.height },
              cavern: { top: c.top, bottom: c.bottom, height: c.height },
              heading: { top: h.top, bottom: h.bottom },
              banner: { top: b.top, bottom: b.bottom }
            };
          })()`, 
          returnByValue: true 
        } 
      }));
    });
    console.log(JSON.stringify(res.result.value, null, 2));
    ws.close();
  };
}
check();
