import { useState } from "react";
import {
  MessageSquare,
  Send,
  Loader2,
  EyeOff,
  Eye,
  Check,
} from "lucide-react";
import {
  useDealQA,
  useAskQuestion,
  useAnswerQuestion,
  useStaffPostQuestion,
  useToggleQAVisibility,
  type DealQARow,
} from "@/hooks/useDealQA";
import { useEffectiveRoles } from "@/hooks/useEffectiveRoles";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  dealId: string;
  /** When provided (staff view), restrict to a specific buyer. When null, buyer sees own. */
  buyerUserId?: string | null;
  /** Renders a more compact mode for sidebars / sections. */
  compact?: boolean;
  /** Disable any write actions (observer / read-only). */
  readOnly?: boolean;
}

/**
 * Painel de Q&A para um deal.
 * - Comprador: vê apenas suas perguntas/respostas visíveis e pode enviar novas.
 * - Staff (advisor/admin/legal): vê tudo, pode responder, ocultar/exibir e postar em nome.
 */
export function DealQAPanel({
  dealId,
  buyerUserId = null,
  compact = false,
  readOnly = false,
}: Props) {
  const { isAdmin, isAdvisor, roles } = useEffectiveRoles();
  const isLegal = (roles as any[])?.includes?.("legal");
  const isStaff = isAdmin || isAdvisor || isLegal;
  const isBuyerView = !isStaff;

  const qaQ = useDealQA(dealId, buyerUserId);
  const askMut = useAskQuestion(dealId);
  const answerMut = useAnswerQuestion(dealId);
  const staffPostMut = useStaffPostQuestion(dealId);
  const toggleMut = useToggleQAVisibility(dealId);

  const [question, setQuestion] = useState("");
  const [answerDraft, setAnswerDraft] = useState<Record<string, string>>({});

  const items = qaQ.data ?? [];

  const onAsk = async () => {
    const text = question.trim();
    if (!text) return;
    if (isBuyerView) {
      await askMut.mutateAsync(text);
    } else if (buyerUserId) {
      await staffPostMut.mutateAsync({ buyerUserId, question: text });
    }
    setQuestion("");
  };

  const onAnswer = async (id: string) => {
    const txt = (answerDraft[id] ?? "").trim();
    if (!txt) return;
    await answerMut.mutateAsync({ id, answer: txt });
    setAnswerDraft((s) => ({ ...s, [id]: "" }));
  };

  const canPostHere = isBuyerView || (isStaff && !!buyerUserId);

  return (
    <div
      className={cn(
        "rounded border border-zinc-800 bg-zinc-900/40 p-4 space-y-3",
        compact && "p-3",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 inline-flex items-center gap-1">
          <MessageSquare className="h-3 w-3 text-[#D9F564]" /> Perguntas & Respostas
        </div>
        <Badge variant="outline" className="text-[9px] bg-transparent">
          {items.length}
        </Badge>
      </div>

      {qaQ.isLoading ? (
        <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Carregando…
        </div>
      ) : items.length === 0 ? (
        <div className="text-xs text-muted-foreground">
          Nenhuma pergunta ainda.
        </div>
      ) : (
        <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {items.map((q) => (
            <QAItem
              key={q.id}
              row={q}
              isStaff={isStaff}
              readOnly={readOnly}
              answerDraft={answerDraft[q.id] ?? ""}
              onAnswerDraftChange={(v) =>
                setAnswerDraft((s) => ({ ...s, [q.id]: v }))
              }
              onAnswer={() => onAnswer(q.id)}
              onToggleVisibility={() =>
                toggleMut.mutate({ id: q.id, visible: !q.visible_to_buyer })
              }
              answerSubmitting={answerMut.isPending}
            />
          ))}
        </ul>
      )}

      {!readOnly && canPostHere && (
        <div className="pt-2 border-t border-zinc-800 space-y-2">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={
              isBuyerView
                ? "Sua pergunta para o assessor…"
                : "Postar pergunta em nome do comprador…"
            }
            className="min-h-[60px] text-xs bg-zinc-950/60 border-zinc-800"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={onAsk}
              disabled={
                !question.trim() || askMut.isPending || staffPostMut.isPending
              }
              className="bg-[#D9F564] text-zinc-950 hover:bg-[#D9F564]/90"
            >
              {askMut.isPending || staffPostMut.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Send className="h-3 w-3 mr-1" />
              )}
              Enviar
            </Button>
          </div>
        </div>
      )}

      {!readOnly && isStaff && !buyerUserId && (
        <div className="text-[10px] text-amber-300/80 border-t border-zinc-800 pt-2">
          Selecione um comprador na sala para responder ou postar perguntas.
        </div>
      )}
    </div>
  );
}

function QAItem({
  row,
  isStaff,
  readOnly,
  answerDraft,
  onAnswerDraftChange,
  onAnswer,
  onToggleVisibility,
  answerSubmitting,
}: {
  row: DealQARow;
  isStaff: boolean;
  readOnly: boolean;
  answerDraft: string;
  onAnswerDraftChange: (v: string) => void;
  onAnswer: () => void;
  onToggleVisibility: () => void;
  answerSubmitting: boolean;
}) {
  const answered = !!row.answer;
  return (
    <li className="rounded border border-zinc-800 bg-zinc-950/40 p-2 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[9px] uppercase tracking-wider text-zinc-500">
            {row.author_role} ·{" "}
            {new Date(row.created_at).toLocaleString("pt-BR")}
          </div>
          <div className="text-[12px] text-zinc-100 break-words whitespace-pre-wrap">
            {row.question}
          </div>
        </div>
        {isStaff && (
          <button
            type="button"
            onClick={onToggleVisibility}
            title={row.visible_to_buyer ? "Ocultar do comprador" : "Mostrar ao comprador"}
            disabled={readOnly}
            className="text-zinc-400 hover:text-zinc-100 disabled:opacity-40"
          >
            {row.visible_to_buyer ? (
              <Eye className="h-3 w-3" />
            ) : (
              <EyeOff className="h-3 w-3 text-amber-300" />
            )}
          </button>
        )}
      </div>

      {answered ? (
        <div className="rounded bg-[#D9F564]/5 border border-[#D9F564]/20 p-2">
          <div className="text-[9px] uppercase tracking-wider text-emerald-300 inline-flex items-center gap-1">
            <Check className="h-3 w-3" /> Respondido{" "}
            {row.answered_at &&
              `· ${new Date(row.answered_at).toLocaleString("pt-BR")}`}
          </div>
          <div className="text-[12px] text-zinc-100 break-words whitespace-pre-wrap mt-0.5">
            {row.answer}
          </div>
        </div>
      ) : isStaff && !readOnly ? (
        <div className="space-y-1">
          <Textarea
            value={answerDraft}
            onChange={(e) => onAnswerDraftChange(e.target.value)}
            placeholder="Resposta…"
            className="min-h-[50px] text-xs bg-zinc-950/60 border-zinc-800"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={onAnswer}
              disabled={!answerDraft.trim() || answerSubmitting}
              className="bg-transparent border-[#D9F564]/40 text-[#D9F564] hover:bg-[#D9F564]/10 h-7 text-[11px]"
            >
              {answerSubmitting ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Send className="h-3 w-3 mr-1" />
              )}
              Responder
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-[10px] text-amber-300/80">Aguardando resposta…</div>
      )}
    </li>
  );
}
