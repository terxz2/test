const puppeteer = require('puppeteer');
const fs = require('fs/promises');

(async () => {
  console.log('🚀 Avvio browser...');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  let mpdSaved = false;

  await page.setRequestInterception(true);

  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('.mpd')) {
      console.log('🔍 MPD Request:', url);
      fs.writeFile('mpd-url.txt', url + '\n\n').catch(() => {});
    }
    req.continue();
  });

  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('.mpd') && res.status() === 200 && !mpdSaved) {
      try {
        const body = await res.text();
        const filename = `manifest-${Date.now()}.mpd`;
        await fs.writeFile(filename, body);
        console.log(`✅ MPD salvato correttamente: ${filename} (${(body.length/1024).toFixed(1)} KB)`);
        mpdSaved = true;
      } catch (e) {
        console.error('❌ Errore nel salvataggio:', e.message);
      }
    }
  });

  try {
    console.log(`Navigazione verso: ${process.env.TARGET_URL}`);
    await page.goto(process.env.TARGET_URL, { 
      waitUntil: 'networkidle2', 
      timeout: 60000 
    });

    console.log('⏳ Attendo caricamento del player e MPD (25 secondi)...');
    await page.waitForTimeout(25000);

  } catch (err) {
    console.error('Errore navigazione:', err.message);
  }

  await browser.close();
  console.log('✅ Script terminato');
})();
