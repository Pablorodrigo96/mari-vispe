import { EntityDocChecklist } from '@/components/shared/EntityDocChecklist';

interface Props {
  requestId: string;
  onDocsChange?: (count: number) => void;
}

export function CapitalDocChecklist({ requestId, onDocsChange }: Props) {
  return <EntityDocChecklist scope="capital" entityId={requestId} onDocsChange={onDocsChange} />;
}
