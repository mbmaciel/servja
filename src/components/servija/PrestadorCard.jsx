import React from 'react';
import { Star, MapPin, BadgeCheck, Phone } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function PrestadorCard({ prestador, onSolicitar, compact = false }) {
  const getInitials = (name) => {
    if (!name) return 'P';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (compact) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src={prestador.foto} />
            <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
              {getInitials(prestador.nome)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-gray-900 truncate">{prestador.nome}</h4>
              {prestador.destaque && (
                <BadgeCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
              )}
            </div>
            <p className="text-sm text-gray-500">{prestador.categoria_nome}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-medium">{prestador.avaliacao?.toFixed(1) || '5.0'}</span>
          </div>
          <p className="text-blue-600 font-bold">
            R$ {prestador.preco_base?.toFixed(2) || '0.00'}
          </p>
        </div>
        <Button 
          onClick={() => onSolicitar(prestador)}
          className="w-full mt-3 bg-blue-600 hover:bg-blue-700"
          size="sm"
        >
          Solicitar
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 group">
      {/* Header com foto */}
      <div className="relative h-32 bg-gradient-to-br from-blue-500 to-blue-600">
        {prestador.destaque && (
          <Badge className="absolute top-3 left-3 bg-yellow-400 text-yellow-900 hover:bg-yellow-400">
            <Star className="w-3 h-3 mr-1 fill-yellow-900" />
            Destaque
          </Badge>
        )}
        <Avatar className="absolute -bottom-8 left-4 w-20 h-20 border-4 border-white shadow-lg">
          <AvatarImage src={prestador.foto} />
          <AvatarFallback className="bg-blue-100 text-blue-600 text-xl font-bold">
            {getInitials(prestador.nome)}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Content */}
      <div className="pt-12 p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-gray-900">{prestador.nome}</h3>
              {prestador.destaque && (
                <BadgeCheck className="w-5 h-5 text-blue-500" />
              )}
            </div>
            <Badge variant="secondary" className="mt-1 bg-blue-50 text-blue-700 hover:bg-blue-50">
              {prestador.categoria_nome}
            </Badge>
          </div>
          <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="font-semibold text-gray-900">{prestador.avaliacao?.toFixed(1) || '5.0'}</span>
          </div>
        </div>

        {prestador.descricao && (
          <p className="mt-3 text-sm text-gray-600 line-clamp-2">
            {prestador.descricao}
          </p>
        )}

        <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
          {prestador.cidade && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{prestador.cidade}</span>
            </div>
          )}
          {prestador.telefone && (
            <div className="flex items-center gap-1">
              <Phone className="w-4 h-4" />
              <span>{prestador.telefone}</span>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">A partir de</p>
            <p className="text-2xl font-bold text-blue-600">
              R$ {prestador.preco_base?.toFixed(2) || '0.00'}
            </p>
          </div>
          <Button 
            onClick={() => onSolicitar(prestador)}
            className="bg-blue-600 hover:bg-blue-700 px-6"
          >
            Solicitar
          </Button>
        </div>
      </div>
    </div>
  );
}