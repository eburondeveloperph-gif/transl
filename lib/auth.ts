
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { create } from 'zustand';
import { ConversationTurn } from './state';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth, rtdb } from './firebase';
import { ref, set, get, update, child } from 'firebase/database';

// --- AUTH STORE ---
interface AuthState {
  user: User | null;
  isSuperAdmin: boolean;
  loading: boolean;
  initialized: boolean;
  signOut: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInAnonymously: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
}

export const useAuth = create<AuthState>((set) => {
  // Initialize auth state listener
  onAuthStateChanged(auth, (user) => {
    set({ user, loading: false, initialized: true, isSuperAdmin: user?.email === 'eburondeveloperph@gmail.com' });
  });

  return {
    user: null,
    isSuperAdmin: false,
    loading: true,
    initialized: false,
    signOut: async () => {
      await firebaseSignOut(auth);
    },
    signInWithPassword: async (email, password) => {
      await signInWithEmailAndPassword(auth, email, password);
    },
    signUp: async (email, password) => {
      await createUserWithEmailAndPassword(auth, email, password);
    },
    signInAnonymously: async () => {
      await signInAnonymously(auth);
    },
    sendPasswordResetEmail: async (email) => {
      await sendPasswordResetEmail(auth, email);
    },
  };
});

// --- DATABASE HELPERS ---
export const updateUserSettings = async (userId: string, newSettings: Partial<{ voice: string; topic: string; language1: string; language2: string; autoDetect: boolean }>) => {
  const settingsRef = ref(rtdb, `users/${userId}/settings/current`);
  try {
    await update(settingsRef, newSettings);
  } catch (error) {
    try {
      await set(settingsRef, newSettings);
    } catch (e) {
      console.error('Error updating user settings in RTDB:', e);
    }
  }
};

export const updateUserConversations = async (userId: string, turns: ConversationTurn[]) => {
  const turnsRef = ref(rtdb, `users/${userId}/lastTurns`);
  try {
    await set(turnsRef, turns.slice(-10).map(t => ({
      role: t.role,
      text: t.text,
      translation: t.translation || '',
      timestamp: t.timestamp.toISOString()
    })));
  } catch (error) {
    console.error('Error updating user conversations in RTDB:', error);
  }
};

export const clearUserConversations = async (userId: string) => {
  const turnsRef = ref(rtdb, `users/${userId}/lastTurns`);
  try {
    await set(turnsRef, []);
  } catch (error) {
    console.error('Error clearing user conversations in RTDB:', error);
  }
};
