import { Router, type NextFunction, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { db } from "./db.js";
import { LANGS, LEVELS } from "./levels.js";

export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  learning_lang: string;
  native_lang: string;
  level: string;
}

export const toUser = (u: UserRow) => ({
  id: u.id,
  email: u.email,
  learningLang: u.learning_lang,
  nativeLang: u.native_lang,
  level: u.level,
});

const secret = () => process.env.JWT_SECRET as string;
const sign = (id: number) => jwt.sign({ uid: id }, secret(), { expiresIn: "30d" });

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  try {
    const payload = jwt.verify(token, secret()) as unknown as { uid: number };
    res.locals.userId = Number(payload.uid);
    next();
  } catch {
    res.status(401).json({ error: "Нужно войти в аккаунт" });
  }
}

const registerSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(8),
    learningLang: z.enum(LANGS),
    nativeLang: z.enum(LANGS),
    level: z.enum(LEVELS),
  })
  .refine((d) => d.learningLang !== d.nativeLang);

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const authRouter = Router();

authRouter.post("/auth/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Проверь email, пароль (минимум 8 символов) и языки: они должны отличаться",
    });
  }
  const d = parsed.data;
  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(d.email);
  if (exists) return res.status(409).json({ error: "Этот email уже зарегистрирован" });

  const hash = await bcrypt.hash(d.password, 10);
  const info = db
    .prepare(
      "INSERT INTO users (email, password_hash, learning_lang, native_lang, level) VALUES (?, ?, ?, ?, ?)"
    )
    .run(d.email, hash, d.learningLang, d.nativeLang, d.level);
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(Number(info.lastInsertRowid)) as UserRow;
  res.json({ token: sign(user.id), user: toUser(user) });
});

authRouter.post("/auth/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Введи email и пароль" });

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(parsed.data.email) as UserRow | undefined;
  const ok = user && (await bcrypt.compare(parsed.data.password, user.password_hash));
  if (!user || !ok) return res.status(401).json({ error: "Неверный email или пароль" });
  res.json({ token: sign(user.id), user: toUser(user) });
});

authRouter.get("/me", requireAuth, (_req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(res.locals.userId) as UserRow | undefined;
  if (!user) return res.status(401).json({ error: "Пользователь не найден" });
  res.json(toUser(user));
});

authRouter.patch("/me", requireAuth, (req, res) => {
  const parsed = z.object({ level: z.enum(LEVELS) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Неверный уровень" });
  db.prepare("UPDATE users SET level = ? WHERE id = ?").run(parsed.data.level, res.locals.userId);
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(res.locals.userId) as UserRow;
  res.json(toUser(user));
});
