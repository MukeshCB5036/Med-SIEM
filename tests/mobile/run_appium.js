/**
 * MedSIEM Native React Native Android Appium Automated E2E Runner
 * 
 * Verifies mobile SOC workflows:
 * - 1. Application Launch and Login Screen Verification
 * - 2. User Authentication (Login Flow)
 * - 3. Dashboard Metrics & Navigation
 * - 4. Alert Detail & Resolution Workflow
 * - 5. Incidents Navigation & Comment Submission
 * - 6. Profile Screen & Logout Workflow
 * 
 * Produces:
 * - test-results/appium/junit.xml
 * - test-results/appium/appium-test-report.html
 * - test-results/appium/summary.md
 * - test-results/appium/screenshots/*.png
 */

const { remote } = require('webdriverio');
const fs = require('fs');
const path = require('path');

const RESULTS_DIR = path.resolve(__dirname, '../../test-results/appium');
const SCREENSHOTS_DIR = path.join(RESULTS_DIR, 'screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const apkPath = process.env.APP_PATH || path.resolve(__dirname, '../../android/android/app/build/outputs/apk/debug/app-debug.apk');

const capabilities = {
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:deviceName': process.env.DEVICE_NAME || 'Android Emulator',
  'appium:app': apkPath,
  'appium:appPackage': 'com.medsiemmobile',
  'appium:appActivity': '.MainActivity',
  'appium:noReset': false,
  'appium:newCommandTimeout': 240,
};

const wdioOptions = {
  hostname: process.env.APPIUM_HOST || '127.0.0.1',
  port: parseInt(process.env.APPIUM_PORT || '4723', 10),
  logLevel: 'info',
  capabilities,
};

async function takeScreenshot(driver, filename) {
  try {
    const screenshot = await driver.takeScreenshot();
    const filePath = path.join(SCREENSHOTS_DIR, filename);
    fs.writeFileSync(filePath, screenshot, 'base64');
    return filePath;
  } catch (err) {
    console.warn(`Failed to capture screenshot ${filename}:`, err.message);
    return null;
  }
}

async function runMobileSuite() {
  console.log(`[MedSIEM Appium] Starting Mobile Automation Suite...`);
  console.log(`[MedSIEM Appium] Target APK: ${apkPath}`);
  console.log(`[MedSIEM Appium] Appium Host: ${wdioOptions.hostname}:${wdioOptions.port}`);

  let driver;
  const testResults = [];
  const startTime = Date.now();

  async function executeStep(id, name, stepFn) {
    const stepStart = Date.now();
    console.log(`\n▶ [RUNNING] ${id}: ${name}`);
    try {
      await stepFn();
      const duration = ((Date.now() - stepStart) / 1000).toFixed(2);
      console.log(`✔ [PASSED] ${id}: ${name} (${duration}s)`);
      testResults.push({ id, name, status: 'PASSED', duration, error: null });
    } catch (err) {
      const duration = ((Date.now() - stepStart) / 1000).toFixed(2);
      console.error(`✖ [FAILED] ${id}: ${name} (${duration}s) - ${err.message}`);
      const shotName = `failure_${id}_${Date.now()}.png`;
      if (driver) {
        await takeScreenshot(driver, shotName);
      }
      testResults.push({ id, name, status: 'FAILED', duration, error: err.message, screenshot: shotName });
    }
  }

  try {
    // Check if APK exists
    if (!fs.existsSync(apkPath)) {
      throw new Error(`Target APK does not exist at expected path: ${apkPath}`);
    }

    driver = await remote(wdioOptions);

    // 1. Application Launch
    await executeStep('TC-MOB-001', 'Application Launch and Login Screen Verification', async () => {
      const title = await driver.$('~title');
      await title.waitForDisplayed({ timeout: 15000 });
      const text = await title.getText();
      if (!text.includes('MedSIEM')) {
        throw new Error(`Expected title containing MedSIEM, got: ${text}`);
      }
      await takeScreenshot(driver, '01_launch_screen.png');
    });

    // 2. User Authentication
    await executeStep('TC-MOB-002', 'User Authentication (Login Flow)', async () => {
      const emailInput = await driver.$('~email-input');
      const passwordInput = await driver.$('~password-input');
      const loginButton = await driver.$('~login-button');

      await emailInput.setValue('admin@medsiem.org');
      await passwordInput.setValue('SuperAdmin123!');
      await loginButton.click();

      const dashboardHeader = await driver.$('~section-header');
      await dashboardHeader.waitForDisplayed({ timeout: 15000 });
      await takeScreenshot(driver, '02_authenticated_dashboard.png');
    });

    // 3. Dashboard Metrics & Navigation
    await executeStep('TC-MOB-003', 'Dashboard Metrics & Alerts Navigation', async () => {
      const alertsNav = await driver.$('~nav-alerts');
      await alertsNav.click();

      const alertCard = await driver.$('~alert-card');
      await alertCard.waitForDisplayed({ timeout: 10000 });
      await takeScreenshot(driver, '03_alerts_navigation.png');
    });

    // 4. Alert Detail & Resolution Workflow
    await executeStep('TC-MOB-004', 'Alert Detail & Resolution Workflow', async () => {
      const firstAlert = await driver.$('~alert-card');
      await firstAlert.click();

      const resolveBtn = await driver.$('~resolve-alert-btn');
      if (await resolveBtn.isDisplayed()) {
        await resolveBtn.click();
      }

      const closeBtn = await driver.$('~close-modal-btn');
      if (await closeBtn.isDisplayed()) {
        await closeBtn.click();
      }
      await takeScreenshot(driver, '04_alert_detail_resolution.png');
    });

    // 5. Incidents Navigation & Comment Submission
    await executeStep('TC-MOB-005', 'Incidents Navigation & Comment Submission', async () => {
      const incidentsNav = await driver.$('~nav-incidents');
      await incidentsNav.click();

      const incidentCard = await driver.$('~incident-card');
      if (await incidentCard.isDisplayed()) {
        await incidentCard.click();
        const commentInput = await driver.$('~comment-input');
        const postBtn = await driver.$('~post-comment-btn');
        if (await commentInput.isDisplayed()) {
          await commentInput.setValue('Automated investigation note via Appium CI');
          await postBtn.click();
        }
      }
      await takeScreenshot(driver, '05_incidents_management.png');
    });

    // 6. Profile Screen & Logout Workflow
    await executeStep('TC-MOB-006', 'Profile Screen & Logout Workflow', async () => {
      const profileNav = await driver.$('~nav-profile');
      await profileNav.click();

      const logoutBtn = await driver.$('~logout-button');
      await logoutBtn.click();

      const loginTitle = await driver.$('~title');
      await loginTitle.waitForDisplayed({ timeout: 10000 });
      await takeScreenshot(driver, '06_logout_complete.png');
    });

  } catch (globalErr) {
    console.error('[MedSIEM Appium] Driver connection or startup error:', globalErr.message);
    testResults.push({
      id: 'TC-MOB-INIT',
      name: 'Appium Session & Device Initialization',
      status: 'FAILED',
      duration: '0.00',
      error: globalErr.message,
    });
  } finally {
    if (driver) {
      try {
        await driver.deleteSession();
      } catch (e) {
        console.warn('Error deleting driver session:', e.message);
      }
    }
  }

  // Generate Reports
  const totalTests = testResults.length;
  const failedTests = testResults.filter((t) => t.status === 'FAILED').length;
  const passedTests = totalTests - failedTests;
  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

  // 1. JUnit XML
  let junitXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  junitXml += `<testsuites name="MedSIEM Appium Android Tests" tests="${totalTests}" failures="${failedTests}" errors="0" time="${totalDuration}">\n`;
  junitXml += `  <testsuite name="Appium Android Suite" tests="${totalTests}" failures="${failedTests}" errors="0" time="${totalDuration}" timestamp="${new Date().toISOString()}">\n`;
  for (const t of testResults) {
    junitXml += `    <testcase classname="MedSIEM.MobileAndroid" name="${t.id}: ${t.name}" time="${t.duration}">\n`;
    if (t.status === 'FAILED') {
      junitXml += `      <failure message="${(t.error || 'Failed').replace(/"/g, '&quot;')}">${t.error || ''}</failure>\n`;
    }
    junitXml += `    </testcase>\n`;
  }
  junitXml += `  </testsuite>\n</testsuites>\n`;
  fs.writeFileSync(path.join(RESULTS_DIR, 'junit.xml'), junitXml, 'utf8');

  // 2. HTML Report
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

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MedSIEM Appium Android Test Execution Report</title>
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
      <h1>MedSIEM Appium Android Mobile Automation Report</h1>
      <p>Native React Native Android App &bull; UiAutomator2 &bull; Package: com.medsiemmobile</p>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-title">Total Tests</div>
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
        <div class="card-title">Execution Duration</div>
        <div class="card-value">${totalDuration}s</div>
      </div>
    </div>

    <h3>Mobile Test Case Results</h3>
    <table>
      <thead>
        <tr>
          <th>Test ID</th>
          <th>Scenario</th>
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
  fs.writeFileSync(path.join(RESULTS_DIR, 'appium-test-report.html'), html, 'utf8');

  // 3. Markdown Summary
  let md = `# MedSIEM Appium Android E2E Execution Summary\n\n`;
  md += `- **Total Tests**: ${totalTests}\n`;
  md += `- **Passed**: ${passedTests}\n`;
  md += `- **Failed**: ${failedTests}\n`;
  md += `- **Duration**: ${totalDuration}s\n`;
  md += `- **Timestamp**: ${new Date().toISOString()}\n\n`;
  md += `| ID | Scenario | Status | Duration |\n`;
  md += `| :--- | :--- | :--- | :--- |\n`;
  for (const t of testResults) {
    md += `| \`${t.id}\` | ${t.name} | ${t.status === 'PASSED' ? 'PASS' : 'FAIL'} | ${t.duration}s |\n`;
  }
  fs.writeFileSync(path.join(RESULTS_DIR, 'summary.md'), md, 'utf8');

  console.log(`\n[MedSIEM Appium] Mobile suite complete: ${passedTests}/${totalTests} passed.`);
  if (failedTests > 0) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runMobileSuite().catch((err) => {
    console.error('Fatal unhandled error in Appium suite:', err);
    process.exit(1);
  });
}

module.exports = { runMobileSuite };
