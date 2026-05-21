// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function applyPlaceholders(html: string, c: any, advisorName: string, advisorPhone: string) {
  const map: Record<string, string> = {
    "{{contact_name}}": c.contact_name ?? "",
    "{{company_name}}": c.company_name ?? "",
    "{{cnpj}}": c.cnpj ?? "",
    "{{city}}": `${c.city ?? ""}/${c.state ?? ""}`,
    "{{advisor_name}}": advisorName,
    "{{advisor_phone}}": advisorPhone,
  };
  return Object.entries(map).reduce((acc, [k, v]) => acc.split(k).join(v), html);
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function renderLetter(
  doc: any,
  contact: any,
  body: string,
  signature: string,
  senderName: string,
  senderAddress: string,
  pageNum: number,
  totalPages: number,
) {
  const margin = 20;
  const pageW = 210;
  const pageH = 297;
  let y = margin;

  // Header (remetente)
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(senderName, margin, y);
  if (senderAddress) {
    const lines = doc.splitTextToSize(senderAddress, pageW - 2 * margin);
    doc.text(lines, margin, y + 4);
    y += 4 + lines.length * 4;
  } else {
    y += 4;
  }
  y += 8;

  // Data
  doc.setFontSize(10);
  doc.setTextColor(60);
  const date = new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  doc.text(date, pageW - margin, y, { align: "right" });
  y += 10;

  // Destinatário
  doc.setFontSize(11);
  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.text(contact.contact_name ?? "", margin, y);
  doc.setFont("helvetica", "normal");
  y += 5;
  doc.setFontSize(10);
  doc.text(contact.company_name ?? "", margin, y);
  y += 5;
  const addrLines = doc.splitTextToSize(
    `${contact.postal_address ?? ""}\nCEP ${contact.postal_zipcode ?? ""} — ${contact.city ?? ""}/${contact.state ?? ""}`,
    pageW - 2 * margin,
  );
  doc.text(addrLines, margin, y);
  y += addrLines.length * 5 + 10;

  // Body
  doc.setFontSize(11);
  doc.setTextColor(20);
  const bodyText = stripHtml(body);
  const paragraphs = bodyText.split(/\n\n+/);
  for (const p of paragraphs) {
    const lines = doc.splitTextToSize(p, pageW - 2 * margin);
    doc.text(lines, margin, y);
    y += lines.length * 5.5 + 4;
    if (y > pageH - 50) break;
  }

  // Signature
  y = Math.max(y, pageH - 45);
  doc.setFontSize(10);
  doc.setTextColor(40);
  const sigText = stripHtml(signature || "");
  if (sigText) {
    const sigLines = doc.splitTextToSize(sigText, pageW - 2 * margin);
    doc.text(sigLines, margin, y);
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`${pageNum} / ${totalPages}`, pageW - margin, pageH - 10, { align: "right" });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAuth = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: userData } = await supabaseAuth.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { contact_ids, template_id, preview } = await req.json();
    if (!Array.isArray(contact_ids) || contact_ids.length === 0) {
      return new Response(JSON.stringify({ error: "contact_ids vazio" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!preview && contact_ids.length > 200) {
      return new Response(JSON.stringify({ error: "Máximo 200 cartas por lote" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (preview && contact_ids.length !== 1) {
      return new Response(JSON.stringify({ error: "Preview aceita exatamente 1 contato" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch template
    const { data: tpl, error: tplErr } = await supabase
      .from("letter_templates").select("*").eq("id", template_id).maybeSingle();
    if (tplErr || !tpl) {
      return new Response(JSON.stringify({ error: "Template não encontrado" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch contacts (advisor ownership enforced by RLS via service role bypass; we re-check)
    const { data: contacts, error: cErr } = await supabase
      .from("prospect_contacts").select("*").in("id", contact_ids);
    if (cErr) throw cErr;
    if (!contacts || contacts.length === 0) {
      return new Response(JSON.stringify({ error: "Contatos não encontrados" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Ownership check
    const notOwned = contacts.filter((c: any) => c.owner_advisor_id !== user.id);
    if (notOwned.length > 0) {
      // allow admin
      const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const isAdmin = roleRows?.some((r: any) => r.role === "admin");
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Sem permissão para alguns contatos" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Validate addresses
    const missing = contacts.filter((c: any) => !c.postal_address || !c.postal_zipcode);
    if (missing.length > 0) {
      return new Response(JSON.stringify({ error: `${missing.length} contato(s) sem endereço postal` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Settings
    const { data: settings } = await supabase
      .from("api_settings").select("key,value")
      .in("key", ["grafica_email", "grafica_cc", "letter_sender_name", "letter_sender_address"]);
    const cfg: Record<string, string> = {};
    settings?.forEach((s: any) => { cfg[s.key] = s.value; });
    const graficaEmail = cfg.grafica_email || "";
    const senderName = cfg.letter_sender_name || "mari · Vispe Group";
    const senderAddress = cfg.letter_sender_address || "";

    // Advisor profile
    const { data: profile } = await supabase
      .from("profiles").select("full_name, phone, email").eq("id", user.id).maybeSingle();
    const advisorName = profile?.full_name || user.email || "Equipe mari";
    const advisorPhone = profile?.phone || "";

    // Create batch row
    const { data: batch, error: bErr } = await supabase
      .from("letter_batches").insert({
        advisor_id: user.id,
        template_id,
        total_contacts: contacts.length,
        status: "generating",
        grafica_email: graficaEmail || null,
      }).select().single();
    if (bErr || !batch) throw bErr ?? new Error("Falha ao criar lote");

    // Generate PDF
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    contacts.forEach((c: any, i: number) => {
      if (i > 0) doc.addPage();
      const body = applyPlaceholders(tpl.body_html, c, advisorName, advisorPhone);
      const sig = applyPlaceholders(tpl.signature_html ?? "", c, advisorName, advisorPhone);
      renderLetter(doc, c, body, sig, senderName, senderAddress, i + 1, contacts.length);
    });
    const pdfBytes = new Uint8Array(doc.output("arraybuffer"));

    const pdfPath = `${user.id}/${batch.id}/cartas.pdf`;
    const csvPath = `${user.id}/${batch.id}/etiquetas.csv`;

    const { error: upErr } = await supabase.storage.from("prospect-letters")
      .upload(pdfPath, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (upErr) throw upErr;

    // CSV
    const csvHeader = "nome;empresa;cnpj;endereco;cep;cidade;uf\n";
    const csvBody = contacts.map((c: any) => [
      c.contact_name, c.company_name, c.cnpj ?? "",
      (c.postal_address ?? "").replace(/\n/g, " "),
      c.postal_zipcode ?? "", c.city ?? "", c.state ?? "",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const csvText = csvHeader + csvBody;
    await supabase.storage.from("prospect-letters")
      .upload(csvPath, new TextEncoder().encode(csvText), { contentType: "text/csv;charset=utf-8", upsert: true });

    // Insert items
    const items = contacts.map((c: any, i: number) => ({
      batch_id: batch.id,
      prospect_contact_id: c.id,
      page_number: i + 1,
      snapshot: c,
    }));
    await supabase.from("letter_batch_items").insert(items);

    // Update prospects status
    await supabase.from("prospect_contacts")
      .update({ status: "letter_sent", last_contact_at: new Date().toISOString() })
      .in("id", contact_ids);

    // Email send — best-effort via send-transactional-email
    let emailSent = false;
    let emailError: string | null = null;
    if (graficaEmail) {
      try {
        const { data: pdfUrl } = await supabase.storage.from("prospect-letters")
          .createSignedUrl(pdfPath, 60 * 60 * 24 * 7);
        const { data: csvUrl } = await supabase.storage.from("prospect-letters")
          .createSignedUrl(csvPath, 60 * 60 * 24 * 7);

        const resp = await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "prospect-letters-batch",
            recipientEmail: graficaEmail,
            idempotencyKey: `letters-batch-${batch.id}`,
            templateData: {
              advisorName,
              advisorPhone,
              totalCartas: contacts.length,
              pdfUrl: pdfUrl?.signedUrl,
              csvUrl: csvUrl?.signedUrl,
              batchId: batch.id,
            },
          },
        });
        if (resp.error) {
          emailError = resp.error.message ?? String(resp.error);
        } else {
          emailSent = true;
        }
      } catch (e) {
        emailError = (e as Error).message;
      }
    } else {
      emailError = "E-mail da gráfica não configurado em api_settings (chave: grafica_email)";
    }

    // Update batch final state
    await supabase.from("letter_batches").update({
      pdf_storage_path: pdfPath,
      csv_storage_path: csvPath,
      status: emailError ? "sent" : "sent", // PDF foi gerado em ambos os casos
      error_message: emailError,
      sent_at: new Date().toISOString(),
    }).eq("id", batch.id);

    // Audit log
    await supabase.from("audit_events").insert({
      user_id: user.id,
      event_type: "prospect_letter_batch_sent",
      entity_type: "letter_batch",
      entity_id: batch.id,
      payload: { count: contacts.length, contact_ids, email_sent: emailSent, email_error: emailError },
    }).then(() => undefined).catch(() => undefined);

    return new Response(JSON.stringify({
      batch_id: batch.id,
      pdf_path: pdfPath,
      csv_path: csvPath,
      email_sent: emailSent,
      email_error: emailError,
      total: contacts.length,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("send-letters-batch error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
