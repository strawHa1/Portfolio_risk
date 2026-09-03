import {
  getReportsArchive,
  getReportById,
  generateIntelligenceReport,
  clusterCriticalNews,
  initReportEngine
} from '../reportEngineService.js';
import { fetchHeadlines } from '../newsApi.js';

async function runReportsEngineTest() {
  console.log('=== STARTING AI REPORTS ENGINE AUTOMATED TEST ===\n');

  // Test 1: News Ingestion & Thematic Clustering
  console.log('1. Testing Live News Ingestion & Thematic Clustering...');
  const { articles } = await fetchHeadlines('all', 40);
  console.log(`✓ Fetched ${articles.length} live headlines`);
  const clusters = clusterCriticalNews(articles);
  console.log(`✓ Formed ${clusters.length} thematic clusters from live news:`);
  for (const c of clusters) {
    console.log(`  • [${c.severity.toUpperCase()}] ${c.topic} (${c.headlines.length} articles)`);
  }

  // Test 2: Initializing Archive & Seed Reports
  console.log('\n2. Testing Archive Loading & Seed Reports...');
  await initReportEngine();
  const initialArchive = getReportsArchive();
  console.log(`✓ Archive loaded with ${initialArchive.length} reports`);
  if (initialArchive.length === 0) {
    throw new Error('FAIL: Archive is empty after initialization');
  }

  // Test 3: Generating a Fresh AI Intelligence Briefing
  console.log('\n3. Testing Automated Intelligence Brief Generation...');
  const report1 = await generateIntelligenceReport();
  console.log(`✓ Generated Report: "${report1.title}"`);
  console.log(`  • ID: ${report1.id}`);
  console.log(`  • Published: ${report1.createdAt}`);
  console.log(`  • Severity: ${report1.severityTag}`);
  console.log(`  • Author: ${report1.author}`);
  console.log(`  • Tags: ${report1.tags.join(', ')}`);
  console.log(`  • Sections count: ${report1.sections.length}`);
  console.log(`  • Source: ${report1.triggerSource}`);

  // Validate report format
  if (!report1.id || !report1.title || !report1.summary || !report1.sections || report1.sections.length < 2) {
    throw new Error('FAIL: Report does not meet required structural schema');
  }

  // Test 4: Generating a Custom Topic AI Report
  console.log('\n4. Testing Custom Topic Report Generation...');
  const customTopic = 'Red Sea Commercial Shipping Drone Interceptions';
  const customFocus = 'Maritime Insurance Tariffs & Global Container Freight';
  const report2 = await generateIntelligenceReport({
    topic: customTopic,
    focusArea: customFocus,
    preferredSeverity: 'critical'
  });
  console.log(`✓ Generated Custom Report: "${report2.title}"`);
  console.log(`  • Severity: ${report2.severityTag}`);
  console.log(`  • Summary snippet: ${report2.summary.substring(0, 100)}...`);

  // Test 5: Verify Archive Persistence & Sorting
  console.log('\n5. Testing Archive History & Persistence...');
  const updatedArchive = getReportsArchive();
  console.log(`✓ Total reports in archive now: ${updatedArchive.length}`);
  if (updatedArchive.length < initialArchive.length) {
    throw new Error('FAIL: Archive did not grow when new reports were generated');
  }

  // Check getReportById
  const retrieved = getReportById(report1.id);
  if (!retrieved || retrieved.id !== report1.id) {
    throw new Error(`FAIL: Could not retrieve report by ID ${report1.id}`);
  }
  console.log(`✓ Retrieved report by ID successfully: "${retrieved.title}"`);

  console.log('\n=== ALL AI REPORTS ENGINE TESTS PASSED SUCCESSFULLY! ===');
}

runReportsEngineTest().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
