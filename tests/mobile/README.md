# MedSIEM Automated Mobile Appium Test Suite Setup Guide

## Overview
This directory contains the Appium end-to-end test suite for the MedSIEM Android Mobile Application (`tests/mobile/appium_android_test.js`).

## Prerequisites
1. **Node.js**: Version 18 or 20
2. **Appium 2.x**: Installed globally via `npm install -g appium`
3. **Appium UiAutomator2 Driver**: Installed via `appium driver install uiautomator2`
4. **Android SDK & Emulator**: `ANDROID_HOME` configured and Android Emulator running (`emulator -avd Pixel_API_33`)
5. **Built APK**: `./android/app/build/outputs/apk/debug/app-debug.apk`

## Execution Instructions
1. **Start the Appium Server**:
   ```bash
   appium
   ```
2. **Verify Connected Device/Emulator**:
   ```bash
   adb devices
   ```
3. **Execute Test Suite**:
   ```bash
   npx jest tests/mobile/appium_android_test.js
   ```

## Test Coverage
- Application Launch & Title Verification
- User Login Authentication
- SOC Mobile Dashboard & Metric Cards Navigation
- Security Alert Detail Modal & Resolution Action
- Incident Investigation & Comment Posting
- User Profile View & Logout Action
