import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Images, X, ZoomIn } from 'lucide-react';
import { createPortal } from 'react-dom';

const AUTOPLAY_INTERVAL = 4000; // ms

/**
 * Carrossel read-only de fotos de serviços do prestador.
 * Props:
 *   fotos            – string[] (URLs) ou JSON string
 *   height           – className de altura (default 'h-48')
 *   className        – classes extras no wrapper
 *   showEmpty        – exibe placeholder quando sem fotos
 *   autoplay         – inicia autoplay automático (default true)
 *   alwaysShowArrows – setas sempre visíveis, sem depender de hover (default false)
 */
export default function FotosCarousel({
  fotos = [],
  height = 'h-48',
  className = '',
  showEmpty = false,
  autoplay = true,
  alwaysShowArrows = false,
}) {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(null); // índice ou null
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  // Normaliza: JSON string ou array
  const list = (() => {
    if (Array.isArray(fotos)) return fotos.filter(Boolean);
    if (typeof fotos === 'string') {
      try { return JSON.parse(fotos).filter(Boolean); } catch { return []; }
    }
    return [];
  })();

  // Autoplay
  const startTimer = useCallback(() => {
    if (!autoplay || list.length <= 1) return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (!paused) {
        setIndex((i) => (i + 1) % list.length);
      }
    }, AUTOPLAY_INTERVAL);
  }, [autoplay, list.length, paused]);

  useEffect(() => {
    startTimer();
    return () => clearInterval(timerRef.current);
  }, [startTimer]);

  // Pausa no hover
  const handleMouseEnter = () => setPaused(true);
  const handleMouseLeave = () => setPaused(false);

  // Navegação
  const prev = (e) => {
    e?.stopPropagation();
    setIndex((i) => (i - 1 + list.length) % list.length);
    startTimer();
  };
  const next = (e) => {
    e?.stopPropagation();
    setIndex((i) => (i + 1) % list.length);
    startTimer();
  };
  const goTo = (i, e) => {
    e?.stopPropagation();
    setIndex(i);
    startTimer();
  };

  // Lightbox — navegação
  const lbPrev = (e) => {
    e?.stopPropagation();
    setLightbox((i) => (i - 1 + list.length) % list.length);
  };
  const lbNext = (e) => {
    e?.stopPropagation();
    setLightbox((i) => (i + 1) % list.length);
  };

  // Fechar lightbox com ESC
  useEffect(() => {
    if (lightbox === null) return;
    const handler = (e) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowLeft') lbPrev();
      if (e.key === 'ArrowRight') lbNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox]);

  if (list.length === 0) {
    if (!showEmpty) return null;
    return (
      <div className={`${height} ${className} bg-gradient-to-br from-blue-500 to-blue-600 flex flex-col items-center justify-center gap-2 text-white/60`}>
        <Images className="w-8 h-8" />
        <span className="text-xs">Sem fotos de serviços</span>
      </div>
    );
  }

  return (
    <>
      {/* ── Carrossel ── */}
      <div
        className={`relative overflow-hidden ${height} ${className} bg-gray-100 select-none group`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Slides */}
        <div
          className="flex h-full transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {list.map((url, i) => (
            <div
              key={i}
              className="min-w-full h-full flex-shrink-0 relative cursor-zoom-in"
              onClick={(e) => { e.stopPropagation(); setLightbox(i); }}
            >
              <img
                src={url}
                alt={`Serviço ${i + 1}`}
                className="w-full h-full object-cover"
                draggable={false}
              />
              {/* Ícone zoom no hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="bg-black/40 rounded-full p-2">
                  <ZoomIn className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Setas */}
        {list.length > 1 && (
          <>
            <button
              onClick={prev}
              className={`absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/65 text-white rounded-full p-1.5 transition-opacity ${alwaysShowArrows ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              aria-label="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={next}
              className={`absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/65 text-white rounded-full p-1.5 transition-opacity ${alwaysShowArrows ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              aria-label="Próxima"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Barra de progresso autoplay */}
        {autoplay && list.length > 1 && !paused && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20">
            <div
              key={index}
              className="h-full bg-white/70 animate-[progress_4s_linear_forwards]"
              style={{ animationDuration: `${AUTOPLAY_INTERVAL}ms` }}
            />
          </div>
        )}

        {/* Dots */}
        {list.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {list.map((_, i) => (
              <button
                key={i}
                onClick={(e) => goTo(i, e)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === index ? 'bg-white w-4' : 'bg-white/50 w-1.5'
                }`}
                aria-label={`Foto ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Badge */}
        {list.length > 1 && (
          <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded-full">
            {index + 1}/{list.length}
          </div>
        )}
      </div>

      {/* ── Lightbox ── */}
      {lightbox !== null && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          {/* Imagem */}
          <div
            className="relative max-w-5xl max-h-[90vh] w-full mx-4 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={list[lightbox]}
              alt={`Serviço ${lightbox + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              draggable={false}
            />

            {/* Contador */}
            {list.length > 1 && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-3 py-1 rounded-full">
                {lightbox + 1} / {list.length}
              </div>
            )}

            {/* Fechar */}
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Setas lightbox */}
            {list.length > 1 && (
              <>
                <button
                  onClick={lbPrev}
                  className="absolute left-0 -translate-x-14 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/25 text-white rounded-full p-3 transition-colors"
                  aria-label="Anterior"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={lbNext}
                  className="absolute right-0 translate-x-14 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/25 text-white rounded-full p-3 transition-colors"
                  aria-label="Próxima"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails no rodapé */}
          {list.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {list.map((url, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setLightbox(i); }}
                  className={`w-12 h-10 rounded overflow-hidden border-2 transition-all flex-shrink-0 ${
                    i === lightbox ? 'border-white' : 'border-white/30 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt={`Miniatura ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
