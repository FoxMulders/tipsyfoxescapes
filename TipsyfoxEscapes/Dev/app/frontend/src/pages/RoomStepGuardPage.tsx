import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getOrCreateDeviceId } from "@/deviceId";

const AUTH_STORAGE_KEY = "escape-room-builder-auth-v1";
const API_BASE = "";

type RoomStepGuardPageProps = {
  step: "build" | "export";
  wizardStep: "themes-puzzles" | "output-review";
};

export function RoomStepGuardPage({ step, wizardStep }: RoomStepGuardPageProps) {
  const navigate = useNavigate();
  const [deniedMessage, setDeniedMessage] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let token = "";
    try {
      const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) token = (JSON.parse(raw) as { authToken?: string }).authToken ?? "";
    } catch {
      // ignore
    }
    void (async () => {
      try {
        const headers: HeadersInit = { "X-Device-Id": getOrCreateDeviceId() };
        if (token) headers.Authorization = `Bearer ${token}`;
        const response = await fetch(`${API_BASE}/api/access/room/${step}`, { headers });
        const data = (await response.json()) as {
          allowed?: boolean;
          clearSessionPayload?: boolean;
          error?: { message?: string; code?: string };
        };
        if (data.clearSessionPayload) {
          try {
            window.sessionStorage.removeItem("escape-room-builder-session-id");
          } catch {
            // ignore
          }
        }
        if (!response.ok) {
          setDeniedMessage(data.error?.message ?? "You do not have access to this step on your current plan.");
          setReady(true);
          return;
        }
        setReady(true);
        navigate("/", { replace: true, state: { wizardStep, billingCode: data.error?.code } });
      } catch {
        setDeniedMessage("Could not verify plan access. Check that the backend is running.");
        setReady(true);
      }
    })();
  }, [navigate, step, wizardStep]);

  if (!ready) {
    return (
      <div className="page-shell page-shell--layered">
        <p className="muted" style={{ padding: "2rem" }}>
          Verifying access…
        </p>
      </div>
    );
  }

  if (deniedMessage) {
    return (
      <div className="page-shell page-shell--layered">
        <section className="card mission-panel glass-panel" style={{ margin: "2rem auto", maxWidth: 520 }}>
          <h2>Access restricted</h2>
          <p className="muted">{deniedMessage}</p>
          <button type="button" className="primary-btn" onClick={() => navigate("/", { replace: true, state: { openUpgrade: true } })}>
            View plans
          </button>
        </section>
      </div>
    );
  }

  return <Navigate to="/" replace />;
}
