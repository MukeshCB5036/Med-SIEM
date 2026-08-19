const BasePage = require('./BasePage');

class RawEventPage extends BasePage {
    get rawContent() { return 'android=new UiSelector().className("android.widget.TextView").instance(3)'; }
}

module.exports = RawEventPage;
