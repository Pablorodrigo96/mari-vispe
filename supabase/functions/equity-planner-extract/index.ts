// Equity Planner — Extrator de Documentos
// Recebe documentId (linha em equity_company_documents), baixa o arquivo do bucket
// equity-planner-docs (cria o bucket se não existir), envia para Claude com bloco
// document (PDF base64) ou text e persiste um JSON estruturado + resumo de 1 parágrafo
// que vira input adicional para o equity-planner-classify/compute.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
const BUCKET = "equity-planner-docs";

const SYSTEM = `Você é o Extrator do Equity Planner.
Recebe um documento empresarial (DRE, balanço, contrato, organograma, ata de reunião, diagnóstico)
e devolve APENAS JSON estrito, sem markdown, com fatos verificáveis e flags do que está faltando.
Quando algo não estiver no documento, devolva null — nunca invente número.`;

function buildSchema() {
  return `{
  "doc_type_detectado": "balanco|dre|contrato_cliente|contrato_socios|organograma|diagnostico_reuniao|outro",
  "resumo_executivo": "1 parágrafo (até 5 linhas) com o que é o documento e os 3 fatos mais relevantes",
  "financeiro": {
    "faturamento_anual": null | number,
    "ebitda": null | number,
    "margem_ebitda_pct": null | number,
    "endividamento_total": null | number,
    "endividamento_liquido": null | number,
    "capital_de_giro": null | number,
    "ano_referencia": null | number,
    "moeda": "BRL"
  },
  "governanca": {
    "tem_socio_administrador_unico": null | boolean,
    "conselho_existe": null | boolean,
    "sucessao_definida": null | boolean,
    "dependencia_dono_alta": null | boolean
  },
  "contratos": {
    "principais_clientes": [{"nome": null|string, "concentracao_pct": null|number, "prazo_anos": null|number, "renovacao_automatica": null|boolean}],
    "clausulas_change_of_control": null | boolean,
    "exclusividade": null | boolean
  },
  "sinais_qualitativos": ["frase 1", "frase 2"],
  "lacunas_identificadas": ["o que falta para concluir o diagnóstico"]
}`;
}

async function ensureBucket(supabase: any) {
  // service-role can manage buckets via REST without RLS
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket/${BUCKET}`, {
      headers: { Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE },
    });
    if (res.status === 200) return;
    const create = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE}`,
        apikey: SERVICE_ROLE,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: BUCKET, name: BUCKET, public: false,
        file_size_limit: 25 * 1024 * 1024,
        allowed_mime_types: [
          "application/pdf", "text/plain", "text/csv",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
      }),
    });
    if (!create.ok && create.status !== 409) {
      console.warn("[ensureBucket] failed", create.status, await create.text());
    }
  } catch (e) {
    console.warn("[ensureBucket] error", (e as Error).message);
  }
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

async function callClaude(prompt: string, attachment?: { mime: string; b64: string }) {
  if (!ANTHROPIC_KEY) throw new Error("ANTHROPIC_API_KEY missing");
  const content: any[] = [{ type: "text", text: prompt }];
  if (attachment && attachment.mime === "application/pdf") {
    content.unshift({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: attachment.b64 },
    });
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1800,
      temperature: 0.1,
      system: SYSTEM,
      messages: [{ role: "user", content }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic_${res.status}: ${await res.text()}`);
  const json = await res.json();
  const text = (json?.content || []).map((b: any) => b?.text || "").join("\n").trim();
  return text;
}

async function callGeminiFallback(prompt: string, attachment?: { mime: string; b64: string }) {
  if (!LOVABLE_KEY) throw new Error("LOVABLE_API_KEY missing");
  const parts: any[] = [{ text: prompt }];
  if (attachment) parts.unshift({ inline_data: { mime_type: attachment.mime, data: attachment.b64 } });
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_KEY },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt + (attachment ? "\n\n(documento anexado em base64 omitido na fallback)" : "") },
      ],
      temperature: 0.1,
      max_tokens: 1800,
    }),
  });
  if (!res.ok) throw new Error(`gemini_${res.status}: ${await res.text()}`);
  const j = await res.json();
  return j?.choices?.[0]?.message?.content || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    await ensureBucket(supabase);

    const body = await req.json().catch(() => ({}));
    const { documentId } = body || {};
    if (!documentId) {
      return new Response(JSON.stringify({ error: "documentId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: doc, error: dErr } = await supabase
      .from("equity_company_documents")
      .select("*")
      .eq("id", documentId)
      .single();
    if (dErr || !doc) throw new Error("document_not_found");

    await supabase.from("equity_company_documents")
      .update({ extraction_status: "running", extraction_error: null }).eq("id", documentId);

    // Download from storage
    const dl = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${doc.file_path}`,
      { headers: { Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE } },
    );
    if (!dl.ok) throw new Error(`download_failed_${dl.status}`);
    const buf = await dl.arrayBuffer();
    const mime = doc.mime_type || "application/octet-stream";

    let attachment: { mime: string; b64: string } | undefined;
    let textPreview = "";
    if (mime === "application/pdf") {
      attachment = { mime, b64: toBase64(buf) };
    } else if (mime.startsWith("text/") || mime.includes("csv")) {
      textPreview = new TextDecoder().decode(buf).slice(0, 18000);
    } else {
      // For DOCX/XLSX we can't parse here without a lib — Claude/Gemini will receive raw
      // bytes via base64 fallback note; we mark a warning.
      textPreview = `(arquivo ${mime} — extração estruturada limitada nesta versão)`;
    }

    const prompt = `Arquivo: ${doc.file_name}
Tipo declarado pelo usuário: ${doc.doc_type || "não informado"}

${textPreview ? `Conteúdo (parcial):\n"""\n${textPreview}\n"""\n` : "PDF anexado."}

Devolva o JSON no schema:
${buildSchema()}`;

    let raw = "";
    let provider = "anthropic";
    try {
      raw = await callClaude(prompt, attachment);
    } catch (e) {
      console.warn("[extract] anthropic failed, fallback gemini:", (e as Error).message);
      provider = "gemini_fallback";
      raw = await callGeminiFallback(prompt, attachment);
    }

    let parsed: any = null;
    try {
      const txt = raw.trim().replace(/^```json\s*|\s*```$/g, "");
      const start = txt.indexOf("{");
      const end = txt.lastIndexOf("}");
      parsed = JSON.parse(txt.slice(start, end + 1));
    } catch (e) {
      await supabase.from("equity_company_documents").update({
        extraction_status: "error",
        extraction_error: "invalid_json: " + (e as Error).message,
      }).eq("id", documentId);
      throw new Error("invalid_json_from_model");
    }

    await supabase.from("equity_company_documents").update({
      extraction_status: "done",
      extracted_json: parsed,
      extraction_summary: parsed?.resumo_executivo || null,
      doc_type: doc.doc_type || parsed?.doc_type_detectado || null,
    }).eq("id", documentId);

    return new Response(JSON.stringify({ ok: true, extracted: parsed, provider }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[equity-planner-extract]", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
