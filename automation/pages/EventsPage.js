const BasePage = require('./BasePage');

class EventsPage extends BasePage {
    get title() { return 'android=new UiSelector().text("Events Stream")'; }
    get searchInput() { return 'android=new UiSelector().className("android.widget.EditText")'; }
}

module.exports = EventsPage;
