const BasePage = require('./BasePage');

class IncidentsPage extends BasePage {
    get title() { return 'android=new UiSelector().text("Security Incidents")'; }
    get firstIncident() { return 'android=new UiSelector().className("android.view.ViewGroup").instance(4)'; }
}

module.exports = IncidentsPage;
