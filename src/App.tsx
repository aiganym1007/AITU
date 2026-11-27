import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./AuthContext";
import Layout from "./components/Layout";
import AuthPage from "./pages/AuthPage";
import ChatPage from "./pages/ChatPage";
import MistakesPage from "./pages/MistakesPage";
import VocabPage from "./pages/VocabPage";

function Protected() {
  const { user, loading } = useAuth();
  if (loading) return <div className="center">Загрузка…</div>;
  return user ? <Layout /> : <Navigate to="/auth" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route element={<Protected />}>
        <Route index element={<ChatPage />} />
        <Route path="mistakes" element={<MistakesPage />} />
        <Route path="vocab" element={<VocabPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
