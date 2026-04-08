import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { doc_id, listing_id, file_url, file_name, file_type, user_id } = await req.json();

    if (!listing_id || !file_url || !user_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, serviceKey);

    // Insert doc record if not exists
    let docId = doc_id;
    if (!docId) {
      const { data: doc, error: insertErr } = await supabase
        .from("listing_financial_docs")
        .insert({
          listing_id,
          user_id,
          file_url,
          file_name: file_name || "document",
          file_type: file_type || "pdf",
          status: "processing",
        })
        .select("id")
        .single();

      if (insertErr) throw insertErr;
      docId = doc.id;
    } else {
      await supabase
        .from("listing_financial_docs")
        .update({ status: "processing" })
        .eq("id", docId);
    }

    // Download file from storage
    // Extract path from URL: everything after /financial-docs/
    const pathMatch = file_url.match(/financial-docs\/(.+)$/);
    let fileContent = "";

    if (pathMatch) {
      const storagePath = decodeURIComponent(pathMatch[1]);
      const { data: fileData, error: dlError } = await supabase.storage
        .from("financial-docs")
        .download(storagePath);

      if (dlError) {
        console.error("Download error:", dlError);
        // Try to extract text anyway with filename info
        fileContent = `[Não foi possível ler o arquivo ${file_name}. Analise com base no nome e tipo do arquivo.]`;
      } else if (file_type === "csv") {
        fileContent = await fileData.text();
      } else if (file_type === "xlsx" || file_type === "xls") {
        // For Excel, convert to base64 and let AI try to parse
        const arrayBuffer = await fileData.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        fileContent = `[Arquivo Excel em base64 - primeiros 5000 chars]: ${btoa(binary).substring(0, 5000)}`;
      } else {
        // PDF - convert to base64 for AI
        const arrayBuffer = await fileData.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        fileContent = `[Arquivo PDF em base64 - primeiros 5000 chars]: ${btoa(binary).substring(0, 5000)}`;
      }
    }

    // Call Lovable AI with structured output
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um auditor financeiro especializado em análise de Balancetes e DREs de empresas brasileiras. 
Analise o documento financeiro fornecido e extraia os dados estruturados. 
Se não conseguir ler o conteúdo do arquivo, faça estimativas baseadas no tipo de documento e retorne com confidence baixa.
IMPORTANTE: Responda APENAS chamando a função extract_financial_data.`,
          },
          {
            role: "user",
            content: `Analise este documento financeiro (${file_name}, tipo: ${file_type}).

Conteúdo do arquivo:
${fileContent}

Extraia os indicadores financeiros e calcule o Equity Score (0-100) baseado em:
- Margem EBITDA (peso 40%): >20% = score alto
- Crescimento de receita indicado (peso 30%): crescimento positivo = score alto  
- Consistência e saúde financeira (peso 30%): dívida controlada, custos razoáveis = score alto`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_financial_data",
              description: "Extrai dados financeiros estruturados do documento",
              parameters: {
                type: "object",
                properties: {
                  annual_revenue: { type: "number", description: "Receita Bruta Anual em reais" },
                  costs: { type: "number", description: "Custos totais em reais" },
                  gross_profit: { type: "number", description: "Lucro Bruto em reais" },
                  ebitda: { type: "number", description: "EBITDA em reais" },
                  net_profit: { type: "number", description: "Lucro Líquido em reais" },
                  ebitda_margin: { type: "number", description: "Margem EBITDA em %" },
                  net_margin: { type: "number", description: "Margem Líquida em %" },
                  equity_score: { type: "number", description: "Equity Score de 0 a 100" },
                  confidence: { type: "string", enum: ["high", "medium", "low"], description: "Confiança na extração" },
                  notes: { type: "string", description: "Observações sobre a análise" },
                },
                required: ["equity_score", "confidence"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_financial_data" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      
      await supabase
        .from("listing_financial_docs")
        .update({ status: "error", ai_extracted_data: { error: errText } })
        .eq("id", docId);

      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    let extractedData: any = {};
    let equityScore = 50; // default

    if (toolCall?.function?.arguments) {
      try {
        extractedData = JSON.parse(toolCall.function.arguments);
        equityScore = extractedData.equity_score || 50;
      } catch {
        console.error("Failed to parse AI response");
        extractedData = { notes: "Falha ao processar resposta da IA", confidence: "low" };
      }
    }

    // Update doc record
    await supabase
      .from("listing_financial_docs")
      .update({
        status: "completed",
        equity_score: extractedData,
        ai_extracted_data: extractedData,
      })
      .eq("id", docId);

    // Update listing equity_score
    await supabase
      .from("listings")
      .update({ equity_score: equityScore })
      .eq("id", listing_id);

    return new Response(
      JSON.stringify({ success: true, equity_score: equityScore, data: extractedData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("analyze-financial-doc error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
