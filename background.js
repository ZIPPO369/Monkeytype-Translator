// MV3 service worker: injectuje extension.js do aktuálního tabu až na požadavek z waiter.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== 'inject-extension') return;
  const tabId = sender?.tab?.id;
  if (!tabId) {
    sendResponse({ ok: false, error: 'No tabId from sender' });
    return; 
  }
  try {
    chrome.scripting.executeScript({ target: { tabId }, files: ['extension.js'] }, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ ok: true });
      }
    });
    return true; // async sendResponse
  } catch (e) {
    sendResponse({ ok: false, error: e?.message || String(e) });
  }
});