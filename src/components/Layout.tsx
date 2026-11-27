import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { LANG_NAMES, LEVELS, type Level } from "../types";

export default function Layout() {
  const { user, logout, changeLevel } = useAuth();
  if (!user) return null;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">AITU</div>
        <nav className="nav">
          <NavLink to="/" end>
            Чат
          </NavLink>
          <NavLink to="/mistakes">Мои ошибки</NavLink>
          <NavLink to="/vocab">Слова</NavLink>
        </nav>
        <div className="sidebar-foot">
          <div className="learning">
            Учу: <strong>{LANG_NAMES[user.learningLang]}</strong>
          </div>
          <label className="level-pick">
            Уровень
            <select
              value={user.level}
              onChange={(e) => changeLevel(e.target.value as Level)}
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <div className="email">{user.email}</div>
          <button className="link-btn" onClick={logout}>
            Выйти
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
