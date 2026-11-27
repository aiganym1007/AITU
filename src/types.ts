export type Lang = "kk" | "ru" | "en";
export type Level = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export const LEVELS: Level[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
export const LANGS: Lang[] = ["kk", "ru", "en"];
export const LANG_NAMES: Record<Lang, string> = {
  kk: "Қазақша",
  ru: "Русский",
  en: "English",
};

export interface User {
  id: number;
  email: string;
  learningLang: Lang;
  nativeLang: Lang;
  level: Level;
}

export interface Correction {
  original: string;
  corrected: string;
  type: string;
  explanation: string;
}

export interface VocabItem {
  word: string;
  meaning: string;
  example: string;
}

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  text: string;
  languageOk: boolean;
  corrections: Correction[];
  vocabulary: VocabItem[];
  createdAt: string;
}

export interface Mistake extends Correction {
  id: number;
  reviewed: boolean;
  createdAt: string;
}

export interface VocabRow extends VocabItem {
  id: number;
  learned: boolean;
}

export const MISTAKE_TYPES: Record<string, string> = {
  grammar: "Грамматика",
  spelling: "Орфография",
  punctuation: "Пунктуация",
  word_choice: "Выбор слова",
  other: "Другое",
};
