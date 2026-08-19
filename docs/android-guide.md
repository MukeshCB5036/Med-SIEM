# MedSIEM Android Mobile Application Guide

The MedSIEM Android Application is built with **React Native** and connects directly to the MedSIEM FastAPI Backend API (`/api/v1/`).

---

## 🛠 Local Setup & Backend Connection

### 1. API Base URL Configuration (`10.0.2.2`)
When running inside the standard Android Emulator, `localhost` refers to the Android device itself. To connect to the FastAPI backend running on your host machine, `10.0.2.2` is configured in `android/src/services/api.ts`.

### 2. Building and Running local APK / Emulator

```bash
cd android
npm install
npx react-native run-android
```

To build a standalone Debug APK:
```bash
cd android
./gradlew assembleDebug
```
The generated APK file will be located at:
`android/app/build/outputs/apk/debug/app-debug.apk`

---

## 📱 App Capabilities & Features

- **Authentication**: JWT token storage, automatic profile restoration, and sign-out.
- **Mobile SOC Dashboard**: Real-time summary cards for active alerts, incidents, and assets.
- **Alert Triage**: Interactive alert list, severity filtering, and resolution action modal.
- **Incident Management**: Incident case viewer, analyst investigation comments, and resolution workflows.
- **Log Event Explorer**: Real-time event log inspection.
- **Asset Status Monitor**: Health badges for clinical endpoints.
