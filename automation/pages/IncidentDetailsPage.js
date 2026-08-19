const BasePage = require('./BasePage');

class IncidentDetailsPage extends BasePage {
    get incidentTitle() { return 'android=new UiSelector().textContains("Incident #")'; }
    get addCommentInput() { return 'android=new UiSelector().className("android.widget.EditText")'; }
    get postCommentButton() { return 'android=new UiSelector().text("Post Comment")'; }
}

module.exports = IncidentDetailsPage;
