import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import App from "./App.tsx";
import { AdminDashboardPage } from "./pages/AdminDashboardPage.tsx";
import { GmConsolePage } from "./pages/GmConsolePage.tsx";
import { PlayerDisplayPage } from "./pages/PlayerDisplayPage.tsx";
import { RoomStepGuardPage } from "./pages/RoomStepGuardPage.tsx";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/room/build" element={<RoomStepGuardPage step="build" wizardStep="themes-puzzles" />} />
        <Route path="/room/export" element={<RoomStepGuardPage step="export" wizardStep="output-review" />} />
        <Route path="/gm/:sessionId" element={<GmConsolePage />} />
        <Route path="/console/:sessionId" element={<GmConsolePage />} />
        <Route path="/room/:sessionId/player-display" element={<PlayerDisplayPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
