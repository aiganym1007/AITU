import type {
  ChatMessage,
  Lang,
  Level,
  Mistake,
  User,
  VocabRow,
} from "./types";

const TOKEN_KEY = "aitu_token";
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Что-то пошло не так");
  return data as T;
}

const post = (body: unknown): RequestInit => ({
  method: "POST",
  body: JSON.stringify(body),
});

export const api = {
  register: (body: {
    email: string;
    password: string;
    learningLang: Lang;
    nativeLang: Lang;
    level: Level;
  }) => request<{ token: string; user: User }>("/auth/register", post(body)),
  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: User }>("/auth/login", post(body)),
  me: () => request<User>("/me"),
  updateLevel: (level: Level) =>
    request<User>("/me", { method: "PATCH", body: JSON.stringify({ level }) }),

  messages: () => request<ChatMessage[]>("/messages"),
  sendMessage: (text: string) =>
    request<{ userMessage: ChatMessage; assistantMessage: ChatMessage }>(
      "/chat",
      post({ text }),
    ),

  mistakes: () => request<Mistake[]>("/mistakes"),
  setMistakeReviewed: (id: number, reviewed: boolean) =>
    request<{ ok: true }>(`/mistakes/${id}/reviewed`, post({ reviewed })),

  vocab: () => request<VocabRow[]>("/vocab"),
  setWordLearned: (id: number, learned: boolean) =>
    request<{ ok: true }>(`/vocab/${id}/learned`, post({ learned })),
};
