// background.js — Service Worker for AI Email Manager
// Handles badge updates, alarm-based polling, and message routing

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    emailRecords: [],
    settings: {
      model: "llama3",
      autoScan: false,
      maxStore: 100
    },
    stats: {
      total: 0, urgent: 0, normal: 0, low: 0,
      scheduling: 0, update: 0, spam: 0, other: 0,
      lastScan: null
    }
  });
});

// Listen for messages from popup/content
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_STATS") {
    chrome.storage.local.get(["stats", "emailRecords"], data => {
      sendResponse({ stats: data.stats, records: data.emailRecords || [] });
    });
    return true;
  }

  if (msg.type === "SAVE_RECORD") {
    saveEmailRecord(msg.record).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === "CLEAR_ALL") {
    chrome.storage.local.set({
      emailRecords: [],
      stats: { total: 0, urgent: 0, normal: 0, low: 0, scheduling: 0, update: 0, spam: 0, other: 0, lastScan: null }
    }, () => {
      chrome.action.setBadgeText({ text: "" });
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === "UPDATE_BADGE") {
    updateBadge(msg.count);
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === "ping") {
    sendResponse({ type: "pong" });
    return true;
  }
});

async function saveEmailRecord(record) {
  return new Promise(resolve => {
    chrome.storage.local.get(["emailRecords", "settings", "stats"], data => {
      let records = data.emailRecords || [];
      const settings = data.settings || { maxStore: 100 };
      let stats = data.stats || { total: 0, urgent: 0, normal: 0, low: 0, scheduling: 0, update: 0, spam: 0, other: 0 };

      // Avoid duplicates by id
      const exists = records.find(r => r.id === record.id);
      if (!exists) {
        records.unshift(record);
        if (records.length > settings.maxStore) records = records.slice(0, settings.maxStore);

        // Update stats
        stats.total = records.length;
        stats.urgent   = records.filter(r => r.priority === "URGENT").length;
        stats.normal   = records.filter(r => r.priority === "NORMAL").length;
        stats.low      = records.filter(r => r.priority === "LOW").length;
        stats.scheduling = records.filter(r => r.intent === "SCHEDULING_REQUEST").length;
        stats.update   = records.filter(r => r.intent === "UPDATE_REQUEST").length;
        stats.spam     = records.filter(r => r.isSpam).length;
        stats.other    = records.filter(r => r.intent === "OTHER").length;
        stats.lastScan = new Date().toISOString();

        chrome.storage.local.set({ emailRecords: records, stats }, resolve);
        updateBadge(stats.urgent);
      } else {
        resolve();
      }
    });
  });
}

function updateBadge(count) {
  if (count > 0) {
    chrome.action.setBadgeText({ text: String(count) });
    chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
}
