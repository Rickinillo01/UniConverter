// =============================================================================
// chat.js - Main chat module. Core of the hidden ShadowChat interface.
// =============================================================================

import {
  db, auth, ref, push, set, onValue, onChildAdded, onChildRemoved,
  remove, off, query, orderByChild, get
} from '../firebase.js';

import {
  createMessage, sendMessage, startCleanupInterval, stopCleanupInterval,
  formatTimestamp, getTTLOptions, getRemainingTime
} from './messages.js';

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------
let _listeners = [];          // Firebase listener unsubscribe functions
let _cleanupIntervalId = null;
let _progressIntervalId = null;
let _currentUser = null;
let _panicHandler = null;
let _currentTTLIndex = 1;     // Default to '5 min' (index 1)
let _container = null;

// ---------------------------------------------------------------------------
// SVG Icons
// ---------------------------------------------------------------------------
const ICON_SHIELD = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;

const ICON_GEAR = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;

const ICON_BOLT = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;

const ICON_SEND = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;

const ICON_GHOST = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"><path d="M12 2a8 8 0 0 0-8 8v12l3-3 2 2 3-3 3 3 2-2 3 3V10a8 8 0 0 0-8-8z"/><circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/></svg>`;

// ---------------------------------------------------------------------------
// UI Builder helpers
// ---------------------------------------------------------------------------

/**
 * Injects scoped styles for the chat UI into the document head.
 */
