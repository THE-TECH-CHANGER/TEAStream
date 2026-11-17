# 🍵 TEAstream — Official Releases (v1.2)

This folder contains pre-built installable applications, zip files, and source code archives for **TEAstream v1.2**.

---

## 📦 Available Downloads

### 🚀 Applications (Direct Installers & Executables)
| Platform | Package | Architecture | Type | Description |
| :--- | :--- | :--- | :--- | :--- |
| **🪟 Windows (Installer)** | [`TEAstream-Setup-1.2.0.exe`](TEAstream-Setup-1.2.0.exe) | **x64 (Intel / AMD)** | NSIS Setup | Complete Windows 10/11 installer with Start Menu & Desktop shortcuts. |
| **🪟 Windows (Portable App)** | [`TEAstream-1.2.0-Portable.exe`](TEAstream-1.2.0-Portable.exe) | **x64 (Intel / AMD)** | Standalone Executable | Zero-install standalone desktop executable. Just double-click! |
| **🍎 macOS (Installer)** | [`TEAstream-1.2.0-macOS-arm64.dmg`](TEAstream-1.2.0-macOS-arm64.dmg) | **arm64 (Apple Silicon)** | Disk Image (.dmg) | Native Apple Silicon installer (M1/M2/M3/M4). Drag into `/Applications`. |

### 🗜️ Zip Files (Portable Packages)
| Platform | Package | Architecture | Type | Description |
| :--- | :--- | :--- | :--- | :--- |
| **🍎 macOS (Portable Zip)** | [`TEAstream-1.2.0-macOS-arm64.zip`](TEAstream-1.2.0-macOS-arm64.zip) | **arm64 (Apple Silicon)** | Application Zip | Native `TEAstream.app` inside zip archive. Extract and run directly. |
| **🐧 Linux / Universal** | [`TEAstream-1.2.0-portable-source.zip`](TEAstream-1.2.0-portable-source.zip) | **Universal** | Portable Archive | Universal release with start/stop shell scripts and Flutter companion. |

### 💻 Source Codes
| Format | Package | Description |
| :--- | :--- | :--- |
| **📦 Source Code (.zip)** | [`TEAstream-1.2.0-source-code.zip`](TEAstream-1.2.0-source-code.zip) | Full TEAstream v1.2 source code (Server, Dashboard, Desktop, Flutter). |
| **📦 Source Code (.tar.gz)** | [`TEAstream-1.2.0-source-code.tar.gz`](TEAstream-1.2.0-source-code.tar.gz) | Standard Unix tarball containing full v1.2 source code. |

---

## 🔒 SHA-256 Checksums

```text
b0f1b7f9d28ee741db9b76689ffb0a3c6aff0661291395fb1eed8198bb81d31a  TEAstream-Setup-1.2.0.exe
06d2c477376f5da59989847cfb7d2773d483a51d94c12651a7d684caf7798bd4  TEAstream-1.2.0-Portable.exe
96ce83f385245f2182dbb4c5271d597b768495e54d66b9df7ea4b1387c1c080f  TEAstream-1.2.0-macOS-arm64.dmg
b6e740f91b030ab62804141bbc2822fa59c90e1a2f7e91d888e99dcfd96d17f1  TEAstream-1.2.0-macOS-arm64.zip
31b2ef0ea3ee8e4136dac3845ed6978ef34706218c9ecb9d40fb7542fc029e51  TEAstream-1.2.0-source-code.zip
d5e4bf50ec2af7902d71ce7a804e69b6fa453f1fb4475bce7a0ecd6034e3a8e9  TEAstream-1.2.0-source-code.tar.gz
31b2ef0ea3ee8e4136dac3845ed6978ef34706218c9ecb9d40fb7542fc029e51  TEAstream-1.2.0-portable-source.zip
```

---

## 🚀 Quick Start Instructions

### Windows:
1. Double-click `TEAstream-Setup-1.2.0.exe` or `TEAstream-1.2.0-Portable.exe`.
2. The TEAstream window will open with the dashboard.
3. Configure your RTMP keys and start streaming in OBS!

### macOS:
1. Open `TEAstream-1.2.0-macOS-arm64.dmg` and drag `TEAstream` to `/Applications`.
2. Double-click `TEAstream` in Applications (or use `Start-TEAstream.command`).
3. Power lock (`caffeinate`) automatically engages so Wi-Fi stays awake.

### Linux / Server / Docker:
1. Extract `TEAstream-1.2.0-source-code.tar.gz` or `TEAstream-1.2.0-portable-source.zip`.
2. Run `./start-teastream.sh` or `docker compose up -d`.
3. Open `http://localhost:3000` (or `http://<server-ip>:3000`).

---

## 🛑 Clean Shutdown
- **From Web UI**: Click **`🛑 Stop Hub`** in the top navigation bar.
- **From Desktop App**: Close the application window or select **"Stop Hub & Quit"** from the system tray.
- **Auto-Stop**: Toggle **"Auto-Stop Hub when OBS stream ends"** in the dashboard.
- **From Scripts**: Double-click `Stop-TEAstream.bat` (Windows) or `Stop-TEAstream.command` (macOS).
