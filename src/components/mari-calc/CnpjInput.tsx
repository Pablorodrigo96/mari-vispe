import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search } from "lucide-react";
import { maskCnpj, isValidCnpj } from "@/lib/mariWindowHeuristic";

interface Props {
  onSubmit: (cnpj: string) => void;
  loading?: boolean;
}

export function CnpjInput({ onSubmit, loading }: Props) {
  const [value, setValue] = useState("");
  const valid = isValidCnpj(value);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid && !loading) onSubmit(value.replace(/\D/g, ""));
      }}
      className="flex flex-col sm:flex-row gap-2 w-full"
    >
      <Input
        inputMode="numeric"
        placeholder="00.000.000/0000-00"
        value={value}
        onChange={(e) => setValue(maskCnpj(e.target.value))}
        className="h-12 text-base flex-1"
        aria-label="CNPJ da empresa"
      />
      <Button type="submit" size="lg" disabled={!valid || loading} className="h-12 sm:w-auto">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Search className="h-4 w-4 mr-2" /> Calcular janela</>}
      </Button>
    </form>
  );
}
