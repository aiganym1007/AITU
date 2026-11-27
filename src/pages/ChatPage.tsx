import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import { LANG_NAMES, MISTAKE_TYPES, type ChatMessage } from "../types";

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.messages().then(setMessages).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  if (!user) return null;
  const langName = LANG_NAMES[user.learningLang];

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value || sending) return;

    setText("");
    setError("");
    setSending(true);

    // Показываем сообщение сразу, пока ждём ответ
    const temp: ChatMessage = {
      id: -Date.now(),
      role: "user",
      text: value,
      languageOk: true,
      corrections: [],
      vocabulary: [],
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, temp]);

    try {
      const { userMessage, assistantMessage } = await api.sendMessage(value);
      setMessages((m) => [...m.filter((x) => x.id !== temp.id), userMessage, assistantMessage]);
    } catch (err) {
      setMessages((m) => m.filter((x) => x.id !== temp.id));
      setText(value);
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <div className="chat">
      <div className="chat-scroll">
        {messages.length === 0 && !sending && (
          <div className="empty">
            Напиши первое сообщение на языке «{langName}». Например, расскажи, как прошёл твой день или
            о чём хочешь поговорить.
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`msg ${m.role}`}>
            <div className={`bubble ${m.role === "assistant" && !m.languageOk ? "notice" : ""}`}>
              {m.text}
            </div>

            {m.role === "user" && m.id > 0 && m.languageOk && (
              m.corrections.length > 0 ? (
                <div className="corr">
                  {m.corrections.map((c, i) => (
                    <div key={i} className="corr-item">
                      <div>
                        <s>{c.original}</s> <span className="arrow">→</span> <strong>{c.corrected}</strong>
                        <span className="tag">{MISTAKE_TYPES[c.type] ?? c.type}</span>
                      </div>
                      <div className="explain">{c.explanation}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="clean">Ошибок нет</div>
              )
            )}

            {m.role === "assistant" && m.vocabulary.length > 0 && (
              <div className="vocab-row">
                {m.vocabulary.map((v) => (
                  <span key={v.word} className="chip" title={`${v.meaning}\n${v.example}`}>
                    {v.word}
                    <small>{v.meaning}</small>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="msg assistant">
            <div className="bubble typing">Печатает…</div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && <div className="error chat-error">{error}</div>}

      <form className="composer" onSubmit={onSubmit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={`Пиши на языке: ${langName}`}
          rows={1}
          maxLength={2000}
        />
        <button className="btn" disabled={sending || !text.trim()}>Отправить</button>
      </form>
    </div>
  );
}
