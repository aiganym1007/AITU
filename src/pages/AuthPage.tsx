import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { LANGS, LANG_NAMES, LEVELS, type Lang, type Level } from "../types";

export default function AuthPage() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [learningLang, setLearningLang] = useState<Lang>("en");
  const [nativeLang, setNativeLang] = useState<Lang>("ru");
  const [level, setLevel] = useState<Level>("A2");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  function pickLearning(l: Lang) {
    setLearningLang(l);
    if (l === nativeLang) setNativeLang(LANGS.find((x) => x !== l)!);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await register({ email, password, learningLang, nativeLang, level });
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>AITU</h1>
        <p className="muted">
          {mode === "register"
            ? "Общайся с ИИ на языке, который учишь. Он отвечает чуть сложнее твоего уровня и разбирает ошибки."
            : "Войди, чтобы продолжить."}
        </p>

        <label className="field">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="field">
          Пароль
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={mode === "register" ? 8 : 1}
            required
          />
        </label>

        {mode === "register" && (
          <>
            <div className="field">
              Какой язык учишь
              <div className="seg">
                {LANGS.map((l) => (
                  <button
                    type="button"
                    key={l}
                    className={l === learningLang ? "on" : ""}
                    onClick={() => pickLearning(l)}
                  >
                    {LANG_NAMES[l]}
                  </button>
                ))}
              </div>
            </div>

            <div className="row">
              <label className="field">
                Твой уровень
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as Level)}
                >
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Родной язык (для объяснений)
                <select
                  value={nativeLang}
                  onChange={(e) => setNativeLang(e.target.value as Lang)}
                >
                  {LANGS.filter((l) => l !== learningLang).map((l) => (
                    <option key={l} value={l}>
                      {LANG_NAMES[l]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </>
        )}

        {error && <div className="error">{error}</div>}

        <button className="btn" disabled={busy}>
          {mode === "register" ? "Создать аккаунт" : "Войти"}
        </button>
        <button
          type="button"
          className="link-btn"
          onClick={() => {
            setMode(mode === "register" ? "login" : "register");
            setError("");
          }}
        >
          {mode === "register"
            ? "Уже есть аккаунт? Войти"
            : "Нет аккаунта? Зарегистрироваться"}
        </button>
      </form>
    </div>
  );
}
