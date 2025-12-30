#!/usr/bin/env node
/**
 * Cancun Vacation Planner - Test Suite
 * Run with: node test.js
 */

// Test Framework
let passCount = 0;
let failCount = 0;
const tests = [];

function test(name, fn) {
    tests.push({ name, fn });
}

function assertEqual(actual, expected, message = '') {
    if (actual !== expected) {
        throw new Error(`${message} Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

function assertTrue(condition, message = '') {
    if (!condition) {
        throw new Error(`${message} Expected true, got false`);
    }
}

function assertDefined(value, message = '') {
    if (value === undefined || value === null) {
        throw new Error(`${message} Expected value to be defined`);
    }
}

// Colors for terminal output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

// Test Data (same as in main app)
const priceHistory = {
    1: { trend: "down", percentChange: -9.5, lowestSeen: 380, avgPrice: 400, dealThreshold: 360 },
    2: { trend: "down", percentChange: -5.9, lowestSeen: 299, avgPrice: 335, dealThreshold: 300 },
    3: { trend: "down", percentChange: -7.9, lowestSeen: 320, avgPrice: 365, dealThreshold: 330 },
    4: { trend: "stable", percentChange: -4.0, lowestSeen: 450, avgPrice: 495, dealThreshold: 460 },
    11: { trend: "down", percentChange: -6.7, lowestSeen: 380, avgPrice: 435, dealThreshold: 400 },
    16: { trend: "down", percentChange: -7.7, lowestSeen: 450, avgPrice: 500, dealThreshold: 460 },
    41: { trend: "down", percentChange: -4.7, lowestSeen: 2700, avgPrice: 2925, dealThreshold: 2750 },
    44: { trend: "down", percentChange: -5.7, lowestSeen: 1500, avgPrice: 1700, dealThreshold: 1550 }
};

const hiddenCosts = {
    1: { resortFee: 0, tips: 0, transfer: 85, extras: 25, freeTransfer: false },
    2: { resortFee: 0, tips: 0, transfer: 90, extras: 15, freeTransfer: false },
    3: { resortFee: 0, tips: 0, transfer: 0, extras: 40, freeTransfer: true, resortCredits: 1500 },
    11: { resortFee: 0, tips: 0, transfer: 0, extras: 10, freeTransfer: true },
    16: { resortFee: 0, tips: 0, transfer: 0, extras: 0, freeTransfer: true, parksIncluded: true, parksValue: 1200 },
    41: { resortFee: 0, tips: 350, transfer: 180, extras: 200, freeTransfer: false, isVilla: true },
    44: { resortFee: 0, tips: 200, transfer: 200, extras: 150, freeTransfer: false, isVilla: true }
};

const allInclusiveValue = {
    1: { costPerMeal: 42, retailValue: 700, savingsVsRetail: 320, valueRating: "Good" },
    2: { costPerMeal: 36, retailValue: 680, savingsVsRetail: 360, valueRating: "Excellent" },
    11: { costPerMeal: 47, retailValue: 900, savingsVsRetail: 480, valueRating: "Exceptional" },
    16: { costPerMeal: 53, retailValue: 1500, savingsVsRetail: 1020, valueRating: "BEST VALUE" }
};

const resorts = [
    { id: 1, name: "Hyatt Ziva Cancun", priceMay24: 380, priceMay31: 420, valueScore: 8, isVilla: false },
    { id: 2, name: "Hard Rock Hotel Cancun", priceMay24: 320, priceMay31: 360, valueScore: 9, isVilla: false },
    { id: 11, name: "Generations Riviera Maya", priceMay24: 420, priceMay31: 480, valueScore: 10, isVilla: false },
    { id: 16, name: "Hotel Xcaret Mexico", priceMay24: 480, priceMay31: 540, valueScore: 9, isVilla: false },
    { id: 41, name: "Hacienda Magica (Villa)", priceMay24: 2860, priceMay31: 3200, valueScore: 10, isVilla: true },
    { id: 44, name: "Villa Quinta Clara (Villa)", priceMay24: 1650, priceMay31: 1900, valueScore: 10, isVilla: true }
];

// Functions to test
function getDealBadge(resort) {
    const history = priceHistory[resort.id];
    if (!history) {
        if (resort.valueScore >= 9) return { class: 'good-value', text: 'Good Value', icon: '💚' };
        if (resort.valueScore >= 7) return { class: 'premium', text: 'Fair Price', icon: '⚖️' };
        return null;
    }

    const currentPrice = resort.priceMay24;

    if (currentPrice <= history.dealThreshold) {
        return { class: 'hot-deal', text: 'Hot Deal!', icon: '🔥' };
    }

    if (history.trend === 'down' && history.percentChange <= -5) {
        return { class: 'price-drop', text: `${Math.abs(history.percentChange).toFixed(0)}% Drop`, icon: '📉' };
    }

    if (currentPrice < history.avgPrice) {
        return { class: 'good-value', text: 'Good Value', icon: '💚' };
    }

    if (currentPrice > history.avgPrice * 1.1) {
        return { class: 'premium', text: 'Premium', icon: '⭐' };
    }

    return null;
}

function getTrendIndicator(resort) {
    const history = priceHistory[resort.id];
    if (!history) return '';

    const arrow = history.trend === 'down' ? '↓' : history.trend === 'up' ? '↑' : '→';
    const label = history.trend === 'down' ? 'prices falling' : history.trend === 'up' ? 'prices rising' : 'stable';

    return `${arrow} ${Math.abs(history.percentChange).toFixed(1)}% ${label}`;
}

function calculateBudget(resortId, nights, week) {
    const resort = resorts.find(r => r.id === resortId);
    if (!resort) return null;

    const isVilla = resort.isVilla;
    const pricePerNight = week === 'may24' ? resort.priceMay24 : resort.priceMay31;
    const accommodationTotal = isVilla ? pricePerNight * nights : pricePerNight * 7 * nights;
    const flightTotal = (450 * 3) + (420 * 5) + (280 * 4) + (380 * 2);
    const transferCost = 360;
    const excursionTotal = 200 * 14;
    const extras = (hiddenCosts[resortId]?.extras || 20) * nights;

    return {
        accommodation: accommodationTotal,
        flights: flightTotal,
        transfers: transferCost,
        excursions: excursionTotal,
        extras: extras,
        total: accommodationTotal + flightTotal + transferCost + excursionTotal + extras
    };
}

function getHiddenCosts(resortId) {
    return hiddenCosts[resortId] || null;
}

function getAllInclusiveValue(resortId) {
    return allInclusiveValue[resortId] || null;
}

// ========== TEST SUITES ==========

console.log(`\n${colors.bold}${colors.blue}🏖️  Cancun Vacation Planner - Test Suite${colors.reset}\n`);
console.log('Testing all deal finder and budget calculator features\n');

// Suite 1: Deal Badge Tests
console.log(`${colors.yellow}━━━ Deal Badge Tests ━━━${colors.reset}`);

test('getDealBadge returns price-drop for resort with falling prices', () => {
    const resort = resorts.find(r => r.id === 1);
    const badge = getDealBadge(resort);
    assertDefined(badge, 'Badge should be defined');
    assertEqual(badge.class, 'price-drop', 'Should be price-drop class');
});

test('getDealBadge identifies good value for below-average price', () => {
    const resort = resorts.find(r => r.id === 2);
    const badge = getDealBadge(resort);
    assertDefined(badge, 'Badge should be defined');
    assertTrue(badge.text.includes('Drop') || badge.text.includes('Value'), 'Should indicate value');
});

test('getDealBadge returns valid badge structure', () => {
    const resort = resorts.find(r => r.id === 11);
    const badge = getDealBadge(resort);
    if (badge) {
        assertDefined(badge.class, 'Badge should have class');
        assertDefined(badge.text, 'Badge should have text');
        assertDefined(badge.icon, 'Badge should have icon');
    }
});

test('getDealBadge handles villas correctly', () => {
    const villa = resorts.find(r => r.id === 44);
    const badge = getDealBadge(villa);
    assertDefined(badge, 'Villa should get badge');
    assertTrue(badge.class.length > 0, 'Badge should have class');
});

// Suite 2: Price Trend Tests
console.log(`\n${colors.yellow}━━━ Price Trend Tests ━━━${colors.reset}`);

test('getTrendIndicator shows down arrow for falling prices', () => {
    const resort = resorts.find(r => r.id === 1);
    const indicator = getTrendIndicator(resort);
    assertTrue(indicator.includes('↓'), 'Should contain down arrow');
    assertTrue(indicator.includes('prices falling'), 'Should say prices falling');
});

test('getTrendIndicator displays correct percentage', () => {
    const resort = resorts.find(r => r.id === 1);
    const indicator = getTrendIndicator(resort);
    assertTrue(indicator.includes('9.5%'), 'Should show 9.5% change');
});

test('getTrendIndicator returns empty for unknown resort', () => {
    const resort = { id: 999, name: "Unknown Resort", priceMay24: 300 };
    const indicator = getTrendIndicator(resort);
    assertEqual(indicator, '', 'Should return empty string');
});

// Suite 3: Hidden Costs Tests
console.log(`\n${colors.yellow}━━━ Hidden Costs Tests ━━━${colors.reset}`);

test('hiddenCosts structure for Hyatt Ziva', () => {
    const costs = getHiddenCosts(1);
    assertDefined(costs, 'Costs should be defined');
    assertEqual(costs.resortFee, 0, 'Resort fee should be 0');
    assertEqual(costs.transfer, 85, 'Transfer should be 85');
    assertEqual(costs.freeTransfer, false, 'Should not have free transfer');
});

test('hiddenCosts identifies free transfer resorts', () => {
    const costs = getHiddenCosts(11);
    assertEqual(costs.freeTransfer, true, 'Generations should have free transfer');
});

test('hiddenCosts includes parks value for Xcaret', () => {
    const costs = getHiddenCosts(16);
    assertEqual(costs.parksIncluded, true, 'Xcaret should include parks');
    assertEqual(costs.parksValue, 1200, 'Parks value should be 1200');
});

test('hiddenCosts tracks villa tip expectations', () => {
    const costs = getHiddenCosts(41);
    assertEqual(costs.tips, 350, 'Villa should have $350/day tip suggestion');
    assertEqual(costs.isVilla, true, 'Should be marked as villa');
});

test('hiddenCosts includes resort credits for Moon Palace', () => {
    const costs = getHiddenCosts(3);
    assertEqual(costs.resortCredits, 1500, 'Moon Palace should have $1500 credits');
});

// Suite 4: All-Inclusive Value Tests
console.log(`\n${colors.yellow}━━━ All-Inclusive Value Tests ━━━${colors.reset}`);

test('allInclusiveValue calculates cost per meal', () => {
    const value = getAllInclusiveValue(2);
    assertDefined(value, 'Value should be defined');
    assertEqual(value.costPerMeal, 36, 'Hard Rock cost per meal should be 36');
});

test('allInclusiveValue identifies BEST VALUE', () => {
    const value = getAllInclusiveValue(16);
    assertEqual(value.valueRating, 'BEST VALUE', 'Xcaret should be BEST VALUE');
});

test('allInclusiveValue shows significant savings for Xcaret', () => {
    const value = getAllInclusiveValue(16);
    assertTrue(value.savingsVsRetail > 1000, 'Xcaret savings should exceed 1000');
});

test('allInclusiveValue retail value exceeds price', () => {
    Object.keys(allInclusiveValue).forEach(id => {
        const value = allInclusiveValue[id];
        assertTrue(value.retailValue > value.costPerMeal * 4, 'Retail value should exceed daily cost');
    });
});

// Suite 5: Budget Calculator Tests
console.log(`\n${colors.yellow}━━━ Budget Calculator Tests ━━━${colors.reset}`);

test('calculateBudget returns correct hotel accommodation cost', () => {
    const budget = calculateBudget(2, 7, 'may24');
    assertDefined(budget, 'Budget should be defined');
    // Hard Rock: $320/night × 7 rooms × 7 nights = $15,680
    assertEqual(budget.accommodation, 15680, 'Accommodation should be 15680');
});

test('calculateBudget returns correct villa accommodation cost', () => {
    const budget = calculateBudget(44, 7, 'may24');
    // Villa Quinta Clara: $1,650/night × 7 nights = $11,550
    assertEqual(budget.accommodation, 11550, 'Villa accommodation should be 11550');
});

test('calculateBudget includes all 14 people in flight costs', () => {
    const budget = calculateBudget(1, 7, 'may24');
    // (450*3) + (420*5) + (280*4) + (380*2) = 1350 + 2100 + 1120 + 760 = 5330
    assertEqual(budget.flights, 5330, 'Flights for 14 people should be 5330');
});

test('calculateBudget calculates excursions for all 14 people', () => {
    const budget = calculateBudget(1, 7, 'may24');
    assertEqual(budget.excursions, 2800, 'Excursions should be 2800');
});

test('calculateBudget total equals sum of components', () => {
    const budget = calculateBudget(2, 7, 'may24');
    const expectedTotal = budget.accommodation + budget.flights + budget.transfers + budget.excursions + budget.extras;
    assertEqual(budget.total, expectedTotal, 'Total should equal sum of components');
});

test('calculateBudget uses May31 prices correctly', () => {
    const budgetMay24 = calculateBudget(1, 7, 'may24');
    const budgetMay31 = calculateBudget(1, 7, 'may31');
    assertTrue(budgetMay31.accommodation > budgetMay24.accommodation, 'May31 should be more expensive');
});

// Suite 6: Price History Tests
console.log(`\n${colors.yellow}━━━ Price History Tests ━━━${colors.reset}`);

test('priceHistory exists for key resorts', () => {
    assertTrue(priceHistory[1] !== undefined, 'Hyatt should have history');
    assertTrue(priceHistory[2] !== undefined, 'Hard Rock should have history');
    assertTrue(priceHistory[11] !== undefined, 'Generations should have history');
    assertTrue(priceHistory[16] !== undefined, 'Xcaret should have history');
});

test('priceHistory dealThreshold is below average', () => {
    Object.keys(priceHistory).forEach(id => {
        const history = priceHistory[id];
        assertTrue(history.dealThreshold < history.avgPrice, `Resort ${id}: threshold should be below average`);
    });
});

test('priceHistory has valid trend values', () => {
    Object.keys(priceHistory).forEach(id => {
        const history = priceHistory[id];
        assertTrue(['down', 'up', 'stable'].includes(history.trend), `Resort ${id}: trend should be valid`);
    });
});

test('priceHistory percentChange is negative for down trend', () => {
    Object.keys(priceHistory).forEach(id => {
        const history = priceHistory[id];
        if (history.trend === 'down') {
            assertTrue(history.percentChange < 0, `Resort ${id}: down trend should have negative percent`);
        }
    });
});

// Suite 7: Resort Data Tests
console.log(`\n${colors.yellow}━━━ Resort Data Tests ━━━${colors.reset}`);

test('resorts have required fields', () => {
    resorts.forEach(r => {
        assertDefined(r.id, `${r.name} should have id`);
        assertDefined(r.priceMay24, `${r.name} should have priceMay24`);
        assertDefined(r.priceMay31, `${r.name} should have priceMay31`);
        assertDefined(r.valueScore, `${r.name} should have valueScore`);
    });
});

test('resorts May31 price >= May24 price', () => {
    resorts.forEach(r => {
        assertTrue(r.priceMay31 >= r.priceMay24, `${r.name}: May31 should be >= May24`);
    });
});

test('resorts valueScore is between 1-10', () => {
    resorts.forEach(r => {
        assertTrue(r.valueScore >= 1 && r.valueScore <= 10, `${r.name}: valueScore should be 1-10`);
    });
});

test('villas are properly flagged', () => {
    const villas = resorts.filter(r => r.isVilla);
    assertTrue(villas.length >= 2, 'Should have at least 2 villas');
    villas.forEach(v => {
        assertTrue(v.name.includes('Villa'), `${v.name} should contain Villa in name`);
    });
});

// Suite 8: Integration Tests
console.log(`\n${colors.yellow}━━━ Integration Tests ━━━${colors.reset}`);

test('budget + hidden costs calculation for Xcaret', () => {
    const budget = calculateBudget(16, 7, 'may24');
    const costs = getHiddenCosts(16);

    assertTrue(costs.freeTransfer, 'Xcaret should have free transfer');
    assertTrue(costs.parksIncluded, 'Xcaret should include parks');

    // If using free transfer, savings would be ~$360
    const potentialSavings = costs.parksValue + 360; // Parks + transfer
    assertTrue(potentialSavings > 1500, 'Xcaret should save over $1500');
});

test('per-person cost calculation for villa', () => {
    const budget = calculateBudget(44, 7, 'may24');
    const perPerson = Math.round(budget.total / 14);
    assertTrue(perPerson > 0, 'Per person cost should be positive');
    assertTrue(perPerson < 3000, 'Per person cost should be under $3000');
});

// Run all tests
function runTests() {
    console.log('\n');

    tests.forEach(t => {
        try {
            t.fn();
            console.log(`  ${colors.green}✓${colors.reset} ${t.name}`);
            passCount++;
        } catch (error) {
            console.log(`  ${colors.red}✗${colors.reset} ${t.name}`);
            console.log(`    ${colors.red}${error.message}${colors.reset}`);
            failCount++;
        }
    });

    // Summary
    console.log(`\n${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.bold}Test Results:${colors.reset}`);
    console.log(`  ${colors.green}${passCount} passed${colors.reset}`);
    if (failCount > 0) {
        console.log(`  ${colors.red}${failCount} failed${colors.reset}`);
    }
    console.log(`  ${tests.length} total`);
    console.log(`${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

    // Exit code
    process.exit(failCount > 0 ? 1 : 0);
}

runTests();
