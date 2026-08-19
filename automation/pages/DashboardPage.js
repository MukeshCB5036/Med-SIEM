const BasePage = require('./BasePage');

class DashboardPage extends BasePage {
    get headerTitle() { return 'android=new UiSelector().text("MedSIEM Dashboard")'; }
    get alertsTab() { return 'android=new UiSelector().text("Alerts")'; }
    get eventsTab() { return 'android=new UiSelector().text("Events")'; }
    get assetsTab() { return 'android=new UiSelector().text("Assets")'; }
    get profileTab() { return 'android=new UiSelector().text("Profile")'; }

    async navigateToAlerts() { await this.click(this.alertsTab); }
    async navigateToEvents() { await this.click(this.eventsTab); }
    async navigateToAssets() { await this.click(this.assetsTab); }
    async navigateToProfile() { await this.click(this.profileTab); }
}

module.exports = DashboardPage;
