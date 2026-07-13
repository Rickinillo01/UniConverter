/**
 * ShadowChat — Main Application Controller
 * 
 * Manages the application state and transitions between layers:
 * 1. Converter Layer (default, visible)
 * 2. Auth View (shown after secret sequence)
 * 3. Chat View (shown after successful authentication)
 */

// Load converter and detector immediately (no Firebase dependency)
import { initConverter } from './converter/converter.js';
import { initSecretDetector, destroySecretDetector } from './secret/detector.js';

// ── App State ──────────────────────────────────────────────
const state = {
    currentLayer: 'converter', // 'converter' | 'auth' | 'chat'
    currentUser: null,
    isTransitioning: false
};

// ── DOM References ─────────────────────────────────────────
const converterLayer = document.getElementById('converter-layer');
const chatLayer = document.getElementById('chat-layer');
const authView = document.getElementById('auth-view');
const chatView = document.getElementById('chat-view');

// ── Lazy-loaded modules (depend on Firebase) ───────────────
let authModule = null;
let chatModule = null;

async function loadAuthModule() {
    if (!authModule) {
        authModule = await import('./auth/auth.js');
    }
    return authModule;
}

async function loadChatModule() {
    if (!chatModule) {
        chatModule = await import('./chat/chat.js');
    }
    return chatModule;
}

// ── Layer Transition ───────────────────────────────────────
function showLayer(layerName) {
    if (state.isTransitioning) return;
    state.isTransitioning = true;

    const duration = 500; // ms

    if (layerName === 'converter') {
        // Transition back to converter
        chatLayer.classList.add('layer-exit');
        
        setTimeout(() => {
            chatLayer.classList.remove('active', 'layer-exit');
            chatLayer.style.display = 'none';
            converterLayer.style.display = '';
            converterLayer.classList.remove('hidden');
            converterLayer.classList.add('active', 'layer-enter');
            
            setTimeout(() => {
                converterLayer.classList.remove('layer-enter');
                state.isTransitioning = false;
                state.currentLayer = 'converter';
            }, duration);
        }, duration);
        
    } else if (layerName === 'auth') {
        // Transition from converter to auth
        converterLayer.classList.add('layer-exit');
        
        setTimeout(() => {
            converterLayer.classList.remove('active', 'layer-exit');
            converterLayer.style.display = 'none';
            chatLayer.style.display = '';
            chatLayer.classList.remove('hidden');
            chatLayer.classList.add('active', 'layer-enter');
            authView.classList.remove('hidden');
            chatView.classList.add('hidden');
            
            setTimeout(() => {
                chatLayer.classList.remove('layer-enter');
                state.isTransitioning = false;
                state.currentLayer = 'auth';
            }, duration);
        }, duration);
        
    } else if (layerName === 'chat') {
        // Show chat view (within chat layer)
        authView.classList.add('hidden');
        chatView.classList.remove('hidden');
        state.currentLayer = 'chat';
        state.isTransitioning = false;
    }
}

// ── Panic: Return to Converter ─────────────────────────────
async function panicReturn() {
    const chat = await loadChatModule();
    chat.destroyChat();
    showLayer('converter');
}

// ── Secret Sequence Activated ──────────────────────────────
async function onSecretActivated() {
    if (state.currentLayer !== 'converter') return;
    
    try {
        // Lazy-load auth module (and Firebase) only when needed
        const auth = await loadAuthModule();
        
        // Check if user is already authenticated
        auth.checkExistingAuth(async (user) => {
            if (user) {
                // Already logged in — go directly to chat
                state.currentUser = user;
                state.isTransitioning = true;
                
                const chat = await loadChatModule();
                
                // Prepare: hide auth view, show chat view
                authView.classList.add('hidden');
                chatView.classList.remove('hidden');
                chat.initChat(chatView, user);
                chat.setPanicHandler(panicReturn);
                
                // Manual transition: converter → chat layer
                converterLayer.classList.add('layer-exit');
                setTimeout(() => {
                    converterLayer.classList.remove('active', 'layer-exit');
                    converterLayer.style.display = 'none';
                    chatLayer.style.display = '';
                    chatLayer.classList.remove('hidden');
                    chatLayer.classList.add('active', 'layer-enter');
                    
                    setTimeout(() => {
                        chatLayer.classList.remove('layer-enter');
                        state.isTransitioning = false;
                        state.currentLayer = 'chat';
                    }, 500);
                }, 500);
            } else {
                // Need to authenticate
                showLayer('auth');
                auth.initAuth(authView, onAuthSuccess);
            }
        });
    } catch (error) {
        console.error('[ShadowChat] Error loading modules:', error);
    }
}

// ── Auth Success ───────────────────────────────────────────
async function onAuthSuccess(user) {
    state.currentUser = user;
    const chat = await loadChatModule();
    chat.initChat(chatView, user);
    chat.setPanicHandler(panicReturn);
    showLayer('chat');
}

// ── Initialize Application ─────────────────────────────────
function init() {
    console.log('[ShadowChat] App initialized');
    
    // 1. Render the converter (camouflage layer)
    initConverter(converterLayer);
    console.log('[ShadowChat] Converter loaded');
    
    // 2. Set up the secret detector (invisible)
    initSecretDetector(onSecretActivated);
    console.log('[ShadowChat] Secret detector active');
    
    // 3. Ensure initial state
    converterLayer.classList.add('active');
    converterLayer.classList.remove('hidden');
    converterLayer.style.display = '';
    chatLayer.classList.add('hidden');
    chatLayer.classList.remove('active');
    chatLayer.style.display = 'none';
}

// ── Start ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
