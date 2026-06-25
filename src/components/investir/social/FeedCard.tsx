import { Link } from "react-router-dom";
import { MessageCircle, Heart, Share2, TrendingUp, Sparkles, Radio } from "lucide-react";
import { useState } from "react";
import type { FeedPost } from "@/types/social";
import { FollowButton } from "./FollowButton";

function chipFor(category: string): string {
  const c = category.toLowerCase();
  if (c.includes("rodada")) return "m-chip m-chip-round";
  if (c.includes("live") || c.includes("ao vivo")) return "m-chip m-chip-live";
  if (c.includes("atualiza")) return "m-chip m-chip-update";
  if (c.includes("marco") || c.includes("conquista")) return "m-chip m-chip-milestone";
  if (c.includes("comunidade") || c.includes("fundador")) return "m-chip m-chip-pink";
  return "m-chip m-chip-neutral";
}

export function FeedCard({ post }: { post: FeedPost }) {
  const [liked, setLiked] = useState(false);
  const isLive = post.kind === "live";

  return (
    <article className="m-card m-card-hover overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-3 p-4 md:p-5">
        <Link to={`/investir/empresa/${post.company.symbol}`} className="flex items-center gap-3 min-w-0 flex-1">
          <div className="p-[2px] rounded-full m-ring-company shrink-0">
            <img
              src={post.company.avatar}
              alt={post.company.name}
              className="w-10 h-10 md:w-11 md:h-11 rounded-full object-cover bg-carbon"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-bone font-semibold text-sm truncate">{post.company.name}</span>
              {isLive && (
                <span className="m-chip m-chip-live">
                  <Radio className="w-2.5 h-2.5" /> ao vivo
                </span>
              )}
            </div>
            <div className="text-bone/45 text-[11px] truncate">
              {post.company.founder} · {post.company.city} · {timeAgo(post.createdAt)}
            </div>
          </div>
        </Link>
        <span className={chipFor(post.category)}>{post.category}</span>
        <FollowButton symbol={post.company.symbol} compact />
      </header>

      {/* Mídia */}
      <Link to={`/investir/empresa/${post.company.symbol}`} className="block relative aspect-[16/10] md:aspect-[16/9] overflow-hidden bg-carbon">
        <img src={post.media} alt={post.headline} className="w-full h-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/40 to-transparent p-4 md:p-5">
          <h3 className="text-white font-semibold text-lg md:text-xl leading-tight break-words drop-shadow-md">
            {post.headline}
          </h3>
        </div>
      </Link>

      {/* Resumo IA */}
      <div className="p-4 md:p-5 border-b border-bone/10 bg-volt/5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-volt" />
          <div className="text-[10px] uppercase tracking-wider text-volt font-bold">Resumo Mari · 30s</div>
        </div>
        <p className="text-bone/80 text-sm leading-relaxed mt-2">{post.resumoIA}</p>
      </div>

      {/* Métricas */}
      {post.metrics && (
        <div className="grid grid-cols-3 divide-x divide-bone/10 border-b border-bone/10">
          {post.metrics.slice(0, 3).map((m) => (
            <div key={m.label} className="p-3 md:p-4 text-center">
              <div className="text-[9px] uppercase tracking-wider text-bone/45 font-medium">{m.label}</div>
              <div className="text-bone font-bold text-base md:text-lg mt-1 tabular-nums">{m.value}</div>
              {m.delta && (
                <div className="text-[10px] text-volt font-semibold mt-0.5 inline-flex items-center gap-0.5">
                  <TrendingUp className="w-2.5 h-2.5" /> {m.delta}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Rodada */}
      {typeof post.rodadaPct === "number" && (
        <div className="px-4 md:px-5 py-3 border-b border-bone/10 flex items-center gap-3 text-[11px]">
          <span className="text-bone/55 font-medium">Rodada atual</span>
          <div className="flex-1 h-2 bg-bone/10 rounded-full overflow-hidden">
            <div className="h-full bg-volt rounded-full" style={{ width: `${post.rodadaPct}%` }} />
          </div>
          <span className="text-volt font-bold tabular-nums">{post.rodadaPct}%</span>
        </div>
      )}

      {/* Ações */}
      <footer className="flex items-center justify-between p-3 md:p-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setLiked((v) => !v)}
            className={`p-2 rounded-full hover:bg-bone/5 transition-colors ${liked ? "text-red-400" : "text-bone/55"}`}
            aria-label="Curtir"
          >
            <Heart className="w-5 h-5" fill={liked ? "currentColor" : "none"} />
          </button>
          <Link
            to={`/investir/empresa/${post.company.symbol}#comentarios`}
            className="p-2 rounded-full hover:bg-bone/5 text-bone/55 hover:text-bone transition-colors"
            aria-label="Comentar"
          >
            <MessageCircle className="w-5 h-5" />
          </Link>
          <button
            onClick={() => navigator.share?.({ title: post.company.name, url: window.location.href }).catch(() => {})}
            className="p-2 rounded-full hover:bg-bone/5 text-bone/55 hover:text-bone transition-colors"
            aria-label="Compartilhar"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-bone/55 font-medium">
          <span>{formatCount(post.followers)} seguindo</span>
          <span>·</span>
          <span>{formatCount(post.investors)} sócios</span>
        </div>
      </footer>

      <div className="px-4 md:px-5 pb-4 md:pb-5 flex flex-col sm:flex-row gap-2">
        <Link
          to={`/investir/empresa/${post.company.symbol}`}
          className="m-cta-outline flex-1 text-center text-sm py-2.5"
        >
          Conhecer empresa
        </Link>
        <Link
          to={`/investir/empresa/${post.company.symbol}#investir`}
          className="m-cta flex-1 text-center text-sm py-2.5"
        >
          Quero ser sócio
        </Link>
      </div>
    </article>
  );
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.round(diff / 60)}min`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h`;
  return `${Math.round(diff / 86400)}d`;
}

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}
