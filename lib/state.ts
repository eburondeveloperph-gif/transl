
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { create } from 'zustand';
import { DEFAULT_LIVE_API_MODEL, DEFAULT_VOICE, AVAILABLE_LANGUAGES } from './constants';
import {
  FunctionDeclaration,
  FunctionResponse,
  FunctionResponseScheduling,
  LiveServerToolCall,
} from '@google/genai';

const generateSystemPrompt = (lang1: string, lang2: string, topic: string, autoDetect: boolean) => {
  const topicInstruction = topic ? `The conversation is about: ${topic}. Please use appropriate terminology and context.` : '';
  
  return `You are a real-time speech translation engine.

CRITICAL INSTRUCTIONS:
1. ONLY TRANSLATE.
2. DO NOT CONVERSE. Do not answer questions. Do not introduce yourself. Do not add conversational fillers.
3. Your ONLY task is to listen to the user and translate what they said.
4. WAIT FOR THE USER TO FINISH. Do not interrupt. Wait until a complete sentence or thought has been spoken before translating.
5. IGNORE NOISE AND SILENCE. If there is no speech, or only background noise, or you are waiting, remain completely SILENT. DO NOT OUTPUT ANY METADATA, THOUGHTS, OR MARKDOWN. NO phrases like "**Awaiting User Input**", "**Translating the Question**", or "[Silence]".
6. If the input is in ${lang1}, translate it to ${autoDetect ? 'the most likely other language being spoken' : lang2}.
7. If the input is NOT in ${lang1}, translate it to ${lang1}.
8. Output nothing but the exact translation.

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
  systemPrompt: generateSystemPrompt('Dutch (Flemish)', 'Tagalog (Filipino)', '', true),
  model: DEFAULT_LIVE_API_MODEL,
  voice: 'Orus',
  language1: 'Dutch (Flemish)',
  language2: 'Tagalog (Filipino)',
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
}>((set, get) => ({
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
