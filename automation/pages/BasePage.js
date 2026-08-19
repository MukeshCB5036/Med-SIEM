class BasePage {
    constructor(driver) {
        this.driver = driver;
    }

    async waitForElement(selector, timeout = 10000) {
        const el = await this.driver.$(selector);
        await el.waitForDisplayed({ timeout });
        return el;
    }

    async click(selector) {
        const el = await this.waitForElement(selector);
        await el.click();
    }

    async type(selector, text) {
        const el = await this.waitForElement(selector);
        await el.setValue(text);
    }

    async getText(selector) {
        const el = await this.waitForElement(selector);
        return await el.getText();
    }

    async isDisplayed(selector) {
        try {
            const el = await this.driver.$(selector);
            return await el.isDisplayed();
        } catch (e) {
            return false;
        }
    }
}

module.exports = BasePage;
