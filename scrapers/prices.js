#!/usr/bin/env node
/**
 * Price Scraper for Cancun Resorts
 * Simulates checking prices from various sources
 * In production, this would use Puppeteer to scrape real prices
 *
 * Run with: npm run scrape
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'db', 'vacation.db');

// Simulated price data (in production, scrape from actual sites)
const priceSources = {
  costco: {
    name: 'Costco Travel',
    prices: {
      1: { may24: 375, may31: 415 },  // Hyatt Ziva - slightly lower
      2: { may24: 310, may31: 350 },  // Hard Rock - Costco deal
      3: { may24: 340, may31: 390 },  // Moon Palace
      11: { may24: 410, may31: 470 }, // Generations
      16: { may24: 470, may31: 530 }, // Xcaret
    }
  },
  expedia: {
    name: 'Expedia',
    prices: {
      1: { may24: 385, may31: 425 },
      2: { may24: 325, may31: 365 },
      3: { may24: 355, may31: 405 },
      4: { may24: 485, may31: 525 },
      11: { may24: 425, may31: 485 },
      12: { may24: 555, may31: 625 },
      16: { may24: 485, may31: 545 },
    }
  },
  booking: {
    name: 'Booking.com',
    prices: {
      1: { may24: 380, may31: 420 },
      2: { may24: 320, may31: 360 },
      3: { may24: 350, may31: 400 },
      4: { may24: 480, may31: 520 },
      11: { may24: 420, may31: 480 },
      12: { may24: 550, may31: 620 },
      16: { may24: 480, may31: 540 },
    }
  }
};

// Add random variance to simulate real price changes
function addVariance(price, maxVariance = 15) {
  const variance = Math.floor(Math.random() * maxVariance * 2) - maxVariance;
  return Math.max(price + variance, price * 0.85); // Don't go below 85% of base
}

async function scrapeAndSave() {
  console.log('🔍 Starting price scrape...\n');

  let db;
  try {
    db = new Database(DB_PATH);
  } catch (err) {
    console.error('❌ Database not found. Run: npm run db:init');
    process.exit(1);
  }

  const today = new Date().toISOString().split('T')[0];

  const insertPrice = db.prepare(`
    INSERT OR REPLACE INTO price_history (resort_id, date, price_may24, price_may31, source)
    VALUES (?, ?, ?, ?, ?)
  `);

  let totalInserted = 0;

  for (const [sourceKey, source] of Object.entries(priceSources)) {
    console.log(`📊 Scraping ${source.name}...`);

    for (const [resortId, prices] of Object.entries(source.prices)) {
      // Add some variance to simulate real-world price changes
      const may24 = addVariance(prices.may24);
      const may31 = addVariance(prices.may31);

      insertPrice.run(parseInt(resortId), today, Math.round(may24), Math.round(may31), sourceKey);
      totalInserted++;
    }

    console.log(`   ✅ ${Object.keys(source.prices).length} prices updated`);
  }

  // Find best prices per resort
  console.log('\n📈 Best Prices Found Today:\n');

  const resorts = db.prepare('SELECT id, name FROM resorts').all();
  const getBestPrice = db.prepare(`
    SELECT source, price_may24, price_may31
    FROM price_history
    WHERE resort_id = ? AND date = ?
    ORDER BY price_may24 ASC
    LIMIT 1
  `);

  resorts.forEach(resort => {
    const best = getBestPrice.get(resort.id, today);
    if (best) {
      console.log(`   ${resort.name}: $${best.price_may24}/night (${best.source})`);
    }
  });

  // Check for price drops
  console.log('\n🔔 Price Drop Alerts:\n');

  const checkDrops = db.prepare(`
    SELECT
      r.name,
      p1.price_may24 as today_price,
      p2.price_may24 as yesterday_price,
      ROUND((p2.price_may24 - p1.price_may24) * 100.0 / p2.price_may24, 1) as drop_percent
    FROM price_history p1
    JOIN price_history p2 ON p1.resort_id = p2.resort_id
    JOIN resorts r ON p1.resort_id = r.id
    WHERE p1.date = ?
      AND p2.date = date(?, '-1 day')
      AND p1.price_may24 < p2.price_may24
    ORDER BY drop_percent DESC
  `);

  const drops = checkDrops.all(today, today);
  if (drops.length > 0) {
    drops.forEach(drop => {
      console.log(`   🔥 ${drop.name}: ${drop.drop_percent}% drop ($${drop.yesterday_price} → $${drop.today_price})`);
    });
  } else {
    console.log('   No significant price drops today.');
  }

  // Get alerts to send
  const alerts = db.prepare(`
    SELECT pa.email, pa.threshold, r.name, ph.price_may24
    FROM price_alerts pa
    JOIN resorts r ON pa.resort_id = r.id
    JOIN price_history ph ON pa.resort_id = ph.resort_id
    WHERE pa.active = 1
      AND ph.date = ?
      AND ph.price_may24 <= pa.threshold
  `).all(today);

  if (alerts.length > 0) {
    console.log('\n📧 Alerts to Send:\n');
    alerts.forEach(alert => {
      console.log(`   → ${alert.email}: ${alert.name} is now $${alert.price_may24} (threshold: $${alert.threshold})`);
    });
  }

  db.close();

  console.log(`\n✅ Scrape complete! ${totalInserted} price records updated.`);
  console.log(`📅 Date: ${today}\n`);
}

// Run if called directly
if (require.main === module) {
  scrapeAndSave().catch(console.error);
}

module.exports = { scrapeAndSave, priceSources };
