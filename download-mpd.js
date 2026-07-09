const puppeteer = require('puppeteer');
const fs = require('fs/promises');

(async () => {
  console.log('🚀 Avvio Puppeteer...');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  let mpdSaved = false;

  // Intercettazione richieste
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('.mpd') && !mpdSaved) {
      console.log('🔍 MPD URL trovato:', url);
      fs.writeFile('mpd-url.txt', url + '\n').catch(console.error);
    }
    req.continue();
  });

  // Intercettazione risposte (più affidabile per salvare il contenuto)
  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('.mpd') && res.status() === 200 && !mpdSaved) {
      try {
        const body = await res.text();
        const filename = `manifest-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.mpd`;
        await fs.writeFile(filename, body);
        console.log(`✅ MPD salvato: ${filename} (${body.length} bytes)`);
        mpdSaved = true;
      } catch (err) {
        console.error('❌ Errore salvataggio MPD:', err.message);
      }
    }
  });

  try {
    console.log(`🌐 Navigo su: ${process.env.TARGET_URL}`);
    await page.goto(process.env.TARGET_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    // TODO: aggiungi qui login + click play se necessario
    // await page.waitForSelector('...');
    // await page.click('...');

    console.log('⏳ Aspetto caricamento MPD (20 secondi)...');
    await page.waitForTimeout(20000);

  } catch (err) {
    console.error('Errore durante navigazione:', err.message);
  }

  await browser.close();
  console.log('✅ Fine esecuzione');
})();
