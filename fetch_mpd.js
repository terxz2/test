const fs = require("fs");
const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  // Simula dispositivo HD (max 720p)
  await page.setViewport({
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
    isMobile: false
  });

  // User-Agent di un device HD-ready
  await page.setUserAgent(
    "Mozilla/5.0 (Linux; Android 10; HD-Device) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36"
  );

  let mpdContent = null;

  // Intercetta tutte le risposte
  page.on("response", async (response) => {
    const url = response.url();

    // Cattura l'MPD finale
    if (url.endsWith(".mpd")) {
      try {
        mpdContent = await response.text();
      } catch (e) {
        console.error("Errore nel leggere MPD:", e);
      }
    }
  });

  // URL del player (modifica tu)
  await page.goto("https://www.discoveryplus.com/watch/XXXXXXXX", {
    waitUntil: "networkidle2"
  });

  // Attendi che il player scarichi l'MPD
  await page.waitForTimeout(8000);

  if (mpdContent) {
    fs.writeFileSync("main.mpd", mpdContent);
    console.log("MPD salvato come main.mpd");
  } else {
    console.log("Nessun MPD trovato.");
  }

  await browser.close();
})();
