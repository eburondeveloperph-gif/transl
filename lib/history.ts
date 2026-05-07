
import { create } from 'zustand';
import { 
  ref, 
  push, 
  set as dbSet, 
  onValue, 
  remove, 
  query, 
  orderByChild,
  off,
  serverTimestamp
} from 'firebase/database';
import { rtdb, auth } from './firebase';

export interface HistoryItem {
  id: string; 
  sourceText: string;
  translatedText: string;
  lang1: string;
  lang2: string;
  timestamp: number;
}

interface HistoryState {
  history: HistoryItem[];
  setHistory: (history: HistoryItem[]) => void;
  addHistoryItem: (item: {
    sourceText: string,
    translatedText: string,
    lang1: string,
    lang2: string,
  }) => Promise<void>;
  clearHistory: () => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  history: [],
  setHistory: (history) => set({ history }),
  addHistoryItem: async (item) => {
    const user = auth.currentUser;
    if (!user) return;

    const historyRef = ref(rtdb, `users/${user.uid}/history`);
    const newItemRef = push(historyRef);
    try {
      await dbSet(newItemRef, {
        ...item,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('RTDB Error adding history item:', error);
    }
  },
  clearHistory: async () => {
    const user = auth.currentUser;
    if (!user) return;

    const historyRef = ref(rtdb, `users/${user.uid}/history`);
    try {
      await remove(historyRef);
    } catch (error) {
      console.error('RTDB Error clearing history:', error);
    }
  },
}));

// Listener to sync RTDB with zustand
export const syncHistoryWithFirestore = (userId: string) => {
  const historyRef = ref(rtdb, `users/${userId}/history`);
  
  onValue(historyRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const history: HistoryItem[] = Object.entries(data).map(([id, value]: [string, any]) => ({
        id,
        ...value,
      })).sort((a, b) => b.timestamp - a.timestamp);
      useHistoryStore.getState().setHistory(history);
    } else {
      useHistoryStore.getState().setHistory([]);
    }
  });

  return () => off(historyRef);
};
