import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DealCard } from "@/components/equity-brain/DealCard";

export default function DealDetailPage() {
  const { cnpj } = useParams<{ cnpj: string }>();
  const navigate = useNavigate();

  if (!cnpj) {
    return <div className="p-8 text-center text-zinc-500">CNPJ inválido.</div>;
  }

  return (
    <div>
      <div className="border-b border-zinc-800 px-6 py-3 flex items-center gap-2">
        <Button
          size="sm" variant="ghost"
          onClick={() => navigate(-1)}
          className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
      </div>
      <DealCard cnpj={cnpj} mode="page" />
    </div>
  );
}
