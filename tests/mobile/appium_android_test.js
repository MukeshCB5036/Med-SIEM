/**
 * Appium WebdriverIO Mobile Automation Test Suite for MedSIEM Android Application
 * 
 * Prerequisites for execution:
 * 1. Start Appium Server: `npx appium`
 * 2. Start Android Emulator / Connect Android Device: `adb devices`
 * 3. Run Test Suite: `node tests/mobile/run_appium.js` or `npm test`
 */

const { remote } = require('webdriverio');
const path = require('path');

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

describe('MedSIEM Android Mobile Application E2E Test Suite', () => {
  let driver;

  beforeAll(async () => {
    driver = await remote(wdioOptions);
  });

  afterAll(async () => {
    if (driver) {
      await driver.deleteSession();
    }
  });

  test('1. Application Launch and Login Screen Verification', async () => {
    const title = await driver.$('~title');
    const titleText = await title.getText();
    expect(titleText).toContain('MedSIEM');
  });

  test('2. User Authentication (Login Flow)', async () => {
    const emailInput = await driver.$('~email-input');
    const passwordInput = await driver.$('~password-input');
    const loginButton = await driver.$('~login-button');

    await emailInput.setValue('admin@medsiem.org');
    await passwordInput.setValue('SuperAdmin123!');
    await loginButton.click();

    const dashboardHeader = await driver.$('~section-header');
    await dashboardHeader.waitForDisplayed({ timeout: 10000 });
    expect(await dashboardHeader.isDisplayed()).toBe(true);
  });

  test('3. Dashboard Metrics & Navigation', async () => {
    const alertsNav = await driver.$('~nav-alerts');
    await alertsNav.click();

    const alertCard = await driver.$('~alert-card');
    await alertCard.waitForDisplayed({ timeout: 5000 });
    expect(await alertCard.isDisplayed()).toBe(true);
  });

  test('4. Alert Detail & Resolution Workflow', async () => {
    const firstAlert = await driver.$('~alert-card');
    await firstAlert.click();

    const resolveBtn = await driver.$('~resolve-alert-btn');
    if (await resolveBtn.isDisplayed()) {
      await resolveBtn.click();
    }

    const closeBtn = await driver.$('~close-modal-btn');
    await closeBtn.click();
  });

  test('5. Incidents Navigation & Comment Submission', async () => {
    const incidentsNav = await driver.$('~nav-incidents');
    await incidentsNav.click();

    const incidentCard = await driver.$('~incident-card');
    if (await incidentCard.isDisplayed()) {
      await incidentCard.click();
      const commentInput = await driver.$('~comment-input');
      const postBtn = await driver.$('~post-comment-btn');
      
      await commentInput.setValue('Automated investigation note via Appium');
      await postBtn.click();
    }
  });

  test('6. Profile Screen & Logout Workflow', async () => {
    const profileNav = await driver.$('~nav-profile');
    await profileNav.click();

    const logoutBtn = await driver.$('~logout-button');
    await logoutBtn.click();

    const loginTitle = await driver.$('~title');
    await loginTitle.waitForDisplayed({ timeout: 5000 });
    expect(await loginTitle.isDisplayed()).toBe(true);
  });
});
