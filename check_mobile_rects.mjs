import fs from 'node:fs';

async function checkMobile() {
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

    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });

    await send('Page.reload');
    await new Promise(r => setTimeout(r, 1200));

    // 1. Check About section geometry when scrolled to About
    await send('Runtime.evaluate', { expression: 'window.scrollToAbout();' });
    await new Promise(r => setTimeout(r, 600));

    const aboutData = await send('Runtime.evaluate', {
      expression: `(() => {
        const r = id => {
          const el = document.getElementById(id);
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          return { top: Math.round(rect.top), bottom: Math.round(rect.bottom), left: Math.round(rect.left), width: Math.round(rect.width), height: Math.round(rect.height) };
        };
        const textEl = document.querySelector('.parchment-text');
        const textRect = textEl ? textEl.getBoundingClientRect() : null;
        return {
          window: { w: window.innerWidth, h: window.innerHeight },
          headline: r('layerHeadline'),
          parchment: r('layerParchment'),
          parchmentText: textRect ? { top: Math.round(textRect.top), bottom: Math.round(textRect.bottom), height: Math.round(textRect.height), overflow: textEl.scrollHeight > textEl.clientHeight } : null,
          bee: r('layerBee'),
          forestTop: r('layerForestTop'),
          cliffBase: r('layerCliffBase'),
          islandContainer: r('islandContainer')
        };
      })()`,
      returnByValue: true
    });
    console.log('ABOUT MOBILE GEOMETRY:\n', JSON.stringify(aboutData.result.value, null, 2));

    // 2. Check Cavern section geometry
    await send('Runtime.evaluate', { expression: 'window.scrollToCavern();' });
    await new Promise(r => setTimeout(r, 600));

    const cavernData = await send('Runtime.evaluate', {
      expression: `(() => {
        const r = id => {
          const el = document.getElementById(id);
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          return { top: Math.round(rect.top), bottom: Math.round(rect.bottom), left: Math.round(rect.left), width: Math.round(rect.width), height: Math.round(rect.height) };
        };
        const cards = Array.from(document.querySelectorAll('.highlight-card')).map(c => {
          const rect = c.getBoundingClientRect();
          return { top: Math.round(rect.top), bottom: Math.round(rect.bottom), left: Math.round(rect.left), width: Math.round(rect.width), height: Math.round(rect.height) };
        });
        const bannerBg = document.querySelector('.cavern-banner-bg');
        const bannerContent = document.querySelector('.cavern-banner-content');
        return {
          heading: r('cavernHeading'),
          banner: r('cavernBanner'),
          bannerBg: bannerBg ? { width: Math.round(bannerBg.getBoundingClientRect().width), height: Math.round(bannerBg.getBoundingClientRect().height) } : null,
          bannerContent: bannerContent ? { top: Math.round(bannerContent.getBoundingClientRect().top), bottom: Math.round(bannerContent.getBoundingClientRect().bottom), height: Math.round(bannerContent.getBoundingClientRect().height) } : null,
          cardsCount: cards.length,
          cardsTotalHeight: cards.length > 0 ? (cards[cards.length - 1].bottom - cards[0].top) : 0,
          walls: r('cavernWalls')
        };
      })()`,
      returnByValue: true
    });
    console.log('CAVERN MOBILE GEOMETRY:\n', JSON.stringify(cavernData.result.value, null, 2));

    ws.close();
  };
}
checkMobile();
