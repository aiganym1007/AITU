import { useEffect, useState } from "react";
import { api } from "../api";
import { MISTAKE_TYPES, type Mistake } from "../types";

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

function MistakeCard({ m, onToggle }: { m: Mistake; onToggle: (id: number, reviewed: boolean) => void }) {
  const [practice, setPractice] = useState(false);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<"idle" | "right" | "wrong">("idle");

  function check() {
    if (norm(answer) === norm(m.corrected)) {
      setResult("right");
      setTimeout(() => onToggle(m.id, true), 900);
    } else {
      setResult("wrong");
    }
  }

  return (
    <div className="card mistake">
      <div className="card-head">
        <span className="tag">{MISTAKE_TYPES[m.type] ?? m.type}</span>
        <span className="muted small">{new Date(m.createdAt.replace(" ", "T") + "Z").toLocaleDateString()}</span>
      </div>

      {!practice ? (
        <>
          <div className="bad"><s>{m.original}</s></div>
          <div className="good">{m.corrected}</div>
          <div className="explain">{m.explanation}</div>
        </>
      ) : (
        <>
          <div className="muted small">Исправь фразу:</div>
          <div className="bad">{m.original}</div>
          <input
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value);
              setResult("idle");
            }}
            onKeyDown={(e) => e.key === "Enter" && check()}
            placeholder="Напиши правильный вариант"
            autoFocus
          />
          {result === "right" && <div className="good">Верно!</div>}
          {result === "wrong" && <div className="error">Пока неверно. Подсказка: {m.explanation}</div>}
          <div className="actions">
            <button className="btn small" onClick={check} disabled={!answer.trim()}>Проверить</button>
            <button className="link-btn" onClick={() => setAnswer(m.corrected)}>Показать ответ</button>
          </div>
        </>
      )}

      <div className="actions">
        {!m.reviewed && (
          <button className="link-btn" onClick={() => setPractice(!practice)}>
            {practice ? "Закрыть тренировку" : "Потренироваться"}
          </button>
        )}
        <button className="link-btn" onClick={() => onToggle(m.id, !m.reviewed)}>
          {m.reviewed ? "Вернуть в повторение" : "Отметить повторенным"}
        </button>
      </div>
    </div>
  );
}

export default function MistakesPage() {
  const [items, setItems] = useState<Mistake[]>([]);
  const [tab, setTab] = useState<"todo" | "done">("todo");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.mistakes().then(setItems).finally(() => setLoading(false));
  }, []);

  async function toggle(id: number, reviewed: boolean) {
    setItems((list) => list.map((x) => (x.id === id ? { ...x, reviewed } : x)));
    await api.setMistakeReviewed(id, reviewed).catch(() => {
      setItems((list) => list.map((x) => (x.id === id ? { ...x, reviewed: !reviewed } : x)));
    });
  }

  const shown = items.filter((m) => (tab === "todo" ? !m.reviewed : m.reviewed));

  return (
    <div className="page">
      <h2>Мои ошибки</h2>
      <div className="tabs">
        <button className={tab === "todo" ? "on" : ""} onClick={() => setTab("todo")}>
          К повторению ({items.filter((m) => !m.reviewed).length})
        </button>
        <button className={tab === "done" ? "on" : ""} onClick={() => setTab("done")}>
          Повторено ({items.filter((m) => m.reviewed).length})
        </button>
      </div>

      {loading ? (
        <div className="muted">Загрузка…</div>
      ) : shown.length === 0 ? (
        <div className="empty">
          {tab === "todo"
            ? "Здесь появятся ошибки из твоих сообщений. Пока всё чисто."
            : "Повторенные ошибки появятся здесь."}
        </div>
      ) : (
        <div className="list">
          {shown.map((m) => (
            <MistakeCard key={m.id} m={m} onToggle={toggle} />
          ))}
        </div>
      )}
    </div>
  );
}
