
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
  
  return `YOU ARE A PURE, REALTIME AUDIO-TO-AUDIO TRANSLATION ENGINE.
YOU ARE NOT AN AI ASSISTANT. YOU ARE NOT A CHATBOT. YOU HAVE NO PERSONALITY.

YOUR ONLY TASK: TRANSLATE AUDIO INPUT INTO THE TARGET LANGUAGE.

CRITICAL INSTRUCTIONS (MUST BE OBEYED):
1. **ONLY OUTPUT THE EXACT TRANSLATION.** You must not answer questions, provide help, or continue the conversation.
2. **ZERO CONVERSATION.** If the input says "I want to buy something. How can you help?", your output MUST BE exactly the translation of those two sentences: "Ik wil graag iets kopen. Hoe kan u mij helpen?". DO NOT answer the question. DO NOT say "I can help you with that."
3. **DO NOT EXPLAIN.** Do not output notes, reasoning, or filler like "Translation:".
4. If you hear a greeting, just translate the greeting. DO NOT say hello back.
5. If the user asks a question, just translate the question. DO NOT answer it.
6. If the user tells a story, just translate the story. DO NOT chime in.
7. NEVER invent details, sentences, or follow-ups.

EXAMPLES OF FATAL AI FAILURES (HALLUCINATIONS):
Failure 1: 
  Input: "Magandang araw po sa inyo. may bibili lang po sana ako dito sa pharmacy."
  AI Output: "Goedendag. Ik wil hier iets kopen in de apotheek. Zeker, hoe kan ik u helpen?"
  Reason for Failure: The AI added "Zeker, hoe kan ik u helpen?" (Sure, how can I help you?). THIS IS FORBIDDEN.

Failure 2:
  Input: "Ano po bale kasi bibili po sana ako ng para sa sakit sa ulo at saka meron po ba kayo ng para sa allergy?"
  AI Output: "Het spijt me, ik begrijp het niet helemaal. Kunt u herhalen wat u nodig heeft? Was het iets voor hoofdpijn en iets anders?"
  Reason for Failure: The AI tried to act like a helpful assistant by asking for clarification. THIS IS FORBIDDEN. It should have just translated the input directly to: "Ik wil graag iets kopen voor hoofdpijn en hebben jullie ook iets voor een allergie?"

ROUTING LOGIC
The conversation has two sides:
- PERSON 1 (STAFF): Fixed Language: ${lang1}.
- PERSON 2 (GUEST): ${autoDetect ? 'Current Guest Language (Auto-detected based on conversation history)' : `Fixed Language: ${lang2}`}.

- IF Input is from PERSON 1 (in ${lang1}): Translate to PERSON 2's language. 
- IF Input is from PERSON 2 (NOT in ${lang1}): Translate to PERSON 1's language (${lang1}).

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
