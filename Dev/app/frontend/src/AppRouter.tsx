import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { SiteShell } from "@/components/layout/SiteShell";

const App = lazy(() => import("./App.tsx"));

const AdminDashboardPage = lazy(() =>
  import("./pages/AdminDashboardPage.tsx").then((m) => ({ default: m.AdminDashboardPage })),
);
const GmConsolePage = lazy(() => import("./pages/GmConsolePage.tsx").then((m) => ({ default: m.GmConsolePage })));
const PlayerDisplayPage = lazy(() =>
  import("./pages/PlayerDisplayPage.tsx").then((m) => ({ default: m.PlayerDisplayPage })),
);
const RoomStepGuardPage = lazy(() =>
  import("./pages/RoomStepGuardPage.tsx").then((m) => ({ default: m.RoomStepGuardPage })),
);

function RouteFallback({ label }: { label: string }) {
  return (
    <SiteShell>
      <p className="muted" style={{ padding: "2rem" }}>
        {label}
      </p>
    </SiteShell>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Suspense fallback={<RouteFallback label="Loading Escape Room Builder…" />}>
              <App />
            </Suspense>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <Suspense fallback={<RouteFallback label="Loading admin panel…" />}>
              <AdminDashboardPage />
            </Suspense>
          }
        />
        <Route
          path="/room/build"
          element={
            <Suspense fallback={<RouteFallback label="Verifying access…" />}>
              <RoomStepGuardPage step="build" wizardStep="themes-puzzles" />
            </Suspense>
          }
        />
        <Route
          path="/room/export"
          element={
            <Suspense fallback={<RouteFallback label="Verifying access…" />}>
              <RoomStepGuardPage step="export" wizardStep="output-review" />
            </Suspense>
          }
        />
        <Route
          path="/gm/:sessionId"
          element={
            <Suspense fallback={<RouteFallback label="Loading GM console…" />}>
              <GmConsolePage />
            </Suspense>
          }
        />
        <Route
          path="/console/:sessionId"
          element={
            <Suspense fallback={<RouteFallback label="Loading GM console…" />}>
              <GmConsolePage />
            </Suspense>
          }
        />
        <Route
          path="/room/:sessionId/player-display"
          element={
            <Suspense fallback={<RouteFallback label="Loading player display…" />}>
              <PlayerDisplayPage />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
