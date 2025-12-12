
# SubPad Pro - Advanced Subtitle Editor

SubPad Pro is a powerful, modern, and aesthetically pleasing web-based subtitle editor built with React, Vite, and Tailwind CSS. It features a dark-mode first UI, multi-file support, advanced import/export capabilities, and AI-powered translation tools.

![SubPad Preview](https://via.placeholder.com/800x450?text=SubPad+Pro+Interface)

## Features

- **Multi-File editing:** Work on multiple subtitle files simultaneously.
- **Advanced Timeline:** Visual timeline editor with CPS (Characters Per Second) indicators.
- **Raw Text Mode:** powerful notepad-like interface for batch editing and regex search.
- **Batch Processing:** Import active folders or drag-and-drop multiple files.
- **Export Options:** Support for SRT, VTT, TXT, LRC, and robust ZIP bundling.
- **AI Tools:** Integrated AI instruction capability for translation or formatting fixes.
- **Responsive Design:** Fully responsive UI that works on desktops and tablets.

## Tech Stack

- **Framework:** React 18 + Vite
- **Styling:** Tailwind CSS + Lucide Icons
- **Utils:** JSZip for compression

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/subpad-pro.git
   cd subpad-pro
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

   Open \`http://localhost:5173\` in your browser.

## Deployment

### Heroku

This project is configured for Heroku deployment using an Express server to serve the static build.

1. Create a Heroku app.
2. Connect your GitHub repository.
3. Deploy (Heroku will detect the `Procfile`).

### Replit

1. Create a new Repl and import from GitHub.
2. The `.replit` and `replit.nix` files will automatically configure the environment.
3. Hit "Run".

## License

MIT License