function _injectStyles() {
  if (document.getElementById('shadowchat-styles')) return;

  const style = document.createElement('style');
  style.id = 'shadowchat-styles';
  style.textContent = `
    /* ---- ShadowChat Layout ---- */
    #chat-view {
      width: 100%;
      height: 100vh;
      height: 100dvh;
    }
    .sc-wrapper {
      display: flex;
      flex-direction: column;
      height: 100vh;
      height: 100dvh;
      width: 100%;
      background: #0a0a0f;
      color: #e0e0e0;
      font-family: 'Inter', 'Segoe UI', sans-serif;
      position: relative;
      overflow: hidden;
    }

    /* ---- Header ---- */
    .sc-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: linear-gradient(135deg, #0d0d14, #141420);
      border-bottom: 1px solid rgba(0, 245, 212, 0.12);
      flex-shrink: 0;
      z-index: 10;
    }
    .sc-header-icon {
      color: #00f5d4;
      display: flex;
      align-items: center;
      opacity: 0.7;
    }
    .sc-header-title {
      font-size: 1.1rem;
      font-weight: 700;
      letter-spacing: 1px;
      color: #00f5d4;
      text-shadow: 0 0 8px rgba(0, 245, 212, 0.4), 0 0 20px rgba(0, 245, 212, 0.15);
      flex-grow: 1;
    }
    .sc-online-badge {
      font-size: 0.7rem;
      background: rgba(0, 245, 212, 0.15);
      color: #00f5d4;
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: 600;
      white-space: nowrap;
    }
    .sc-header-btn {
      background: none;
      border: none;
      color: #888;
      cursor: pointer;
      padding: 6px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      transition: background 0.2s, color 0.2s;
    }
    .sc-header-btn:hover {
      background: rgba(255, 255, 255, 0.06);
      color: #ccc;
    }
    .sc-header-btn.panic {
      color: #ff4757;
    }
    .sc-header-btn.panic:hover {
      background: rgba(255, 71, 87, 0.12);
      color: #ff6b81;
    }

    /* ---- TTL Popover ---- */
    .sc-ttl-popover {
      display: none;
      position: absolute;
      top: 52px;
      right: 60px;
      background: #1a1a2e;
      border: 1px solid rgba(0, 245, 212, 0.15);
      border-radius: 10px;
      padding: 8px 0;
      z-index: 20;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
      min-width: 140px;
    }
    .sc-ttl-popover.visible {
      display: block;
    }
    .sc-ttl-option {
      padding: 8px 16px;
      cursor: pointer;
      font-size: 0.85rem;
      color: #ccc;
      transition: background 0.15s, color 0.15s;
    }
    .sc-ttl-option:hover {
      background: rgba(0, 245, 212, 0.1);
      color: #00f5d4;
    }
    .sc-ttl-option.active {
      color: #00f5d4;
      font-weight: 600;
    }

    /* ---- Messages Area ---- */
    .sc-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      scroll-behavior: smooth;
    }
    .sc-messages::-webkit-scrollbar {
      width: 4px;
    }
    .sc-messages::-webkit-scrollbar-track {
      background: transparent;
    }
    .sc-messages::-webkit-scrollbar-thumb {
      background: rgba(0, 245, 212, 0.2);
      border-radius: 2px;
    }

    /* ---- Empty State ---- */
    .sc-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      gap: 12px;
      color: #555;
      user-select: none;
    }
    .sc-empty-text {
      font-size: 0.9rem;
      font-style: italic;
    }

    /* ---- Message Bubbles ---- */
    .sc-msg {
      max-width: 75%;
      padding: 10px 14px 6px;
      border-radius: 14px;
      position: relative;
      animation: sc-fadeIn 0.3s ease;
      word-break: break-word;
    }
    @keyframes sc-fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .msg-sent {
      align-self: flex-end;
      background: linear-gradient(135deg, #00b894, #00cec9);
      color: #0a0a0f;
      border-bottom-right-radius: 4px;
    }
    .msg-received {
      align-self: flex-start;
      background: #1a1a2e;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-bottom-left-radius: 4px;
    }
    .sc-msg-sender {
      font-size: 0.68rem;
      font-weight: 600;
      color: #00f5d4;
      margin-bottom: 2px;
      opacity: 0.8;
    }
    .sc-msg-text {
      font-size: 0.9rem;
      line-height: 1.4;
    }
    .sc-msg-time {
      font-size: 0.65rem;
      opacity: 0.5;
      text-align: right;
      margin-top: 4px;
    }
    .msg-sent .sc-msg-time {
      color: #0a0a0f;
    }

    /* ---- Self-destruct progress bar ---- */
    .sc-msg-ttl-bar {
      height: 2px;
      background: rgba(0, 245, 212, 0.5);
      border-radius: 1px;
      margin-top: 6px;
      transition: width 1s linear;
    }
    .msg-sent .sc-msg-ttl-bar {
      background: rgba(10, 10, 15, 0.3);
    }

    /* ---- Expiring animation ---- */
    .msg-expiring {
      animation: sc-fadeOut 0.6s ease forwards;
    }
    @keyframes sc-fadeOut {
      from { opacity: 1; transform: scale(1); }
      to   { opacity: 0; transform: scale(0.95); }
    }

    /* ---- Input Area ---- */
    .sc-input-area {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: linear-gradient(135deg, #0d0d14, #141420);
      border-top: 1px solid rgba(0, 245, 212, 0.08);
      flex-shrink: 0;
    }
    .sc-ttl-btn {
      background: rgba(0, 245, 212, 0.1);
      color: #00f5d4;
      border: 1px solid rgba(0, 245, 212, 0.2);
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.2s;
      flex-shrink: 0;
    }
    .sc-ttl-btn:hover {
      background: rgba(0, 245, 212, 0.2);
    }
    .sc-input {
      flex: 1;
      background: #12121c;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 10px 16px;
      color: #e0e0e0;
      font-size: 0.9rem;
      outline: none;
      transition: border-color 0.2s;
    }
    .sc-input::placeholder {
      color: #555;
    }
    .sc-input:focus {
      border-color: rgba(0, 245, 212, 0.3);
    }
    .sc-send-btn {
      background: linear-gradient(135deg, #00b894, #00cec9);
      border: none;
      color: #0a0a0f;
      padding: 10px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.15s, box-shadow 0.2s;
      flex-shrink: 0;
    }
    .sc-send-btn:hover {
      transform: scale(1.08);
      box-shadow: 0 0 12px rgba(0, 245, 212, 0.3);
    }
    .sc-send-btn:active {
      transform: scale(0.95);
    }
  `;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Build DOM
// ---------------------------------------------------------------------------

/**
 * Builds the full chat UI inside the given container.
 * @param {HTMLElement} container
 * @returns {{ messagesEl: HTMLElement, onlineBadge: HTMLElement, ttlBtn: HTMLElement, input: HTMLElement }}
 */
function _buildUI(container) {
  _injectStyles();
  container.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'sc-wrapper';

  // ---- Header ----
  const header = document.createElement('div');
  header.className = 'sc-header';

  const shieldIcon = document.createElement('span');
  shieldIcon.className = 'sc-header-icon';
  shieldIcon.innerHTML = ICON_SHIELD;

  const title = document.createElement('span');
  title.className = 'sc-header-title';
  title.textContent = 'ShadowChat';

  const onlineBadge = document.createElement('span');
  onlineBadge.className = 'sc-online-badge';
  onlineBadge.textContent = '0 online';

  const gearBtn = document.createElement('button');
  gearBtn.className = 'sc-header-btn';
  gearBtn.title = 'TTL Settings';
  gearBtn.innerHTML = ICON_GEAR;

  const panicBtn = document.createElement('button');
  panicBtn.className = 'sc-header-btn panic';
  panicBtn.id = 'panic-btn';
  panicBtn.title = 'Exit';
  panicBtn.innerHTML = ICON_BOLT;

  header.append(shieldIcon, title, onlineBadge, gearBtn, panicBtn);

  // ---- TTL Popover ----
  const ttlPopover = document.createElement('div');
  ttlPopover.className = 'sc-ttl-popover';
  const ttlOptions = getTTLOptions();
  ttlOptions.forEach((opt, i) => {
    const optEl = document.createElement('div');
    optEl.className = 'sc-ttl-option' + (i === _currentTTLIndex ? ' active' : '');
    optEl.textContent = opt.label;
    optEl.addEventListener('click', () => {
      _currentTTLIndex = i;
      ttlBtn.textContent = opt.label;
      ttlPopover.querySelectorAll('.sc-ttl-option').forEach((el, j) => {
        el.classList.toggle('active', j === i);
      });
      ttlPopover.classList.remove('visible');
    });
    ttlPopover.appendChild(optEl);
  });

  gearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    ttlPopover.classList.toggle('visible');
  });

  // Close popover on outside click
  document.addEventListener('click', () => {
    ttlPopover.classList.remove('visible');
  });

  // ---- Messages area ----
  const messagesEl = document.createElement('div');
  messagesEl.className = 'sc-messages';
  messagesEl.id = 'messages-container';

  // Empty state
  const emptyState = document.createElement('div');
  emptyState.className = 'sc-empty';
  emptyState.id = 'sc-empty-state';
  emptyState.innerHTML = ICON_GHOST;
  const emptyText = document.createElement('span');
  emptyText.className = 'sc-empty-text';
  emptyText.textContent = 'No hay mensajes aún...';
  emptyState.appendChild(emptyText);
  messagesEl.appendChild(emptyState);

  // ---- Input area ----
  const inputArea = document.createElement('div');
  inputArea.className = 'sc-input-area';

  const ttlBtn = document.createElement('button');
  ttlBtn.className = 'sc-ttl-btn';
  ttlBtn.textContent = ttlOptions[_currentTTLIndex].label;
  ttlBtn.addEventListener('click', () => {
    _currentTTLIndex = (_currentTTLIndex + 1) % ttlOptions.length;
    ttlBtn.textContent = ttlOptions[_currentTTLIndex].label;
  });

  const input = document.createElement('input');
  input.className = 'sc-input';
  input.type = 'text';
  input.placeholder = 'Escribe un mensaje...';

  const sendBtn = document.createElement('button');
  sendBtn.className = 'sc-send-btn';
  sendBtn.title = 'Enviar';
  sendBtn.innerHTML = ICON_SEND;

  inputArea.append(ttlBtn, input, sendBtn);

  // ---- Assemble ----
  wrapper.append(header, ttlPopover, messagesEl, inputArea);
  container.appendChild(wrapper);

  // ---- Send handlers ----
  const doSend = () => {
    const text = input.value.trim();
    if (!text || !_currentUser) return;
    const ttl = ttlOptions[_currentTTLIndex].value;
    sendMessage(text, _currentUser, ttl);
    input.value = '';
    input.focus();
  };

  sendBtn.addEventListener('click', doSend);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      doSend();
    }
  });

  // Panic button
  panicBtn.addEventListener('click', () => {
    if (_panicHandler) _panicHandler();
  });

  return { messagesEl, onlineBadge, ttlBtn, input };
}

