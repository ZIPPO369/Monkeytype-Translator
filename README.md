# Monkeytype Translator

A translation panel for [MonkeyType](https://monkeytype.com) that shows the translation of the currently typed word in real time, lets you save words to a personal dictionary, organize them into categories, and export them to TXT/CSV/JSON. Configuration is managed via a popup (language selection, app language, theme).

---

## Features

- Live translation of the active word (Google Translate).
- One-click save; overview of saved and frequently used words.
- Floating dictionary with filtering, sorting, and export (TXT/CSV/JSON).
- Popup controls:
  - Source and target language selection.
  - App language (EN/CZ) — i18n across the UI.
  - Theme (Light / MonkeyType Dark).
  - Shortcut to open MonkeyType.
- Styles isolated via Shadow DOM so the UI doesn’t conflict with MonkeyType’s CSS.
- Initialization delayed until the page is fully loaded to avoid slowing startup.

---

## Installation

### From Chrome Web Store (to be added)
- Once published, add the store URL here and install via “Add to Chrome”.

### Developer (unpacked)
1. Clone or download this repository.
2. Open `chrome://extensions`.
3. Enable “Developer mode”.
4. Click “Load unpacked” and select the project root.
5. Open `https://monkeytype.com/` and verify the panel appears after the page loads.

---

## Usage

- Open MonkeyType and start typing.
- The translator panel appears after page load; it shows the original word and its translation.
- Click “Save” to add the word to your dictionary.
- Click “Dictionary” to open the floating dictionary (filter, sort, export).
- Use the popup to configure languages, app language, and theme.

---

## Settings and i18n

- Settings stored in `chrome.storage.sync` (source/target languages, app language, theme).
- Dictionary stored locally (`localStorage` + `chrome.storage.local`).
- App languages available: English and Czech. Easily extendable.

---

## Permissions

- `storage` — stores settings and your dictionary.
- `activeTab`, `scripting` — renders the panel on MonkeyType.
- `host_permissions` — `https://translate.googleapis.com/*` for translations.

---

## Privacy

- Dictionary and settings remain in your browser.
- Translation requests go to Google Translate; no extra personal data is sent by this extension.

---

## Screenshots and Media

Recommended screenshots (PNG/JPG):
- Popup (language/theme selection).
- Translator panel on MonkeyType — light/dark.
- Floating dictionary (filtering, sorting, export).
- Export options (TXT/CSV/JSON).
If you create a short video (30–60s), show installation, popup configuration, and workflow on MonkeyType.

---

## Development

- Manifest V3, static scripts.
- Main files:
  - `manifest.json` — MV3 configuration.
  - `content-script.js` — floating panel, in-page dictionary, i18n.
  - `popup.html`, `popup.js`, `popup.css` — popup configuration.
  - `dictionary.html`, `dictionary.js`, `dictionary.css` — dictionary page (web-accessible resource).
  - `background.js` — supplemental actions (MV3 service worker).
- Static preview: `dictionary.html` and `popup.html` can be served via a local HTTP server.

---

## Troubleshooting

- Page loads slowly or panel appears too early:
  - The extension waits for `window.load` plus a short idle period; after changes, use “Reload” in `chrome://extensions` and refresh `monkeytype.com`.
- “Unchecked runtime.lastError” when clicking “Reset UI” in the popup:
  - Ensure the active tab is `https://monkeytype.com/`. On other pages, the content script isn’t running.
- IndexedDB errors after clearing cookies:
  - Those come from MonkeyType’s own code. Typically reloading the page helps.

---

## Contributing

Suggestions and PRs are welcome:
1. Fork the repository.
2. Create a feature branch.
3. Open a Pull Request with a clear description.

---

## Author

- GitHub: https://github.com/ZIPPO369
