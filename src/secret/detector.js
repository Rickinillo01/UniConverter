/**
 * Secret Access Detector Module
 * Detects hidden activation sequences via keyboard (PC) and tap (Mobile).
 * Completely invisible - no visual feedback whatsoever.
 */

let keydownHandler = null;
let tapHandler = null;
let inactivityTimer = null;
let tapTimer = null;

/**
 * Sets up both keyboard and tap detection.
 * @param {Function} onActivate - Called when secret sequence is detected.
 */
export function initSecretDetector(onActivate) {
  // Clean up any existing listeners first
  destroySecretDetector();

  // ── Keyboard Detection (PC) ──
  let buffer = '';

  keydownHandler = (e) => {
    // Ignore when user is focused on form elements
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      return;
    }

    // Only care about single printable characters
    if (e.key.length !== 1) return;

    // Reset inactivity timer
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }

    buffer += e.key.toLowerCase();

    // Keep only the last 6 characters
    if (buffer.length > 6) {
      buffer = buffer.slice(-6);
    }


    // Check for the magic word
    if (buffer === 'shadow') {
      buffer = '';
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        inactivityTimer = null;
      }
      onActivate();
    }

    // Reset buffer after 3 seconds of inactivity
    inactivityTimer = setTimeout(() => {
      buffer = '';
      inactivityTimer = null;
    }, 3000);
  };

  document.addEventListener('keydown', keydownHandler);

  // ── Tap Detection (Mobile) ──
  let tapCount = 0;

  tapHandler = () => {
    tapCount++;

    // Reset tap timer on each tap
    if (tapTimer) {
      clearTimeout(tapTimer);
    }

    if (tapCount >= 5) {
      tapCount = 0;
      if (tapTimer) {
        clearTimeout(tapTimer);
        tapTimer = null;
      }
      onActivate();
      return;
    }

    // Reset count after 400ms of no taps
    tapTimer = setTimeout(() => {
      tapCount = 0;
      tapTimer = null;
    }, 400);
  };

  const logoElement = document.getElementById('converter-logo');
  if (logoElement) {
    logoElement.addEventListener('click', tapHandler);
  }
}

/**
 * Removes all event listeners cleanly.
 */
export function destroySecretDetector() {
  if (keydownHandler) {
    document.removeEventListener('keydown', keydownHandler);
    keydownHandler = null;
  }

  if (tapHandler) {
    const logoElement = document.getElementById('converter-logo');
    if (logoElement) {
      logoElement.removeEventListener('click', tapHandler);
    }
    tapHandler = null;
  }

  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }

  if (tapTimer) {
    clearTimeout(tapTimer);
    tapTimer = null;
  }
}
