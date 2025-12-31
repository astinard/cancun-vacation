#!/usr/bin/env node
/**
 * Cancun Vacation Planner API Server
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const DB_PATH = path.join(__dirname, 'db', 'vacation.db');
let db;

try {
  db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');
  console.log('✅ Database connected');
} catch (err) {
  console.log('⚠️  Database not found. Run: npm run db:init');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Budget target constant
const BUDGET_TARGET = {
  min: 20000,
  max: 25000,
  sweet: 22500
};

// ============================================
// API ROUTES
// ============================================

// Get all resorts
app.get('/api/resorts', (req, res) => {
  try {
    const resorts = db.prepare('SELECT * FROM resorts ORDER BY price_may24').all();
    res.json(resorts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single resort with hidden costs
app.get('/api/resorts/:id', (req, res) => {
  try {
    const resort = db.prepare('SELECT * FROM resorts WHERE id = ?').get(req.params.id);
    if (!resort) return res.status(404).json({ error: 'Resort not found' });

    const hiddenCosts = db.prepare('SELECT * FROM hidden_costs WHERE resort_id = ?').get(req.params.id);
    const priceHistory = db.prepare('SELECT * FROM price_history WHERE resort_id = ? ORDER BY date DESC LIMIT 30').all(req.params.id);
    const comments = db.prepare(`
      SELECT c.*, fm.name as member_name
      FROM comments c
      LEFT JOIN family_members fm ON c.member_id = fm.id
      WHERE c.resort_id = ?
      ORDER BY c.created_at DESC
    `).all(req.params.id);

    res.json({ ...resort, hiddenCosts, priceHistory, comments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get price history for a resort
app.get('/api/prices/:resortId', (req, res) => {
  try {
    const history = db.prepare(`
      SELECT * FROM price_history
      WHERE resort_id = ?
      ORDER BY date DESC
      LIMIT 90
    `).all(req.params.resortId);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get budget calculation
app.get('/api/budget/:resortId', (req, res) => {
  try {
    const nights = parseInt(req.query.nights) || 7;
    const week = req.query.week || 'may24';

    const resort = db.prepare('SELECT * FROM resorts WHERE id = ?').get(req.params.resortId);
    if (!resort) return res.status(404).json({ error: 'Resort not found' });

    const costs = db.prepare('SELECT * FROM hidden_costs WHERE resort_id = ?').get(req.params.resortId);

    const isVilla = resort.is_villa;
    const pricePerNight = week === 'may24' ? resort.price_may24 : resort.price_may31;
    const accommodation = isVilla ? pricePerNight * nights : pricePerNight * 7 * nights;
    const flights = 5330; // Fixed estimate for 14 people
    const transfers = costs?.free_transfer ? 0 : 360;
    const excursions = costs?.parks_included ? 1400 : 2800;
    const extras = (costs?.extras || 20) * nights;

    const total = accommodation + flights + transfers + excursions + extras;
    const perPerson = Math.round(total / 14);

    let budgetStatus = 'over';
    let budgetDiff = total - BUDGET_TARGET.max;
    if (total <= BUDGET_TARGET.min) {
      budgetStatus = 'under';
      budgetDiff = BUDGET_TARGET.min - total;
    } else if (total <= BUDGET_TARGET.max) {
      budgetStatus = 'sweet';
      budgetDiff = 0;
    }

    res.json({
      resort: resort.name,
      nights,
      week,
      breakdown: { accommodation, flights, transfers, excursions, extras },
      total,
      perPerson,
      budgetTarget: BUDGET_TARGET,
      budgetStatus,
      budgetDiff
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get family members
app.get('/api/family', (req, res) => {
  try {
    const members = db.prepare('SELECT * FROM family_members ORDER BY group_name, name').all();
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get votes
app.get('/api/votes', (req, res) => {
  try {
    const votes = db.prepare(`
      SELECT v.*, fm.name as member_name
      FROM votes v
      JOIN family_members fm ON v.member_id = fm.id
      ORDER BY v.category, v.rank
    `).all();
    res.json(votes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit vote
app.post('/api/votes', (req, res) => {
  try {
    const { member_id, category, value, rank } = req.body;

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO votes (member_id, category, value, rank)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(member_id, category, value, rank || 1);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit ranked votes (for ranked-choice voting)
app.post('/api/votes/ranked', (req, res) => {
  try {
    const { member_id, category, rankings } = req.body;
    // rankings is an array like [{value: 'resort_2', rank: 1}, {value: 'resort_11', rank: 2}]

    // Delete existing votes for this member/category
    db.prepare('DELETE FROM votes WHERE member_id = ? AND category = ?').run(member_id, category);

    // Insert new rankings
    const stmt = db.prepare(`
      INSERT INTO votes (member_id, category, value, rank)
      VALUES (?, ?, ?, ?)
    `);

    rankings.forEach(r => {
      stmt.run(member_id, category, r.value, r.rank);
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get vote results with ranked-choice calculation
app.get('/api/votes/results', (req, res) => {
  try {
    const votes = db.prepare(`
      SELECT v.*, fm.name as member_name
      FROM votes v
      JOIN family_members fm ON v.member_id = fm.id
      WHERE v.category = 'resort'
      ORDER BY v.member_id, v.rank
    `).all();

    // Simple ranked choice: count first-choice votes
    const firstChoices = {};
    const allRankings = {};

    votes.forEach(v => {
      if (v.rank === 1) {
        firstChoices[v.value] = (firstChoices[v.value] || 0) + 1;
      }
      if (!allRankings[v.value]) allRankings[v.value] = [];
      allRankings[v.value].push({ member: v.member_name, rank: v.rank });
    });

    // Sort by first-choice votes
    const results = Object.entries(firstChoices)
      .map(([resortId, count]) => ({
        resortId,
        firstChoiceVotes: count,
        rankings: allRankings[resortId] || []
      }))
      .sort((a, b) => b.firstChoiceVotes - a.firstChoiceVotes);

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add comment
app.post('/api/comments', (req, res) => {
  try {
    const { resort_id, member_id, content } = req.body;

    const stmt = db.prepare(`
      INSERT INTO comments (resort_id, member_id, content)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(resort_id, member_id, content);

    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Price alert signup
app.post('/api/alerts', (req, res) => {
  try {
    const { email, resort_id, threshold } = req.body;

    const stmt = db.prepare(`
      INSERT INTO price_alerts (email, resort_id, threshold)
      VALUES (?, ?, ?)
    `);
    stmt.run(email, resort_id, threshold);

    res.json({ success: true, message: 'Alert created! We\'ll email you when price drops.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get comparison data
app.get('/api/compare', (req, res) => {
  try {
    const ids = req.query.ids?.split(',').map(id => parseInt(id)) || [];
    if (ids.length === 0) return res.json([]);

    const placeholders = ids.map(() => '?').join(',');
    const resorts = db.prepare(`
      SELECT r.*, h.*
      FROM resorts r
      LEFT JOIN hidden_costs h ON r.id = h.resort_id
      WHERE r.id IN (${placeholders})
    `).all(...ids);

    res.json(resorts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save comparison for sharing
app.post('/api/compare/save', (req, res) => {
  try {
    const { resort_ids } = req.body;
    const id = Math.random().toString(36).substr(2, 9);

    db.prepare(`
      INSERT INTO comparisons (id, resort_ids)
      VALUES (?, ?)
    `).run(id, JSON.stringify(resort_ids));

    res.json({ id, url: `/compare/${id}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get saved comparison
app.get('/api/compare/:id', (req, res) => {
  try {
    const comparison = db.prepare('SELECT * FROM comparisons WHERE id = ?').get(req.params.id);
    if (!comparison) return res.status(404).json({ error: 'Comparison not found' });

    const resortIds = JSON.parse(comparison.resort_ids);
    const placeholders = resortIds.map(() => '?').join(',');
    const resorts = db.prepare(`
      SELECT r.*, h.*
      FROM resorts r
      LEFT JOIN hidden_costs h ON r.id = h.resort_id
      WHERE r.id IN (${placeholders})
    `).all(...resortIds);

    res.json({ id: comparison.id, resorts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Itinerary endpoints
app.get('/api/itinerary', (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM itinerary ORDER BY date, time_slot').all();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/itinerary', (req, res) => {
  try {
    const { date, time_slot, title, description, category, cost } = req.body;

    const result = db.prepare(`
      INSERT INTO itinerary (date, time_slot, title, description, category, cost)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(date, time_slot, title, description, category, cost || 0);

    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/itinerary/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM itinerary WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve the main app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`
🌴 Cancun Vacation Planner API
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 Server running on http://localhost:${PORT}
📊 API endpoints available at /api/*
🗄️  Database: ${DB_PATH}
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  if (db) db.close();
  process.exit(0);
});
