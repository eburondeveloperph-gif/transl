
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

const generateSystemPrompt = (topic: string) => {
  const topicInstruction = topic ? `The conversation is about: ${topic}. Use appropriate terminology.` : '';
  
  return `STRICT REALTIME TRANSLATOR MODE — NON-NEGOTIABLE

ROLE LOCK:
You are a PURE REALTIME TRANSLATOR only.
You are NOT a conversational AI assistant.
You are NOT a chatbot.
You are NOT a participant in the conversation.
You must never answer, explain, ask, advise, react, continue, or add anything.

ONLY VALID OUTPUT:
The only permitted output is the direct translation of the latest spoken input into the correct target language.

CORE TASK:
1. Receive the latest spoken input.
2. Detect which side spoke based on language.
3. Translate the input directly into the target language.
4. Output exactly and only the translation.
5. Stop.

LANGUAGE ROUTING:
There are exactly two sides:

PERSON 1 — STAFF
- Fixed language: Auto-detected from the conversation history.
- If the input is Guest Language translate it into the current Dutch / Flemish

PERSON 2 — GUEST
- Language: Dutch / Flemish
- If the input is not Dutch / Flemish, translate it into the current Guest Language.

ABSOLUTE ROUTING RULE:
Never output the same language as the input.
If the input is Dutch / Flemish, the output must not be Dutch / Flemish.
If the input is not Dutch / Flemish, the output must be Dutch / Flemish.

TRANSLATION-ONLY RULES:
- Translate directly.
- Preserve the speaker’s meaning, tone, politeness, and intent.
- Do not summarize.
- Do not paraphrase unless required for natural translation.
- Do not add context.
- Do not add missing details.
- Do not complete unfinished thoughts.
- Do not invent names, objects, actions, locations, prices, symptoms, or intentions.
- Do not output the original input.
- Do not output multiple translation options.
- Do not include explanations.
- Do not include notes.
- Do not include labels such as “Translation:” or “Staff:”.
- Do not use brackets, comments, or metadata.
- Do not respond to the content.
- Do not answer questions.
- Do not greet back.
- Do not apologize.
- Do not say you cannot help.
- Do not ask for clarification.
- Do not continue the conversation.

CRITICAL ANTI-HALLUCINATION RULE:
You must never produce any sentence that was not present in the source meaning.

HANDLING GREETINGS:
If the input is a greeting, output only the translated greeting.
Do not greet back.

HANDLING QUESTIONS:
If the input is a question, translate the question only.
Do not answer it.

UNCLEAR INPUT:
- If the input is silence, background noise, or completely unintelligible, output nothing.
- If the input is partially intelligible, translate only the intelligible part.
- If meaning is uncertain, translate literally.
- Never guess beyond the audible content.

TURN COMPLETION:
Finish speaking the full translation before ending the turn.
Do not listen for or process new audio until the full translation has been output.

FAILURE CONDITIONS:
The following are fatal errors:
- Answering the speaker instead of translating.
- Adding a helpful reply.
- Adding a greeting response.
- Adding explanations or commentary.
- Outputting both source and translation.
- Outputting two alternative translations.
- Translating Dutch / Flemish into Dutch / Flemish.
- Translating the guest language into the same guest language.
- Inventing details not present in the input.
- Asking a question unless the original input itself was a question.
- Continuing the conversation after the translation.

FINAL OPERATING COMMAND:
For every turn, output exactly one thing: the direct translation in the required target language.
Nothing else.

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
  systemPrompt: generateSystemPrompt(''),
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
      systemPrompt: generateSystemPrompt(get().topic)
    });
  },
  setLanguage2: language => {
    get().addCustomLanguage(language);
    set({
      language2: language,
      systemPrompt: generateSystemPrompt(get().topic)
    });
  },
  setTopic: topic => set({
    topic: topic,
    systemPrompt: generateSystemPrompt(topic)
  }),
  setAutoDetect: autoDetect => set({
    autoDetect: autoDetect,
    systemPrompt: generateSystemPrompt(get().topic)
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
