import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Clock, CheckCircle, XCircle,
  User, Briefcase, Star
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from '@/utils/prestadorUtils';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

const statusConfig = {
  aberto: {
    label: 'Aguardando',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock,
  },
  aceito: {
    label: 'Aceito',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle,
  },
  concluido: {
    label: 'Concluído',
    color: 'bg-blue-100 text-blue-800',
    icon: CheckCircle,
  },
  cancelado: {
    label: 'Cancelado',
    color: 'bg-red-100 text-red-800',
    icon: XCircle,
  },
};

export default function SolicitacaoCard({
  solicitacao,
  tipo = 'cliente', // 'cliente' ou 'prestador'
  onAceitar,
  onRecusar,
  onConcluir,
  onCancelar,
  onAvaliar,
  avaliacao,
  isLoading
}) {
  const status = statusConfig[solicitacao.status] || statusConfig.aberto;
  const StatusIcon = status.icon;

  const outraParte = tipo === 'cliente' 
    ? { nome: solicitacao.prestador_nome, email: solicitacao.prestador_email }
    : { nome: solicitacao.cliente_nome, email: solicitacao.cliente_email };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Avatar className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
              <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold text-sm">
                {getInitials(outraParte.nome)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{outraParte.nome}</h4>
              <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-500">
                {tipo === 'cliente' ? (
                  <Briefcase className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                ) : (
                  <User className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                )}
                <span>{tipo === 'cliente' ? 'Prestador' : 'Cliente'}</span>
              </div>
            </div>
          </div>
          <Badge className={`${status.color} flex-shrink-0 text-xs`}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {status.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-2.5 px-3 sm:px-6">
        <div>
          <p className="text-xs text-gray-500 mb-1">Categoria</p>
          <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-xs">
            {solicitacao.categoria_nome}
          </Badge>
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-1">Descrição</p>
          <p className="text-sm text-gray-700 line-clamp-3">{solicitacao.descricao}</p>
        </div>

        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs text-gray-500">Proposto</p>
            <p className="text-base font-bold text-gray-900">
              R$ {solicitacao.preco_proposto?.toFixed(2) || '0.00'}
            </p>
          </div>
          {solicitacao.preco_acordado && (
            <div>
              <p className="text-xs text-gray-500">Acordado</p>
              <p className="text-base font-bold text-green-600">
                R$ {solicitacao.preco_acordado.toFixed(2)}
              </p>
            </div>
          )}
        </div>

        {solicitacao.resposta_prestador && (
          <div className="bg-gray-50 rounded-lg p-2.5">
            <p className="text-xs text-gray-500 mb-1">Resposta do prestador</p>
            <p className="text-sm text-gray-700">{solicitacao.resposta_prestador}</p>
          </div>
        )}

        <p className="text-xs text-gray-400">
          {format(new Date(solicitacao.created_date), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
        </p>
      </CardContent>

      {/* Actions */}
      {(solicitacao.status === 'aberto' || solicitacao.status === 'aceito' || solicitacao.status === 'concluido') && (
        <CardFooter className="pt-0 px-3 sm:px-6">
          <div className="flex gap-2 w-full flex-wrap">
            {tipo === 'prestador' && solicitacao.status === 'aberto' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 text-xs sm:text-sm"
                  onClick={() => onRecusar(solicitacao)}
                  disabled={isLoading}
                >
                  <XCircle className="w-3.5 h-3.5 mr-1.5" />
                  Recusar
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-xs sm:text-sm"
                  onClick={() => onAceitar(solicitacao)}
                  disabled={isLoading}
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                  Aceitar
                </Button>
              </>
            )}

            {tipo === 'prestador' && solicitacao.status === 'aceito' && (
              <Button
                size="sm"
                className="w-full bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm"
                onClick={() => onConcluir(solicitacao)}
                disabled={isLoading}
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                Marcar como Concluído
              </Button>
            )}

            {tipo === 'cliente' && solicitacao.status === 'aberto' && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 text-xs sm:text-sm"
                onClick={() => onCancelar(solicitacao)}
                disabled={isLoading}
              >
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                Cancelar Solicitação
              </Button>
            )}

            {tipo === 'cliente' && solicitacao.status === 'concluido' && (
              avaliacao ? (
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`w-4 h-4 ${n <= avaliacao.estrelas ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                    />
                  ))}
                  <span className="text-xs text-gray-500 ml-1">Avaliado</span>
                </div>
              ) : onAvaliar ? (
                <Button
                  size="sm"
                  onClick={onAvaliar}
                  className="w-full gap-2 bg-yellow-500 hover:bg-yellow-600 text-white text-xs sm:text-sm"
                  disabled={isLoading}
                >
                  <Star className="w-3.5 h-3.5" />
                  Avaliar Atendimento
                </Button>
              ) : null
            )}

            {tipo === 'prestador' && solicitacao.status === 'concluido' && avaliacao && (
              <div className="w-full bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 space-y-1">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`w-4 h-4 ${n <= avaliacao.estrelas ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                    />
                  ))}
                  <span className="text-sm font-medium text-yellow-700 ml-1">
                    Avaliação do cliente
                  </span>
                </div>
                {avaliacao.comentario && (
                  <p className="text-sm text-gray-600 italic">"{avaliacao.comentario}"</p>
                )}
              </div>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}