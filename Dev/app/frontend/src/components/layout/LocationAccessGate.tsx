import { useEffect, useState, type ReactNode } from "react";

const ACK_KEY = "erb_intl_usage_ack_v1";

type GateState = "checking" | "allowed" | "blocked";

async function detectCountryCode(): Promise<string | null> {
  try {
    const response = await fetch("https://ipapi.co/country_code/", { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const code = (await response.text()).trim().toUpperCase();
    return code.length === 2 ? code : null;
  } catch {
    return null;
  }
}

export function LocationAccessGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>(() =>
    typeof window !== "undefined" && window.sessionStorage.getItem(ACK_KEY) === "1" ? "allowed" : "checking",
  );

  useEffect(() => {
    if (state !== "checking") return;
    let cancelled = false;
    void (async () => {
      const country = await detectCountryCode();
      if (cancelled) return;
      if (!country || country === "CA") {
        setState("allowed");
        return;
      }
      setState("blocked");
    })();
    return () => {
      cancelled = true;
    };
  }, [state]);

  if (state === "checking") {
    return (
      <div className="location-gate location-gate--checking" role="status">
        <p className="muted">Verifying regional access…</p>
      </div>
    );
  }

  if (state === "blocked") {
    return (
      <div className="location-gate location-gate--blocked card mission-panel">
        <h2>International access acknowledgment</h2>
        <p>
          Tipsy Fox Escapes is operated from Canada. You appear to be connecting from outside Canada. You may continue after
          confirming you understand regional terms, safety responsibilities, and that puzzle frameworks are provided without
          construction liability.
        </p>
        <div className="button-row">
          <button
            type="button"
            className="primary-btn"
            onClick={() => {
              window.sessionStorage.setItem(ACK_KEY, "1");
              setState("allowed");
            }}
          >
            I understand — continue to builder
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
