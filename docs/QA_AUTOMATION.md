# MedSIEM QA Automation & Security Testing Guide

## Prerequisites & Installation
- **Node.js**: v20+
- **Python**: v3.12+
- **Appium**: 2.x (`npm install -g appium && appium driver install uiautomator2`)
- **Android SDK & Java JDK**: JDK 17, Android Studio with `emulator-5554`

## Commands Reference

### 1. Build Android Application
```bash
cd android/android
./gradlew assembleDebug
```

### 2. Run Appium E2E Automation Framework
```bash
cd automation
npm install
npm test
```

### 3. Execute Backend Unit & Security Audits
```bash
docker exec medsiem-backend pytest
```

### 4. Build Excel & HTML Report Artifacts
```bash
python3 build_reports.py
```

### 5. Run Performance & Load Tests
```bash
k6 run k6-load-test.js
artillery run artillery-load-test.yml
```
