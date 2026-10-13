import {
  computePositionValue,
  computeTotalPortfolioValue,
  computeRawAllocationPct,
  computeAllocationsLargestRemainder,
  computePositionDayChangeDollar,
  computePortfolioDayChangeDollar,
  computePortfolioDayChangePct,
  getRiskSignalBand,
  isPositionFlagged,
  getFlaggedPositions,
  computeSectorAllocations,
  computeCompositeTailRiskScore,
  generateHedgeRecommendation,
  formatCurrency,
  formatPercent
} from '../src/utils/portfolioMath';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

function approxEqual(a: number, b: number, eps = 0.001): boolean {
  return Math.abs(a - b) < eps;
}

console.log('\n--- Running Portfolio Risk Unit Tests ---\n');

// 1. Position value & Total portfolio value
const seedHoldings = [
  { ticker: 'NVDA', name: 'NVIDIA Corporation', sector: 'Semiconductors', shares: 150, price: 118.5, prevClose: 116.8, riskScore: 78 },
  { ticker: 'TSM', name: 'Taiwan Semiconductor Mfg.', sector: 'Semiconductors', shares: 200, price: 142.0, prevClose: 139.0, riskScore: 88 },
  { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Technology', shares: 120, price: 210.3, prevClose: 207.5, riskScore: 64 },
  { ticker: 'XOM', name: 'Exxon Mobil Corporation', sector: 'Energy', shares: 180, price: 104.1, prevClose: 103.0, riskScore: 71 },
  { ticker: 'LMT', name: 'Lockheed Martin Corporation', sector: 'Defense', shares: 40, price: 452.0, prevClose: 449.0, riskScore: 35 }
];

const posValues = seedHoldings.map((h) => computePositionValue(h.shares, h.price));
assert(posValues[0] === 17775, 'NVDA position value is $17,775');
assert(posValues[1] === 28400, 'TSM position value is $28,400');
assert(posValues[2] === 25236, 'AAPL position value is $25,236');
assert(posValues[3] === 18738, 'XOM position value is $18,738');
assert(posValues[4] === 18080, 'LMT position value is $18,080');

const totalValue = computeTotalPortfolioValue(seedHoldings);
assert(totalValue === 108229, 'Total portfolio value reconciles to exactly $108,229');

// 2. Allocations with Largest Remainder Method sums to exactly 100.0%
const allocations = computeAllocationsLargestRemainder(posValues, 1);
const allocationSum = allocations.reduce((sum, a) => sum + a, 0);
assert(approxEqual(allocationSum, 100.0), `Allocations sum to exactly 100.0% (actual: ${allocationSum}%)`);

// Verify individual allocations match requirement ~ NVDA 16.4%, TSM 26.2%, AAPL 23.3%, XOM 17.3%, LMT 16.7%
assert(allocations[0] === 16.4, `NVDA allocation displays 16.4% (actual: ${allocations[0]}%)`);
assert(allocations[1] === 26.3 || allocations[1] === 26.2, `TSM allocation is ~26.2-26.3% (actual: ${allocations[1]}%)`);
assert(allocations[2] === 23.3, `AAPL allocation displays 23.3% (actual: ${allocations[2]}%)`);
assert(allocations[3] === 17.3, `XOM allocation displays 17.3% (actual: ${allocations[3]}%)`);
assert(allocations[4] === 16.7, `LMT allocation displays 16.7% (actual: ${allocations[4]}%)`);

// Test arbitrary uneven numbers sum to exactly 100.0%
const arbitraryValues = [123.45, 987.65, 432.10, 555.55, 777.77];
const arbitraryAllocations = computeAllocationsLargestRemainder(arbitraryValues, 1);
const arbitrarySum = Number(arbitraryAllocations.reduce((sum, a) => sum + a, 0).toFixed(1));
assert(arbitrarySum === 100.0, `Arbitrary values sum to exactly 100.0% (actual: ${arbitrarySum}%)`);

// 3. Day change $ and Day change % calculations
const dayChangeDollar = computePortfolioDayChangeDollar(seedHoldings);
assert(dayChangeDollar === 1509, `Day change dollar is +$1,509 (actual: $${dayChangeDollar})`);

const dayChangePct = computePortfolioDayChangePct(dayChangeDollar, totalValue);
assert(approxEqual(dayChangePct, 1.41, 0.05), `Day change pct is +1.4% (actual: ${dayChangePct.toFixed(2)}%)`);

// 4. Signal band mapping relative to tolerance
const tolerance = 55;
const bandFavorable = getRiskSignalBand(35, tolerance);
assert(bandFavorable.band === 'Favorable', 'Score 35 mapped to Favorable (<40)');

const bandNeutral = getRiskSignalBand(50, tolerance);
assert(bandNeutral.band === 'Neutral-Hold', 'Score 50 mapped to Neutral-Hold (40 to tolerance 55)');

const bandCaution = getRiskSignalBand(65, tolerance);
assert(bandCaution.band === 'Caution', 'Score 65 mapped to Caution (> tolerance to tolerance + 20)');

const bandHighRisk = getRiskSignalBand(80, tolerance);
assert(bandHighRisk.band === 'High-Risk', 'Score 80 mapped to High-Risk (> tolerance + 20 = 75)');

// 5. Flagged positions logic
const isNvdaFlagged = isPositionFlagged(78, tolerance);
assert(isNvdaFlagged === true, 'NVDA (score 78) is flagged when tolerance is 55');

const isLmtFlagged = isPositionFlagged(35, tolerance);
assert(isLmtFlagged === false, 'LMT (score 35) is not flagged when tolerance is 55');

const flaggedList = getFlaggedPositions(seedHoldings, tolerance);
assert(flaggedList.length === 4, `4 positions flagged when tolerance is 55 (NVDA, TSM, AAPL, XOM; actual: ${flaggedList.length})`);

const flaggedListHighTol = getFlaggedPositions(seedHoldings, 80);
assert(flaggedListHighTol.length === 1 && flaggedListHighTol[0].ticker === 'TSM', 'Only TSM flagged when tolerance is 80');

const flaggedListExtreme = getFlaggedPositions(seedHoldings, 95);
assert(flaggedListExtreme.length === 0, '0 positions flagged when tolerance is 95');

// 6. Composite Tail-Risk score clamping & concentration penalty
const holdingsWithAlloc = seedHoldings.map((h, i) => ({
  ...h,
  allocationPct: allocations[i],
  positionValue: posValues[i]
}));

const compositeResult = computeCompositeTailRiskScore(holdingsWithAlloc, tolerance);
assert(compositeResult.score >= 0 && compositeResult.score <= 100, `Composite score is clamped to 0-100 (actual: ${compositeResult.score})`);
assert(compositeResult.herfindahlIndex > 0, `Herfindahl Index computed (${compositeResult.herfindahlIndex})`);
assert(compositeResult.topSector.name === 'Semiconductors', `Top sector identified as Semiconductors (${compositeResult.topSector.allocationPct}%)`);
assert(compositeResult.concentrationPenalty > 0, `Concentration penalty applied (${compositeResult.concentrationPenalty} pts)`);

// Test extreme bounds clamp to 0 and 100
const extremeLow = computeCompositeTailRiskScore([{ riskScore: -50, allocationPct: 100, sector: 'A' }], tolerance);
assert(extremeLow.score === 0, 'Extreme negative clamped to 0');

const extremeHigh = computeCompositeTailRiskScore([{ riskScore: 150, allocationPct: 100, sector: 'A' }], tolerance);
assert(extremeHigh.score === 100, 'Extreme high clamped to 100');

// 7. Sector Allocations
const sectors = computeSectorAllocations(holdingsWithAlloc, totalValue);
assert(sectors[0].sector === 'Semiconductors', 'Largest sector is Semiconductors');
assert(sectors.reduce((sum, s) => sum + s.allocationPct, 0) === 100.0, 'Sector allocations sum to exactly 100.0%');

// 8. AI Recommended Hedging
const hedgeRec = generateHedgeRecommendation(holdingsWithAlloc, tolerance);
assert(hedgeRec !== null, 'Hedge recommendation generated');
assert(hedgeRec?.ticker === 'TSM', `TSM selected for hedge due to highest (riskScore * allocationPct) (actual: ${hedgeRec?.ticker})`);
assert(hedgeRec?.contractsNeeded === 2, `2 contracts needed for 200 shares (actual: ${hedgeRec?.contractsNeeded})`);
assert(hedgeRec?.notionalHedged === 28400, `Notional hedged is $28,400 (actual: $${hedgeRec?.notionalHedged})`);

// 9. Currency & Percent formatters
assert(formatCurrency(108229) === '$108,229', 'Currency format 108229 -> $108,229');
assert(formatPercent(1.41, 1, true) === '+1.4%', 'Percent format 1.41 -> +1.4%');

console.log('\n🎉 ALL UNIT TESTS PASSED SUCCESSFULLY!\n');
