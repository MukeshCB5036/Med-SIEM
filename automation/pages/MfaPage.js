const BasePage = require('./BasePage');

class MfaPage extends BasePage {
    get otpInput() { return 'android=new UiSelector().className("android.widget.EditText").instance(0)'; }
    get verifyButton() { return 'android=new UiSelector().text("Verify OTP")'; }

    async enterOtp(otp) {
        await this.type(this.otpInput, otp);
        await this.click(this.verifyButton);
    }
}

module.exports = MfaPage;
