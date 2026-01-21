import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MessagePayload {
  listing_id: string;
  sender_name: string;
  sender_email: string;
  sender_phone?: string;
  message: string;
}

// Rate limit: 5 messages per 15 minutes per IP
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MINUTES = 15;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown';

    // Parse and validate request body
    const body: MessagePayload = await req.json();
    
    // Validate required fields
    if (!body.listing_id || !body.sender_name || !body.sender_email || !body.message) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: listing_id, sender_name, sender_email, message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.sender_email)) {
      return new Response(
        JSON.stringify({ error: 'Email inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate field lengths
    if (body.sender_name.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Nome deve ter no máximo 100 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.sender_email.length > 255) {
      return new Response(
        JSON.stringify({ error: 'Email deve ter no máximo 255 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.message.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Mensagem deve ter no máximo 2000 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.sender_phone && body.sender_phone.length > 20) {
      return new Response(
        JSON.stringify({ error: 'Telefone deve ter no máximo 20 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize inputs (remove potential XSS)
    const sanitize = (str: string) => str.replace(/<[^>]*>/g, '').trim();
    const sanitizedName = sanitize(body.sender_name);
    const sanitizedEmail = body.sender_email.trim().toLowerCase();
    const sanitizedPhone = body.sender_phone ? sanitize(body.sender_phone) : null;
    const sanitizedMessage = sanitize(body.message);

    // Create Supabase client with service role for rate limiting
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check rate limit
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
    
    const { count, error: rateLimitError } = await supabase
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('identifier', clientIP)
      .eq('action', 'send_message')
      .gte('created_at', windowStart);

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
    }

    if (count && count >= RATE_LIMIT_MAX) {
      return new Response(
        JSON.stringify({ 
          error: 'Muitas mensagens enviadas. Tente novamente em alguns minutos.',
          retry_after: RATE_LIMIT_WINDOW_MINUTES * 60
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify listing exists and is active
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, user_id, title')
      .eq('id', body.listing_id)
      .eq('status', 'active')
      .single();

    if (listingError || !listing) {
      return new Response(
        JSON.stringify({ error: 'Anúncio não encontrado ou inativo' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert message
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        listing_id: body.listing_id,
        sender_name: sanitizedName,
        sender_email: sanitizedEmail,
        sender_phone: sanitizedPhone,
        message: sanitizedMessage,
      });

    if (messageError) {
      console.error('Message insert error:', messageError);
      return new Response(
        JSON.stringify({ error: 'Erro ao enviar mensagem. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record rate limit entry
    await supabase
      .from('rate_limits')
      .insert({
        identifier: clientIP,
        action: 'send_message',
      });

    // Clean up old rate limit entries (fire and forget)
    try {
      await supabase.rpc('cleanup_old_rate_limits');
      console.log('Rate limits cleaned up');
    } catch (cleanupErr) {
      console.error('Cleanup error:', cleanupErr);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Mensagem enviada com sucesso!' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
