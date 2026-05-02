import { Sheet, SheetContent } from "@/components/ui/sheet";
import { DealMeta } from "./DealMeta";
import { DealActions, DealOpenFullPage } from "./DealActions";
import { DealTimeline } from "./DealTimeline";

interface DealDrawerProps {
  mandateId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DealDrawer({ mandateId, open, onOpenChange }: DealDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="dark bg-zinc-950 border-l border-zinc-800 text-zinc-100 w-full sm:max-w-[640px] p-0 flex flex-col"
      >
        {mandateId && (
          <>
            <DealMeta mandateId={mandateId} />
            <DealActions mandateId={mandateId} />
            <DealTimeline mandateId={mandateId} />
            <DealOpenFullPage mandateId={mandateId} />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
