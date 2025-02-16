// DOM Elements
const blockingToggle = document.getElementById('blockingToggle');
const statusText = document.getElementById('statusText');
const blockedCount = document.getElementById('blockedCount');
const aggressiveness = document.getElementById('aggressiveness');
const currentDomain = document.getElementById('currentDomain');
const whitelistButton = document.getElementById('whitelistButton');
const optionsButton = document.getElementById('optionsButton');

// Track current settings
let settings = null;
let currentUrl = null;

// Initialize popup
async function initializePopup() {
  // Get current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentUrl = new URL(tab.url);
  currentDomain.textContent = currentUrl.hostname;

  // Load settings
  settings = await chrome.storage.local.get(null);
  
  // Update UI
  updateUI();
}

// Update UI elements based on current settings
function updateUI() {
  if (!settings) return;

  // Update toggle
  blockingToggle.checked = settings.blockingEnabled;
  statusText.textContent = settings.blockingEnabled ? 'Enabled' : 'Disabled';
  
  // Update aggressiveness dropdown
  aggressiveness.value = settings.settings.aggressiveness;

  // Update whitelist button
  const isWhitelisted = settings.whitelist.includes(currentUrl.hostname);
  whitelistButton.textContent = isWhitelisted ? 'Remove from Whitelist' : 'Add to Whitelist';

  // Get today's block count
  const today = new Date().toDateString();
  const blockedToday = settings.blockStats?.[today] || 0;
  blockedCount.textContent = blockedToday;
}

// Handle blocking toggle
blockingToggle.addEventListener('change', async () => {
  settings.blockingEnabled = blockingToggle.checked;
  await chrome.storage.local.set({
    blockingEnabled: settings.blockingEnabled
  });
  updateUI();
});

// Handle aggressiveness change
aggressiveness.addEventListener('change', async () => {
  settings.settings.aggressiveness = Number(aggressiveness.value);
  await chrome.storage.local.set({
    settings: settings.settings
  });
});

// Handle whitelist button
whitelistButton.addEventListener('click', async () => {
  const hostname = currentUrl.hostname;
  const isWhitelisted = settings.whitelist.includes(hostname);
  
  if (isWhitelisted) {
    settings.whitelist = settings.whitelist.filter(d => d !== hostname);
  } else {
    settings.whitelist = [...settings.whitelist, hostname];
  }
  
  await chrome.storage.local.set({
    whitelist: settings.whitelist
  });
  updateUI();
});

// Open options page
optionsButton.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes) => {
  // Update local settings cache
  for (const [key, { newValue }] of Object.entries(changes)) {
    if (!settings) settings = {};
    settings[key] = newValue;
  }
  updateUI();
});

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePopup);