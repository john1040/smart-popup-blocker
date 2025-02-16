// Track user interactions and detect suspicious patterns
let settings = null;

// Initialize settings
chrome.runtime.sendMessage({ type: 'getSettings' }, response => {
  settings = response;
});

// Listen for settings updates
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'settingsUpdate') {
    settings = message.settings;
  }
});

// Helper function to check if an element is hidden
function isElementHidden(element) {
  const style = window.getComputedStyle(element);
  return style.display === 'none' || 
         style.visibility === 'hidden' || 
         style.opacity === '0' ||
         element.offsetParent === null;
}

// Check if element matches common ad/video play button patterns
function isLikelyPlayButton(element) {
  const text = element.textContent?.toLowerCase() || '';
  const className = element.className?.toLowerCase() || '';
  const id = element.id?.toLowerCase() || '';
  
  const patterns = [
    'play',
    'video',
    'watch',
    'stream',
    'movie',
    'episode'
  ];

  return patterns.some(pattern => 
    text.includes(pattern) ||
    className.includes(pattern) ||
    id.includes(pattern)
  );
}

// Detect suspicious elements
function detectSuspiciousElement(element) {
  if (!settings?.settings.detectPlayButtons) return false;

  const suspicious = {
    isHidden: isElementHidden(element),
    isPlayButton: isLikelyPlayButton(element),
    hasClickHandler: element.onclick != null || 
                    element.getAttribute('onclick') != null,
    isAbsolute: window.getComputedStyle(element).position === 'absolute',
    isFixed: window.getComputedStyle(element).position === 'fixed',
    isLargeOverlay: false
  };

  // Check if element is a large overlay
  if (element.offsetWidth && element.offsetHeight) {
    const viewportArea = window.innerWidth * window.innerHeight;
    const elementArea = element.offsetWidth * element.offsetHeight;
    suspicious.isLargeOverlay = elementArea > (viewportArea * 0.5);
  }

  // Report if element has multiple suspicious characteristics
  let suspiciousCount = Object.values(suspicious).filter(Boolean).length;
  if (suspiciousCount >= 2) {
    chrome.runtime.sendMessage({
      type: 'suspiciousElement',
      data: suspicious
    });
    return true;
  }

  return false;
}

// Monitor all click events
document.addEventListener('click', (event) => {
  // Notify background script of user interaction
  chrome.runtime.sendMessage({ type: 'userInteraction' });

  // Check clicked element and its parents for suspicious patterns
  let element = event.target;
  while (element && element !== document.body) {
    if (detectSuspiciousElement(element)) {
      // If suspicious element is found, apply extra scrutiny to popups
      console.log('Suspicious element clicked:', element);
    }
    element = element.parentElement;
  }
}, true);

// Monitor dynamically added elements
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        detectSuspiciousElement(node);
      }
    }
  }
});

// Start observing document for dynamic changes
observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});

// Additional event listeners for various user interactions
const interactionEvents = ['mousedown', 'keydown', 'touchstart'];
interactionEvents.forEach(eventType => {
  document.addEventListener(eventType, () => {
    chrome.runtime.sendMessage({ type: 'userInteraction' });
  }, true);
});

// Watch for window.open calls
const originalWindowOpen = window.open;
window.open = function(...args) {
  // Notify background script of popup attempt
  chrome.runtime.sendMessage({ 
    type: 'windowOpen',
    data: { url: args[0] }
  });
  
  return originalWindowOpen.apply(this, args);
};