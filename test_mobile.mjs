import fs from 'node:fs';

async function testMobile() {
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

    // Set mobile viewport emulation: 390 x 844 (iPhone 12/13/14/15)
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });

    await send('Page.reload');
    await new Promise(r => setTimeout(r, 1200));

    // Capture Hero Start
    await send('Runtime.evaluate', { expression: 'window.scrollTo(0, 0);' });
    await new Promise(r => setTimeout(r, 600));
    let shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('c:/sus/mobile_1_hero.png', Buffer.from(shot.data, 'base64'));

    // Capture About section
    await send('Runtime.evaluate', { expression: 'window.scrollToAbout();' });
    await new Promise(r => setTimeout(r, 800));
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('c:/sus/mobile_2_about.png', Buffer.from(shot.data, 'base64'));

    // Capture Transition between Island stalactites and Cavern
    await send('Runtime.evaluate', { expression: 'window.scrollTo(0, document.getElementById("cavern").offsetTop - 100);' });
    await new Promise(r => setTimeout(r, 800));
    let transShot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('c:/sus/mobile_transition_stalactites.png', Buffer.from(transShot.data, 'base64'));

    // Capture Cavern section
    const navResult = await send('Runtime.evaluate', { 
      expression: `(() => {
        window.scrollToCavern();
        const el = document.getElementById("cavern");
        const rect = el.getBoundingClientRect();
        return {
          scrollY: window.scrollY,
          offsetTop: el.offsetTop,
          rect: { top: rect.top, bottom: rect.bottom, height: rect.height }
        };
      })()`,
      returnByValue: true
    });
    console.log('SCROLL TO CAVERN EVAL RESULT:', navResult.result.value);
    await new Promise(r => setTimeout(r, 800));
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('c:/sus/mobile_3_cavern.png', Buffer.from(shot.data, 'base64'));

    // Capture Scroll further into Cavern banner
    await send('Runtime.evaluate', { expression: 'targetScroll = currentScroll = document.getElementById("cavern").offsetTop + 350; window.scrollTo(0, targetScroll);' });
    await new Promise(r => setTimeout(r, 800));
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('c:/sus/mobile_4_cavern_banner.png', Buffer.from(shot.data, 'base64'));

    console.log('Mobile screenshots captured successfully!');
    ws.close();
  };
}
testMobile();
