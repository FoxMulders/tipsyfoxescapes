import { useCallback, useEffect, useId, useRef, useState } from "react";
import { resolveSquareWebEnvironment } from "@/lib/squareEnv";

type SquarePaymentsConfig = {
  applicationId: string;
  locationId: string;
  environment: "sandbox" | "production";
};

type SquareCheckoutProps = {
  planId: string;
  planLabel: string;
  authToken: string;
  square: SquarePaymentsConfig | null;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
};

type SquareCard = {
  attach: (selector: string) => Promise<void>;
  tokenize: () => Promise<{ status: string; token?: string; errors?: unknown[] }>;
};

type SquarePaymentsInstance = {
  card: () => Promise<SquareCard>;
};

declare global {
  interface Window {
    Square?: {
      payments: (applicationId: string, locationId: string) => SquarePaymentsInstance;
    };
  }
}

const squareScriptUrl = (env: "sandbox" | "production"): string =>
  env === "production"
    ? "https://web.squarecdn.com/v1/square.js"
    : "https://sandbox.web.squarecdn.com/v1/square.js";

let squareScriptPromise: Promise<void> | null = null;
let squareScriptLoadedEnv: "sandbox" | "production" | null = null;

const loadSquareScript = (env: "sandbox" | "production"): Promise<void> => {
  if (window.Square && squareScriptLoadedEnv === env) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>('script[data-square-sdk="true"]');
  if (existing && squareScriptLoadedEnv !== env) {
    existing.remove();
    squareScriptPromise = null;
    squareScriptLoadedEnv = null;
    delete window.Square;
  }

  if (squareScriptPromise && squareScriptLoadedEnv === env) return squareScriptPromise;

  squareScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = squareScriptUrl(env);
    script.async = true;
    script.dataset.squareSdk = "true";
    script.dataset.squareEnv = env;
    script.onload = () => {
      squareScriptLoadedEnv = env;
      resolve();
    };
    script.onerror = () => reject(new Error("Square SDK failed to load."));
    document.head.appendChild(script);
  });
  return squareScriptPromise;
};

export function SquareCheckout({ planId, planLabel, authToken, square, onNotice, onError }: SquareCheckoutProps) {
  const containerId = useId().replace(/:/g, "");
  const cardRef = useRef<SquareCard | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    if (!square?.applicationId || !square.locationId) {
      setSdkReady(false);
      setInitError("Square Web Payments is not configured (missing application or location id).");
      return;
    }
    let cancelled = false;
    setInitError(null);
    setSdkReady(false);
    void (async () => {
      try {
        const sdkEnvironment = resolveSquareWebEnvironment(square.applicationId, square.environment);
        await loadSquareScript(sdkEnvironment);
        if (cancelled || !window.Square) return;
        const payments = window.Square.payments(square.applicationId, square.locationId);
        const card = await payments.card();
        await card.attach(`#${containerId}`);
        if (cancelled) return;
        cardRef.current = card;
        setSdkReady(true);
      } catch (err) {
        if (!cancelled) {
          setInitError(err instanceof Error ? err.message : "Could not initialize Square card form.");
        }
      }
    })();
    return () => {
      cancelled = true;
      cardRef.current = null;
    };
  }, [square, containerId]);

  const handlePay = useCallback(async () => {
    if (!cardRef.current) {
      onError("Card form is not ready yet.");
      return;
    }
    setLoading(true);
    onError("");
    try {
      const result = await cardRef.current.tokenize();
      if (result.status !== "OK" || !result.token) {
        throw new Error("Card could not be tokenized. Check the form and try again.");
      }
      const response = await fetch("/api/payments/square/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ sourceId: result.token, planId }),
      });
      const data = (await response.json()) as { message?: string; error?: { message?: string } };
      if (!response.ok) {
        throw new Error(data.error?.message ?? "Payment could not be processed.");
      }
      onNotice(data.message ?? `Payment submitted for ${planLabel}.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Payment failed.");
    } finally {
      setLoading(false);
    }
  }, [authToken, onError, onNotice, planId, planLabel]);

  if (!square?.applicationId) {
    return (
      <p className="muted pricing-square-hint" role="status">
        In-card checkout needs <code>SQUARE_APPLICATION_ID</code> in Vercel environment variables. You can still use hosted Square checkout below.
      </p>
    );
  }

  return (
    <section className="square-checkout-panel" aria-label="Square card checkout">
      <header className="square-checkout-head">
        <h3>Pay with card</h3>
        <p className="muted">{planLabel}</p>
      </header>
      {initError ? (
        <p className="error-inline" role="alert">
          {initError}
        </p>
      ) : (
        <>
          <p className="square-checkout-status muted" role="status" aria-live="polite">
            {sdkReady ? "Enter your card details below." : "Loading secure payment form…"}
          </p>
          <div id={containerId} className="square-card-container" aria-label="Card details" />
          <button
            type="button"
            className="primary-btn square-checkout-submit"
            disabled={!sdkReady || loading}
            aria-busy={loading}
            onClick={() => void handlePay()}
          >
            {loading ? "Processing…" : `Pay — ${planLabel}`}
          </button>
        </>
      )}
    </section>
  );
}
