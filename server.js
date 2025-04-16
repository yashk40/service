const express = require("express");
const puppeteer = require("puppeteer");
const fs = require("fs");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static("public"));

// Load proxies from proxies.txt
const proxyList = fs.readFileSync("proxies.txt", "utf-8")
  .split("\n")
  .map(p => p.trim())
  .filter(Boolean);

// Helper function to wait between requests
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Visit URL with a specific proxy
async function visitWithProxy(url, proxy) {
  try {
    console.log(`🔄 Trying proxy: ${proxy}`);

    // Launch browser with the correct executable path for cloud environments like Render
    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser', // Adjust path as needed
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Fix for limited memory environments
        '--headless', // Run in headless mode
      ],
      headless: true, 
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    console.log(`✅ Visited: ${url} via ${proxy}`);

    await page.waitForTimeout(10000); // Simulate user viewing the page
    await browser.close();

    return { success: true, proxy };
  } catch (err) {
    console.error(`❌ Failed with proxy ${proxy}: ${err.message}`);
    return { success: false, proxy, error: err.message };
  }
}

// POST endpoint to start the bot
app.post("/start", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Missing video URL." });

  const results = [];

  for (const proxy of proxyList) {
    const result = await visitWithProxy(url, proxy);
    results.push(result);

    await delay(5000); // Wait 5 seconds before next visit
  }

  res.json({ message: "Bot completed", results });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

