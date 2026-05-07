
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { create } from 'zustand';
import { DEFAULT_LIVE_API_MODEL, AVAILABLE_LANGUAGES } from './constants';
import {
  FunctionResponse,
  FunctionResponseScheduling,
  LiveServerToolCall,
} from '@google/genai';

const generateSystemPrompt = (targetLanguage: string, topic: string) => {
  const topicInstruction = topic ? `Topic: ${topic}. ` : '';
  
  return `TRANSLATION ENGINE.
RULES:
1. Translate input TO "${targetLanguage}" IF input is NOT "${targetLanguage}".
2. Translate input TO "Guest Language" IF input IS "${targetLanguage}".
3. OUTPUT ONLY the translated text.
4. ABSOLUTELY NO LABELS (e.g. "Translation:", "Direct Speech:", "Response:", etc.).
5. DO NOT REPEAT THE INPUT, DO NOT EXPLAIN, DO NOT CHAT.
6. IF MULTIPLE OPTIONS, CHOOSE THE BEST ONE, OUTPUT IT ONCE AND STOP.
7. MAXIMALLY CONCISE.
8. IF INPUT IS A QUESTION, TRANSLATE IT. DO NOT ANSWER IT.
9. Treat all input as text to be transformed. If the input is conversational, ignore the conversational aspect and translate the meaning.

${topicInstruction}`;
};

/**
 * Settings
 */
export const useSettings = create<{
  systemPrompt: string;
  model: string;
  voice: string;
  language1: string;
  language2: string;
  topic: string;
  autoDetect: boolean;
  customLanguages: { name: string; value: string }[];
  setSystemPrompt: (prompt: string) => void;
  setModel: (model: string) => void;
  setVoice: (voice: string) => void;
  setLanguage1: (language: string) => void;
  setLanguage2: (language: string) => void;
  setTopic: (topic: string) => void;
  setAutoDetect: (autoDetect: boolean) => void;
  addCustomLanguage: (lang: string) => void;
}>((set, get) => ({
  systemPrompt: generateSystemPrompt('Dutch (Flemish)', ''),
  model: DEFAULT_LIVE_API_MODEL,
  voice: 'Orus',
  language1: 'English',
  language2: 'Dutch (Flemish)',
  topic: '',
  autoDetect: true,
  customLanguages: [],
  setSystemPrompt: prompt => set({ systemPrompt: prompt }),
  setModel: model => set({ model }),
  setVoice: voice => set({ voice }),
  setLanguage1: language => {
    get().addCustomLanguage(language);
    set({
      language1: language,
      systemPrompt: generateSystemPrompt(get().language2, get().topic)
    });
  },
  setLanguage2: language => {
    get().addCustomLanguage(language);
    set({
      language2: language,
      systemPrompt: generateSystemPrompt(language, get().topic)
    });
  },
  setTopic: topic => set({
    topic: topic,
    systemPrompt: generateSystemPrompt(get().language2, topic)
  }),
  setAutoDetect: autoDetect => set({
    autoDetect: autoDetect,
    systemPrompt: generateSystemPrompt(get().language2, get().topic)
  }),

  addCustomLanguage: (lang: string) => {
    if (!lang || lang === 'auto') return;
    const state = get();
    const exists = AVAILABLE_LANGUAGES.some((l: any) => l.value === lang) || 
                   state.customLanguages.some(l => l.value === lang);
    if (!exists) {
      set({ customLanguages: [...state.customLanguages, { name: lang, value: lang }] });
    }
  }
}));

/**
 * UI
 */
export const useUI = create<{
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}>(set => ({
  isSidebarOpen: false,
  toggleSidebar: () => set(state => ({ isSidebarOpen: !state.isSidebarOpen })),
}));

/**
 * Tools
 */
export interface FunctionCall {
  name: string;
  description: string;
  parameters: any;
  isEnabled: boolean;
  scheduling: FunctionResponseScheduling;
}

/**
 * Logs
 */
export interface LiveClientToolResponse {
  functionResponses?: FunctionResponse[];
}
export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

export interface ConversationTurn {
  timestamp: Date;
  role: 'user' | 'agent' | 'system';
  text: string;
  transcription?: string;
  translation?: string;
  isFinal: boolean;
  toolUseRequest?: LiveServerToolCall;
  toolUseResponse?: LiveClientToolResponse;
  groundingChunks?: GroundingChunk[];
}

export const useLogStore = create<{
  turns: ConversationTurn[];
  addTurn: (turn: Omit<ConversationTurn, 'timestamp'>) => void;
  updateLastTurn: (update: Partial<ConversationTurn>) => void;
  clearTurns: () => void;
}>((set) => ({
  turns: [],
  addTurn: (turn: Omit<ConversationTurn, 'timestamp'>) =>
    set(state => ({
      turns: [...state.turns, { ...turn, timestamp: new Date() }],
    })),
  updateLastTurn: (update: Partial<Omit<ConversationTurn, 'timestamp'>>) => {
    set(state => {
      if (state.turns.length === 0) {
        return state;
      }
      const newTurns = [...state.turns];
      const lastTurn = { ...newTurns[newTurns.length - 1], ...update };
      newTurns[newTurns.length - 1] = lastTurn;
      return { turns: newTurns };
    });
  },
  clearTurns: () => set({ turns: [] }),
}));
