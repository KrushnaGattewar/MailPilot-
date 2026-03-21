#  AI Email Manager — Chrome Extension

> **100% Free · Powered by Local AI (Ollama) · Zero Data Leaves Your Device**

A smart Chrome extension that automatically classifies, prioritizes, detects spam, and drafts replies for your Gmail emails — all powered by a local AI model running on your own machine. No API keys. No subscriptions. No cloud.

---

##  Features

| Feature | Description |
|--------|-------------|
|  **Auto Scan Inbox** | Scans up to 20 Gmail emails at once and classifies each one |
|  **Scan Open Email** | Instantly analyze any email you have open in Gmail |
|  **Intent Detection** | Classifies emails as Scheduling Request, Update Request, or Other |
|  **Smart Priority** | Assigns Urgent / Normal / Low priority to every email |
|  **Spam & Phishing Detector** | Flags suspicious emails with reason explanation |
|  **Auto Reply Drafts** | Generates a professional reply draft for each email |
|  **Gmail Badges** | Injects color-coded labels directly into your Gmail inbox rows |
|  **Dashboard** | Live stats showing total, urgent, spam, and meeting counts |
|  **100% Private** | All AI runs locally — only metadata stored, email body never saved |

---

##  Installation Guide

### Prerequisites
- Google Chrome browser
- Windows / Mac / Linux PC
- ~5 GB free disk space (for the AI model)

---

### Step 1 — Install Ollama

Download and install Ollama (the local AI engine) from the official website:

👉 **[https://ollama.com/download](https://ollama.com/download)**

Install it like any regular application.

---

### Step 2 — Download a Free AI Model

Open **Command Prompt** (Windows) or **Terminal** (Mac/Linux) and run:

```bash
ollama pull llama3
```

> ⏳ This downloads the AI model (~4 GB). It only needs to be done once.

Other supported models:
```bash
ollama pull mistral
ollama pull gemma2
ollama pull phi3
```

---

### Step 3 — Start Ollama with CORS Enabled

The extension needs CORS access to communicate with Ollama.

**Windows (Command Prompt):**
```cmd
set OLLAMA_ORIGINS=* && ollama serve
```

**Windows (PowerShell):**
```powershell
$env:OLLAMA_ORIGINS="*"; ollama serve
```

**Mac / Linux (Terminal):**
```bash
OLLAMA_ORIGINS=* ollama serve
```

> ⚠️ Keep this terminal window **open** while using the extension. Run this every time before using the extension.

---

### Step 4 — Load the Extension in Chrome

1. Download this repository as a ZIP → click **Code → Download ZIP**
2. Extract the ZIP to a folder on your PC
3. Open Chrome and go to: `chrome://extensions`
4. Enable **Developer Mode** (toggle in top-right corner)
5. Click **"Load unpacked"**
6. Select the extracted `email-manager-extension` folder
7. The 📬 icon will appear in your Chrome toolbar

---

##  How to Use

### Method 1 — Scan Your Inbox
1. Open **[Gmail](https://mail.google.com)** in Chrome
2. Click the 📬 extension icon in the toolbar
3. Make sure the status shows 🟢 **Online**
4. Click **"🔍 Scan Inbox"**
5. Wait ~10–30 seconds while each email is analyzed
6. View results in the **Emails** tab with color-coded badges

### Method 2 — Scan a Specific Email
1. Open any email in Gmail (fully open, not just previewed)
2. Click the 📬 extension icon
3. Click **"📧 Scan Open Email"**
4. The extension automatically jumps to the **Reply** tab with full analysis + draft reply

### Method 3 — Copy & Send the Draft Reply
1. Go to the **Reply** tab after scanning
2. Review the AI-generated draft
3. Click **"Copy"** to copy it to clipboard
4. Paste it into Gmail's compose window and send!

---

##  Project Structure

```
email-manager-extension/
├── manifest.json        — Chrome Extension configuration (MV3)
├── popup.html           — Extension UI (Dashboard, Emails, Reply, Settings tabs)
├── popup.js             — Core logic (Ollama integration, scanning, analysis)
├── content.js           — Gmail inbox scanner & badge injector
├── content.css          — Styles injected into Gmail
├── background.js        — Service worker (storage, badge counter)
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md            — This file
```

---

##  Privacy & Security

This extension was built with privacy as the top priority:

- ✅ **All AI processing is local** — Ollama runs on your machine, not in the cloud
- ✅ **No API keys required** — completely free, forever
- ✅ **No data sent to any server** — your emails never leave your device
- ✅ **Email body is never stored** — only metadata (sender, subject, category) is saved locally
- ✅ **Works offline** — once the model is downloaded, no internet needed for AI
- ✅ **Open source** — you can read every line of code

---

##  Troubleshooting

| Problem | Solution |
|--------|---------|
| Status shows "Checking..." | Reload the extension at `chrome://extensions` |
| Status shows "Offline" | Make sure Ollama is running: `set OLLAMA_ORIGINS=* && ollama serve` |
| Status shows "CORS blocked" | Restart Ollama with `OLLAMA_ORIGINS=*` flag |
| Port already in use error | Run `taskkill /F /IM ollama.exe` then restart Ollama |
| "No email found" on scan | Make sure a Gmail email is fully open (not just previewed) |
| Analysis failed / bad JSON | Try again — local LLMs occasionally return imperfect responses |
| Slow analysis | First run loads the model into memory (~20–30s). Subsequent runs are faster |

---

##  Supported AI Models

| Model | Size | Speed | Quality |
|-------|------|-------|---------|
| `llama3`  | ~4 GB | Medium | Best |
| `mistral` | ~4 GB | Fast | Great |
| `llama3.2` | ~2 GB | Fast | Good |
| `gemma2` | ~5 GB | Medium | Great |
| `phi3` | ~2 GB | Fastest | Good |

> Recommendation: Start with **llama3** for the best results.

---

##  Contributing

Contributions are welcome! Feel free to:
-  Report bugs via [Issues](../../issues)
-  Suggest features via [Issues](../../issues)
-  Submit improvements via [Pull Requests](../../pulls)

---

##  License

MIT License — free to use, modify, and distribute.

---

##  Acknowledgements

- [Ollama](https://ollama.com) — for making local AI models accessible
- [Meta LLaMA](https://llama.meta.com) — for the open-source LLaMA models
- [Google Chrome Extensions](https://developer.chrome.com/docs/extensions/) — for the extension platform

---

<div align="center">


⭐ If you find this useful, please give it a star on GitHub!

</div>
