const puppeteer = require('puppeteer');
const fs = require('fs/promises');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();

  // Intercetta tutte le richieste
  await page.setRequestInterception(true);
  let mpdFound = false;

  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('.mpd') && !mpdFound) {
      console.log('🔍 MPD rilevato:', url);
      // Salva l'URL completo (con token nei query params)
      fs.writeFile('mpd-url.txt', url).catch(console.error);
      
      // Opzionale: scarica subito il contenuto
      fetchMPD(url, request.headers());
      mpdFound = true;
    }
    request.continue();
  });

  // Intercetta risposte per MPD (più affidabile)
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('.mpd') && response.status() === 200) {
      console.log('📥 MPD response intercettata!');
      try {
        const body = await response.text();
        const filename = `manifest-${Date.now()}.mpd`;
        await fs.writeFile(filename, body);
        console.log(`✅ MPD salvato: ${filename}`);
      } catch (e) {
        console.error('Errore lettura body:', e);
      }
    }
  });

  // Navigazione + login (adatta al tuo sito)
  await page.goto(process.env.TARGET_URL, { waitUntil: 'networkidle2' });

  // Esempio login semplice (usa i tuoi selettori)
  // await page.type('#username', process.env.LOGIN_USER);
  // await page.type('#password', process.env.LOGIN_PASS);
  // await page.click('button[type="submit"]');
  // await page.waitForNavigation();

  // Play video o trigger caricamento MPD
  console.log('Aspetto caricamento MPD...');
  await page.waitForTimeout(15000); // o meglio: waitForSelector + click play

  await browser.close();
})();

async function fetchMPD(url, headers) {
  try {
    const res = await fetch(url, { headers });
    const text = await res.text();
    await fs.writeFile(`mpd-${Date.now()}.mpd`, text);
  } catch (e) {
    console.error('Fetch MPD fallito:', e);
  }
}
