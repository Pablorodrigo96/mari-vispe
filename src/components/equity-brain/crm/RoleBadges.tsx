import { Badge } from "@/components/ui/badge";
import { Building2, Target, Layers } from "lucide-react";

interface RoleBadgesProps {
  isTarget?: boolean;
  isBuyer?: boolean;
  promotedFrom?: string | null;
  className?: string;
}

/**
 * Shows the role(s) a contact plays in Equity Brain.
 * - target: appears in companies pool (sell-side)
 * - buyer: appears in buyers pool (buy-side)
 * - dual: both
 */
export function RoleBadges({ isTarget, isBuyer, promotedFrom, className }: RoleBadgesProps) {
  const dual = isTarget && isBuyer;
  return (
    <div className={`inline-flex flex-wrap gap-1 ${className ?? ""}`}>
      {dual ? (
        <Badge variant="outline" className="bg-violet-950/40 border-violet-700/60 text-violet-200 text-[10px] h-5 gap-1">
          <Layers className="h-3 w-3" /> Dual
        </Badge>
      ) : (
        <>
          {isTarget && (
            <Badge variant="outline" className="bg-sky-950/40 border-sky-700/60 text-sky-200 text-[10px] h-5 gap-1">
              <Target className="h-3 w-3" /> Target
            </Badge>
          )}
          {isBuyer && (
            <Badge variant="outline" className="bg-amber-950/40 border-amber-700/60 text-amber-200 text-[10px] h-5 gap-1">
              <Building2 className="h-3 w-3" /> Buyer
            </Badge>
          )}
        </>
      )}
      {promotedFrom && promotedFrom !== "rfb" && promotedFrom !== "manual" && (
        <Badge variant="outline" className="bg-zinc-900 border-zinc-700 text-zinc-400 text-[10px] h-5">
          promovido
        </Badge>
      )}
    </div>
  );
}
