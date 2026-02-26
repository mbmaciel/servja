import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Star, BadgeCheck, MapPin, Phone, MessageCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const createCustomIcon = (isDestaque) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="relative">
        <div class="w-10 h-10 ${isDestaque ? 'bg-yellow-400' : 'bg-blue-500'} rounded-full flex items-center justify-center shadow-lg border-2 border-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </div>
        <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-6 border-l-transparent border-r-transparent ${isDestaque ? 'border-t-yellow-400' : 'border-t-blue-500'}"></div>
      </div>
    `,
    iconSize: [40, 48],
    iconAnchor: [20, 48],
    popupAnchor: [0, -52]
  });
};

function MapController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 12);
  }, [center, map]);
  return null;
}

const getInitials = (name) => {
  if (!name) return 'P';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const getPrecoInicial = (prestador) => {
  let servicos = prestador?.servicos;
  if (typeof servicos === 'string') {
    try { servicos = JSON.parse(servicos); } catch { servicos = []; }
  }
  if (Array.isArray(servicos)) {
    const precos = servicos
      .map((s) => Number(s?.preco))
      .filter((p) => Number.isFinite(p) && p >= 0);
    if (precos.length > 0) return Math.min(...precos);
  }
  return typeof prestador?.preco_base === 'number' ? prestador.preco_base : null;
};

const formatWhatsApp = (telefone) => {
  if (!telefone) return null;
  const digits = String(telefone).replace(/\D/g, '');
  if (digits.length < 10) return null;
  return `https://wa.me/55${digits}`;
};

export default function MapaPrestadores({
  prestadores,
  onSolicitar,
  center: centerProp,
  height = '400px'
}) {
  const prestadoresComLocalizacao = useMemo(
    () => prestadores.filter(p => p.latitude && p.longitude),
    [prestadores]
  );

  // Auto-center: média das coordenadas dos prestadores com localização
  const autoCenter = useMemo(() => {
    if (prestadoresComLocalizacao.length === 0) return [-25.4284, -49.2733]; // Curitiba
    const lat = prestadoresComLocalizacao.reduce((s, p) => s + parseFloat(p.latitude), 0) / prestadoresComLocalizacao.length;
    const lng = prestadoresComLocalizacao.reduce((s, p) => s + parseFloat(p.longitude), 0) / prestadoresComLocalizacao.length;
    return [lat, lng];
  }, [prestadoresComLocalizacao]);

  const center = centerProp || autoCenter;

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-lg border border-gray-200" style={{ height }}>
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController center={center} />

        {prestadoresComLocalizacao.map((prestador) => {
          const preco = getPrecoInicial(prestador);
          const whatsapp = formatWhatsApp(prestador.telefone);
          const localidade = [prestador.cidade, prestador.estado].filter(Boolean).join(' — ');

          return (
            <Marker
              key={prestador.id}
              position={[parseFloat(prestador.latitude), parseFloat(prestador.longitude)]}
              icon={createCustomIcon(prestador.destaque)}
            >
              <Popup className="custom-popup" minWidth={240} maxWidth={280}>
                <div className="p-1">
                  {/* Header: avatar + nome + categoria */}
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="w-12 h-12 shrink-0">
                      <AvatarImage src={prestador.foto} />
                      <AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-sm">
                        {getInitials(prestador.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="font-bold text-gray-900 text-sm leading-tight">{prestador.nome}</span>
                        {prestador.destaque && (
                          <BadgeCheck className="w-4 h-4 text-blue-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-blue-600 font-medium">{prestador.categoria_nome}</p>
                    </div>
                  </div>

                  {/* Avaliação + Localidade */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                      <span className="text-xs font-semibold text-gray-700">
                        {prestador.avaliacao?.toFixed(1) || '5.0'}
                      </span>
                    </div>
                    {localidade && (
                      <div className="flex items-center gap-1 text-gray-500">
                        <MapPin className="w-3 h-3" />
                        <span className="text-xs">{localidade}</span>
                      </div>
                    )}
                  </div>

                  {/* Descrição curta */}
                  {prestador.descricao && (
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2 leading-relaxed">
                      {prestador.descricao}
                    </p>
                  )}

                  {/* Preço */}
                  {preco !== null && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-3 text-center">
                      <p className="text-xs text-blue-500 font-medium">A partir de</p>
                      <p className="text-lg font-bold text-blue-700">
                        R$ {preco.toFixed(2)}
                      </p>
                    </div>
                  )}

                  {/* Contato */}
                  {prestador.telefone && (
                    <div className="flex gap-2 mb-3">
                      <a
                        href={`tel:${prestador.telefone}`}
                        className="flex-1 flex items-center justify-center gap-1 text-xs border border-gray-200 rounded-lg py-1.5 text-gray-600 hover:bg-gray-50 transition-colors"
                        onClick={e => e.stopPropagation()}
                      >
                        <Phone className="w-3 h-3" />
                        Ligar
                      </a>
                      {whatsapp && (
                        <a
                          href={whatsapp}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1 text-xs border border-green-200 rounded-lg py-1.5 text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
                          onClick={e => e.stopPropagation()}
                        >
                          <MessageCircle className="w-3 h-3" />
                          WhatsApp
                        </a>
                      )}
                    </div>
                  )}

                  <Button
                    onClick={() => onSolicitar(prestador)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                  >
                    Solicitar Serviço
                  </Button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Legenda + contador */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg p-3 shadow-lg z-[1000]">
        <p className="text-xs font-semibold text-gray-500 mb-2">
          {prestadoresComLocalizacao.length} prestador{prestadoresComLocalizacao.length !== 1 ? 'es' : ''} no mapa
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 bg-blue-500 rounded-full" />
            <span className="text-xs text-gray-600">Prestador</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 bg-yellow-400 rounded-full" />
            <span className="text-xs text-gray-600">Destaque</span>
          </div>
        </div>
      </div>
    </div>
  );
}
