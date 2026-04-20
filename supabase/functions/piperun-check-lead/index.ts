import { corsHeaders } from '@supabase/supabase-js/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { cnpj, company_name } = await req.json();

    if (!cnpj && !company_name) {
      return new Response(
        JSON.stringify({ error: 'cnpj ou company_name obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const PIPERUN_API_KEY = Deno.env.get('PIPERUN_API_KEY');

    // Stub: se a API key não estiver configurada, sempre retorna disponível
    if (!PIPERUN_API_KEY) {
      console.log('[piperun-check-lead] STUB MODE - PIPERUN_API_KEY não configurada');
      return new Response(
        JSON.stringify({
          status: 'available',
          source: 'stub',
          message: 'Lead disponível (modo stub - integração PipeRun não configurada)',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Implementação real: consulta o CRM do PipeRun
    const cleanCnpj = cnpj?.replace(/\D/g, '') || '';
    const searchUrl = `https://api.pipe.run/v1/deals?token=${PIPERUN_API_KEY}&search=${encodeURIComponent(cleanCnpj || company_name)}`;
    
    const response = await fetch(searchUrl);
    const data = await response.json();

    const isTaken = Array.isArray(data?.data) && data.data.length > 0;

    return new Response(
      JSON.stringify({
        status: isTaken ? 'taken_by_matrix' : 'available',
        source: 'piperun',
        deal_count: data?.data?.length ?? 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[piperun-check-lead] error:', error);
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ status: 'available', source: 'fallback', error: msg }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
