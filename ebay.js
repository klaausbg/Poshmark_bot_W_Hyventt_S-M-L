require("dotenv").config();
console.log("✅ DATABASE_URL loaded:", process.env.DATABASE_URL);
const axios = require("axios");
const cheerio = require("cheerio");

const { ensureTable, isSeen, markAsSeen } = require("./db_ebay");

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const EBAY_URL =
  "https://www.ebay.com/sch/i.html?_nkw=the+north+face+thermoball&_sacat=0&_from=R40&_trksid=p4624852.m570.l1313";

async function sendTelegramMessage(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

  try {
    await axios.post(url, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: "Markdown",
      disable_web_page_preview: false,
    });
    console.log("📬 Sent to Telegram:", message.slice(0, 60) + "...");
  } catch (error) {
    console.error("❌ Telegram send failed:", error.message);
  }
}

async function scrapeEbay() {
  console.log("🌐 Fetching eBay search results...");
  const { data: html } = await axios.get(EBAY_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
    },
  });

  const $ = cheerio.load(html);
  const items = [];

  $("li.s-item").each((_, el) => {
    const title = $(el).find("h3.s-item__title").text().trim();
    const link = $(el).find("a.s-item__link").attr("href");
    const priceText = $(el).find(".s-item__price").first().text().trim();
    const priceMatch = priceText.match(/\$([\d.]+)/);
    const price = priceMatch ? parseFloat(priceMatch[1]) : null;

    if (title && link && price) {
      items.push({ title, link, price });
    }
  });

  console.log(`🔍 Found ${items.length} listings on eBay`);
  return items;
}

async function checkEbay() {
  const listings = await scrapeEbay();

  let matchCount = 0;
  let firstMatch = true;
  const flaws = ["flaw", "flaws", "stain", "vest", "damaged", "polartec"];

  for (const item of listings) {
    if (await isSeen(item.link)) {
      console.log("🔁 Already seen:", item.link);
      continue;
    }

    const titleLower = item.title.toLowerCase();
    const hasFlaw = flaws.some((w) => titleLower.includes(w));

    if (
      titleLower.includes("thermoball") &&
      item.price <= 30 &&
      !hasFlaw
    ) {
      if (firstMatch) {
        await sendTelegramMessage("\u2063");
        await sendTelegramMessage(
          "🔔 *You got new eBay Thermoballs deals!*\n\nHere are the latest jackets:"
        );
        firstMatch = false;
      }

      const msg = `🧥 *${item.title}*\n💰 $${item.price}\n🔗 ${item.link}`;
      await sendTelegramMessage(msg);
      await markAsSeen(item.link);
      matchCount++;

      console.log(`✅ Sent ${matchCount}: ${item.title}`);
    }
  }

  console.log(`📦 Final matches sent: ${matchCount}`);
}

async function main() {
  await ensureTable();
  await checkEbay();
}

main().catch((err) => console.error("💥 Fatal error:", err));
