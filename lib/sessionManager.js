import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ============================
// ES6 MODULE COMPATIBILITY
// ============================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================
// CONFIGURATION
// ============================
const PREFERENCES_FILE = path.join(__dirname, '..', 'data', 'session-preferences.json');
const MAX_SESSIONS = 10000; // Safety limit to prevent unbounded growth

// ============================
// SESSION STORAGE
// ============================

/**
 * Session metadata storage
 * Format: { chatId: { model: 'sonnet', tools: ['Bash','Read'], permissions: 'strict', ... } }
 */
const sessionPreferences = new Map();

/**
 * Current session metadata (active sessions)
 * Format: { chatId: { sessionId: 'xxx', pid: 123, startTime: Date, ... } }
 */
const sessionMetadata = new Map();

// ============================
// PREFERENCE MANAGEMENT
// ============================

/**
 * Get session preferences for a chat
 *
 * @param {string|number} chatId - Chat ID to get preferences for
 * @returns {Object} Session preferences object with keys like model, tools, permissions
 *
 * @example
 * const prefs = getSessionPreferences(12345);
 * // Returns: { model: 'sonnet', tools: ['Bash', 'Read'], permissions: 'strict' }
 */
export function getSessionPreferences(chatId) {
  const key = chatId?.toString();
  return sessionPreferences.get(key) || {};
}

/**
 * Set a session preference for a chat
 *
 * @param {string|number} chatId - Chat ID
 * @param {string} key - Preference key (e.g., 'model', 'tools', 'permissions')
 * @param {any} value - Preference value
 *
 * @example
 * setSessionPreference(12345, 'model', 'opus');
 * setSessionPreference(12345, 'tools', ['Bash', 'Read', 'Write']);
 * setSessionPreference(12345, 'permissions', 'relaxed');
 */
export function setSessionPreference(chatId, key, value) {
  const chatKey = chatId?.toString();

  if (!chatKey) {
    console.warn('⚠️ Invalid chatId provided to setSessionPreference');
    return;
  }

  // Get existing preferences or create new object
  const prefs = sessionPreferences.get(chatKey) || {};

  // Update preference
  prefs[key] = value;

  // Safety check: prevent unbounded growth
  if (sessionPreferences.size >= MAX_SESSIONS && !sessionPreferences.has(chatKey)) {
    console.warn(`⚠️ Session preferences limit reached (${MAX_SESSIONS}), clearing oldest entries`);
    // Keep only last 50% of entries
    const entries = Array.from(sessionPreferences.entries());
    sessionPreferences.clear();
    entries.slice(-Math.floor(MAX_SESSIONS / 2)).forEach(([id, prefs]) => {
      sessionPreferences.set(id, prefs);
    });
  }

  // Store updated preferences
  sessionPreferences.set(chatKey, prefs);

  console.log(`🔧 Session preference set for chat ${chatId}: ${key} = ${JSON.stringify(value)}`);

  // Auto-save to disk
  savePreferences();
}

/**
 * Save preferences to disk (data/session-preferences.json)
 * Creates the data directory if it doesn't exist
 */
export function savePreferences() {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(PREFERENCES_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('📁 Created data directory');
    }

    // Convert Map to plain object
    const data = Object.fromEntries(sessionPreferences);

    // Write to disk with pretty formatting
    fs.writeFileSync(PREFERENCES_FILE, JSON.stringify(data, null, 2), 'utf-8');

    console.log(`💾 Saved ${sessionPreferences.size} session preference(s) to disk`);
  } catch (error) {
    console.error('⚠️ Error saving session preferences:', error.message);
  }
}

/**
 * Load preferences from disk
 * Called automatically on module import
 */
export function loadPreferences() {
  try {
    if (fs.existsSync(PREFERENCES_FILE)) {
      const data = JSON.parse(fs.readFileSync(PREFERENCES_FILE, 'utf-8'));

      // Convert plain object to Map
      Object.entries(data).forEach(([chatId, prefs]) => {
        sessionPreferences.set(chatId, prefs);
      });

      console.log(`✅ Loaded ${sessionPreferences.size} session preference(s) from disk`);
    } else {
      console.log('📝 No existing session preferences file found (will be created on first save)');
    }
  } catch (error) {
    console.error('⚠️ Error loading session preferences:', error.message);
  }
}

// ============================
// SESSION METADATA
// ============================

/**
 * Get current session metadata for a chat
 * This includes runtime information like sessionId, pid, startTime
 *
 * @param {string|number} chatId - Chat ID
 * @returns {Object|null} Session metadata or null if no active session
 *
 * @example
 * const metadata = getSessionMetadata(12345);
 * // Returns: { sessionId: 'abc123', pid: 5678, startTime: Date, directory: '/path/to/dir' }
 */
export function getSessionMetadata(chatId) {
  const key = chatId?.toString();
  return sessionMetadata.get(key) || null;
}

/**
 * Set session metadata for a chat
 * This is used to track active session information
 *
 * @param {string|number} chatId - Chat ID
 * @param {Object} metadata - Session metadata object
 *
 * @example
 * setSessionMetadata(12345, {
 *   sessionId: 'abc123',
 *   pid: 5678,
 *   startTime: new Date(),
 *   directory: '/path/to/dir'
 * });
 */
export function setSessionMetadata(chatId, metadata) {
  const key = chatId?.toString();

  if (!key) {
    console.warn('⚠️ Invalid chatId provided to setSessionMetadata');
    return;
  }

  sessionMetadata.set(key, {
    ...metadata,
    lastUpdated: new Date()
  });

  console.log(`📊 Session metadata set for chat ${chatId}`);
}

/**
 * Clear session metadata for a chat
 * Called when a session is stopped or closed
 *
 * @param {string|number} chatId - Chat ID
 *
 * @example
 * clearSessionMetadata(12345);
 */
export function clearSessionMetadata(chatId) {
  const key = chatId?.toString();

  if (!key) {
    console.warn('⚠️ Invalid chatId provided to clearSessionMetadata');
    return;
  }

  const deleted = sessionMetadata.delete(key);

  if (deleted) {
    console.log(`🗑️ Session metadata cleared for chat ${chatId}`);
  }
}

/**
 * Clear session preferences for a chat
 * This removes saved preferences like model, tools, permissions
 *
 * @param {string|number} chatId - Chat ID
 *
 * @example
 * clearSessionPreferences(12345);
 */
export function clearSessionPreferences(chatId) {
  const key = chatId?.toString();

  if (!key) {
    console.warn('⚠️ Invalid chatId provided to clearSessionPreferences');
    return;
  }

  const deleted = sessionPreferences.delete(key);

  if (deleted) {
    console.log(`🗑️ Session preferences cleared for chat ${chatId}`);
    savePreferences();
  }
}

/**
 * Get all session preferences (for debugging/admin purposes)
 *
 * @returns {Object} All session preferences as plain object
 */
export function getAllPreferences() {
  return Object.fromEntries(sessionPreferences);
}

/**
 * Get all session metadata (for debugging/admin purposes)
 *
 * @returns {Object} All session metadata as plain object
 */
export function getAllMetadata() {
  return Object.fromEntries(sessionMetadata);
}

// ============================
// INITIALIZATION
// ============================

// Load preferences on module import
loadPreferences();

console.log('✅ Session manager initialized');

// ============================
// EXPORTS
// ============================
export default {
  getSessionPreferences,
  setSessionPreference,
  savePreferences,
  loadPreferences,
  getSessionMetadata,
  setSessionMetadata,
  clearSessionMetadata,
  clearSessionPreferences,
  getAllPreferences,
  getAllMetadata
};
