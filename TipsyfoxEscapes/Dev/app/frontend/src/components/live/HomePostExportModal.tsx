import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { OperatingMode } from "../../../../shared/liveContracts";

type Props = {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  operatingMode: OperatingMode;
  hasGmConsole: boolean;
  onDownloadRunbook: () => void;
  planName: string;
};

export function HomePostExportModal({
  open,
  onClose,
  sessionId,
  operatingMode,
  hasGmConsole,
  onDownloadRunbook,
  planName,
}: Props) {
  const playerPath = `/room/${sessionId}/player-display`;
  const gmPath = `/gm/${sessionId}`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="live-glass-panel max-w-lg border-slate-700/60 bg-slate-950/90 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle>How to run your game</DialogTitle>
          <DialogDescription>
            {planName ? (
              <>
                Your plan for <strong>{planName}</strong> is ready. Use the runbook on this device and mirror the player
                screen on a TV or tablet.
              </>
            ) : (
              <>Your export is ready. Mirror the player screen on a TV or tablet while you host from this device.</>
            )}
          </DialogDescription>
        </DialogHeader>
        <ol className="live-onboarding-steps">
          {operatingMode === "venue" ? (
            <>
              <li>Open the GM Live Console on your crew tablet.</li>
              <li>Pair the player display on the in-room projector or TV.</li>
              <li>Run the game — clues and timer sync in real time.</li>
            </>
          ) : (
            <>
              <li>Open the player link on your TV or tablet.</li>
              <li>Keep this device as your controller with the runbook.</li>
              <li>Start the timer and deliver hints from your plan.</li>
            </>
          )}
        </ol>
        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button type="button" variant="secondary" onClick={onDownloadRunbook}>
            Print / Download runbook
          </Button>
          <Button type="button" asChild>
            <Link to={playerPath} onClick={onClose}>
              Launch player screen
            </Link>
          </Button>
          {operatingMode === "venue" ? (
            <Button type="button" className={hasGmConsole ? "" : "opacity-80"} variant={hasGmConsole ? "default" : "outline"} asChild>
              <Link to={gmPath} onClick={onClose}>
                Deploy to Live Gamemaster Console
              </Link>
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
