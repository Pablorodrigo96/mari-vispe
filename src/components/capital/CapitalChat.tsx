import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

interface Message {
  id: string;
  sender_id: string;
  message: string;
  created_at: string | null;
  read_at: string | null;
}

interface Props {
  requestId: string;
}

export function CapitalChat({ requestId }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from('capital_messages')
      .select('id, sender_id, message, created_at, read_at')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setMessages(data); });

    const channel = supabase
      .channel(`chat-${requestId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'capital_messages', filter: `request_id=eq.${requestId}` },
        (payload) => setMessages(prev => [...prev, payload.new as Message])
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [requestId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !user) return;
    setSending(true);
    await supabase.from('capital_messages').insert({
      request_id: requestId,
      sender_id: user.id,
      message: input.trim(),
    });
    setInput('');
    setSending(false);
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-foreground text-lg">Chat com Analista</h3>
      <div className="border rounded-lg bg-card h-64 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-8">Nenhuma mensagem ainda. Envie sua dúvida!</p>
        )}
        {messages.map(msg => {
          const isMine = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${isMine ? 'bg-accent text-accent-foreground' : 'bg-muted text-foreground'}`}>
                <p>{msg.message}</p>
                <p className="text-[10px] opacity-60 mt-1">
                  {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Digite sua mensagem..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <Button size="icon" onClick={handleSend} disabled={sending || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
