import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Loader2, Mail, CheckCircle2, XCircle } from 'lucide-react'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

type State = 'loading' | 'valid' | 'already' | 'invalid' | 'submitting' | 'done' | 'error'

export default function Unsubscribe() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [state, setState] = useState<State>('loading')
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    if (!token) { setState('invalid'); setMessage('Token ausente.'); return }
    ;(async () => {
      try {
        const r = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON } },
        )
        const data = await r.json().catch(() => ({}))
        if (r.status === 404) { setState('invalid'); setMessage('Link inválido ou expirado.'); return }
        if (data?.valid === false && data?.reason === 'already_unsubscribed') {
          setState('already'); return
        }
        if (data?.valid) { setState('valid'); return }
        setState('invalid'); setMessage(data?.error || 'Token inválido.')
      } catch (e: any) {
        setState('error'); setMessage(e?.message || 'Erro inesperado.')
      }
    })()
  }, [token])

  async function confirm() {
    setState('submitting')
    try {
      const { data, error } = await supabase.functions.invoke('handle-email-unsubscribe', { body: { token } })
      if (error) throw error
      if ((data as any)?.success) setState('done')
      else if ((data as any)?.reason === 'already_unsubscribed') setState('already')
      else { setState('error'); setMessage((data as any)?.error || 'Falha ao descadastrar.') }
    } catch (e: any) {
      setState('error'); setMessage(e?.message || 'Falha ao descadastrar.')
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-zinc-950 text-zinc-100 px-4">
      <div className="w-full max-w-md !bg-slate-900/60 backdrop-blur-md border border-zinc-800 rounded-lg p-8 space-y-5">
        <div className="flex items-center gap-2 text-[#D9F564]">
          <Mail className="h-5 w-5" />
          <span className="font-semibold">mari · Vispe</span>
        </div>
        <h1 className="text-xl font-semibold">Cancelar inscrição</h1>

        {state === 'loading' && (
          <div className="flex items-center gap-2 text-zinc-400 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Validando…</div>
        )}

        {state === 'valid' && (
          <>
            <p className="text-sm text-zinc-300 break-words">
              Confirme abaixo para não receber mais e-mails da plataforma. Você ainda receberá comunicações estritamente legais relacionadas a contratos e operações em andamento.
            </p>
            <Button onClick={confirm} className="w-full bg-[#D9F564] text-zinc-900 hover:bg-[#D9F564]/90 font-semibold">
              Confirmar descadastro
            </Button>
          </>
        )}

        {state === 'submitting' && (
          <div className="flex items-center gap-2 text-zinc-400 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Processando…</div>
        )}

        {state === 'done' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 text-sm"><CheckCircle2 className="h-4 w-4" /> Tudo certo!</div>
            <p className="text-sm text-zinc-300 break-words">Seu e-mail foi removido da lista de envios.</p>
          </div>
        )}

        {state === 'already' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-zinc-400 text-sm"><CheckCircle2 className="h-4 w-4" /> Já descadastrado.</div>
            <p className="text-sm text-zinc-300 break-words">Este e-mail já está fora da lista.</p>
          </div>
        )}

        {(state === 'invalid' || state === 'error') && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-red-400 text-sm"><XCircle className="h-4 w-4" /> {state === 'invalid' ? 'Link inválido' : 'Erro'}</div>
            <p className="text-sm text-zinc-300 break-words">{message}</p>
          </div>
        )}
      </div>
    </div>
  )
}
