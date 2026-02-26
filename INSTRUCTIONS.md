# Account Tracker (Offline) — Setup & Usage

## How to Open

No installation, no internet, no server needed.

1. Download or copy all three files into the **same folder**:
   ```
   your-folder/
   ├── index.html
   ├── style.css
   └── script.js
   ```
2. Double-click **index.html** — it opens directly in your browser.
3. That's it. The app is fully functional offline.

> **Tip:** If you want the Google Fonts (IBM Plex Mono) to load, you'll need a brief internet connection the first time. After that, fonts are cached and work offline too. If you're always offline, the browser falls back to a system monospace font — the app still works fine.

---

## How to Use

### Add an Account
Click **+ Add Account**. A new row appears with blank fields.

### Edit Fields
Click into any field and type:
- **Username** — the game account name
- **Password** — stored locally only, never sent anywhere
- **Lv** — current level number
- **XP / Max** — current XP and the XP needed for next level
  - The XP bar fills automatically based on these two numbers

All edits save automatically after you stop typing (500ms debounce).

### Mark as Done
Check the **Done** checkbox. The row highlights and a **HH:MM:SS** countdown starts showing how long until it resets.

- Turns **amber** while counting down
- Turns **red** in the last hour
- Automatically unchecks itself after 24 hours

### Remove an Account
Click the **✕** button on the right of any row. No confirmation needed — the row is removed immediately and the data is deleted from localStorage.

---

## Data Storage

Everything is stored in your browser's **localStorage** under the key `accountTracker_accounts`. This means:

| Situation | What Happens |
|---|---|
| Close the tab | Data saved ✓ |
| Close the browser | Data saved ✓ |
| Restart your computer | Data saved ✓ |
| Clear browser data / cache | **Data is erased** |
| Open on a different device | No data (localStorage is device-local) |
| Open in a different browser | No data (each browser has its own localStorage) |

### Backup Your Data (Optional)
To back up, open the browser console (F12 → Console) and run:
```js
copy(localStorage.getItem("accountTracker_accounts"))
```
This copies your data as JSON. Paste it into a text file to save it.

To restore, run:
```js
localStorage.setItem("accountTracker_accounts", `PASTE_YOUR_JSON_HERE`)
```
Then refresh the page.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Fonts look different | No internet for Google Fonts — app still works, just uses fallback font |
| Data disappeared | Browser storage was cleared — restore from backup if you have one |
| Checkbox didn't reset after 24h | The tab must be open for the timer to fire; re-open the app and it will auto-correct on load |
| App won't open | Make sure all 3 files are in the same folder and you're opening `index.html`, not `style.css` or `script.js` |
