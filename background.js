// Background service worker for Tab Notes extension
// Handles badge updates to show when a tab has a note

chrome.tabs.onActivated.addListener(({ tabId }) => {
  updateBadgeForTab(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    updateBadgeForTab(tabId);
  }
});

function updateBadgeForTab(tabId) {
  chrome.tabs.get(tabId, (tab) => {
    if (!tab || !tab.url) return;
    const key = urlToKey(tab.url);
    chrome.storage.local.get([key], (result) => {
      if (result[key] && result[key].note) {
        chrome.action.setBadgeText({ text: '📌', tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#f5c542', tabId });
      } else {
        chrome.action.setBadgeText({ text: '', tabId });
      }
    });
  });
}

function urlToKey(url) {
  const encoded = btoa(unescape(encodeURIComponent(url)));
  return 'tabnote_' + encoded.replace(/[^a-zA-Z0-9]/g, '').substring(0, 80);
}
