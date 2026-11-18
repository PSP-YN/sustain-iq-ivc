import fs from 'node:fs';

async function run() {
  const vres = await fetch('http://127.0.0.1:9222/json');
  const tabs = await vres.json();
  const tab = tabs[0];
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  
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

  ws.onopen = async () => {
    // 1. Capture About Surface section
    await send('Runtime.evaluate', { 
      expression: 'window.scrollToAbout();' 
    });
    await new Promise(r => setTimeout(r, 1500));
    let shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('c:/sus/test_surface_verified.png', Buffer.from(shot.data, 'base64'));

    // 2. Capture Stalactites Overhang Transition into Cavern
    await send('Runtime.evaluate', { 
      expression: 'window.scrollTo(0, document.getElementById("cavern").offsetTop - 250);' 
    });
    await new Promise(r => setTimeout(r, 1500));
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('c:/sus/test_stalactites_transition.png', Buffer.from(shot.data, 'base64'));

    // 3. Capture Full Underground Cavern View (Stalactite ceiling + Heading + Banner)
    await send('Runtime.evaluate', { 
      expression: 'window.scrollTo(0, document.getElementById("cavern").offsetTop + 300);' 
    });
    await new Promise(r => setTimeout(r, 1500));
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('c:/sus/test_cavern_verified.png', Buffer.from(shot.data, 'base64'));

    console.log('All cavern and transition screenshots saved successfully!');
    ws.close();
    process.exit(0);
  };
}
run();
