import { CheckCircle, Clock, FileSearch, Globe, Users, Handshake } from 'lucide-react';

const PIPELINE_STEPS = [
  { key: 'pending', label: 'Cadastrado', icon: Clock },
  { key: 'review', label: 'Em Análise', icon: FileSearch },
  { key: 'active', label: 'Publicado', icon: Globe },
  { key: 'matched', label: 'Compradores', icon: Users },
  { key: 'sold', label: 'Negociação', icon: Handshake },
];

interface Props {
  status: string;
  interestCount?: number;
}

export function ListingTimeline({ status, interestCount = 0 }: Props) {
  // Map listing.status into the ordered pipeline index
  let currentIdx = 0;
  if (status === 'pending') currentIdx = 0;
  else if (status === 'paused') currentIdx = 1;
  else if (status === 'active') currentIdx = interestCount > 0 ? 3 : 2;
  else if (status === 'sold' || status === 'closed') currentIdx = 4;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground text-lg">Pipeline</h3>
      <div className="flex items-center gap-0 flex-wrap">
        {PIPELINE_STEPS.map((step, i) => {
          const done = i <= currentIdx;
          const Icon = done && i < currentIdx ? CheckCircle : step.icon;
          return (
            <div key={step.key} className="flex items-center">
              <div className={`flex flex-col items-center gap-1 ${done ? 'opacity-100' : 'opacity-40'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${done ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium text-foreground text-center w-20 break-words">{step.label}</span>
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <div className={`h-0.5 w-8 mx-1 ${i < currentIdx ? 'bg-accent' : 'bg-muted'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
