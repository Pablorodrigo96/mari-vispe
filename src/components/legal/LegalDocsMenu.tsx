import { useState } from "react";
import { Link } from "react-router-dom";
import { FileText, ChevronDown, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LegalDocumentGenerator } from "./LegalDocumentGenerator";
import { useUserRoles } from "@/hooks/useUserRoles";

type Category = "nda" | "nbo" | "term_sheet" | "spa";

const ITEMS: { value: Category; label: string }[] = [
  { value: "nda", label: "Gerar NDA" },
  { value: "nbo", label: "Gerar NBO" },
  { value: "term_sheet", label: "Gerar Term Sheet" },
  { value: "spa", label: "Gerar SPA" },
];

interface Props {
  dealId: string;
  size?: "sm" | "default";
  variant?: "outline" | "ghost" | "default";
  label?: string;
  className?: string;
}

export function LegalDocsMenu({
  dealId,
  size = "sm",
  variant = "outline",
  label = "Documentos",
  className,
}: Props) {
  const { isAdmin, isAdvisor } = useUserRoles();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("nda");

  if (!(isAdmin || isAdvisor)) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size={size}
            variant={variant}
            className={`bg-transparent border-zinc-700 text-zinc-200 hover:bg-zinc-800 gap-1.5 ${className ?? ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <FileText className="h-3.5 w-3.5" />
            {label}
            <ChevronDown className="h-3 w-3 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="bg-zinc-900 border-zinc-800 text-zinc-100"
          onClick={(e) => e.stopPropagation()}
        >
          {ITEMS.map((it) => (
            <DropdownMenuItem
              key={it.value}
              onSelect={() => {
                setCategory(it.value);
                setOpen(true);
              }}
            >
              {it.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <LegalDocumentGenerator
        dealId={dealId}
        triggerless
        open={open}
        onOpenChange={setOpen}
        initialCategory={category}
      />
    </>
  );
}
