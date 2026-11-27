import { useEffect, useState } from "react";
import { api } from "../api";
import type { VocabRow } from "../types";

export default function VocabPage() {
  const [items, setItems] = useState<VocabRow[]>([]);
  const [tab, setTab] = useState<"todo" | "done">("todo");
  const [hideMeaning, setHideMeaning] = useState(false);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.vocab().then(setItems).finally(() => setLoading(false));
  }, []);

  async function toggle(id: number, learned: boolean) {
    setItems((list) => list.map((x) => (x.id === id ? { ...x, learned } : x)));
    await api.setWordLearned(id, learned).catch(() => {
      setItems((list) => list.map((x) => (x.id === id ? { ...x, learned: !learned } : x)));
    });
  }

  function reveal(id: number) {
    setRevealed((s) => new Set(s).add(id));
  }

  const shown = items.filter((w) => (tab === "todo" ? !w.learned : w.learned));

  return (
    <div className="page">
      <h2>Слова</h2>
      <div className="tabs">
        <button className={tab === "todo" ? "on" : ""} onClick={() => setTab("todo")}>
          Учу ({items.filter((w) => !w.learned).length})
        </button>
        <button className={tab === "done" ? "on" : ""} onClick={() => setTab("done")}>
          Выучено ({items.filter((w) => w.learned).length})
        </button>
        <label className="check">
          <input type="checkbox" checked={hideMeaning} onChange={(e) => setHideMeaning(e.target.checked)} />
          Скрыть значения (проверь себя)
        </label>
      </div>

      {loading ? (
        <div className="muted">Загрузка…</div>
      ) : shown.length === 0 ? (
        <div className="empty">Новые слова из ответов бота будут сохраняться здесь автоматически.</div>
      ) : (
        <div className="grid">
          {shown.map((w) => {
            const hidden = hideMeaning && !revealed.has(w.id);
            return (
              <div key={w.id} className="card word">
                <div className="word-title">{w.word}</div>
                {hidden ? (
                  <button className="link-btn" onClick={() => reveal(w.id)}>Показать значение</button>
                ) : (
                  <>
                    <div>{w.meaning}</div>
                    <div className="muted small example">{w.example}</div>
                  </>
                )}
                <div className="actions">
                  <button className="link-btn" onClick={() => toggle(w.id, !w.learned)}>
                    {w.learned ? "Вернуть в изучение" : "Выучил"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
