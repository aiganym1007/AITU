import "dotenv/config";
import express from "express";
import rateLimit from "express-rate-limit";
import { authRouter } from "./auth.js";
import { apiRouter } from "./routes.js";

for (const key of ["GEMINI_API_KEY", "JWT_SECRET"]) {
  if (!process.env[key]) {
    console.error(`Не задана переменная ${key}. Проверь файл server/.env`);
    process.exit(1);
  }
}

const app = express();
app.use(express.json({ limit: "50kb" }));

// Общий лимит и отдельный, более жёсткий лимит на запросы к ИИ (они стоят денег)
app.use("/api", rateLimit({ windowMs: 60_000, limit: 120 }));
app.use("/api/chat", rateLimit({ windowMs: 60_000, limit: 15 }));

app.use("/api", authRouter);
app.use("/api", apiRouter);

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`API: http://localhost:${port}`));
