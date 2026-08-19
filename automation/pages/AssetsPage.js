const BasePage = require('./BasePage');

class AssetsPage extends BasePage {
    get title() { return 'android=new UiSelector().text("IT Assets")'; }
    get searchInput() { return 'android=new UiSelector().className("android.widget.EditText")'; }
}

module.exports = AssetsPage;
