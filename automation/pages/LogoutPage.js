const BasePage = require('./BasePage');

class LogoutPage extends BasePage {
    get logoutConfirmButton() { return 'android=new UiSelector().text("Confirm Sign Out")'; }
}

module.exports = LogoutPage;
