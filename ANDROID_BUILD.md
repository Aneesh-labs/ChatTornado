# ChatTornado Android Build & Installation Guide

This document covers prerequisites, architecture configuration, compilation steps, and device deployment for the native ChatTornado Android application.

---

## 1. Environment Prerequisites

- **Node.js**: `v20.x` or later (LTS recommended)
- **Java Development Kit (JDK)**: OpenJDK 17 or JDK 21 (Eclipse Temurin 21 tested and verified)
  - Verify with: `java -version` and `javac -version`
  - Ensure `JAVA_HOME` environment variable is set.
- **Android SDK**:
  - Platforms: `android-34` / `android-35` / `android-36`
  - Build-tools: `34.0.0` or `35.0.0`
  - Set `ANDROID_HOME`:
    - Windows: `C:\Users\<user>\AppData\Local\Android\Sdk`
    - Linux/macOS: `$HOME/Android/Sdk`
- **Capacitor CLI**: `@capacitor/cli` and `@capacitor/core` (included in `package.json`)

---

## 2. Project Configuration

The Android native project is generated and managed through Capacitor:

- **Application ID**: `com.chattornado.app`
- **Application Name**: `ChatTornado`
- **Configuration File**: `capacitor.config.json`
- **Native Android Directory**: `android/`

### `android/local.properties`
Ensure your local SDK path is specified in `android/local.properties`:
```properties
sdk.dir=C\:\\Users\\samos\\AppData\\Local\\Android\\Sdk
```

---

## 3. Step-by-Step Build Instructions

### Step 1: Install Dependencies
```powershell
npm install
```

### Step 2: Compile Production Web Assets
Compile the React 19 + Vite frontend bundle:
```powershell
npm run build
```
This builds optimized client artifacts into the `dist/` directory.

### Step 3: Synchronize Capacitor Native Project
Sync web assets, configuration, and native plugins to the `android/` workspace:
```powershell
npx cap sync android
```
Plugins synchronized:
- `@capacitor/app`
- `@capacitor/camera`
- `@capacitor/filesystem`
- `@capacitor/keyboard`
- `@capacitor/status-bar`

### Step 4: Compile Debug APK
Run the Gradle wrapper from the `android/` folder:

On Windows (PowerShell):
```powershell
cd android
$env:ANDROID_HOME = "C:\Users\<user>\AppData\Local\Android\Sdk"
.\gradlew.bat assembleDebug
```

On Linux / macOS:
```bash
cd android
export ANDROID_HOME="$HOME/Android/Sdk"
./gradlew assembleDebug
```

The resulting installable APK will be generated at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```
Copied to project root: `ChatTornado-Android-debug.apk`.

---

## 4. Device Installation & Testing

### Option A: Install via Android Debug Bridge (ADB)
1. Enable **Developer Options** and **USB Debugging** on your Android device.
2. Connect your device via USB or wireless ADB.
3. Verify connection:
   ```powershell
   adb devices
   ```
4. Install the compiled APK:
   ```powershell
   adb install -r ChatTornado-Android-debug.apk
   ```

### Option B: Direct Sideloading
1. Transfer `ChatTornado-Android-debug.apk` to your phone via USB, Google Drive, or local file sharing.
2. Open the file on your device and tap **Install** (allow installation from unknown sources if prompted).

---

## 5. Android Permissions Configured

Declared in `android/app/src/main/AndroidManifest.xml`:
- `android.permission.INTERNET`: WebSocket signaling & API calls.
- `android.permission.ACCESS_NETWORK_STATE`: Wi-Fi / cellular transition detection.
- `android.permission.CAMERA`: Live photo capture.
- `android.permission.RECORD_AUDIO`: Voice notes & WebRTC audio.
- `android.permission.MODIFY_AUDIO_SETTINGS`: Acoustic echo cancellation & routing.
- `android.permission.POST_NOTIFICATIONS`: Message & transfer alerts.
- `android.permission.READ_MEDIA_IMAGES` / `READ_MEDIA_VIDEO` / `READ_MEDIA_AUDIO`: Scoped media access.
- `android.permission.READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE`: Dual-storage gallery export for legacy API levels.
