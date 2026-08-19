const BasePage = require('./BasePage');

class LoginPage extends BasePage {
    get emailInput() { return 'android=new UiSelector().className("android.widget.EditText").instance(0)'; }
    get passwordInput() { return 'android=new UiSelector().className("android.widget.EditText").instance(1)'; }
    get loginButton() { return 'android=new UiSelector().text("Sign In")'; }
    get errorMessage() { return 'android=new UiSelector().resourceId("error-message")'; }

    async login(email, password) {
        await this.type(this.emailInput, email);
        await this.type(this.passwordInput, password);
        await this.click(this.loginButton);
    }
}

module.exports = LoginPage;
