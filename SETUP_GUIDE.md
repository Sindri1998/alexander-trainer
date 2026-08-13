# Alexander Machine Shop — G-Code Trainer
## Setup Guide: From Laptop to Live Website

---

## What you have in this folder

```
alexander-trainer/
├── index.html          ← page shell (don't edit)
├── package.json        ← project config (don't edit)
├── vite.config.js      ← build config (don't edit)
├── netlify.toml        ← deploy config (don't edit)
├── .gitignore          ← tells Git what to ignore
└── src/
    ├── main.jsx        ← app entry point (don't edit)
    └── App.jsx         ← THE TRAINER — edit this to make changes
```

---

## STEP 1 — Install Node.js (one time only)

1. Go to **https://nodejs.org**
2. Click the big **"LTS"** download button (the left one)
3. Run the installer — click Next through everything, keep all defaults
4. When done, open **Terminal** (Mac) or **Command Prompt** (Windows)
5. Type this and press Enter to confirm it worked:
   ```
   node --version
   ```
   You should see something like `v20.x.x`. If you do, you're good.

---

## STEP 2 — Run the app on your laptop

1. Open Terminal / Command Prompt
2. Navigate to this folder. For example if it's on your Desktop:
   ```
   cd Desktop/alexander-trainer
   ```
3. Install dependencies (one time only):
   ```
   npm install
   ```
   This downloads React and the build tools. Takes ~30 seconds.

4. Start the app:
   ```
   npm run dev
   ```
5. You'll see something like:
   ```
   VITE v5.x  ready in 300ms
   ➜  Local:   http://localhost:5173/
   ```
6. Open **http://localhost:5173** in your browser — the trainer is running!

To stop it: press **Ctrl+C** in the terminal.

---

## STEP 3 — Share it on your local network (optional)

If you want your team to access it from phones or other PCs on the same Wi-Fi:

1. Run this instead:
   ```
   npm run dev:network
   ```
2. You'll see two URLs:
   ```
   ➜  Local:    http://localhost:5173/
   ➜  Network:  http://192.168.1.42:5173/
   ```
3. Share the **Network** URL with anyone on the same Wi-Fi — they just open it in a browser. No install needed on their end.

**Note:** This only works while your laptop is on and the app is running.

---

## STEP 4 — Build it for deployment (making a website)

When you're ready to put it on the internet:

```
npm run build
```

This creates a `dist/` folder containing the complete website as plain HTML/CSS/JS files.

---

## STEP 5A — Deploy to Netlify (free, fastest option)

### Option A: Drag and drop (no account needed)
1. Run `npm run build`
2. Go to **https://netlify.com/drop**
3. Drag the `dist/` folder onto the page
4. Done — you get a live URL in seconds like `trainer-abc123.netlify.app`
5. You can rename it to something like `ams-trainer.netlify.app` for free in Netlify settings

### Option B: Connect to GitHub (recommended for updates)
This lets you update the trainer by just saving the file — the website updates automatically.

1. Create a free account at **https://github.com**
2. Create a free account at **https://netlify.com**
3. Push this project to GitHub (see Step 6 below)
4. In Netlify: click **"Add new site" → "Import an existing project"**
5. Connect to GitHub, select your repo
6. Netlify auto-detects the settings from `netlify.toml`
7. Click **Deploy** — live in ~1 minute
8. Every time you save a change and push to GitHub, Netlify rebuilds automatically

---

## STEP 5B — Deploy to Vercel (equally good, also free)

1. Go to **https://vercel.com** and sign up free
2. Click **"New Project"**, connect your GitHub repo
3. Vercel auto-detects it's a Vite project
4. Click **Deploy**

---

## STEP 6 — Push to GitHub (for auto-deploy)

If you went with Option B above:

1. Create a free account at **https://github.com**
2. Click **"New repository"**, name it `alexander-trainer`, click Create
3. GitHub will show you some commands. Run them in your terminal from inside the project folder:
   ```
   git init
   git add .
   git commit -m "Initial trainer"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/alexander-trainer.git
   git push -u origin main
   ```
4. Now connect it to Netlify or Vercel as described in Step 5

---

## Updating the trainer later

**To add or change codes / lessons:**
1. Open `src/App.jsx` in any text editor (Notepad, VS Code, etc.)
2. Make your changes
3. If running locally, the browser updates instantly
4. To push to the live website:
   ```
   git add .
   git commit -m "Added new codes"
   git push
   ```
   Netlify/Vercel will auto-rebuild in about 60 seconds.

**Recommended free editor:** Download **VS Code** from https://code.visualstudio.com — makes editing App.jsx much easier with colour highlighting.

---

## Custom domain (optional, ~$12/year)

If you want `trainer.alexandermachineshop.com`:

1. Buy a domain at **https://namecheap.com** or **https://cloudflare.com**
2. In Netlify/Vercel settings → "Domain management" → add your domain
3. Follow the DNS instructions they give you — usually just changing two settings at your domain registrar

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `npm: command not found` | Node.js didn't install correctly — reinstall from nodejs.org |
| `npm install` fails | Make sure you're inside the `alexander-trainer` folder |
| App won't open in browser | Check the terminal shows "ready" and use the exact URL shown |
| Network URL not accessible | Make sure you're on the same Wi-Fi network |
| Build fails | Run `npm install` first, then `npm run build` |

---

## Quick reference

| Command | What it does |
|---|---|
| `npm install` | Install dependencies (first time only) |
| `npm run dev` | Run locally on your laptop |
| `npm run dev:network` | Run on local network (share with team) |
| `npm run build` | Build for deployment → creates `dist/` folder |
| `npm run preview` | Preview the built version locally |

---

*Alexander Machine Shop · RAD MFG · PUMA DNT2600M G-Code Trainer*
