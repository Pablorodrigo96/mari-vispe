import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { X, ChevronLeft, ChevronRight, BadgeCheck } from "lucide-react";
import type { StoryItem } from "@/types/social";

const SLIDE_MS = 5000;

export function StoryViewer({
  stories,
  startIndex,
  onClose,
}: {
  stories: StoryItem[];
  startIndex: number;
  onClose: () => void;
}) {
  const [i, setI] = useState(startIndex);
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(performance.now());

  const story = stories[i];
  const slides = story?.slides?.length ? story.slides : [{
    media: story?.media || "",
    kind: story?.kind || "photo",
    title: story?.title || "",
    body: story?.body,
  }];
  const current = slides[slide];

  const nextSlide = useCallback(() => {
    if (slide + 1 < slides.length) { setSlide(slide + 1); setProgress(0); startRef.current = performance.now(); }
    else if (i + 1 < stories.length) { setI(i + 1); setSlide(0); setProgress(0); startRef.current = performance.now(); }
    else onClose();
  }, [i, slide, slides.length, stories.length, onClose]);

  const prevSlide = useCallback(() => {
    if (slide > 0) { setSlide(slide - 1); setProgress(0); startRef.current = performance.now(); }
    else if (i > 0) {
      const prev = stories[i - 1];
      const last = (prev.slides?.length || 1) - 1;
      setI(i - 1); setSlide(last); setProgress(0); startRef.current = performance.now();
    }
  }, [i, slide, stories]);

  useEffect(() => {
    if (paused) return;
    function tick() {
      const elapsed = performance.now() - startRef.current;
      const p = Math.min(1, elapsed / SLIDE_MS);
      setProgress(p);
      if (p >= 1) { nextSlide(); return; }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [paused, nextSlide, i, slide]);

  useEffect(() => {
    function k(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") nextSlide();
      else if (e.key === "ArrowLeft") prevSlide();
      else if (e.key === " ") { e.preventDefault(); setPaused((p) => !p); }
    }
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [nextSlide, prevSlide, onClose]);

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl grid place-items-center">
      <div className="relative w-full h-full md:max-w-[420px] md:h-[88vh] md:rounded-3xl overflow-hidden bg-carbon shadow-2xl">
        {/* mídia */}
        <img
          src={current.media}
          alt={current.title}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-transparent to-black/85" />

        {/* progress bars */}
        <div className="absolute top-3 left-3 right-3 flex gap-1 z-20">
          {slides.map((_, idx) => (
            <div key={idx} className="flex-1 h-[3px] bg-white/25 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-[width] ease-linear"
                style={{
                  width: `${idx < slide ? 100 : idx === slide ? progress * 100 : 0}%`,
                }}
              />
            </div>
          ))}
        </div>

        {/* header */}
        <div className="absolute top-7 left-3 right-3 z-20 flex items-center gap-3 mt-2">
          <img
            src={story.founderAvatar || story.company.avatar}
            alt=""
            className="w-9 h-9 rounded-full object-cover ring-2 ring-white/80"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-white font-semibold text-sm truncate">
                {story.actor === "founder" ? story.founderName || "Fundador" : story.company.name}
              </span>
              {story.actor === "founder" && (
                <span className="inline-flex items-center gap-0.5 text-[9px] uppercase tracking-wider bg-volt/90 text-carbon font-bold px-1.5 py-0.5 rounded">
                  <BadgeCheck className="w-2.5 h-2.5" /> Fundador
                </span>
              )}
            </div>
            {story.actor === "founder" && (
              <div className="text-white/65 text-[11px] truncate">{story.company.name}</div>
            )}
          </div>
          <button onClick={onClose} className="text-white/85 hover:text-white p-1" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* tap zones */}
        <button
          onClick={prevSlide}
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          className="absolute left-0 top-16 bottom-24 w-1/3 z-10"
          aria-label="Anterior"
        />
        <button
          onClick={nextSlide}
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          className="absolute right-0 top-16 bottom-24 w-1/3 z-10"
          aria-label="Próximo"
        />

        {/* desktop chevrons */}
        {i > 0 && (
          <button
            onClick={prevSlide}
            className="hidden md:grid place-items-center absolute -left-12 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white z-20"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {i < stories.length - 1 && (
          <button
            onClick={nextSlide}
            className="hidden md:grid place-items-center absolute -right-12 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white z-20"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* conteúdo */}
        <div className="absolute inset-x-0 bottom-0 p-5 pb-7 z-10 text-white">
          {current.kind === "indicator" && current.indicator && (
            <div className="mb-3 inline-flex items-baseline gap-2 bg-white/10 backdrop-blur px-3 py-2 rounded-2xl">
              <span className="text-white/70 text-[11px] uppercase tracking-wider">{current.indicator.label}</span>
              <span className="text-white font-bold text-2xl tabular-nums">{current.indicator.value}</span>
              {current.indicator.delta && <span className="text-volt text-xs font-semibold">{current.indicator.delta}</span>}
            </div>
          )}
          <h3 className="text-white font-semibold text-lg md:text-xl leading-snug">{current.title}</h3>
          {current.body && <p className="text-white/80 text-sm mt-1.5 leading-relaxed">{current.body}</p>}

          <Link
            to={`/investir/empresa/${story.company.symbol}`}
            onClick={onClose}
            className="mt-4 inline-flex items-center justify-center w-full bg-white text-carbon font-semibold py-3 rounded-full text-sm hover:bg-volt transition-colors"
          >
            Conhecer {story.company.name}
          </Link>
        </div>
      </div>
    </div>
  );
}
