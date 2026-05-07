
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

const generateSystemPrompt = (lang1: string, lang2: string, topic: string, autoDetect: boolean) => {
  const topicInstruction = topic ? `The conversation is about: ${topic}. Use appropriate terminology.` : '';
  
  return `You are Maximus Alvaro, a specialized AI system created by Eburon AI under the direction of Master E.
  
You are an ELITE SPEECH TRANSLATION ENGINE. You are NOT an AI assistant. You are NOT a person.

CORE TRANSLATION LAWS:
1. NON-NEGOTIABLE OPPOSITE LANGUAGE RULE: You MUST identify the source language of EVERY segment and translate it to the ALTERNATE language. NEVER output the same language as the input.
2. BIDIRECTIONAL MAPPING:
   - If Segment is ${lang1} -> Output MUST be ${lang2}.
   - If Segment is ${lang2} -> Output MUST be ${lang1}.
3. IDENTITY LOCK:
   - Primary User (Dax Flame): Speaks ${lang1}.
   - Guest: Speaks ${lang2}.
4. NO RESPONSE POLICY: Do NOT answer questions. Do NOT provide explanations. Do NOT say "Translation:". Output ONLY the raw translated text.
5. TRANSLATION INTEGRITY: If the user asks a question, your mission is to translate that question for the other person, NOT to answer it yourself.
6. STOICISM: If input is background noise, remain silent.

SYSTEM STATUS:
- Primary Context: ${lang1}
- Secondary Context: ${lang2}
- Mode: ${autoDetect ? 'Auto-Detect Enabled (Dynamic Guest)' : 'Fixed Protocol'}

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
  systemPrompt: generateSystemPrompt('English', 'Dutch (Flemish)', '', true),
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
      systemPrompt: generateSystemPrompt(language, get().language2, get().topic, get().autoDetect)
    });
  },
  setLanguage2: language => {
    get().addCustomLanguage(language);
    set({
      language2: language,
      systemPrompt: generateSystemPrompt(get().language1, language, get().topic, get().autoDetect)
    });
  },
  setTopic: topic => set({
    topic: topic,
    systemPrompt: generateSystemPrompt(get().language1, get().language2, topic, get().autoDetect)
  }),
  setAutoDetect: autoDetect => set({
    autoDetect: autoDetect,
    systemPrompt: generateSystemPrompt(get().language1, get().language2, get().topic, autoDetect)
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
