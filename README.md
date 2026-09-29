# LocalLink — Private LAN Communication & File Transfer

> **Zero Cloud. Zero External Servers. Zero Tracking. Pure Local Network Communication.**

LocalLink is a high-speed, private local-network communication and file-sharing web application. It operates strictly across devices connected to the same Wi-Fi / LAN network.

---

## 🏗 Dual-Deployment Architecture

LocalLink is engineered to run seamlessly in two modes from a single repository:

```
                         LocalLink
                            │
             ┌──────────────┴──────────────┐
             │                             │
       Mode 1: Vercel Free           Mode 2: Local Server
             │                             │
       Static Frontend App           Local Node.js Engine
             │                             │
    (React + Vite + Routing)       (0.0.0.0 Binding, WS, UDP)
             │                             │
             └──────────────┬──────────────┘
                            │
              Direct Wi-Fi / LAN Mesh
```

### Mode 1: Vercel Free / Static Web Hosting
- Deployable to Vercel Free tier (`https://example.vercel.app`).
- 100% client-side SPA with full React Router rewrites (`vercel.json`).
- Connects to your local Node.js service on your PC/Termux for LAN mesh operations.

### Mode 2: Local Node.js / Termux / PC Server
- Runs on any PC (Windows, macOS, Linux) or Android phone via Termux.
- Binds to `0.0.0.0:3000` (with dynamic fallback to 3001, 3002...) so any phone, tablet, or laptop on the same Wi-Fi can open `http://<LAN-IP>:3000`.
- Operates even when the Internet connection is completely OFF.

---

## 🚀 Quick Start

### 1. Run on Windows, macOS, or Linux

```bash
# 1. Clone the repository
git clone https://github.com/Iftikhar30/locallink.git
cd locallink

# 2. Install dependencies
npm install

# 3. Start LocalLink on your LAN
npm run lan
# or: npm run locallink
```

Upon startup, your terminal will display your LAN IP address:

```text
╔═══════════════════════════════════════════════════════════════╗
║                     LocalLink v1.0.0                          ║
╠═══════════════════════════════════════════════════════════════╣
║ Status: 🟢 Running on LAN                                     ║
║                                                               ║
║ Local:   http://localhost:3000                                ║
║ LAN:     http://192.168.1.100:3000                            ║
║                                                               ║
║ Architecture: Dual Deployment (Local Node & Vercel Free)      ║
║                                                               ║
║ Open the LAN URL on any phone or laptop on the same Wi-Fi.    ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## 📱 Android Termux Deployment Guide

LocalLink can run directly on Android using Termux to turn your smartphone into a local communication and file transfer server.

### Step-by-Step Termux Setup:

```bash
# 1. Update Termux packages
pkg update -y && pkg upgrade -y

# 2. Install Node.js and Git
pkg install nodejs git -y

# 3. (Optional) Request Android storage permissions for downloads
termux-setup-storage

# 4. (Optional) Prevent Termux from sleeping in the background
termux-wake-lock

# 5. Clone LocalLink repository
git clone https://github.com/Iftikhar30/locallink.git
cd locallink

# 6. Install dependencies
npm install

# 7. Start LocalLink
npm run termux
```

Open the LAN address displayed in Termux (e.g. `http://192.168.1.105:3000`) on any browser on your phone, laptop, or other devices on the same Wi-Fi.

---

## ☁️ Vercel Free Deployment Guide

LocalLink is optimized for the Vercel Hobby / Free plan. It requires no paid features, serverless functions, or cloud databases.

### Deployment Steps:

1. Push your repository to GitHub.
2. In the Vercel Dashboard, click **Add New Project** and select your repository.
3. Configure the build settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Click **Deploy**.

All client-side routes (`/`, `/devices`, `/connect`, `/connect/code`, `/connect/scan`, `/chats`, `/settings`, etc.) will work out of the box via `vercel.json`.

---

## 🔗 Connection Mechanisms

LocalLink supports 3 distinct methods to connect devices:

1. **🔢 4-Digit Unique PIN**:
   - Every installation generates a 4-digit code (e.g. `7392`).
   - Persistent across browser reloads.
   - Enter the 4-digit PIN on another device to send a connection request.
2. **📷 QR Code Scan**:
   - Instant pairing via live camera viewfinder (`/connect/scan`) or screenshot upload.
   - Static, deterministic QR representation without timestamp drift.
3. **🔍 LAN Automatic Discovery**:
   - Native UDP beaconing on port `41235` and real-time WebSocket peer broadcast.

---

## 🛠 Available NPM Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts the development server with Vite middleware |
| `npm run lan` | Builds the app and starts the local Node.js server on `0.0.0.0` |
| `npm run termux` | Starts LocalLink on Android Termux |
| `npm run locallink` | Universal single-command launcher |
| `npm run build` | Compiles the production static bundle to `dist/` |
| `npm run preview` | Previews the production build with Vite |

---

## 🔒 Security & Privacy

- **No Cloud Database**: Messages and file transfer records are stored locally in the browser's IndexedDB.
- **LAN-Only Scope**: Device codes and discovery packets are never broadcast to the public internet.
- **Chunked File Streaming**: Files are transferred in 128KB binary chunks with memory backpressure management.

---

## 🛜 Troubleshooting & Firewall Guidance

If two devices cannot find each other:

1. **Same Wi-Fi Network**: Ensure both devices are connected to the exact same Wi-Fi SSID (or subnet).
2. **Router AP / Client Isolation**: Some guest or public Wi-Fi networks enable "Client Isolation", preventing direct communication between devices. Disable AP isolation in your router settings.
3. **Firewall Access**: On Windows/Linux, ensure inbound connections on port `3000` and UDP port `41235` are allowed through the firewall.
4. **Android Background Restrictions**: On Termux, run `termux-wake-lock` to keep the server running when the screen is locked.
