export function TrustLogos() {
  const partners = [
    { name: 'Itaú', initials: 'IT' },
    { name: 'Santander', initials: 'SAN' },
    { name: 'Bradesco', initials: 'BRA' },
    { name: 'BTG Pactual', initials: 'BTG' },
    { name: 'XP Investimentos', initials: 'XP' },
    { name: 'Nubank', initials: 'NU' },
  ];

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center mb-10">
          <h3 className="text-lg font-medium text-muted-foreground">
            Quem confia na PME.B3
          </h3>
        </div>
        
        <div className="flex flex-wrap justify-center items-center gap-8 lg:gap-12">
          {partners.map((partner, index) => (
            <div 
              key={index}
              className="w-24 h-12 flex items-center justify-center rounded-lg bg-card border border-border hover:border-accent/30 transition-colors"
            >
              <span className="text-lg font-bold text-muted-foreground/70">
                {partner.initials}
              </span>
            </div>
          ))}
        </div>
        
        <p className="text-center text-sm text-muted-foreground mt-8">
          Parceiros e instituições conectadas à nossa plataforma
        </p>
      </div>
    </section>
  );
}
