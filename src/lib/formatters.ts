export const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1).replace('.', ',')} mi`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)} mil`;
  }
  return `R$ ${value.toLocaleString('pt-BR')}`;
};

export const formatFullCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

export const formatNumber = (value: number): string => {
  return value.toLocaleString('pt-BR');
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
    tech: '💻',
    commerce: '🛒',
    industry: '🏭',
    services: '💼',
    food: '🍽️',
    health: '🏥',
    education: '📚',
    logistics: '🚚',
  };
  return icons[category] || '📊';
};

export const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    tech: 'Tecnologia',
    commerce: 'Comércio',
    industry: 'Indústria',
    services: 'Serviços',
    food: 'Alimentação',
    health: 'Saúde',
    education: 'Educação',
    logistics: 'Logística',
  };
  return labels[category] || category;
};

export const getBadgeConfig = (badge: string): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
  const configs: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    verified: { label: 'Verificado', variant: 'default' },
    exclusive: { label: 'Exclusivo', variant: 'secondary' },
    profitable: { label: 'Lucrativa', variant: 'outline' },
    new: { label: 'Novo', variant: 'secondary' },
  };
  return configs[badge] || { label: badge, variant: 'outline' };
};
