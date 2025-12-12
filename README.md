

# 🎬
# 🎬 SubPad Pro - Advanced Subtitle Editor

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

**SubPad Pro** is a professional, web-based subtitle editor designed for speed, precision, and aesthetics. It bridges the gap between simple text editors and complex desktop subtitling software, offering a modern dark-mode interface, AI-powered translation capabilities, and batch processing tools.

> **🔗 [View Live Preview & Demo](https://gemini.google.com/share/a7130f2ed84a)**

---

## ✨ Key Features

### 🛠️ Professional Editing Tools
- **Split View Interface:** Simultaneously view the timeline editor and raw text source.
- **Visual CPS Indicators:** Real-time Characters Per Second (CPS) monitoring with color-coded alerts for reading speed.
- **Smart Timeline:** Drag-and-drop feeling inputs for start/end timestamps.
- **Raw Text Mode:** powerful notepad-like interface for rapid bulk editing, regex search, and copy-paste workflows.

### 📂 Advanced File Management
- **Multi-File Support:** Open and edit dozens of subtitle files in tabs.
- **Batch Import:** Drag and drop folders or select multiple files at once.
- **Robust Export:** 
  - Formats: `.srt`, `.vtt`, `.txt` (raw), `.lrc` (lyrics).
  - **ZIP Bundling:** Download all open files as a single optimized ZIP archive.
  - **Selective Export:** Choose specific files to export from your workspace.

### 🤖 AI-Powered Translation
- **Integrated AI Instructions:** Built-in prompt system to send subtitle content to AI models (Google Gemini API ready).
- **Batch Translation:** One-click "Translate All" files feature to localize entire seasons or collections automatically.
- **Customizable Prompts:** Define your own translation or formatting rules (e.g., "Translate to Spanish and remove SDH tags").

### 🎨 Modern Experience
- **Dark/Light Mode:** Beautifully crafted themes for day and night work.
- **Responsive Design:** Fully functional on tablets and desktops.
- **Focus Mode:** Minimalist fullscreen experience for distraction-free editing.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** or **yarn**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/everarpitraj/subpad-pro.git
   cd subpad-pro
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run Development Server:**
   ```bash
   npm run dev
   ```
   The app will open at `http://localhost:5173`.

---

## 📖 Usage Guide

### 1. Importing Subtitles
- Click the **Import** button in the bottom-right corner.
- Choose **"Upload Files"** for individual `.srt` files or **"Upload Folder"** to load an entire season.
- You can also drag and drop files directly into the window.

### 2. Editing & Syncing
- **Timeline View (Left):** Adjust timestamps, text, and add/delete lines visually.
- **Notepad View (Right):** Edit the raw text. Useful for find/replace.
- **Sync:** Changes in the Timeline auto-sync to the Notepad. If you edit the Notepad manually, click the **Refresh (Sync)** button to update the Timeline.

### 3. Using AI Translation
1. Open **Settings** (Gear icon) and enter your AI prompt (e.g., "Translate to French").
2. *(Note: You must configure the API key in `src/utils/aiUtils.js` or provide a backend proxy).*
3. Click the **Sparkles** icon on a file to translate it, or the **Globe** icon in the header to batch translate all open files.

### 4. Exporting
- Click the main **Download** button.
- Select your desired format (`.srt`, `.vtt`, etc.).
- Click **"Download Current"** for one file or **"Download All"** to get a ZIP file.

---

## ☁️ Deployment Guide

### Option 1: Replit (Easiest)
This project is pre-configured for Replit with `replit.nix`.

1. **Log in** to your [Replit](https://replit.com/) account.
2. Click **"+ Create Repl"** and select **"Import from GitHub"**.
3. Paste your repository URL: `https://github.com/everarpitraj/subpad-pro.git`.
4. Select the imported repository.
5. Replit will detect the configuration. Once loaded, simply click the big green **Run** button at the top.
6. Your app will be live at the provided Replit URL.

### Option 2: Heroku
We include a `server.js` and `Procfile` to serve the static Vite build via Express.

**Steps:**

1. **Install Heroku CLI:** Download and install from [heroku.com](https://devcenter.heroku.com/articles/heroku-cli).
2. **Login:**
   ```bash
   heroku login
   ```
3. **Create App:**
   ```bash
   heroku create subpad-pro-app
   ```
4. **Deploy:**
   ```bash
   git push heroku master
   ```
   *(Or connect your GitHub repo to Heroku dashboard and enable auto-deploy).*

5. **Open App:**
   ```bash
   heroku open
   ```

### Option 3: Netlify / Vercel (Static Hosting)
Since SubPad Pro is a client-side React app, it works perfectly on static hosts.

1. **Sign up/Login** to Vercel or Netlify.
2. **Import Project** from GitHub.
3. Use these build settings:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Click **Deploy**.

---

## 🤝 Contributing

Contributions are welcome!
1. Fork the project.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
