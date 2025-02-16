# Smart Popup Blocking Architecture Plan

## Problem Statement
Current popup blocking implementation blocks all popups indiscriminately, including legitimate ones like Google search results. We need a smarter system that can distinguish between legitimate and spam popups.

## Proposed Solution
Implement a context-aware popup blocking system with the following features:

### 1. Global Toggle System
- Quick toggle in popup UI for enabling/disabling all popup blocking
- Persistent state storage using chrome.storage.local
- Visual indicator of current blocking status
- Instant application of toggle state across all tabs
- Optional site-specific toggle controls

### 2. Heuristic-based Detection
Identify patterns commonly associated with spam/malicious popups:
- Triggered by click events on video play buttons or similar elements
- Multiple popups opened in quick succession
- Popups opened without direct user interaction
- Popups from known spam/ad domains
- Hidden elements that trigger popups

### 3. Whitelist System
- Allow trusted domains (e.g., google.com, legitimate search engines)
- User-configurable whitelist in options page
- Default whitelist of commonly used legitimate services

### 4. Technical Implementation

#### Background Service Worker (background.js)
```javascript
// Store whitelist and settings
// Handle popup blocking decisions
// Communicate with content script
// Manage global blocking state
// Broadcast state changes to all tabs
```

#### Content Script (content.js)
```javascript
// Monitor user interactions
// Detect suspicious patterns
// Send context to background script
// React to blocking state changes
```

#### Popup UI (popup.html/js)
- Simple, clean interface with:
  - Prominent ON/OFF toggle switch
  - Current blocking status indicator
  - Quick access to common settings
  - Site-specific controls (optional)

#### Options Page
- Allow users to:
  - Add/remove domains to whitelist
  - Enable/disable specific detection features
  - Set blocking aggressiveness level
  - Configure default blocking state
  - Set per-site preferences

### 5. State Management
1. Global State:
   - Blocking enabled/disabled
   - Whitelist
   - Detection settings
   - Per-site preferences

2. Storage Schema:
```javascript
{
  blockingEnabled: boolean,
  whitelist: string[],
  settings: {
    aggressiveness: number,
    detectPlayButtons: boolean,
    detectMultiPopups: boolean,
    // other feature flags
  },
  sitePreferences: {
    [domain: string]: {
      enabled: boolean,
      customRules: object
    }
  }
}
```

### 6. Detection Algorithm

1. When a popup is about to open, check:
   - Global blocking state
   - Source domain (whitelist check)
   - User interaction context
   - Timing of popup (relative to clicks/interactions)
   - DOM context (what element triggered it)
   
2. Scoring system:
   - Each factor contributes to a "spam score"
   - Higher score = more likely to be spam
   - Configurable threshold for blocking

### 7. Implementation Steps

1. Update manifest.json:
   - Add necessary permissions
   - Configure content script matching patterns

2. Create new background.js:
   - Implement core blocking logic
   - Handle whitelist management
   - Process context from content script
   - Manage global state
   - Handle state broadcasting

3. Create new content.js:
   - Add interaction monitoring
   - Implement pattern detection
   - Send context to background script
   - Listen for state changes

4. Update popup UI:
   - Add toggle switch component
   - Implement state management
   - Add quick settings access
   - Show current status

5. Update options page:
   - Add whitelist management UI
   - Add configuration options
   - Save/load user preferences
   - Add detailed toggle controls

## Code Structure

```plaintext
extension/
├── manifest.json
├── background.js (popup blocking logic)
├── content.js (page monitoring)
├── options/
│   ├── options.html
│   ├── options.css
│   └── options.js (whitelist management)
└── popup/
    ├── popup.html (includes toggle UI)
    ├── popup.css
    └── popup.js (quick controls)
```

## Security Considerations

1. Prevent whitelist spoofing
2. Secure storage of user preferences
3. Avoid exposing blocking patterns to websites
4. Handle edge cases gracefully
5. Protect toggle state from manipulation

## Future Improvements

1. Machine learning-based detection
2. Community-driven blocklist
3. Sync settings across devices
4. Statistics dashboard
5. Regular updates to detection patterns
6. Advanced per-site configuration
7. Toggle state sync across devices