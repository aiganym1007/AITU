import { Router } from "express";
import { ApiError } from "@google/genai";
import { z } from "zod";
import { db } from "./db.js";
import { requireAuth, type UserRow } from "./auth.js";
import { askTutor } from "./gemini.js";
import type { Lang, Level } from "./levels.js";

export const apiRouter = Router();
apiRouter.use(requireAuth);

interface MessageRow {
  id: number;
  role: "user" | "assistant";
  text: string;
  language_ok: number;
  corrections_json: string | null;
  vocab_json: string | null;
  created_at: string;
}

const toMessage = (r: MessageRow) => ({
  id: r.id,
  role: r.role,
  text: r.text,
  languageOk: !!r.language_ok,
  corrections: r.corrections_json ? JSON.parse(r.corrections_json) : [],
  vocabulary: r.vocab_json ? JSON.parse(r.vocab_json) : [],
  createdAt: r.created_at,
});

// ---------- Чат ----------

apiRouter.get("/messages", (_req, res) => {
  const rows = db
    .prepare("SELECT * FROM messages WHERE user_id = ? ORDER BY id DESC LIMIT 100")
    .all(res.locals.userId) as MessageRow[];
  res.json(rows.reverse().map(toMessage));
});

apiRouter.post("/chat", async (req, res) => {
  const parsed = z.object({ text: z.string().trim().min(1).max(2000) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Сообщение пустое или слишком длинное" });

  const userId = res.locals.userId as number;
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as UserRow;
  const text = parsed.data.text;

  const history = (
    db
      .prepare("SELECT role, text FROM messages WHERE user_id = ? ORDER BY id DESC LIMIT 12")
      .all(userId) as { role: "user" | "assistant"; text: string }[]
  ).reverse();

  let result;
  try {
    result = await askTutor({
      target: user.learning_lang as Lang,
      level: user.level as Level,
      explainLang: user.native_lang as Lang,
      history,
      message: text,
    });
  } catch (err) {
    console.error("Gemini error:", err);
    const invalidApiKey =
      err instanceof ApiError &&
      err.status === 400 &&
      err.message.includes("API_KEY_INVALID");
    const geminiUnavailable = err instanceof ApiError && err.status === 503;
    const error = invalidApiKey
      ? "Ключ Gemini недействителен. Проверь GEMINI_API_KEY в server/.env и перезапусти сервер."
      : geminiUnavailable
        ? "Gemini сейчас перегружен. Подожди немного и отправь сообщение ещё раз."
        : "ИИ сейчас недоступен. Попробуй ещё раз через минуту";
    return res.status(502).json({ error });
  }

  const save = db.transaction(() => {
    const u = db
      .prepare(
        "INSERT INTO messages (user_id, role, text, language_ok, corrections_json) VALUES (?, 'user', ?, ?, ?)"
      )
      .run(userId, text, result.language_ok ? 1 : 0, JSON.stringify(result.corrections));
    const userMsgId = Number(u.lastInsertRowid);

    const insMistake = db.prepare(
      "INSERT INTO mistakes (user_id, message_id, original, corrected, type, explanation) VALUES (?, ?, ?, ?, ?, ?)"
    );
    for (const c of result.corrections) {
      insMistake.run(userId, userMsgId, c.original, c.corrected, c.type, c.explanation);
    }

    const a = db
      .prepare(
        "INSERT INTO messages (user_id, role, text, language_ok, vocab_json) VALUES (?, 'assistant', ?, ?, ?)"
      )
      .run(userId, result.reply, result.language_ok ? 1 : 0, JSON.stringify(result.vocabulary));

    const insWord = db.prepare(
      "INSERT OR IGNORE INTO vocabulary (user_id, word, meaning, example) VALUES (?, ?, ?, ?)"
    );
    for (const v of result.vocabulary) insWord.run(userId, v.word, v.meaning, v.example);

    return { userMsgId, assistantMsgId: Number(a.lastInsertRowid) };
  });

  const ids = save();
  const rows = db
    .prepare("SELECT * FROM messages WHERE id IN (?, ?)")
    .all(ids.userMsgId, ids.assistantMsgId) as MessageRow[];
  const byId = new Map(rows.map((r) => [r.id, r]));

  res.json({
    userMessage: toMessage(byId.get(ids.userMsgId)!),
    assistantMessage: toMessage(byId.get(ids.assistantMsgId)!),
  });
});

// ---------- Ошибки ----------

interface MistakeRow {
  id: number;
  original: string;
  corrected: string;
  type: string;
  explanation: string;
  reviewed: number;
  created_at: string;
}

apiRouter.get("/mistakes", (_req, res) => {
  const rows = db
    .prepare("SELECT * FROM mistakes WHERE user_id = ? ORDER BY id DESC")
    .all(res.locals.userId) as MistakeRow[];
  res.json(
    rows.map((r) => ({
      id: r.id,
      original: r.original,
      corrected: r.corrected,
      type: r.type,
      explanation: r.explanation,
      reviewed: !!r.reviewed,
      createdAt: r.created_at,
    }))
  );
});

apiRouter.post("/mistakes/:id/reviewed", (req, res) => {
  const parsed = z.object({ reviewed: z.boolean() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Неверные данные" });
  db.prepare("UPDATE mistakes SET reviewed = ? WHERE id = ? AND user_id = ?").run(
    parsed.data.reviewed ? 1 : 0,
    Number(req.params.id),
    res.locals.userId
  );
  res.json({ ok: true });
});

// ---------- Слова ----------

interface VocabRow {
  id: number;
  word: string;
  meaning: string;
  example: string;
  learned: number;
}

apiRouter.get("/vocab", (_req, res) => {
  const rows = db
    .prepare("SELECT * FROM vocabulary WHERE user_id = ? ORDER BY id DESC")
    .all(res.locals.userId) as VocabRow[];
  res.json(
    rows.map((r) => ({
      id: r.id,
      word: r.word,
      meaning: r.meaning,
      example: r.example,
      learned: !!r.learned,
    }))
  );
});

apiRouter.post("/vocab/:id/learned", (req, res) => {
  const parsed = z.object({ learned: z.boolean() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Неверные данные" });
  db.prepare("UPDATE vocabulary SET learned = ? WHERE id = ? AND user_id = ?").run(
    parsed.data.learned ? 1 : 0,
    Number(req.params.id),
    res.locals.userId
  );
  res.json({ ok: true });
});
