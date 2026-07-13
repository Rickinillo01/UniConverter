// =============================================================================
// messages.js - Message management module with self-destruct logic
// =============================================================================

import { db, ref, push, get, remove } from '../firebase.js';

/**
 * Creates a message object with TTL and expiration metadata.
 * @param {string} text - The message text content
 * @param {object} user - Firebase auth user object with .uid and .displayName
 * @param {number} ttlMs - Time-to-live in milliseconds
 * @returns {object} Message object ready to be pushed to Firebase
 */
export function createMessage(text, user, ttlMs) {
  const now = Date.now();
  return {
    text: text,
    senderId: user.uid,
    senderName: user.displayName,
    timestamp: now,
    ttl: ttlMs,
    expiresAt: now + ttlMs
  };
}

/**
 * Pushes a message to Firebase at the 'messages/' path.
 * @param {string} text - The message text content
 * @param {object} user - Firebase auth user object
 * @param {number} ttlMs - Time-to-live in milliseconds
 * @returns {Promise} Firebase push promise
 */
export function sendMessage(text, user, ttlMs) {
  const messageObj = createMessage(text, user, ttlMs);
  return push(ref(db, 'messages'), messageObj);
}

/**
 * Starts a cleanup interval that removes expired messages from Firebase.
 * Runs every 10 seconds, queries all messages and deletes those past expiration.
 * @returns {number} The interval ID (use with stopCleanupInterval)
 */
export function startCleanupInterval() {
  const intervalId = setInterval(async () => {
    try {
      const snapshot = await get(ref(db, 'messages'));
      if (!snapshot.exists()) return;

      const now = Date.now();
      const messages = snapshot.val();

      Object.keys(messages).forEach((key) => {
        const msg = messages[key];
        if (msg.expiresAt < now) {
          remove(ref(db, 'messages/' + key));
        }
      });
    } catch (error) {
      console.error('[ShadowChat] Cleanup error:', error);
    }
  }, 10000);

  return intervalId;
}

/**
 * Stops the cleanup interval.
 * @param {number} intervalId - The interval ID returned by startCleanupInterval
 */
export function stopCleanupInterval(intervalId) {
  clearInterval(intervalId);
}

/**
 * Formats a timestamp into a 24h zero-padded time string (e.g., '09:05').
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Formatted time string like '12:30'
 */
export function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Returns the available TTL options for message self-destruct.
 * @returns {Array<{label: string, value: number}>} Array of TTL option objects
 */
export function getTTLOptions() {
  return [
    { label: '1 min', value: 60000 },
    { label: '5 min', value: 300000 },
    { label: '15 min', value: 900000 },
    { label: '1 hora', value: 3600000 },
    { label: '24 horas', value: 86400000 }
  ];
}

/**
 * Calculates the remaining time as a percentage (0 to 1) for the progress bar.
 * Returns 0 if the message has expired.
 * @param {number} expiresAt - The expiration timestamp in milliseconds
 * @param {number} [ttl] - Original TTL in milliseconds (needed for accurate 0-1 ratio)
 * @returns {number} Remaining time ratio between 0 and 1
 */
export function getRemainingTime(expiresAt, ttl) {
  const now = Date.now();
  if (now >= expiresAt) return 0;

  const remaining = expiresAt - now;

  // If ttl is provided, return a proper 0-1 ratio
  if (ttl && ttl > 0) {
    return Math.min(1, remaining / ttl);
  }

  // Fallback: return 1 if not expired (caller should provide ttl for accuracy)
  return 1;
}
