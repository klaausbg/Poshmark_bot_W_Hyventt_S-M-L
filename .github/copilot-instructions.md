Project: poshmark-tracker (ebay_m_thermoball)

Purpose
- Small Node.js scraper that finds The North Face "Thermoball" jackets on eBay, filters by price and keywords, records seen links in Postgres, and posts matches to a Telegram chat.

Quick run
- Uses environment variables stored in a .env file. Key vars:
  - DATABASE_URL (Postgres connection string)
  - TELEGRAM_TOKEN (bot token)
  - TELEGRAM_CHAT_ID (target chat id)
- Start locally: `npm start` (runs `node hyvent.js`).

Architecture & important files
- `hyvent.js` — Main entrypoint. Flow:
  1. loads env
  2. ensures DB table exists (calls `ensureTable()`)
  3. scrapes eBay search results via axios + cheerio (`scrapeEbay()`)
  4. filters results (title contains "thermoball", price <= 30, excludes flaw words)
  5. sends Telegram messages for new matches and marks links as seen (`markAsSeen()`)
- `db_ebay.js` — Minimal Postgres helper using `pg.Pool`.
  - Creates table `seen_links_ebay(url TEXT PRIMARY KEY)` in `ensureTable()`
  - Uses `ON CONFLICT DO NOTHING` for idempotent inserts
  - Detects Railway SSL by checking DATABASE_URL content and sets ssl.rejectUnauthorized accordingly
- `package.json` — dependencies and `start` script. No tests or build step.

Project-specific conventions & patterns
- Idempotency: link deduplication is handled in Postgres (primary key + ON CONFLICT). New work should preserve this pattern.
- Environment detection: `db_ebay.js` uses a simple substring check on DATABASE_URL to decide if SSL is required for hosted DBs (Railway). Keep this guard when adding new DB code.
- Lightweight, single-file service: business logic (scraping + messaging) is in `hyvent.js`. When adding features, prefer small helper modules (like `db_ebay.js`) rather than splitting into many files unless necessary.
- Telemetry: The code logs high-level steps with emoji markers (e.g., "🔍 Fetching eBay...", "✅ Sent..."). Keep logs concise and human-readable.

External integrations
- eBay: Scrapes search result HTML at the hard-coded `EBAY_URL` in `hyvent.js`. Prefer using the same selectors when updating scraping logic:
  - Items: `li.s-item`
  - Title: `h3.s-item__title`
  - Link: `a.s-item__link` (href)
  - Price: `.s-item__price` (parse $number)
- Telegram: Uses Bot API `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage` with Markdown parse mode. Keep message formatting mindful of Markdown escaping and message length.
- Postgres: `pg` Pool. Table name: `seen_links_ebay`.

Common tasks & troubleshooting
- Missing env vars: startup will print `DATABASE_URL loaded:`; verify .env is present and values are correct.
- Local DB SSL: If connecting locally, ensure DATABASE_URL does not contain "railway" so ssl is disabled; otherwise the code enables ssl.rejectUnauthorized=false.
- If Telegram sends fail, check `TELEGRAM_TOKEN` and `CHAT_ID` and examine error logs printed by `sendTelegramMessage()`.

When editing or extending
- Keep the main flow readable: `ensureTable()` -> `scrapeEbay()` -> `checkEbay()` -> send/mark
- Reuse selectors and filters from `hyvent.js`. If adding new marketplaces, implement a similar scraper module returning [{title, link, price}].
- Preserve DB idempotency: always call `markAsSeen(link)` after sending.

Examples (copyable snippets)
- Parse price (already used in repo):
  const priceMatch = priceText.match(/\$([\d.]+)/);
  const price = priceMatch ? parseFloat(priceMatch[1]) : null;
- Mark as seen (pg):
  INSERT INTO seen_links_ebay(url) VALUES ($1) ON CONFLICT DO NOTHING

Notes for AI/code agents
- Focus edits on the three files above for most behavior changes. There are no test suites or CI configs to update.
- Avoid changing the DB detection heuristic unless adding a clear env or config flag; changing it may break hosted deployments.
- Keep messages in Markdown and preserve the existing two-stage Telegram notification (initial header message, then item messages) when modifying notification behavior.

If anything is unclear or you want instructions expanded (for CI, tests, or adding another marketplace), tell me which area to expand and I'll iterate.
