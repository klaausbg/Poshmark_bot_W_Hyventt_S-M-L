const { Pool } = require("pg");

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: {
//     rejectUnauthorized: false, // Required for Railway's SSL
//   },
// });

// ✅ Define this BEFORE using it
const databaseUrl = process.env.DATABASE_URL || "";
const isLocal = !databaseUrl.includes("railway");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});


async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS seen_links_ebay (
      url TEXT PRIMARY KEY
    );
  `);
}

async function isSeen(url) {
  const res = await pool.query(
    "SELECT 1 FROM seen_links_ebay WHERE url = $1",
    [url]
  );
  return res.rowCount > 0;
}

async function markAsSeen(url) {
  await pool.query(
    "INSERT INTO seen_links_ebay(url) VALUES ($1) ON CONFLICT DO NOTHING",
    [url]
  );
}

module.exports = {
  ensureTable,
  isSeen,
  markAsSeen,
};
