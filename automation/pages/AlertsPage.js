const BasePage = require('./BasePage');

class AlertsPage extends BasePage {
    get title() { return 'android=new UiSelector().text("Security Alerts")'; }
    get firstAlertItem() { return 'android=new UiSelector().className("android.view.ViewGroup").instance(5)'; }
    get searchInput() { return 'android=new UiSelector().className("android.widget.EditText")'; }

    async selectFirstAlert() {
        await this.click(this.firstAlertItem);
    }
}

module.exports = AlertsPage;
