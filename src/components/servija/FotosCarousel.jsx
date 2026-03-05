import { useState } from 'react';
import { ChevronLeft, ChevronRight, Images } from 'lucide-react';

/**
 * Carrossel read-only de fotos de serviços do prestador.
 * Props:
 *   fotos     – string[] (URLs)
 *   height    – className de altura (default 'h-48')
 *   className – classes extras no wrapper
 *   showEmpty – se true exibe placeholder quando sem fotos
 */
export default function FotosCarousel({ fotos = [], height = 'h-48', className = '', showEmpty = false }) {
  const [index, setIndex] = useState(0);

  // Normaliza: pode vir como JSON string ou array
  const list = (() => {
    if (Array.isArray(fotos)) return fotos.filter(Boolean);
    if (typeof fotos === 'string') {
      try { return JSON.parse(fotos).filter(Boolean); } catch { return []; }
    }
    return [];
  })();

  if (list.length === 0) {
    if (!showEmpty) return null;
    return (
      <div className={`${height} ${className} bg-gradient-to-br from-blue-500 to-blue-600 flex flex-col items-center justify-center gap-2 text-white/60`}>
        <Images className="w-8 h-8" />
        <span className="text-xs">Sem fotos de serviços</span>
      </div>
    );
  }

  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const next = () => setIndex((i) => Math.min(list.length - 1, i + 1));

  return (
    <div className={`relative overflow-hidden ${height} ${className} bg-gray-100 select-none`}>
      {/* Slides */}
      <div
        className="flex h-full transition-transform duration-300 ease-in-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {list.map((url, i) => (
          <div key={i} className="min-w-full h-full flex-shrink-0">
            <img
              src={url}
              alt={`Serviço ${i + 1}`}
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* Setas */}
      {list.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            disabled={index === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 disabled:opacity-0 transition-all"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            disabled={index === list.length - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 disabled:opacity-0 transition-all"
            aria-label="Próxima"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}

      {/* Contador */}
      {list.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {list.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setIndex(i); }}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === index ? 'bg-white w-3' : 'bg-white/50'
              }`}
              aria-label={`Foto ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Badge contador no canto */}
      {list.length > 1 && (
        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded-full">
          {index + 1}/{list.length}
        </div>
      )}
    </div>
  );
}
