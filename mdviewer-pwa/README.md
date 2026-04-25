# MDView PWA — Setup & Deploy Guide

## 📁 Project Structure

```
mdview-pwa/
├── index.html          ← Vite entry point
├── vite.config.js      ← Vite + PWA plugin config
├── package.json
├── public/
│   ├── manifest.json   ← PWA manifest
│   ├── sw.js           ← Service worker (offline support)
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
└── src/
    ├── main.jsx        ← React entry + SW registration
    └── App.jsx         ← Full MD viewer app
```

---

## 🚀 Deploy to Vercel (Free — Recommended)

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "MDView PWA"
gh repo create mdview-pwa --public --push
# or: git remote add origin https://github.com/YOUR_USER/mdview-pwa.git && git push
```

### Step 2 — Deploy on Vercel
1. Go to https://vercel.com and sign in with GitHub
2. Click **"Add New Project"**
3. Import your `mdview-pwa` repo
4. Leave all settings as default (Vercel auto-detects Vite)
5. Click **Deploy**
6. You'll get a URL like: `https://mdview-pwa.vercel.app`

---

## 📱 Install on Android

1. Open the Vercel URL in **Chrome** on your Android phone
2. Chrome will show a **"Add to Home Screen"** banner, OR
3. Tap the **⋮ menu → Add to Home Screen**
4. Tap **Install**

The app now appears on your home screen like a native app, works **offline**, and has no browser chrome.

---

## 🖥 Run Locally

```bash
npm install
npm run dev
# Opens at http://localhost:5173
```

### Build for production:
```bash
npm run build
npm run preview
```

---

## 📂 Opening .md Files on Android

Once installed as a PWA:
- Tap **Open** button in the app → file picker opens → browse to your `.md` file
- Files from **Google Drive, Downloads, Obsidian vault** all work
- You can also **share** a `.md` file from a file manager app directly to Chrome/MDView

---

## ✏️ Customise

| What | Where |
|---|---|
| Default demo content | `src/App.jsx` → `DEMO` constant |
| Colors / theme | `src/App.jsx` → `T` object |
| Add languages to highlighter | `src/App.jsx` → `highlight()` function |
| App name | `vite.config.js` → manifest `name` |
| Icons | Replace `public/icons/icon-192.png` and `icon-512.png` |

---

## 🔧 Upgrade Parser (Optional)

To use a full-spec Markdown parser instead of the built-in one:

```bash
npm install react-markdown remark-gfm rehype-highlight
```

Then replace the `dangerouslySetInnerHTML` block in `App.jsx` with:

```jsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

<ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
```
