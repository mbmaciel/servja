import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Star, BadgeCheck } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

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
    popupAnchor: [0, -48]
  });
};

function MapController({ center }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, 13);
    }
  }, [center, map]);
  
  return null;
}

export default function MapaPrestadores({ 
  prestadores, 
  onSolicitar,
  center = [-25.4284, -49.2733], // Curitiba por padrão
  height = '400px'
}) {
  const [selectedPrestador, setSelectedPrestador] = useState(null);

  const getInitials = (name) => {
    if (!name) return 'P';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getPrecoInicial = (prestador) => {
    let servicos = prestador?.servicos;
    if (typeof servicos === 'string') {
      try {
        servicos = JSON.parse(servicos);
      } catch {
        servicos = [];
      }
    }

    if (Array.isArray(servicos)) {
      const precos = servicos
        .map((servico) => Number(servico?.preco))
        .filter((preco) => Number.isFinite(preco) && preco >= 0);

      if (precos.length > 0) {
        return Math.min(...precos);
      }
    }

    if (typeof prestador?.preco_base === 'number') {
      return prestador.preco_base;
    }

    return null;
  };

  const prestadoresComLocalizacao = prestadores.filter(p => p.latitude && p.longitude);

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
        
        {prestadoresComLocalizacao.map((prestador) => (
          <Marker
            key={prestador.id}
            position={[prestador.latitude, prestador.longitude]}
            icon={createCustomIcon(prestador.destaque)}
            eventHandlers={{
              click: () => setSelectedPrestador(prestador)
            }}
          >
            <Popup className="custom-popup">
              <div className="p-2 min-w-[200px]">
                {/* Preço em destaque no topo */}
                <div className="bg-blue-600 text-white px-3 py-2 rounded-lg mb-3 text-center">
                  <p className="text-xs font-medium">A partir de</p>
                  <p className="text-2xl font-bold">R$ {getPrecoInicial(prestador)?.toFixed(2) || '0.00'}</p>
                </div>

                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={prestador.foto} />
                    <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                      {getInitials(prestador.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1">
                      <h4 className="font-bold text-gray-900">{prestador.nome}</h4>
                      {prestador.destaque && (
                        <BadgeCheck className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{prestador.categoria_nome}</p>
                  </div>
                </div>
                
                <div className="mt-3 flex items-center justify-center">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-sm font-medium">{prestador.avaliacao?.toFixed(1) || '5.0'}</span>
                  </div>
                </div>
                
                <Button 
                  onClick={() => onSolicitar(prestador)}
                  className="w-full mt-3 bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  Solicitar Serviço
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg p-3 shadow-lg z-[1000]">
        <p className="text-xs font-medium text-gray-500 mb-2">Legenda</p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full" />
            <span className="text-xs text-gray-600">Prestador</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-400 rounded-full" />
            <span className="text-xs text-gray-600">Destaque</span>
          </div>
        </div>
      </div>
    </div>
  );
}
