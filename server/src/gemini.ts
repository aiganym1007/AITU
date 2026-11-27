import { GoogleGenAI, Type } from "@google/genai";
import { LANG_NAMES, nextLevel, type Lang, type Level } from "./levels.js";

let client: GoogleGenAI | null = null;
function getClient() {
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

export interface TutorResult {
  language_ok: boolean;
  reply: string;
  corrections: { original: string; corrected: string; type: string; explanation: string }[];
  vocabulary: { word: string; meaning: string; example: string }[];
}

export interface HistoryItem {
  role: "user" | "assistant";
  text: string;
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    language_ok: { type: Type.BOOLEAN },
    reply: { type: Type.STRING },
    corrections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          original: { type: Type.STRING },
          corrected: { type: Type.STRING },
          type: {
            type: Type.STRING,
            enum: ["grammar", "spelling", "punctuation", "word_choice", "other"],
          },
          explanation: { type: Type.STRING },
        },
        required: ["original", "corrected", "type", "explanation"],
      },
    },
    vocabulary: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          meaning: { type: Type.STRING },
          example: { type: Type.STRING },
        },
        required: ["word", "meaning", "example"],
      },
    },
  },
  required: ["language_ok", "reply", "corrections", "vocabulary"],
};

function buildSystemPrompt(target: Lang, level: Level, explainLang: Lang) {
  const T = LANG_NAMES[target];
  const E = LANG_NAMES[explainLang];
  const next = nextLevel(level);
  const kazakhNote =
    target === "kk"
      ? "\nFor Kazakh use Cyrillic script and correct modern orthography (ә, ғ, қ, ң, ө, ұ, ү, һ, і)."
      : "";

  return `You are a friendly language tutor AND a general-purpose AI assistant (like ChatGPT).
Target language: ${T}. Student's CEFR level: ${level}. Your reply level: ${next}. Language for explanations: ${E}.${kazakhNote}

RULES
1. The student must write ONLY in ${T}. If the latest message is mostly in another language, set language_ok=false. In "reply" politely ask them to rewrite it in ${T} (first in simple ${T}, then the same sentence in ${E}). Return empty corrections and vocabulary. Do not answer the question.
2. Otherwise set language_ok=true and answer the question fully, correctly and helpfully, exactly like a normal assistant. Do not refuse harmless topics just because they are not about language learning.
3. Write "reply" ONLY in ${T}, at CEFR level ${next}: slightly harder than the student's level, with a few new words and structures, but still understandable. Be concise unless the student asks for detail.
4. Check ONLY the latest student message for ALL mistakes: grammar, spelling, punctuation, word choice. For each mistake give "original" (the exact fragment from the message), "corrected", "type", and a short "explanation" written in ${E}. If there are no mistakes, return an empty array. Never invent mistakes and never flag pure style preferences.
5. Pick 3-5 useful words or phrases from your reply that are at or above the student's level. "word" in ${T}, "meaning" in ${E}, "example" is a short sentence in ${T}.
6. Output ONLY JSON that matches the schema.`;
}

export async function askTutor(opts: {
  target: Lang;
  level: Level;
  explainLang: Lang;
  history: HistoryItem[]; // старые сообщения, без нового
  message: string;
}): Promise<TutorResult> {
  const contents = [
    ...opts.history.map((h) => ({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: h.text }],
    })),
    { role: "user", parts: [{ text: opts.message }] },
  ];

  // Gemini ждёт, что диалог начинается с user
  while (contents.length > 1 && contents[0].role === "model") contents.shift();

  const response = await getClient().models.generateContent({
    model: process.env.GEMINI_MODEL ?? "gemini-3.8-flash",
    contents,
    config: {
      systemInstruction: buildSystemPrompt(opts.target, opts.level, opts.explainLang),
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.7,
    },
  });

  const raw = (response.text ?? "").replace(/```json|```/g, "").trim();
  const data = JSON.parse(raw) as TutorResult;
  return {
    language_ok: !!data.language_ok,
    reply: String(data.reply ?? ""),
    corrections: Array.isArray(data.corrections) ? data.corrections : [],
    vocabulary: Array.isArray(data.vocabulary) ? data.vocabulary : [],
  };
}
