const botbrowser = require("@botbrowser/puppeteer");
const fs = require("fs/promises");

const TARGET_URL = "https://play.discoveryplus.com/channel/watch/..."; // tua URL

(async () => {
  console.log("🚀 Avvio BotBrowser con Widevine...");

  const browser = await botbrowser.launch({
    headless: false, // Widevine funziona solo headful
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage"
    ]
  });

  const page = await browser.newPage();
  await page.setRequestInterception(true);

  let mpdFound = false;

  page.on("request", async (req) => {
    const url = req.url();

    if (url.includes(".mpd")) {
      console.log("🔍 MPD trovato:", url);

      await fs.writeFile("mpd-url.txt", url);
      mpdFound = true;
    }

    req.continue();
  });

  console.log("🌐 Navigo:", TARGET_URL);

  await page.goto(TARGET_URL, {
    waitUntil: "networkidle2",
    timeout: 60000
  });

  console.log("⏳ Aspetto che il player carichi l'MPD...");
  await new Promise(r => setTimeout(r, 20000));

  if (!mpdFound) {
    console.log("❌ Nessun MPD intercettato.");
  } else {
    console.log("✅ MPD URL salvato in mpd-url.txt");
  }

  await browser.close();
})();
