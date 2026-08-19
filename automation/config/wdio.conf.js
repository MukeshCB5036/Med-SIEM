export const config = {
    runner: 'local',
    port: 4723,
    specs: [
        '../tests/**/*.spec.js'
    ],
    exclude: [],
    maxInstances: 1,
    capabilities: [{
        platformName: 'Android',
        'appium:deviceName': 'emulator-5554',
        'appium:platformVersion': '14.0',
        'appium:automationName': 'UiAutomator2',
        'appium:app': '../android/android/app/build/outputs/apk/debug/app-debug.apk',
        'appium:appPackage': 'com.medsiem.app',
        'appium:appActivity': '.MainActivity',
        'appium:noReset': false,
        'appium:fullReset': false,
        'appium:newCommandTimeout': 240
    }],
    logLevel: 'info',
    bail: 0,
    baseUrl: 'http://localhost:8000',
    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
    services: ['appium'],
    framework: 'mocha',
    reporters: ['spec'],
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000
    }
};
