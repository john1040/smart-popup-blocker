// DOM Elements
const domainInput = document.getElementById('domainInput');
const addDomainButton = document.getElementById('addDomain');
const whitelistDomains = document.getElementById('whitelistDomains');
const aggressiveness = document.getElementById('aggressiveness');
const detectPlayButtons = document.getElementById('detectPlayButtons');
const detectMultiPopups = document.getElementById('detectMultiPopups');
const detectNoInteraction = document.getElementById('detectNoInteraction');
const enabledByDefault = document.getElementById('enabledByDefault');
const totalBlocked = document.getElementById('totalBlocked');
const blockedToday = document.getElementById('blockedToday');
const topBlockedDomains = document.getElementById('topBlockedDomains');
const resetButton = document.getElementById('resetSettings');
const exportButton = document.getElementById('exportSettings');
const importButton = document.getElementById('importSettings');

// Default settings
const DEFAULT_SETTINGS = {
  blockingEnabled: true,
  whitelist: ['google.com', 'gmail.com', 'github.com'],
  settings: {
    aggressiveness: 2,
    detectPlayButtons: true,
    detectMultiPopups: true,
    detectNoInteraction: true
  },
  sitePreferences: {},
  blockStats: {},
  totalBlocked: 0
};

// Load settings
async function loadSettings() {
  const settings = await chrome.storage.local.get(null);
  
  // Update whitelist
  displayWhitelist(settings.whitelist || []);
  
  // Update detection settings
  aggressiveness.value = settings.settings?.aggressiveness || 2;
  detectPlayButtons.checked = settings.settings?.detectPlayButtons ?? true;
  detectMultiPopups.checked = settings.settings?.detectMultiPopups ?? true;
  detectNoInteraction.checked = settings.settings?.detectNoInteraction ?? true;
  
  // Update statistics
  updateStats(settings);
}

// Display whitelist
function displayWhitelist(whitelist) {
  whitelistDomains.innerHTML = '';
  whitelist.forEach(domain => {
    const li = document.createElement('li');
    li.innerHTML = `
      ${domain}
      <button class="remove-domain" data-domain="${domain}">Remove</button>
    `;
    whitelistDomains.appendChild(li);
  });
}

// Update statistics display
function updateStats(settings) {
  // Total blocked
  totalBlocked.textContent = settings.totalBlocked || 0;
  
  // Blocked today
  const today = new Date().toDateString();
  blockedToday.textContent = settings.blockStats?.[today] || 0;
  
  // Top blocked domains
  const domains = Object.entries(settings.blockedDomains || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  
  topBlockedDomains.innerHTML = domains
    .map(([domain, count]) => `
      <li>
        <span>${domain}</span>
        <span>${count}</span>
      </li>
    `).join('');
}

// Add domain to whitelist
async function addDomain() {
  const domain = domainInput.value.trim().toLowerCase();
  if (!domain) return;
  
  // Validate domain format
  if (!/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/.test(domain)) {
    alert('Please enter a valid domain name');
    return;
  }
  
  const settings = await chrome.storage.local.get('whitelist');
  const whitelist = settings.whitelist || [];
  
  if (whitelist.includes(domain)) {
    alert('Domain already in whitelist');
    return;
  }
  
  whitelist.push(domain);
  await chrome.storage.local.set({ whitelist });
  
  domainInput.value = '';
  displayWhitelist(whitelist);
}

// Remove domain from whitelist
async function removeDomain(domain) {
  const settings = await chrome.storage.local.get('whitelist');
  const whitelist = settings.whitelist.filter(d => d !== domain);
  await chrome.storage.local.set({ whitelist });
  displayWhitelist(whitelist);
}

// Save detection settings
async function saveDetectionSettings() {
  const settings = await chrome.storage.local.get('settings');
  const newSettings = {
    ...settings.settings,
    aggressiveness: Number(aggressiveness.value),
    detectPlayButtons: detectPlayButtons.checked,
    detectMultiPopups: detectMultiPopups.checked,
    detectNoInteraction: detectNoInteraction.checked
  };
  
  await chrome.storage.local.set({ settings: newSettings });
}

// Reset settings to defaults
async function resetSettings() {
  if (confirm('Are you sure you want to reset all settings to defaults?')) {
    await chrome.storage.local.set(DEFAULT_SETTINGS);
    loadSettings();
  }
}

// Export settings
function exportSettings() {
  chrome.storage.local.get(null, (settings) => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'popup-blocker-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  });
}

// Import settings
function importSettings() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  
  input.onchange = e => {
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = async readerEvent => {
      try {
        const settings = JSON.parse(readerEvent.target.result);
        await chrome.storage.local.set(settings);
        loadSettings();
      } catch (error) {
        alert('Error importing settings: ' + error.message);
      }
    };
    
    reader.readAsText(file);
  };
  
  input.click();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', loadSettings);
addDomainButton.addEventListener('click', addDomain);
whitelistDomains.addEventListener('click', e => {
  if (e.target.classList.contains('remove-domain')) {
    removeDomain(e.target.dataset.domain);
  }
});

// Detection settings events
aggressiveness.addEventListener('change', saveDetectionSettings);
detectPlayButtons.addEventListener('change', saveDetectionSettings);
detectMultiPopups.addEventListener('change', saveDetectionSettings);
detectNoInteraction.addEventListener('change', saveDetectionSettings);

// Action button events
resetButton.addEventListener('click', resetSettings);
exportButton.addEventListener('click', exportSettings);
importButton.addEventListener('click', importSettings);

// Listen for storage changes
chrome.storage.onChanged.addListener((changes) => {
  loadSettings();
});