// ---------------------------------------------------------------------------
// Message rendering
// ---------------------------------------------------------------------------

/**
 * Creates a message DOM element.
 * @param {string} key - Firebase message key
 * @param {object} msg - Message data object
 * @returns {HTMLElement}
 */
function _createMessageElement(key, msg) {
  const isMine = msg.senderId === _currentUser.uid;

  const el = document.createElement('div');
  el.className = `sc-msg ${isMine ? 'msg-sent' : 'msg-received'}`;
  el.dataset.key = key;

  // Sender name (received messages only)
  if (!isMine) {
    const sender = document.createElement('div');
    sender.className = 'sc-msg-sender';
    sender.textContent = msg.senderName || 'Anónimo';
    el.appendChild(sender);
  }

  // Text
  const text = document.createElement('div');
  text.className = 'sc-msg-text';
  text.textContent = msg.text;
  el.appendChild(text);

  // Time
  const time = document.createElement('div');
  time.className = 'sc-msg-time';
  time.textContent = formatTimestamp(msg.timestamp);
  el.appendChild(time);

  // Self-destruct progress bar
  const bar = document.createElement('div');
  bar.className = 'sc-msg-ttl-bar';
  const remaining = getRemainingTime(msg.expiresAt, msg.ttl);
  bar.style.width = `${remaining * 100}%`;
  el.appendChild(bar);

  return el;
}

