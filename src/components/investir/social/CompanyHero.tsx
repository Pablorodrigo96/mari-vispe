import { ArrowLeft, Share2, MapPin, Users, Heart } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import type { CompanyMini } from "@/types/social";
import { FollowButton } from "./FollowButton";

export function CompanyHero({
  company,
  followers,
  investors,
  tokenId,
  symbol,
}: {
  company: CompanyMini;
  followers: number;
  investors: number;
  tokenId?: string;
  symbol: string;
}) {
  const navigate = useNavigate();
  return (
    <header className="relative">
      <div className="md:hidden sticky top-14 z-30 bg-carbon/95 backdrop-blur-xl border-b border-bone/10">
        <div className="px-4 h-12 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-bone/70 -ml-2 p-2"><ArrowLeft className="w-5 h-5" /></button>
          <div className="text-[13px] text-bone font-mono">@{symbol.toLowerCase()}</div>
          <button className="text-bone/70 -mr-2 p-2"><Share2 className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="relative aspect-[16/9] md:aspect-[3/1] overflow-hidden bg-graphite">
        <img src={company.cover} alt={company.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-carbon via-carbon/30 to-transparent" />
      </div>

      <div className="max-w-[1200px] mx-auto px-5 md:px-6">
        <div className="-mt-12 md:-mt-16 flex flex-col md:flex-row md:items-end md:gap-6">
          <img
            src={company.avatar}
            alt={company.name}
            className="w-24 h-24 md:w-32 md:h-32 rounded-2xl object-cover ring-4 ring-carbon bg-carbon"
          />
          <div className="mt-4 md:mt-0 md:pb-3 flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-semibold text-bone break-words">{company.name}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-bone/55 text-xs">
              {company.founder && <span>Fundada por <span className="text-bone/80">{company.founder}</span></span>}
              {company.city && (
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{company.city}</span>
              )}
              {company.sector && <span className="text-volt">{company.sector}</span>}
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs">
              <span className="flex items-center gap-1.5 text-bone/75">
                <Heart className="w-3.5 h-3.5 text-volt" />
                <strong className="text-bone tabular-nums">{followers}</strong> seguindo
              </span>
              <span className="flex items-center gap-1.5 text-bone/75">
                <Users className="w-3.5 h-3.5 text-volt" />
                <strong className="text-bone tabular-nums">{investors}</strong> sócios
              </span>
            </div>
          </div>
          <div className="mt-4 md:mt-0 md:pb-3 flex items-center gap-2">
            <FollowButton symbol={symbol} tokenId={tokenId} />
            <Link
              to={`#investir`}
              className="text-xs bg-volt/15 border border-volt/30 text-volt font-semibold px-4 py-1.5 rounded-full hover:bg-volt/25 transition-colors"
            >
              Quero ser sócio
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
