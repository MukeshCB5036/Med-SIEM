const BasePage = require('./BasePage');

class UserProfilePage extends BasePage {
    get userEmail() { return 'android=new UiSelector().textContains("@")'; }
    get logoutButton() { return 'android=new UiSelector().text("Sign Out")'; }

    async logout() {
        await this.click(this.logoutButton);
    }
}

module.exports = UserProfilePage;
