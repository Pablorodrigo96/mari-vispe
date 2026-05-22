// deal-closing-notify
// Resolve par + tipo (NBO vs SPA/closing), busca destinatários
// (seller, buyer, advisor responsável, admins), enfileira via
// send-transactional-email, loga em deal_closing_emails_log e audit_events.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_URL = 'https://mari.vispe.com.br'

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

type Recipient = { email: string; role: 'seller' | 'buyer' | 'advisor' | 'admin'; userId?: string | null }

async function getUserEmail(userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null
  try {
    const { data, error } = await admin.auth.admin.getUserById(userId)
    if (error || !data?.user?.email) return null
    return data.user.email
  } catch { return null }
}

async function getAdminEmails(): Promise<string[]> {
  const { data, error } = await admin
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin')
  if (error || !data) return []
  const emails: string[] = []
  for (const row of data) {
    const e = await getUserEmail((row as any).user_id)
    if (e) emails.push(e)
  }
  return emails
}

async function enqueueEmail(args: {
  templateName: string
  recipientEmail: string
  idempotencyKey: string
  templateData: Record<string, unknown>
  replyTo?: string
}) {
  const url = `${SUPABASE_URL}/functions/v1/send-transactional-email`
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({
      templateName: args.templateName,
      recipientEmail: args.recipientEmail,
      idempotencyKey: args.idempotencyKey,
      templateData: args.templateData,
      replyTo: args.replyTo,
    }),
  })
  const text = await r.text()
  return { ok: r.ok, status: r.status, body: text }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json().catch(() => ({}))
    const dealDocumentId: string | undefined = body.deal_document_id
    const force: boolean = !!body.force
    if (!dealDocumentId) {
      return new Response(JSON.stringify({ error: 'deal_document_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 1. resolver doc + par
    const { data: doc, error: docErr } = await admin
      .from('deal_documents')
      .select('id, deal_pair_id, template_code, label, category, status, signed_at, updated_at')
      .eq('id', dealDocumentId)
      .maybeSingle()
    if (docErr || !doc) {
      return new Response(JSON.stringify({ error: 'doc not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (!doc.deal_pair_id) {
      return new Response(JSON.stringify({ skipped: 'no pair' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (doc.status !== 'signed') {
      return new Response(JSON.stringify({ skipped: 'doc not signed' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: pair, error: pairErr } = await admin
      .from('deal_pairs')
      .select('id, sell_mandate_id, buy_mandate_id, buyer_profile_id, responsavel_advisor_id, status, closed_at, nbo_signed_at')
      .eq('id', doc.deal_pair_id)
      .maybeSingle()
    if (pairErr || !pair) {
      return new Response(JSON.stringify({ error: 'pair not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. tipo
    const tplCode = (doc.template_code || '').toLowerCase()
    const isNbo = tplCode.includes('nbo')
    const isClosing = tplCode.includes('spa') || tplCode.includes('closing') || doc.category === 'closing'
    if (!isNbo && !isClosing) {
      return new Response(JSON.stringify({ skipped: 'not closing-class doc' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const templateName = isClosing ? 'deal-closed' : 'nbo-signed'
    const eventType = isClosing ? 'deal_closed' : 'nbo_signed'

    // 3. enriquecer — sell_mandate_id refere equity_brain.mandates.id
    const { data: mandate } = await admin
      .schema('equity_brain' as never)
      .from('mandates')
      .select('id, company_cnpj, responsavel_id, created_by, contato_email')
      .eq('id', pair.sell_mandate_id)
      .maybeSingle()

    let codename = 'Projeto'
    let companyRazao: string | undefined
    if (mandate?.company_cnpj) {
      const { data: company } = await admin
        .schema('equity_brain' as never)
        .from('companies')
        .select('codename, razao_social')
        .eq('cnpj', mandate.company_cnpj)
        .maybeSingle()
      codename = (company as any)?.codename || codename
      companyRazao = (company as any)?.razao_social
    }

    const advisorEmail = await getUserEmail(pair.responsavel_advisor_id)
    const sellerUserId = (mandate as any)?.created_by || (mandate as any)?.responsavel_id || null
    const sellerEmail = (await getUserEmail(sellerUserId)) || (mandate as any)?.contato_email || null
    const buyerEmail = await getUserEmail(pair.buyer_profile_id)
    const adminEmails = await getAdminEmails()

    // advisor display name (profiles)
    let advisorName: string | undefined
    if (pair.responsavel_advisor_id) {
      const { data: p } = await admin.from('profiles').select('display_name, full_name').eq('user_id', pair.responsavel_advisor_id).maybeSingle()
      advisorName = (p as any)?.display_name || (p as any)?.full_name || undefined
    }

    const recipients: Recipient[] = []
    if (sellerEmail) recipients.push({ email: sellerEmail, role: 'seller', userId: company?.created_by })
    if (buyerEmail) recipients.push({ email: buyerEmail, role: 'buyer', userId: pair.buyer_profile_id })
    if (advisorEmail) recipients.push({ email: advisorEmail, role: 'advisor', userId: pair.responsavel_advisor_id })
    for (const e of adminEmails) {
      if (!recipients.find(r => r.email.toLowerCase() === e.toLowerCase())) {
        recipients.push({ email: e, role: 'admin' })
      }
    }

    const pairUrl = `${APP_URL}/equity-brain/par/${pair.id}`
    const signedAt = doc.signed_at || doc.updated_at || new Date().toISOString()

    // 4. dedupe — se já enviou pra esse doc, só reenvia com force=true
    if (!force) {
      const { data: existing } = await admin
        .from('deal_closing_emails_log')
        .select('id')
        .eq('deal_document_id', dealDocumentId)
        .limit(1)
      if (existing && existing.length > 0) {
        return new Response(JSON.stringify({ skipped: 'already sent', use_force: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    const results: any[] = []
    for (const r of recipients) {
      const idem = `${eventType}-${dealDocumentId}-${r.role}-${r.email.toLowerCase()}`
      const templateData = {
        codename,
        advisorName,
        pairUrl,
        recipientRole: r.role,
        ...(isClosing ? { closedAt: signedAt } : { signedAt }),
      }
      const sendRes = await enqueueEmail({
        templateName,
        recipientEmail: r.email,
        idempotencyKey: idem,
        templateData,
        replyTo: advisorEmail ?? undefined,
      })

      await admin.from('deal_closing_emails_log').insert({
        deal_pair_id: pair.id,
        deal_document_id: dealDocumentId,
        recipient_type: r.role,
        recipient_email: r.email,
        template: templateName,
        sent_at: sendRes.ok ? new Date().toISOString() : null,
        error: sendRes.ok ? null : `HTTP ${sendRes.status}: ${sendRes.body.slice(0, 500)}`,
      })

      results.push({ recipient: r.email, role: r.role, ok: sendRes.ok, status: sendRes.status })
    }

    // 5. audit
    await admin.from('audit_events').insert({
      entity_type: 'deal_pair',
      entity_id: pair.id,
      event_type: eventType,
      payload: {
        deal_document_id: dealDocumentId,
        template: templateName,
        codename,
        recipients: results,
      },
    })

    return new Response(JSON.stringify({ ok: true, template: templateName, recipients: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('[deal-closing-notify] error', err)
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
