import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PlanningSidebar, type PlanningSidebarProps } from "@/components/planning/PlanningSidebar";

type PlanningSnapshotSheetProps = PlanningSidebarProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PlanningSnapshotSheet({ open, onOpenChange, ...sidebarProps }: PlanningSnapshotSheetProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="planning-snapshot-sheet fixed inset-y-0 right-0 left-auto h-full w-full max-w-md translate-x-0 translate-y-0 overflow-y-auto rounded-none border-l border-slate-800/50 data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Plan snapshot</DialogTitle>
          <DialogDescription>Read-only summary with optional inline edits. Changes sync to your session.</DialogDescription>
        </DialogHeader>
        <PlanningSidebar {...sidebarProps} />
      </DialogContent>
    </Dialog>
  );
}
