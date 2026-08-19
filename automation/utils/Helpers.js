const fs = require('fs');
const path = require('path');

class Helpers {
    static async captureScreenshot(driver, name) {
        const screenshotDir = path.join(__dirname, '../screenshots');
        if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
        const filePath = path.join(screenshotDir, `${name}_${Date.now()}.png`);
        await driver.saveScreenshot(filePath);
        return filePath;
    }

    static async retry(fn, retries = 3, delay = 1000) {
        for (let i = 0; i < retries; i++) {
            try {
                return await fn();
            } catch (err) {
                if (i === retries - 1) throw err;
                await new Promise(res => setTimeout(res, delay));
            }
        }
    }

    static log(msg) {
        const logDir = path.join(__dirname, '../logs');
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
        const logPath = path.join(logDir, 'execution.log');
        const entry = `[${new Date().toISOString()}] ${msg}\n`;
        fs.appendFileSync(logPath, entry);
        console.log(entry.trim());
    }
}

module.exports = Helpers;
