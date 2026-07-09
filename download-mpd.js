const puppeteer = require('puppeteer');
const fs = require('fs/promises');

const TARGET_URL = "https://play.discoveryplus.com/channel/watch/f4a4e9af-8af5-54a1-96b8-281b59b00742/366a7d01-78f8-568b-a429-54dcc5f6a1d6?referringSite=dotcom";

(async () => {
  console.log('🚀 Avvio browser...');
  console.log('TARGET_URL =', TARGET_URL);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  await page.setRequestInterception(true);

  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('.mpd')) {
      console.log('🔍 MPD trovato:', url);
      fs.writeFile('mpd-url.txt', url + '\n').catch(() => {});
    }
    req.continue();
  });

  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('.mpd') && res.status() === 200) {
      try {
        const body = await res.text();
        const filename = `manifest-${Date.now()}.mpd`;
        await fs.writeFile(filename, body);
        console.log(`✅ MPD salvato: ${filename}`);
      } catch (e) {
        console.error("Errore salvataggio MPD:", e.message);
      }
    }
  });

  try {
    console.log(`🌐 Vado su: ${TARGET_URL}`);
    await page.goto(TARGET_URL, { 
      waitUntil: 'networkidle2', 
      timeout: 60000 
    });

    console.log('⏳ Aspetto 25 secondi per caricare MPD...');
    await page.waitForTimeout(25000);

  } catch (err) {
    console.error('Errore navigazione:', err.message);
  }

  await browser.close();
  console.log('✅ Fine');
})();
