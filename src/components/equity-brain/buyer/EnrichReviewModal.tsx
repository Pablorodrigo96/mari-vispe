import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  buyerId: string;
  suggested: any;
  citations: string[];
  onClose: () => void;
}

export function EnrichReviewModal({ buyerId, suggested, citations, onClose }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [sel, setSel] = useState<Record<string, boolean>>({
    cnpj: false,
    website: false,
    linkedin_url: false,
    email_contato_principal: false,
    telefone_contato: false,
    pe_sponsor_name: false,
    vertical_principal: false,
    deals_realizados: false,
    deals_last_12m: false,
    avg_multiple_paid_recent: false,
    recent_capital_raise_brl: false,
    tese: false,
    setores_foco: false,
    regioes_foco: false,
    deals_recentes: false,
    captacao: false,
    equipe: false,
  });
  const [saving, setSaving] = useState(false);

  function toggle(k: string) {
    setSel((s) => ({ ...s, [k]: !s[k] }));
  }

  const m = suggested?.metricas ?? {};
  const identityFields: Array<{ k: string; label: string; value: any }> = [
    { k: "cnpj", label: "CNPJ", value: suggested?.cnpj },
    { k: "website", label: "Website", value: suggested?.website },
    { k: "linkedin_url", label: "LinkedIn", value: suggested?.linkedin_url },
    { k: "email_contato_principal", label: "Email contato", value: suggested?.email_contato_principal },
    { k: "telefone_contato", label: "Telefone", value: suggested?.telefone_contato },
    { k: "pe_sponsor_name", label: "PE Sponsor", value: suggested?.pe_sponsor_name },
    { k: "vertical_principal", label: "Vertical principal", value: suggested?.vertical_principal },
  ].filter((f) => f.value);

  const metricFields: Array<{ k: string; label: string; value: any; format?: (v: any) => string }> = [
    { k: "deals_realizados", label: "Total deals históricos", value: m.deals_realizados },
    { k: "deals_last_12m", label: "Deals últimos 12m", value: m.deals_last_12m },
    { k: "avg_multiple_paid_recent", label: "Múltiplo médio EV/EBITDA", value: m.avg_multiple_paid_recent, format: (v: any) => `${v}x` },
    { k: "recent_capital_raise_brl", label: "Última captação", value: m.recent_capital_raise_brl, format: (v: any) => `R$ ${(Number(v) / 1e6).toFixed(1)}MM` },
  ].filter((f) => f.value !== null && f.value !== undefined && f.value !== "");

  const hasAnyData =
    identityFields.length > 0 ||
    metricFields.length > 0 ||
    suggested?.tese_atualizada ||
    (suggested?.setores_foco?.length ?? 0) > 0 ||
    (suggested?.regioes_foco?.length ?? 0) > 0 ||
    (suggested?.deals_recentes?.length ?? 0) > 0 ||
    suggested?.ultima_captacao?.valor_brl_mm ||
    (suggested?.equipe_chave?.length ?? 0) > 0;

  async function applySelected() {
    setSaving(true);
    try {
      const patch: Record<string, any> = {};
      const noteParts: string[] = [];

      for (const f of identityFields) {
        if (sel[f.k]) patch[f.k] = f.value;
      }
      if (sel.deals_realizados && m.deals_realizados != null) patch.deals_realizados = Number(m.deals_realizados);
      if (sel.deals_last_12m && m.deals_last_12m != null) patch.deals_last_12m = Number(m.deals_last_12m);
      if (sel.avg_multiple_paid_recent && m.avg_multiple_paid_recent != null) patch.avg_multiple_paid_recent = Number(m.avg_multiple_paid_recent);
      if (sel.recent_capital_raise_brl && m.recent_capital_raise_brl != null) patch.recent_capital_raise_brl = Number(m.recent_capital_raise_brl);

      if (sel.tese && suggested.tese_atualizada) patch.tese_text = suggested.tese_atualizada;
      if (sel.setores_foco && Array.isArray(suggested.setores_foco) && suggested.setores_foco.length) {
        patch.setores_interesse = suggested.setores_foco;
      }
      if (sel.regioes_foco && Array.isArray(suggested.regioes_foco) && suggested.regioes_foco.length) {
        patch.ufs_interesse = suggested.regioes_foco;
      }
      if (sel.deals_recentes && Array.isArray(suggested.deals_recentes) && suggested.deals_recentes.length) {
        noteParts.push("Deals recentes:\n" + suggested.deals_recentes
          .map((d: any) => `• ${d.target} (${d.setor ?? "?"}) — ${d.data ?? "?"}`).join("\n"));
      }
      if (sel.captacao && suggested.ultima_captacao?.valor_brl_mm && !sel.recent_capital_raise_brl) {
        patch.recent_capital_raise_brl = Number(suggested.ultima_captacao.valor_brl_mm) * 1e6;
      }
      if (sel.equipe && Array.isArray(suggested.equipe_chave) && suggested.equipe_chave.length) {
        noteParts.push("Equipe-chave: " + suggested.equipe_chave.join(", "));
      }

      if (Object.keys(patch).length > 0) {
        const { error } = await (supabase as any)
          .schema("equity_brain").from("buyers").update(patch).eq("id", buyerId);
        if (error) throw error;
      }

      if (noteParts.length > 0 || Object.keys(patch).length > 0) {
        await (supabase as any).schema("equity_brain").from("crm_activities").insert({
          entity_type: "buyer",
          entity_id: buyerId,
          kind: "note",
          direction: "internal",
          body: `Enriquecimento via IA aplicado:\n${noteParts.join("\n")}\n\nFontes:\n${citations.join("\n")}`,
          metadata: { type: "ai_enrichment", patch_keys: Object.keys(patch), citations },
          created_by: user?.id ?? null,
        });
      }

      qc.invalidateQueries({ queryKey: ["crm", "buyer", buyerId] });
      toast.success("Aplicado");
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "erro");
    } finally {
      setSaving(false);
    }
  }

  async function saveAllAsNote() {
    setSaving(true);
    try {
      await (supabase as any).schema("equity_brain").from("crm_activities").insert({
        entity_type: "buyer",
        entity_id: buyerId,
        kind: "note",
        direction: "internal",
        body: "Enriquecimento via IA (não aplicado, apenas registrado):\n\n" + JSON.stringify(suggested, null, 2),
        metadata: { type: "ai_enrichment_raw", citations },
        created_by: user?.id ?? null,
      });
      qc.invalidateQueries({ queryKey: ["activities", "buyer", buyerId] });
      toast.success("Salvo como nota");
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "erro");
    } finally {
      setSaving(false);
    }
  }

  function Item({ k, label, children }: { k: keyof typeof sel; label: string; children?: any }) {
    return (
      <div className="p-3 border border-zinc-800 rounded bg-zinc-900/40">
        <button
          type="button"
          onClick={() => toggle(k)}
          className="flex items-center gap-2 w-full text-left"
        >
          <span className={`w-4 h-4 rounded border flex items-center justify-center ${sel[k] ? "bg-emerald-500 border-emerald-500" : "border-zinc-600"}`}>
            {sel[k] && <Check className="w-3 h-3 text-zinc-950" />}
          </span>
          <span className="text-xs font-semibold text-zinc-100">{label}</span>
        </button>
        {children && <div className="mt-2 text-xs text-zinc-300 pl-6">{children}</div>}
      </div>
    );
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revisar enriquecimento via IA</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Selecione o que aplicar ao perfil. Sugestões são baseadas em conhecimento público e devem ser validadas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {suggested.tese_atualizada && (
            <Item k="tese" label="Aplicar tese atualizada">
              <p className="break-words">{suggested.tese_atualizada}</p>
            </Item>
          )}
          {Array.isArray(suggested.setores_foco) && suggested.setores_foco.length > 0 && (
            <Item k="setores_foco" label="Setores de foco (substitui setores_interesse)">
              {suggested.setores_foco.join(", ")}
            </Item>
          )}
          {Array.isArray(suggested.regioes_foco) && suggested.regioes_foco.length > 0 && (
            <Item k="regioes_foco" label="Regiões de foco (substitui ufs_interesse)">
              {suggested.regioes_foco.join(", ")}
            </Item>
          )}
          {Array.isArray(suggested.deals_recentes) && suggested.deals_recentes.length > 0 && (
            <Item k="deals_recentes" label="Salvar deals recentes nas notas">
              <ul className="space-y-0.5">
                {suggested.deals_recentes.map((d: any, i: number) => (
                  <li key={i}>• {d.target} ({d.setor ?? "?"}) — {d.data ?? "?"}</li>
                ))}
              </ul>
            </Item>
          )}
          {suggested.ultima_captacao?.valor_brl_mm && (
            <Item k="captacao" label={`Última captação: R$ ${suggested.ultima_captacao.valor_brl_mm}MM`}>
              {suggested.ultima_captacao.data} · {suggested.ultima_captacao.fonte}
            </Item>
          )}
          {Array.isArray(suggested.equipe_chave) && suggested.equipe_chave.length > 0 && (
            <Item k="equipe" label="Salvar equipe-chave nas notas">
              {suggested.equipe_chave.join(", ")}
            </Item>
          )}

          {citations.length > 0 && (
            <div className="border-t border-zinc-800 pt-3">
              <h4 className="text-[10px] uppercase text-zinc-500 mb-1">Fontes sugeridas pela IA</h4>
              <ul className="text-xs text-zinc-400 space-y-0.5">
                {citations.map((c, i) => (
                  <li key={i} className="break-words">
                    <a href={c} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">{c}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} className="text-zinc-400">Cancelar</Button>
          <Button variant="outline" onClick={saveAllAsNote} disabled={saving}
                  className="bg-transparent border-zinc-700 text-zinc-100">
            Salvar tudo como nota
          </Button>
          <Button onClick={applySelected} disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950">
            Aplicar selecionados
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
