import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { InvestirShell } from "./InvestirShell";
import { InstitutionalHero, Crumb } from "./InstitutionalHero";
import { SectionBand } from "./SectionBand";

export function InstitutionalPage({
  kicker,
  title,
  subtitle,
  image,
  crumbs,
  heroChildren,
  children,
  cta = true,
}: {
  kicker?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  image?: string;
  crumbs?: Crumb[];
  heroChildren?: ReactNode;
  children: ReactNode;
  cta?: boolean;
}) {
  return (
    <InvestirShell>
      <InstitutionalHero
        kicker={kicker}
        title={title}
        subtitle={subtitle}
        image={image}
        crumbs={crumbs}
      >
        {heroChildren}
      </InstitutionalHero>
      {children}
      {cta && (
        <SectionBand tone="volt" compact>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] font-semibold mb-1">
                Pronto para começar?
              </div>
              <h3 className="text-2xl md:text-3xl font-semibold tracking-tight">
                Abra sua conta em minutos e invista a partir de R$ 100.
              </h3>
            </div>
            <div className="flex gap-3">
              <Link
                to="/investir/auth?mode=signup"
                className="px-5 py-3 rounded-md bg-carbon text-bone font-semibold text-sm hover:bg-graphite transition-colors"
              >
                Criar conta grátis
              </Link>
              <Link
                to="/investir/empresas"
                className="px-5 py-3 rounded-md border border-carbon/30 text-carbon font-semibold text-sm hover:bg-carbon/5 transition-colors"
              >
                Ver empresas
              </Link>
            </div>
          </div>
        </SectionBand>
      )}
    </InvestirShell>
  );
}
