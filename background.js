// Default settings
const DEFAULT_SETTINGS = {
  blockingEnabled: true,
  whitelist: ['google.com', 'gmail.com', 'github.com'],
  settings: {
    aggressiveness: 2, // 1-3: low, medium, high
    detectPlayButtons: true,
    detectMultiPopups: true,
    detectNoInteraction: true
  },
  sitePreferences: {}
};

// Initialize storage with default settings
chrome.runtime.onInstalled.addListener(async () => {
  const storage = await chrome.storage.local.get(null);
  if (Object.keys(storage).length === 0) {
    await chrome.storage.local.set(DEFAULT_SETTINGS);
  }
});

// Cache for quick access
let currentSettings = null;

// Load settings into cache
async function loadSettings() {
  currentSettings = await chrome.storage.local.get(null);
}

// Load settings initially
loadSettings();

// Listen for settings changes
chrome.storage.onChanged.addListener((changes) => {
  loadSettings();
  broadcastSettingsUpdate();
});

// Broadcast settings to all tabs
async function broadcastSettingsUpdate() {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    try {
      chrome.tabs.sendMessage(tab.id, {
        type: 'settingsUpdate',
        settings: currentSettings
      });
    } catch (error) {
      console.error('Error broadcasting to tab:', error);
    }
  }
}

// Store information about user interactions per tab
const tabInteractions = new Map();

// Track popup attempts per tab
const popupAttempts = new Map();

// Store interaction data
function updateTabInteraction(tabId, data) {
  if (!tabInteractions.has(tabId)) {
    tabInteractions.set(tabId, {
      lastInteraction: 0,
      clickCount: 0,
      suspiciousElements: []
    });
  }
  const interaction = tabInteractions.get(tabId);
  Object.assign(interaction, data);
}

// Calculate spam score for a popup attempt
function calculateSpamScore(tabId, url, context = {}) {
  if (!currentSettings?.blockingEnabled) return 0;
  
  let score = 0;
  const interaction = tabInteractions.get(tabId) || {};
  const attempts = popupAttempts.get(tabId) || [];
  
  // Check whitelist
  const isWhitelisted = currentSettings.whitelist.some(domain => 
    url.includes(domain));
  if (isWhitelisted) return 0;

  // Check user interaction
  const timeSinceInteraction = Date.now() - interaction.lastInteraction;
  if (timeSinceInteraction > 1000) {
    score += 30;
  }

  // Check multiple popups
  if (attempts.length > 0) {
    const recentAttempts = attempts.filter(t => 
      Date.now() - t < 5000).length;
    score += recentAttempts * 20;
  }

  // Check context from content script
  if (context.isPlayButton && currentSettings.settings.detectPlayButtons) {
    score += 25;
  }
  if (context.isHidden) {
    score += 40;
  }

  // Adjust based on aggressiveness
  score *= (currentSettings.settings.aggressiveness / 2);

  return score;
}

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;
  if (!tabId) return;

  switch (message.type) {
    case 'userInteraction':
      updateTabInteraction(tabId, {
        lastInteraction: Date.now(),
        clickCount: (tabInteractions.get(tabId)?.clickCount || 0) + 1
      });
      break;
    
    case 'suspiciousElement':
      const elements = tabInteractions.get(tabId)?.suspiciousElements || [];
      elements.push(message.data);
      updateTabInteraction(tabId, { suspiciousElements: elements });
      break;

    case 'getSettings':
      sendResponse(currentSettings);
      break;
  }
});

// Listen for new tab creation
chrome.tabs.onCreated.addListener(async (tab) => {
  if (!tab.openerTabId) return;

  const tabId = tab.openerTabId;
  popupAttempts.set(tabId, [
    ...(popupAttempts.get(tabId) || []),
    Date.now()
  ]);

  try {
    const openerTab = await chrome.tabs.get(tab.openerTabId);
    const spamScore = calculateSpamScore(tabId, openerTab.url);

    // Block if spam score exceeds threshold
    if (spamScore >= 50) {
      await chrome.tabs.remove(tab.id);
      console.log(`Popup blocked (score: ${spamScore})`);
    }
  } catch (error) {
    console.error('Error handling popup:', error);
  }
});

// Listen for window creation (popup windows)
chrome.windows.onCreated.addListener(async (window) => {
  if (window.id === 1) return;

  const tabs = await chrome.tabs.query({ active: true });
  if (tabs.length === 0) return;

  const activeTab = tabs[0];
  const spamScore = calculateSpamScore(activeTab.id, activeTab.url);

  if (spamScore >= 50) {
    try {
      await chrome.windows.remove(window.id);
      console.log(`Popup window blocked (score: ${spamScore})`);
    } catch (error) {
      console.error('Error closing popup window:', error);
    }
  }
});

// Clean up old data periodically
setInterval(() => {
  const tenMinutesAgo = Date.now() - 600000;
  
  for (const [tabId, attempts] of popupAttempts.entries()) {
    popupAttempts.set(tabId, attempts.filter(time => time > tenMinutesAgo));
    if (popupAttempts.get(tabId).length === 0) {
      popupAttempts.delete(tabId);
    }
  }

  for (const [tabId, interaction] of tabInteractions.entries()) {
    if (interaction.lastInteraction < tenMinutesAgo) {
      tabInteractions.delete(tabId);
    }
  }
}, 300000); // Run every 5 minutes