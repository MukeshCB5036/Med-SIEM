const BasePage = require('./BasePage');

class AlertDetailsPage extends BasePage {
    get alertTitle() { return 'android=new UiSelector().textContains("Alert:")'; }
    get resolveButton() { return 'android=new UiSelector().text("Resolve Alert")'; }

    async resolveAlert() {
        await this.click(this.resolveButton);
    }
}

module.exports = AlertDetailsPage;
