#!/usr/bin/env node
/**
 * Database initialization script
 * Run with: npm run db:init
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'vacation.db');

// Create database
const db = new Database(DB_PATH);

console.log('🗄️  Initializing Cancun Vacation Database...\n');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  -- Resorts table
  CREATE TABLE IF NOT EXISTS resorts (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    area TEXT,
    area_name TEXT,
    lat REAL,
    lng REAL,
    airport_dist TEXT,
    price_may24 INTEGER,
    price_may31 INTEGER,
    rating REAL,
    reviews INTEGER,
    family INTEGER DEFAULT 0,
    accessible INTEGER DEFAULT 0,
    luxury INTEGER DEFAULT 0,
    adults_only INTEGER DEFAULT 0,
    is_villa INTEGER DEFAULT 0,
    bedrooms INTEGER,
    sleeps INTEGER,
    points TEXT,
    points_cost TEXT,
    website TEXT,
    tripadvisor TEXT,
    features TEXT,
    notes TEXT,
    value_score INTEGER,
    service_rating TEXT,
    crowd_level TEXT,
    renovated TEXT,
    insider_tip TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Price history table
  CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resort_id INTEGER NOT NULL,
    date DATE NOT NULL,
    price_may24 INTEGER,
    price_may31 INTEGER,
    source TEXT DEFAULT 'manual',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resort_id) REFERENCES resorts(id),
    UNIQUE(resort_id, date, source)
  );

  -- Hidden costs table
  CREATE TABLE IF NOT EXISTS hidden_costs (
    resort_id INTEGER PRIMARY KEY,
    resort_fee INTEGER DEFAULT 0,
    tips INTEGER DEFAULT 0,
    transfer INTEGER DEFAULT 0,
    extras INTEGER DEFAULT 0,
    free_transfer INTEGER DEFAULT 0,
    resort_credits INTEGER,
    parks_included INTEGER DEFAULT 0,
    parks_value INTEGER,
    notes TEXT,
    FOREIGN KEY (resort_id) REFERENCES resorts(id)
  );

  -- Family members table
  CREATE TABLE IF NOT EXISTS family_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    group_name TEXT,
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Votes table
  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    value TEXT NOT NULL,
    rank INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES family_members(id),
    UNIQUE(member_id, category, value)
  );

  -- Price alerts table
  CREATE TABLE IF NOT EXISTS price_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    resort_id INTEGER,
    threshold INTEGER,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resort_id) REFERENCES resorts(id)
  );

  -- Comments table
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resort_id INTEGER NOT NULL,
    member_id INTEGER,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resort_id) REFERENCES resorts(id),
    FOREIGN KEY (member_id) REFERENCES family_members(id)
  );

  -- Saved comparisons table
  CREATE TABLE IF NOT EXISTS comparisons (
    id TEXT PRIMARY KEY,
    resort_ids TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Trip itinerary table
  CREATE TABLE IF NOT EXISTS itinerary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    time_slot TEXT,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    cost INTEGER DEFAULT 0,
    booked INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log('✅ Tables created\n');

// Load resort data from JSON
const resortsData = require('../data/research-2025.json');
const priceHistory = require('../data/price-history.json');
const hiddenCostsData = require('../data/hidden-costs.json');

// Insert resorts from the main HTML file data
// We'll extract this from the index.html or use a separate resorts.json
const resorts = [
  { id: 1, name: "Hyatt Ziva Cancun", area: "cancun", area_name: "Cancun Hotel Zone", price_may24: 380, price_may31: 420, rating: 4.5, reviews: 12500, family: 1, accessible: 1, points: "hyatt", value_score: 8 },
  { id: 2, name: "Hard Rock Hotel Cancun", area: "cancun", area_name: "Cancun Hotel Zone", price_may24: 320, price_may31: 360, rating: 4.4, reviews: 15800, family: 1, accessible: 1, value_score: 9 },
  { id: 3, name: "Moon Palace Cancun", area: "cancun", area_name: "Cancun South", price_may24: 350, price_may31: 400, rating: 4.3, reviews: 28000, family: 1, accessible: 1, value_score: 7 },
  { id: 4, name: "Grand Fiesta Americana Coral Beach", area: "cancun", area_name: "Cancun Hotel Zone", price_may24: 480, price_may31: 520, rating: 4.6, reviews: 8900, family: 1, accessible: 1, luxury: 1, value_score: 8 },
  { id: 11, name: "Generations Riviera Maya", area: "riviera", area_name: "Puerto Morelos", price_may24: 420, price_may31: 480, rating: 4.7, reviews: 4200, family: 1, accessible: 1, value_score: 10 },
  { id: 12, name: "Grand Velas Riviera Maya", area: "riviera", area_name: "Playa del Carmen", price_may24: 550, price_may31: 620, rating: 4.8, reviews: 6100, family: 1, luxury: 1, value_score: 9 },
  { id: 16, name: "Hotel Xcaret Mexico", area: "riviera", area_name: "Playa del Carmen", price_may24: 480, price_may31: 540, rating: 4.6, reviews: 12400, family: 1, accessible: 1, value_score: 9 },
  { id: 41, name: "Hacienda Magica", area: "riviera", area_name: "Riviera Maya", price_may24: 2860, price_may31: 3200, rating: 5.0, reviews: 45, family: 1, is_villa: 1, bedrooms: 14, sleeps: 28, value_score: 10 },
  { id: 44, name: "Villa Quinta Clara", area: "akumal", area_name: "Akumal", price_may24: 1650, price_may31: 1900, rating: 4.9, reviews: 32, family: 1, is_villa: 1, bedrooms: 8, sleeps: 16, value_score: 10 }
];

const insertResort = db.prepare(`
  INSERT OR REPLACE INTO resorts (id, name, area, area_name, price_may24, price_may31, rating, reviews, family, accessible, luxury, is_villa, bedrooms, sleeps, points, value_score)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

resorts.forEach(r => {
  insertResort.run(r.id, r.name, r.area, r.area_name, r.price_may24, r.price_may31, r.rating, r.reviews, r.family || 0, r.accessible || 0, r.luxury || 0, r.is_villa || 0, r.bedrooms, r.sleeps, r.points, r.value_score);
});

console.log(`✅ Inserted ${resorts.length} resorts\n`);

// Insert hidden costs
const hiddenCosts = [
  { resort_id: 1, resort_fee: 0, tips: 0, transfer: 85, extras: 25, free_transfer: 0 },
  { resort_id: 2, resort_fee: 0, tips: 0, transfer: 90, extras: 15, free_transfer: 0 },
  { resort_id: 3, resort_fee: 0, tips: 0, transfer: 0, extras: 40, free_transfer: 1, resort_credits: 1500 },
  { resort_id: 4, resort_fee: 0, tips: 0, transfer: 95, extras: 20, free_transfer: 0 },
  { resort_id: 11, resort_fee: 0, tips: 0, transfer: 0, extras: 10, free_transfer: 1 },
  { resort_id: 12, resort_fee: 0, tips: 0, transfer: 0, extras: 15, free_transfer: 1 },
  { resort_id: 16, resort_fee: 0, tips: 0, transfer: 0, extras: 0, free_transfer: 1, parks_included: 1, parks_value: 1200 },
  { resort_id: 41, resort_fee: 0, tips: 350, transfer: 180, extras: 200, free_transfer: 0 },
  { resort_id: 44, resort_fee: 0, tips: 200, transfer: 200, extras: 150, free_transfer: 0 }
];

const insertHiddenCost = db.prepare(`
  INSERT OR REPLACE INTO hidden_costs (resort_id, resort_fee, tips, transfer, extras, free_transfer, resort_credits, parks_included, parks_value)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

hiddenCosts.forEach(h => {
  insertHiddenCost.run(h.resort_id, h.resort_fee, h.tips, h.transfer, h.extras, h.free_transfer, h.resort_credits, h.parks_included, h.parks_value);
});

console.log(`✅ Inserted ${hiddenCosts.length} hidden cost records\n`);

// Insert family members
const familyMembers = [
  { name: 'Alex', group_name: 'Your Family' },
  { name: 'Andrew', group_name: 'Your Family' },
  { name: 'Cindy', group_name: 'Your Family' },
  { name: 'Mom', group_name: 'Parents' },
  { name: 'Dad', group_name: 'Parents' },
  { name: 'Aunt', group_name: 'Parents' },
  { name: 'Dann', group_name: 'Omaha' },
  { name: "Dann's Husband", group_name: 'Omaha' },
  { name: 'Beckett 1', group_name: 'Becketts' },
  { name: 'Beckett 2', group_name: 'Becketts' }
];

const insertMember = db.prepare(`
  INSERT OR REPLACE INTO family_members (name, group_name)
  VALUES (?, ?)
`);

familyMembers.forEach(m => {
  insertMember.run(m.name, m.group_name);
});

console.log(`✅ Inserted ${familyMembers.length} family members\n`);

// Insert initial price history
const today = new Date().toISOString().split('T')[0];
const insertPrice = db.prepare(`
  INSERT OR IGNORE INTO price_history (resort_id, date, price_may24, price_may31, source)
  VALUES (?, ?, ?, ?, ?)
`);

resorts.forEach(r => {
  insertPrice.run(r.id, today, r.price_may24, r.price_may31, 'initial');
});

console.log(`✅ Inserted initial price history\n`);

db.close();
console.log('🎉 Database initialization complete!');
console.log(`📁 Database saved to: ${DB_PATH}\n`);
