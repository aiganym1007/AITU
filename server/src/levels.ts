export const LANGS = ["kk", "ru", "en"] as const;
export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export type Lang = (typeof LANGS)[number];
export type Level = (typeof LEVELS)[number];

export const LANG_NAMES: Record<Lang, string> = {
  kk: "Kazakh",
  ru: "Russian",
  en: "English",
};

// Уровень, на котором отвечает бот: на ступень выше пользователя.
export function nextLevel(level: Level): Level {
  const i = LEVELS.indexOf(level);
  return LEVELS[Math.min(i + 1, LEVELS.length - 1)];
}