/**
 * Hides the empty state placeholder if messages exist.
 * @param {HTMLElement} messagesEl
 */
function _toggleEmptyState(messagesEl) {
  const empty = messagesEl.querySelector('#sc-empty-state');
  if (!empty) return;
  const hasMessages = messagesEl.querySelectorAll('.sc-msg').length > 0;
  empty.style.display = hasMessages ? 'none' : 'flex';
}

/**
 * Returns true if the messages container is scrolled near the bottom.
 * @param {HTMLElement} el
 * @returns {boolean}
 */
function _isScrolledToBottom(el) {
  return el.scrollHeight - el.scrollTop - el.clientHeight < 60;
}

// ---------------------------------------------------------------------------
// Real-time listeners
// ---------------------------------------------------------------------------




/**
 * Enhanced message element creator that stores TTL data for progress updates.
 * Overrides are applied in _setupListeners context.
 */
function _setupProgressUpdater(messagesEl) {
  // Update all progress bars every second
  if (_progressIntervalId) clearInterval(_progressIntervalId);

  _progressIntervalId = setInterval(() => {
    const msgEls = messagesEl.querySelectorAll('.sc-msg');
    msgEls.forEach((el) => {
      const bar = el.querySelector('.sc-msg-ttl-bar');
      if (!bar) return;

      const expiresAt = parseInt(el.dataset.expiresAt, 10);
      const ttl = parseInt(el.dataset.ttl, 10);
      if (isNaN(expiresAt) || isNaN(ttl)) return;

      const remaining = getRemainingTime(expiresAt, ttl);
      bar.style.width = `${remaining * 100}%`;
    });
  }, 1000);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initializes the chat UI and starts real-time Firebase listeners.
 * @param {HTMLElement} container - DOM element to render the chat into
 * @param {object} currentUser - Firebase auth user object with .uid and .displayName
 */
export function initChat(container, currentUser) {
  _currentUser = currentUser;
  _container = container;

  const { messagesEl, onlineBadge, ttlBtn, input } = _buildUI(container);

  // Override _createMessageElement to store data attributes for progress bar
  const originalCreate = _createMessageElement;

  // Patch: After building message elements, add data attributes
  // We do this inside the listener setup by using a wrapper
  _setupListenersWithProgress(messagesEl, onlineBadge);
}

/**
 * Sets up listeners with progress bar data attribute injection.
 * @param {HTMLElement} messagesEl
 * @param {HTMLElement} onlineBadge
 */
function _setupListenersWithProgress(messagesEl, onlineBadge) {
  const messagesRef = ref(db, 'messages');

  // ---- Listen for new messages ----
  const unsubAdded = onChildAdded(messagesRef, (snapshot) => {
    const key = snapshot.key;
    const msg = snapshot.val();
    if (!msg) return;

    const wasAtBottom = _isScrolledToBottom(messagesEl);

    const el = _createMessageElement(key, msg);
    // Store TTL data for progress bar updates
    el.dataset.expiresAt = msg.expiresAt;
    el.dataset.ttl = msg.ttl;
    messagesEl.appendChild(el);
    _toggleEmptyState(messagesEl);

    if (wasAtBottom) {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  });
  _listeners.push(unsubAdded);

  // ---- Listen for removed messages ----
  const unsubRemoved = onChildRemoved(messagesRef, (snapshot) => {
    const key = snapshot.key;
    const el = messagesEl.querySelector(`.sc-msg[data-key="${key}"]`);
    if (el) {
      el.classList.add('msg-expiring');
      setTimeout(() => {
        el.remove();
        _toggleEmptyState(messagesEl);
      }, 600);
    }
  });
  _listeners.push(unsubRemoved);

  // ---- Online users tracking ----
  const userRef = ref(db, `users/${_currentUser.uid}`);
  set(userRef, { online: true, displayName: _currentUser.displayName || 'Anónimo' });

  const usersRef = ref(db, 'users');
  const unsubUsers = onValue(usersRef, (snapshot) => {
    if (!snapshot.exists()) {
      onlineBadge.textContent = '0 online';
      return;
    }
    const users = snapshot.val();
    const count = Object.values(users).filter((u) => u.online).length;
    onlineBadge.textContent = `${count} online`;
  });
  _listeners.push(unsubUsers);

  // ---- Start progress bar updater ----
  _setupProgressUpdater(messagesEl);

  // ---- Start cleanup interval ----
  _cleanupIntervalId = startCleanupInterval();
}

/**
 * Destroys the chat: removes Firebase listeners, clears intervals, resets container.
 */
export function destroyChat() {
  // Unsubscribe all Firebase listeners
  _listeners.forEach((unsub) => {
    if (typeof unsub === 'function') {
      unsub();
    }
  });
  _listeners = [];

  // Clear intervals
  stopCleanupInterval(_cleanupIntervalId);
  _cleanupIntervalId = null;

  if (_progressIntervalId) {
    clearInterval(_progressIntervalId);
    _progressIntervalId = null;
  }

  // Set user offline
  if (_currentUser) {
    const userRef = ref(db, `users/${_currentUser.uid}/online`);
    set(userRef, false);
  }

  // Reset container
  if (_container) {
    _container.innerHTML = '';
  }

  _currentUser = null;
  _container = null;
}

/**
 * Sets the handler function for the panic button.
 * @param {function} handler - Callback invoked when the panic button is clicked
 */
export function setPanicHandler(handler) {
  _panicHandler = handler;
}
