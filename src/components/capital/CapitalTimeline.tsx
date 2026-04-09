import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, Clock, Users, FileText, Handshake } from 'lucide-react';

interface TimelineEvent {
  id: string;
  event_type: string;
  description: string | null;
  created_at: string | null;
}

const PIPELINE_STEPS = [
  { key: 'pending', label: 'Pendente', icon: Clock },
  { key: 'in_review', label: 'Em Análise', icon: FileText },
  { key: 'matched', label: 'Matched', icon: Users },
  { key: 'proposal_sent', label: 'Proposta', icon: Handshake },
  { key: 'closed', label: 'Fechado', icon: CheckCircle },
];

const stepOrder = PIPELINE_STEPS.map(s => s.key);

interface Props {
  requestId: string;
  currentStatus: string;
}

export function CapitalTimeline({ requestId, currentStatus }: Props) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const currentIdx = stepOrder.indexOf(currentStatus);

  useEffect(() => {
    supabase
      .from('capital_timeline')
      .select('id, event_type, description, created_at')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setEvents(data); });

    const channel = supabase
      .channel(`timeline-${requestId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'capital_timeline', filter: `request_id=eq.${requestId}` },
        (payload) => setEvents(prev => [...prev, payload.new as TimelineEvent])
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [requestId]);

  return (
    <div className="space-y-6">
      <h3 className="font-semibold text-foreground text-lg">Pipeline</h3>

      {/* Steps */}
      <div className="flex items-center gap-0">
        {PIPELINE_STEPS.map((step, i) => {
          const done = i <= currentIdx;
          const Icon = step.icon;
          return (
            <div key={step.key} className="flex items-center">
              <div className={`flex flex-col items-center gap-1 ${done ? 'opacity-100' : 'opacity-40'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${done ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium text-foreground text-center w-16">{step.label}</span>
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <div className={`h-0.5 w-8 mx-1 ${i < currentIdx ? 'bg-accent' : 'bg-muted'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Events */}
      {events.length > 0 && (
        <div className="border-l-2 border-muted ml-5 pl-4 space-y-3 mt-4">
          {events.map(ev => (
            <div key={ev.id} className="relative">
              <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-accent" />
              <p className="text-sm text-foreground">{ev.description}</p>
              <p className="text-xs text-muted-foreground">
                {ev.created_at ? new Date(ev.created_at).toLocaleString('pt-BR') : ''}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
