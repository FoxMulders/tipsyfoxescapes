import { useEffect, useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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

  const acknowledge = (): void => {
    window.sessionStorage.setItem(ACK_KEY, "1");
    setState("allowed");
  };

  if (state === "checking") {
    return (
      <div className="location-gate location-gate--checking" role="status" aria-live="polite">
        <div className="location-gate__spinner" aria-hidden />
        <p className="location-gate__status">Verifying regional access…</p>
      </div>
    );
  }

  return (
    <>
      {state === "allowed" ? children : null}
      <Dialog open={state === "blocked"} onOpenChange={() => undefined}>
        <DialogContent className="location-gate-dialog">
          <DialogHeader>
            <DialogTitle>International access acknowledgment</DialogTitle>
            <DialogDescription>
              Tipsy Fox Escapes is operated from Canada. You appear to be connecting from outside Canada. Review regional
              terms and safety responsibilities before entering the builder workspace.
            </DialogDescription>
          </DialogHeader>
          <ul className="location-gate-dialog__list">
            <li>Puzzle frameworks and storylines are provided without construction liability.</li>
            <li>You are responsible for verifying physical builds are safe to install and operate.</li>
            <li>Export and save features follow the same terms as our Canadian-hosted service.</li>
          </ul>
          <DialogFooter className="location-gate-dialog__footer">
            <Button type="button" className="location-gate-dialog__cta" onClick={acknowledge}>
              I understand — continue to builder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
