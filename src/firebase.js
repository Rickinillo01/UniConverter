/**
 * Firebase Configuration & Initialization
 * Uses Firebase v11 CDN modules.
 *
 * ⚠️  IMPORTANT: Replace ALL placeholder values below with your actual Firebase project credentials.
 *     You can find these in your Firebase Console → Project Settings → General → Your apps → Config.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js';

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js';

import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
  onChildAdded,
  onChildRemoved,
  remove,
  off,
  serverTimestamp,
  query,
  orderByChild,
  get
} from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-database.js';

// ─── Firebase Configuration ─────────────────────────────────────────────────────
// Replace each placeholder value with your actual Firebase project credentials.
const firebaseConfig = {
  apiKey: "AIzaSyCq0XKRa1b_7b-4d7PuSfoqMTUT0m6s-bA",
  authDomain: "shadowchat-e971c.firebaseapp.com",
  databaseURL: "https://shadowchat-e971c-default-rtdb.firebaseio.com",
  projectId: "shadowchat-e971c",
  storageBucket: "shadowchat-e971c.firebasestorage.app",
  messagingSenderId: "798264373263",
  appId: "1:798264373263:web:071498839917afb904b37a"
};

// ─── Initialize Firebase ────────────────────────────────────────────────────────
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ─── Exports ────────────────────────────────────────────────────────────────────
// Core instances
export { app, auth, db };

// Auth functions
export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
};

// Database functions
export {
  ref,
  push,
  set,
  onValue,
  onChildAdded,
  onChildRemoved,
  remove,
  off,
  serverTimestamp,
  query,
  orderByChild,
  get
};
