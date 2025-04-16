// 🧠 Use system-installed Chrome for Puppeteer
process.env.PUPPETEER_EXECUTABLE_PATH = '/usr/bin/google-chrome-stable';

const express = require("express");
const puppeteer = require("puppeteer");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

// 📥 Load proxies from file
const proxyList = fs.readFileSync("proxies.txt", "utf-8")
  .split("\n")
  .map(p => p.trim())
  .filter(Boolean);

// ⏱️ Helper delay function
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 🌐 Visit URL using Puppeteer through a proxy
async function visitWithProxy(url, proxy) {
  try {
    console.log(`🔄 Trying proxy: ${proxy}`);

    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      headless: true,
      args: [
        `--proxy-server=${proxy}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    console.log(`✅ Visited: ${url} via ${proxy}`);

    await page.waitForTimeout(10000); // simulate user watching for 10 seconds
    await browser.close();

    return { success: true, proxy };
  } catch (err) {
    console.error(`❌ Failed with proxy ${proxy}: ${err.message}`);
    return { success: false, proxy, error: err.message };
  }
}

// 🚀 Bot endpoint
app.post("/start", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    console.log("❌ No URL provided in request.");
    return res.status(400).json({ error: "Missing video URL." });
  }

  console.log(`📡 Starting bot for URL: ${url}`);
  const results = [];

  for (const proxy of proxyList) {
    const result = await visitWithProxy(url, proxy);
    results.push(result);
    await delay(5000); // wait 5 seconds between each
  }

  console.log("✅ Bot run completed.");
  res.json({ message: "Bot completed", results });
});

// 🟢 Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});
