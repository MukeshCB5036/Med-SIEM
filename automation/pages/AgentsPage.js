const BasePage = require('./BasePage');

class AgentsPage extends BasePage {
    get title() { return 'android=new UiSelector().text("Endpoint Agents")'; }
}

module.exports = AgentsPage;
