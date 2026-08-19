const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

describe('MedSIEM Selenium Web UI Test Suite', () => {
  let driver;

  beforeAll(async () => {
    const options = new chrome.Options();
    options.addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');
    driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  });

  afterAll(async () => {
    if (driver) await driver.quit();
  });

  test('Navigate to MedSIEM Login Screen', async () => {
    await driver.get('http://localhost:3000/login');
    const title = await driver.getTitle();
    expect(title).toContain('MedSIEM');
  });
});
