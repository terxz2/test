const puppeteer = require("puppeteer");
const fs = require("fs/promises");

const TARGET_URL = "https://play.discoveryplus.com/channel/watch/f4a4e9af-8af5-54a1-96b8-281b59b00742/366a7d01-78f8-568b-a429-54dcc5f6a1d6?referringSite=dotcom";

(async () => {
  console.log("🚀 Avvio browser...");

  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      // opzionale: user-agent più realistico
      "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ]
  });

  const page = await browser.newPage();
  await page.setRequestInterception(true);

  // 🔍 intercetta tutte le request (MPD + licenza DRM)
  page.on("request", async (req) => {
    const url = req.url();
    const method = req.method();
    const resourceType = req.resourceType();

    // MPD
    if (url.includes(".mpd")) {
      console.log("🔍 MPD trovato:", url);
      await fs.writeFile("mpd-url.txt", url + "\n");

      try {
        const mpdText = await page.evaluate(async (mpdUrl) => {
          const res = await fetch(mpdUrl, { credentials: "include" });
          return await res.text();
        }, url);

        const filename = `manifest-${Date.now()}.mpd`;
        await fs.writeFile(filename, mpdText);
        console.log("✅ MPD salvato:", filename);
      } catch (err) {
        console.log("❌ Errore download MPD:", err.message);
      }
    }

    // License Widevine (tipicamente POST verso /license, /widevine, ecc.)
    if (
      method === "POST" &&
      /license|widevine|drm/i.test(url)
    ) {
      console.log("🛡️ Richiesta licenza DRM:", url);
      try {
        const postData = req.postData();
        await fs.writeFile(`drm-request-${Date.now()}.bin`, postData || "");
        console.log("📦 License challenge salvato (binario).");
      } catch (_) {}
    }

    req.continue();
  });

  // 🔍 intercetta anche le risposte MPD (fallback)
  page.on("response", async (res) => {
    const url = res.url();
    if (url.includes(".mpd")) {
      try {
        const body = await res.text();
        const filename = `manifest-response-${Date.now()}.mpd`;
        await fs.writeFile(filename, body);
        console.log("📦 MPD salvato via response:", filename);
      } catch (_) {}
    }
  });

  console.log("🌐 Navigo:", TARGET_URL);

  await page.goto(TARGET_URL, {
    waitUntil: "networkidle2",
    timeout: 60000
  });

  console.log("⏳ Aspetto che il player carichi l'MPD e la licenza...");
  await new Promise(r => setTimeout(r, 25000));

  await browser.close();
  console.log("🏁 Fine");
})();
