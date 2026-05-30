import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchResetChecklist } from "@/live/api";

type Props = {
  open: boolean;
  onClose: () => void;
  sessionId: string;
};

export function ResetChecklistModal({ open, onClose, sessionId }: Props) {
  const [step, setStep] = useState(0);
  const [steps, setSteps] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setLoading(true);
    void fetchResetChecklist(sessionId)
      .then(setSteps)
      .catch(() =>
        setSteps([
          "Power down electronics.",
          "Reset locks and props.",
          "Clear player markings.",
          "Verify timer and clue screen are cleared.",
        ]),
      )
      .finally(() => setLoading(false));
  }, [open, sessionId]);

  const done = step >= steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="live-glass-panel glass-panel max-w-md border-white/12 bg-transparent">
        <DialogHeader>
          <DialogTitle>Interactive reset checklist</DialogTitle>
          <DialogDescription>Step through teardown before the next group.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading checklist…</p>
        ) : steps.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Step {step + 1} of {steps.length}
            </p>
            <p className="text-sm leading-relaxed">{steps[step]}</p>
          </div>
        ) : null}
        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
          {!done ? (
            <Button type="button" onClick={() => setStep((s) => Math.min(s + 1, steps.length - 1))}>
              Next step
            </Button>
          ) : (
            <Button type="button" onClick={onClose}>
              Reset complete
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
