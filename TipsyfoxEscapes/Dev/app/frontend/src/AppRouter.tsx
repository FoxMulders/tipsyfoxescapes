import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import App from "./App.tsx";
import { GmConsolePage } from "./pages/GmConsolePage.tsx";
import { PlayerDisplayPage } from "./pages/PlayerDisplayPage.tsx";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/gm/:sessionId" element={<GmConsolePage />} />
        <Route path="/console/:sessionId" element={<GmConsolePage />} />
        <Route path="/room/:sessionId/player-display" element={<PlayerDisplayPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
