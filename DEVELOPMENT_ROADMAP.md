# Cancun Vacation Planner - 8 Week Development Roadmap

## Overview
Transform the current static planner into a dynamic, data-driven vacation planning platform with live pricing, family coordination, and smart deal alerts.

---

## PHASE 1: Foundation & Data (Weeks 1-2)

### Week 1: Backend Infrastructure
- [ ] **Set up Node.js/Express backend**
  - API endpoints for resort data
  - Price history storage
  - User preferences
- [ ] **Database setup (SQLite or PostgreSQL)**
  - Resorts table with all current data
  - Price history table (daily snapshots)
  - User votes/preferences table
  - Saved searches table
- [ ] **Data migration**
  - Move inline JS data to database
  - Create seed scripts from current JSON files
- [ ] **Basic API endpoints**
  - GET /api/resorts
  - GET /api/resorts/:id
  - GET /api/prices/history/:id
  - POST /api/votes

### Week 2: Price Tracking System
- [ ] **Price scraping service**
  - Scheduled job (daily) to fetch current prices
  - Store in price history table
  - Track: Expedia, Booking.com, Costco Travel
- [ ] **Price change detection**
  - Compare today vs yesterday
  - Calculate trend (7-day, 30-day)
  - Flag significant drops (>5%)
- [ ] **Deal scoring algorithm**
  - Factor in: price vs average, trend, hidden costs, value score
  - Generate "Deal Score" 1-100
- [ ] **Price alerts infrastructure**
  - Email notification service (SendGrid/Mailgun)
  - Alert threshold settings
  - "Notify me when price drops" feature

---

## PHASE 2: Enhanced UI & Mobile (Weeks 3-4)

### Week 3: Mobile-First Redesign
- [ ] **Responsive layout overhaul**
  - Mobile-first CSS
  - Touch-friendly controls
  - Swipe gestures for resort cards
- [ ] **Progressive Web App (PWA)**
  - Service worker for offline access
  - Add to home screen
  - Cache resort data locally
- [ ] **Improved navigation**
  - Bottom nav bar for mobile
  - Sticky filters
  - Quick-scroll to sections

### Week 4: Interactive Features
- [ ] **Side-by-side comparison tool**
  - Select 2-4 resorts
  - Full-screen comparison view
  - Highlight differences (green=better, red=worse)
  - Export/share comparison
- [ ] **Interactive trip timeline**
  - Visual calendar (May 24 - Jun 7)
  - Drag to select dates
  - Show price changes by date
- [ ] **Enhanced map features**
  - Cluster markers
  - Filter by drawing on map
  - Distance calculator between resorts
  - Show nearby attractions

---

## PHASE 3: Smart Deal Finding (Weeks 5-6)

### Week 5: Live Price Integration
- [ ] **Flight price widget**
  - Google Flights API or Skyscanner
  - Show current prices for all departure cities
  - Track price changes
  - "Best flight combo" calculator
- [ ] **Package deal checker**
  - Costco Travel scraper
  - Apple Vacations scraper
  - Compare package vs separate booking
  - Show savings amount
- [ ] **Credit card optimizer**
  - Input which cards family has
  - Calculate best booking strategy
  - Show points earning potential
  - Portal bonus checker

### Week 6: Personalized Recommendations
- [ ] **AI-powered resort matcher**
  - Quiz: priorities, concerns, must-haves
  - Weighted scoring based on family needs
  - "Top 3 for your family" result
- [ ] **Smart alerts system**
  - Price drop notifications
  - "Book now" urgency indicators
  - Seasonal deal predictions
- [ ] **Deal comparison dashboard**
  - All current deals in one view
  - Filter by resort, discount type
  - Sort by savings amount
  - Expiration countdowns

---

## PHASE 4: Family Coordination (Weeks 7-8)

### Week 7: Collaborative Planning
- [ ] **Family accounts**
  - Create family group
  - Invite members via link/email
  - Role-based permissions
- [ ] **Enhanced voting system**
  - Ranked-choice voting
  - Vote on multiple categories
  - Anonymous option
  - Voting deadline with reminders
- [ ] **Shared notes & comments**
  - Comment on each resort
  - Pin important info
  - @ mention family members
  - Activity feed

### Week 8: Trip Management
- [ ] **Itinerary builder**
  - Day-by-day planner
  - Add excursions, restaurants
  - Time blocking
  - Print/export to PDF
- [ ] **Expense tracker**
  - Pre-trip budget
  - Split costs calculator
  - Who owes whom
  - Connect to Splitwise
- [ ] **Booking tracker**
  - Add confirmation numbers
  - Link to booking sites
  - Countdown to trip
  - Document storage (passports, insurance)

---

## Technical Stack Recommendation

```
Frontend:
- Current: Vanilla HTML/CSS/JS (keep for simplicity)
- Optional upgrade: Vue.js or React for complex features

Backend:
- Node.js + Express
- SQLite (simple) or PostgreSQL (scalable)
- Redis for caching

APIs & Services:
- SendGrid for email alerts
- Skyscanner/Google Flights for flight data
- Puppeteer for price scraping
- Mapbox for enhanced maps

Hosting:
- Vercel or Netlify (frontend)
- Railway or Render (backend)
- Supabase (database + auth)
```

---

## Priority Features (If Time Limited)

If you can only do a few things, prioritize:

1. **Price tracking + alerts** - Biggest value for finding deals
2. **Mobile responsive** - Usable on phones during family discussions
3. **Side-by-side comparison** - Makes decision-making easier
4. **Enhanced voting** - Family buy-in is critical

---

## Success Metrics

- [ ] Price data updates daily
- [ ] Mobile Lighthouse score > 90
- [ ] All family members can vote
- [ ] Email alerts working
- [ ] Comparison feature used
- [ ] Final booking decision made!

---

## Weekly Time Estimate

| Week | Focus | Hours |
|------|-------|-------|
| 1 | Backend setup | 10-15 |
| 2 | Price tracking | 10-15 |
| 3 | Mobile UI | 8-12 |
| 4 | Interactive features | 10-15 |
| 5 | Live prices | 12-15 |
| 6 | Recommendations | 10-12 |
| 7 | Family features | 10-12 |
| 8 | Trip management | 10-12 |

**Total: ~80-100 hours over 8 weeks (~10-12 hrs/week)**

---

## Quick Wins (Can Do This Week)

1. Add mobile viewport meta tag and basic responsive CSS
2. Create a simple Node.js script to scrape Costco Travel prices
3. Add email capture for "notify me" feature
4. Implement ranked-choice voting in current UI
5. Add sharing buttons (copy link, email, WhatsApp)

---

*Last updated: January 2025*
*Target booking deadline: February 2025*
*Trip dates: May 24-31, 2025*
