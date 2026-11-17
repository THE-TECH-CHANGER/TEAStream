# 📱 TEAstream Flutter App (Mobile & Desktop)

A cross-platform Flutter application for **TEAstream** that embeds the exact same high-performance Web Dashboard, giving you full control over your multistream relays from your phone, tablet, or desktop!

---

## 🌟 Features

- **Exact Same UI**: Embeds the full HTML5 FLV live monitor, telemetry bar (FPS, bitrate, bandwidth), and platform toggles.
- **Cross-Platform**: Runs on **Android**, **iOS**, **Windows**, **macOS**, and **Linux**.
- **Remote Hub Connection**: Connects to your local PC/Mac relay (`http://192.168.1.x:3000`) or Cloud VPS (`http://your-vps:3000`).
- **Persistent IP Memory**: Remembers your server address automatically.

---

## 🚀 How to Run

### 1. Prerequisites
- [Flutter SDK](https://flutter.dev/docs/get-started/install) (version 3.0 or higher)

### 2. Install Dependencies
```bash
cd teastream_flutter
flutter pub get
```

### 3. Run on Your Device
```bash
# Run on connected Android / iOS device or Simulator:
flutter run

# Run as native desktop app (Windows, macOS, or Linux):
flutter run -d macos
flutter run -d windows
flutter run -d linux
```

### 4. Build Standalone App Package
```bash
# Build Android APK:
flutter build apk --release

# Build iOS Archive:
flutter build ipa --release

# Build Desktop Release:
flutter build macos --release
flutter build windows --release
flutter build linux --release
```
