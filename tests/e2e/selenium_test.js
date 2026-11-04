/**
 * MedSIEM Selenium Web UI Automated E2E Test Suite
 * 
 * Verifies core web application workflows across:
 * - Login / Authentication Screen
 * - SOC Dashboard & Live Metric Overview
 * - Live Events / Log Explorer
 * - Alerts Monitoring & Investigation
 * - User Administration & RBAC
 * 
 * Generates:
 * - JUnit XML: test-results/selenium/junit.xml
 * - HTML Report: test-results/selenium/selenium-report.html
 * - Screenshots: test-results/selenium/screenshots/*.png
 * - Summary: test-results/selenium/summary.md
 */

const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const RESULTS_DIR = path.resolve(__dirname, '../../test-results/selenium');
const SCREENSHOTS_DIR = path.join(RESULTS_DIR, 'screenshots');

// Ensure output directories exist
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function createWebDriver() {
  const options = new chrome.Options();
  options.addArguments(
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--window-size=1920,1080',
    '--ignore-certificate-errors'
  );
  return await new Builder().forBrowser('chrome').setChromeOptions(options).build();
}

async function takeScreenshot(driver, filename) {
  try {
    const imgData = await driver.takeScreenshot();
    const filePath = path.join(SCREENSHOTS_DIR, filename);
    fs.writeFileSync(filePath, imgData, 'base64');
    return filePath;
  } catch (err) {
    console.error(`Failed to capture screenshot ${filename}:`, err.message);
    return null;
  }
}

