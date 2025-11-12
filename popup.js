(() => {
  const LANGS = [
    { code: 'en', name: 'English' },
    { code: 'cs', name: 'Čeština' },
    { code: 'de', name: 'Deutsch' },
    { code: 'sk', name: 'Slovenčina' },
    { code: 'pl', name: 'Polski' }
  ];

  const $ = (id) => document.getElementById(id);
  const sourceSel = $('sourceLang');
  const targetSel = $('targetLang');
  const appLangSel = $('appLangSel');
  const themeSel = $('themeSel');
  const openMtBtn = $('openMtShortcut');
  const openDictBtn = $('openDictBtn');
  const resetUiBtn = $('resetUiBtn');

  function populateLangSelect(select, defaultValue) {
    select.innerHTML = '';
    for (const l of LANGS) {
      const opt = document.createElement('option');
      opt.value = l.code;
      opt.textContent = l.name;
      select.appendChild(opt);
    }
    select.value = defaultValue;
  }

  function loadSettings() {
    const theme = localStorage.getItem('mt_popup_theme') || 'monkey-dark';
    document.body.classList.remove('theme-light', 'theme-monkey-dark');
    document.body.classList.add(theme === 'light' ? 'theme-light' : 'theme-monkey-dark');
    themeSel.value = theme;

    const src = localStorage.getItem('mt_src_lang') || 'en';
    const dst = localStorage.getItem('mt_dst_lang') || 'cs';
    populateLangSelect(sourceSel, src);
    populateLangSelect(targetSel, dst);
  }

  function saveSettings() {
    localStorage.setItem('mt_popup_theme', themeSel.value);
    localStorage.setItem('mt_src_lang', sourceSel.value);
    localStorage.setItem('mt_dst_lang', targetSel.value);
  }

  themeSel.addEventListener('change', () => {
    saveSettings();
    document.body.classList.remove('theme-light', 'theme-monkey-dark');
    document.body.classList.add(themeSel.value === 'light' ? 'theme-light' : 'theme-monkey-dark');
  });
  sourceSel.addEventListener('change', saveSettings);
  targetSel.addEventListener('change', saveSettings);

  openMtBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://monkeytype.com' });
  });

  openDictBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => { window.typingTranslateTool?.openDict?.(); }
      });
      window.close();
    } catch (e) {
      console.warn('openDict failed:', e);
    }
  });

  resetUiBtn.addEventListener('click', () => {
    localStorage.removeItem('mt_popup_theme');
    localStorage.removeItem('mt_src_lang');
    localStorage.removeItem('mt_dst_lang');
    loadSettings();
  });

  // init
  loadSettings();
})();