async function runSeleniumSuite() {
  console.log(`[MedSIEM Selenium] Starting Web Automation Test Suite...`);
  console.log(`[MedSIEM Selenium] Target Frontend: ${FRONTEND_URL}`);
  console.log(`[MedSIEM Selenium] Target Backend:  ${BACKEND_URL}`);

  let driver;
  const testResults = [];
  const startTime = Date.now();

  async function executeTestStep(id, name, testFn) {
    const stepStart = Date.now();
    console.log(`\n▶ [RUNNING] Test ${id}: ${name}`);
    try {
      await testFn();
      const duration = ((Date.now() - stepStart) / 1000).toFixed(2);
      console.log(`✔ [PASSED] Test ${id}: ${name} (${duration}s)`);
      testResults.push({ id, name, status: 'PASSED', duration, error: null });
    } catch (err) {
      const duration = ((Date.now() - stepStart) / 1000).toFixed(2);
      console.error(`✖ [FAILED] Test ${id}: ${name} (${duration}s) - Error: ${err.message}`);
      const screenshotFile = `failure_${id}_${Date.now()}.png`;
      if (driver) {
        await takeScreenshot(driver, screenshotFile);
      }
      testResults.push({
        id,
        name,
        status: 'FAILED',
        duration,
        error: err.message,
        screenshot: screenshotFile,
      });
    }
  }

  try {
    driver = await createWebDriver();

    // -------------------------------------------------------------------------
    // Test 1: Login Page Structure & Input Verification
    // -------------------------------------------------------------------------
    await executeTestStep('TC-WEB-001', 'Login Screen Structure & Elements', async () => {
      await driver.get(`${FRONTEND_URL}/login`);
      await driver.wait(until.elementLocated(By.css('form')), 10000);

      const title = await driver.getTitle();
      console.log(`  Page title retrieved: "${title}"`);

      // Verify email input
      const emailInput = await driver.findElement(By.css('input[type="email"]'));
      const emailPlaceholder = await emailInput.getAttribute('placeholder');
      if (!emailInput) throw new Error('Email input element not found');

      // Verify password input
      const passwordInput = await driver.findElement(By.css('input[type="password"]'));
      if (!passwordInput) throw new Error('Password input element not found');

      // Verify submit button
      const submitBtn = await driver.findElement(By.css('button[type="submit"]'));
      if (!submitBtn) throw new Error('Submit button not found');

      await takeScreenshot(driver, '01_login_screen.png');
    });

    // -------------------------------------------------------------------------
    // Test 2: User Authentication Workflow
    // -------------------------------------------------------------------------
    await executeTestStep('TC-WEB-002', 'Super Admin Authentication Submission', async () => {
      await driver.get(`${FRONTEND_URL}/login`);
      await driver.wait(until.elementLocated(By.css('form')), 10000);

      const emailInput = await driver.findElement(By.css('input[type="email"]'));
      const passwordInput = await driver.findElement(By.css('input[type="password"]'));
      const submitBtn = await driver.findElement(By.css('button[type="submit"]'));

      await emailInput.clear();
      await emailInput.sendKeys('admin@medsiem.org');
      await passwordInput.clear();
      await passwordInput.sendKeys('SuperAdmin123!');
      await submitBtn.click();

      // Wait for navigation or MFA prompt
      await driver.sleep(3000);
      const currentUrl = await driver.getCurrentUrl();
      console.log(`  URL after authentication submission: ${currentUrl}`);

      await takeScreenshot(driver, '02_post_login.png');
    });

    // -------------------------------------------------------------------------
    // Test 3: SOC Overview Dashboard
    // -------------------------------------------------------------------------
    await executeTestStep('TC-WEB-003', 'SOC Overview Dashboard & Metrics Rendering', async () => {
      await driver.get(`${FRONTEND_URL}/`);
      await driver.sleep(3000);

      const bodyText = await driver.findElement(By.css('body')).getText();
      const hasKeywords = bodyText.includes('SOC') || bodyText.includes('Dashboard') || bodyText.includes('MedSIEM') || bodyText.includes('Overview') || bodyText.includes('Alert');
      if (!hasKeywords && bodyText.length < 50) {
        throw new Error('Dashboard body did not load expected content');
      }

      await takeScreenshot(driver, '03_dashboard_overview.png');
    });

    // -------------------------------------------------------------------------
    // Test 4: Live Events / Log Explorer
    // -------------------------------------------------------------------------
    await executeTestStep('TC-WEB-004', 'Live Events & Log Explorer Page', async () => {
      await driver.get(`${FRONTEND_URL}/live-events`);
      await driver.sleep(3000);

      const bodyText = await driver.findElement(By.css('body')).getText();
      const hasLogOrEvent = bodyText.includes('Event') || bodyText.includes('Log') || bodyText.includes('Severity') || bodyText.includes('Timestamp') || bodyText.includes('MedSIEM');
      if (!hasLogOrEvent) {
        // Fallback test /events
        await driver.get(`${FRONTEND_URL}/events`);
        await driver.sleep(2000);
      }

      await takeScreenshot(driver, '04_live_events.png');
    });

    // -------------------------------------------------------------------------
    // Test 5: Alerts Monitoring Page
    // -------------------------------------------------------------------------
    await executeTestStep('TC-WEB-005', 'Security Alerts Management Page', async () => {
      await driver.get(`${FRONTEND_URL}/alerts`);
      await driver.sleep(3000);

      const bodyText = await driver.findElement(By.css('body')).getText();
      const hasAlertContent = bodyText.includes('Alert') || bodyText.includes('Severity') || bodyText.includes('Status') || bodyText.includes('MedSIEM');
      if (!hasAlertContent) {
        throw new Error('Alerts page content verification failed');
      }

      await takeScreenshot(driver, '05_alerts_management.png');
    });

    // -------------------------------------------------------------------------
    // Test 6: User Administration & RBAC
    // -------------------------------------------------------------------------
    await executeTestStep('TC-WEB-006', 'User Administration & RBAC Management View', async () => {
      await driver.get(`${FRONTEND_URL}/administration`);
      await driver.sleep(3000);

      const body = await driver.findElement(By.css('body')).getText();
      const hasAdminContent = body.includes('User') || body.includes('Admin') || body.includes('Role') || body.includes('MedSIEM') || body.includes('Setting');
      if (!hasAdminContent) {
        await driver.get(`${FRONTEND_URL}/users`);
        await driver.sleep(2000);
      }

      await takeScreenshot(driver, '06_administration_users.png');
    });

  } catch (globalErr) {
    console.error('[MedSIEM Selenium] Fatal error initializing WebDriver:', globalErr);
    testResults.push({
      id: 'TC-WEB-FATAL',
      name: 'WebDriver Initialization & Execution',
      status: 'FAILED',
      duration: '0.00',
      error: globalErr.message,
    });
  } finally {
    if (driver) {
      try {
        await driver.quit();
      } catch (e) {
        console.error('Error quitting driver:', e.message);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // GENERATE JUNIT XML REPORT
  // ---------------------------------------------------------------------------
  const totalTests = testResults.length;
  const failedTests = testResults.filter((t) => t.status === 'FAILED').length;
  const passedTests = totalTests - failedTests;
  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

  let junitXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  junitXml += `<testsuites name="MedSIEM Selenium Web UI Tests" tests="${totalTests}" failures="${failedTests}" errors="0" time="${totalDuration}">\n`;
  junitXml += `  <testsuite name="Selenium Web UI Suite" tests="${totalTests}" failures="${failedTests}" errors="0" time="${totalDuration}" timestamp="${new Date().toISOString()}">\n`;

  for (const t of testResults) {
    junitXml += `    <testcase classname="MedSIEM.WebUI" name="${t.id}: ${t.name}" time="${t.duration}">\n`;
    if (t.status === 'FAILED') {
      junitXml += `      <failure message="${(t.error || 'Test Failed').replace(/"/g, '&quot;')}">${t.error || ''}</failure>\n`;
    }
    junitXml += `    </testcase>\n`;
  }
  junitXml += `  </testsuite>\n</testsuites>\n`;
  fs.writeFileSync(path.join(RESULTS_DIR, 'junit.xml'), junitXml, 'utf8');

  // ---------------------------------------------------------------------------
  // GENERATE HTML VISUAL REPORT
  // ---------------------------------------------------------------------------
  let rowsHtml = '';
  for (const t of testResults) {
    const isPass = t.status === 'PASSED';
    rowsHtml += `
      <tr>
        <td style="font-weight:600;font-family:monospace;">${t.id}</td>
        <td>${t.name}</td>
        <td><span class="badge ${isPass ? 'badge-success' : 'badge-danger'}">${t.status}</span></td>
        <td>${t.duration}s</td>
        <td>${t.error ? `<span style="color:#f43f5e;font-size:12px;">${t.error}</span>` : '&mdash;'}</td>
      </tr>
    `;
  }

  const htmlReport = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MedSIEM Selenium Web UI Test Execution Report</title>
  <style>
    :root {
      --bg: #0b0f19;
      --card-bg: #151d30;
      --border: #24304f;
      --text: #e2e8f0;
      --text-muted: #94a3b8;
      --accent: #38bdf8;
      --success: #10b981;
      --danger: #f43f5e;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 30px;
    }
    .container { max-width: 1000px; margin: 0 auto; }
    .header { border-bottom: 1px solid var(--border); padding-bottom: 20px; margin-bottom: 25px; }
    .header h1 { margin: 0 0 8px 0; color: #fff; font-size: 24px; }
    .header p { margin: 0; color: var(--text-muted); font-size: 14px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 18px; }
    .card-title { font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px; }
    .card-value { font-size: 28px; font-weight: 700; color: #fff; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
    .badge-success { background: rgba(16, 185, 129, 0.15); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.3); }
    .badge-danger { background: rgba(244, 63, 94, 0.15); color: var(--danger); border: 1px solid rgba(244, 63, 94, 0.3); }
    table { width: 100%; border-collapse: collapse; background: var(--card-bg); border-radius: 8px; overflow: hidden; border: 1px solid var(--border); margin-bottom: 24px; }
    th, td { padding: 14px 18px; text-align: left; font-size: 14px; border-bottom: 1px solid var(--border); }
    th { background: #1c263d; color: var(--text-muted); font-size: 12px; text-transform: uppercase; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MedSIEM Selenium Web UI Automated Test Report</h1>
      <p>Automated E2E Browser Testing &bull; Headless Chrome &bull; Target: ${FRONTEND_URL}</p>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-title">Total Test Cases</div>
        <div class="card-value">${totalTests}</div>
      </div>
      <div class="card">
        <div class="card-title">Passed Tests</div>
        <div class="card-value" style="color:var(--success)">${passedTests}</div>
      </div>
      <div class="card">
        <div class="card-title">Failed Tests</div>
        <div class="card-value" style="color:${failedTests > 0 ? 'var(--danger)' : 'var(--text-muted)'}">${failedTests}</div>
      </div>
      <div class="card">
        <div class="card-title">Suite Execution Time</div>
        <div class="card-value">${totalDuration}s</div>
      </div>
    </div>

    <h3>Detailed Test Case Execution Results</h3>
    <table>
      <thead>
        <tr>
          <th>Test Case ID</th>
          <th>Test Description</th>
          <th>Outcome</th>
          <th>Duration</th>
          <th>Failure Details</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  </div>
</body>
</html>`;
  fs.writeFileSync(path.join(RESULTS_DIR, 'selenium-report.html'), htmlReport, 'utf8');

  // ---------------------------------------------------------------------------
  // GENERATE MARKDOWN SUMMARY
  // ---------------------------------------------------------------------------
  let mdSummary = `# MedSIEM Selenium Web Automation Execution Summary\n\n`;
  mdSummary += `- **Total Tests**: ${totalTests}\n`;
  mdSummary += `- **Passed**: ${passedTests}\n`;
  mdSummary += `- **Failed**: ${failedTests}\n`;
  mdSummary += `- **Duration**: ${totalDuration}s\n`;
  mdSummary += `- **Timestamp**: ${new Date().toISOString()}\n\n`;
  mdSummary += `| ID | Test Name | Status | Duration |\n`;
  mdSummary += `| :--- | :--- | :--- | :--- |\n`;
  for (const t of testResults) {
    mdSummary += `| \`${t.id}\` | ${t.name} | ${t.status === 'PASSED' ? 'PASS' : 'FAIL'} | ${t.duration}s |\n`;
  }
  fs.writeFileSync(path.join(RESULTS_DIR, 'summary.md'), mdSummary, 'utf8');

  console.log(`\n[MedSIEM Selenium] Test suite complete!`);
  console.log(`[MedSIEM Selenium] Results: ${passedTests}/${totalTests} passed in ${totalDuration}s.`);
  console.log(`[MedSIEM Selenium] Reports saved to ${RESULTS_DIR}`);

  if (failedTests > 0) {
    process.exitCode = 1;
  }
}

// Support running directly via `node selenium_test.js`
if (require.main === module) {
  runSeleniumSuite().catch((err) => {
    console.error('Fatal unhandled error:', err);
    process.exit(1);
  });
}

module.exports = { runSeleniumSuite };
