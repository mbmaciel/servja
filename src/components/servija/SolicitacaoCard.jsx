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

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const outraParte = tipo === 'cliente' 
    ? { nome: solicitacao.prestador_nome, email: solicitacao.prestador_email }
    : { nome: solicitacao.cliente_nome, email: solicitacao.cliente_email };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                {getInitials(outraParte.nome)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-semibold text-gray-900">{outraParte.nome}</h4>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                {tipo === 'cliente' ? (
                  <Briefcase className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )}
                <span>{tipo === 'cliente' ? 'Prestador' : 'Cliente'}</span>
              </div>
            </div>
          </div>
          <Badge className={status.color}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {status.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div>
          <p className="text-sm text-gray-500 mb-1">Categoria</p>
          <Badge variant="secondary" className="bg-blue-50 text-blue-700">
            {solicitacao.categoria_nome}
          </Badge>
        </div>

        <div>
          <p className="text-sm text-gray-500 mb-1">Descrição</p>
          <p className="text-gray-700">{solicitacao.descricao}</p>
        </div>

        <div className="flex items-center gap-4">
          <div>
            <p className="text-sm text-gray-500">Proposto</p>
            <p className="text-lg font-bold text-gray-900">
              R$ {solicitacao.preco_proposto?.toFixed(2) || '0.00'}
            </p>
          </div>
          {solicitacao.preco_acordado && (
            <div>
              <p className="text-sm text-gray-500">Acordado</p>
              <p className="text-lg font-bold text-green-600">
                R$ {solicitacao.preco_acordado.toFixed(2)}
              </p>
            </div>
          )}
        </div>

        {solicitacao.resposta_prestador && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-500 mb-1">Resposta do prestador</p>
            <p className="text-gray-700">{solicitacao.resposta_prestador}</p>
          </div>
        )}

        <p className="text-xs text-gray-400">
          Criado em {format(new Date(solicitacao.created_date), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
        </p>
      </CardContent>

      {/* Actions */}
      {(solicitacao.status === 'aberto' || solicitacao.status === 'aceito' || solicitacao.status === 'concluido') && (
        <CardFooter className="pt-0">
          <div className="flex gap-2 w-full flex-wrap">
            {tipo === 'prestador' && solicitacao.status === 'aberto' && (
              <>
                <Button
                  variant="outline"
                  className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => onRecusar(solicitacao)}
                  disabled={isLoading}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Recusar
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => onAceitar(solicitacao)}
                  disabled={isLoading}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Aceitar
                </Button>
              </>
            )}

            {tipo === 'prestador' && solicitacao.status === 'aceito' && (
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => onConcluir(solicitacao)}
                disabled={isLoading}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Marcar como Concluído
              </Button>
            )}

            {tipo === 'cliente' && solicitacao.status === 'aberto' && (
              <Button
                variant="outline"
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => onCancelar(solicitacao)}
                disabled={isLoading}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancelar Solicitação
              </Button>
            )}

            {tipo === 'cliente' && solicitacao.status === 'concluido' && (
              avaliacao ? (
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`w-5 h-5 ${n <= avaliacao.estrelas ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                    />
                  ))}
                  <span className="text-sm text-gray-500 ml-1">Avaliado</span>
                </div>
              ) : onAvaliar ? (
                <Button
                  onClick={onAvaliar}
                  className="w-full gap-2 bg-yellow-500 hover:bg-yellow-600 text-white"
                  disabled={isLoading}
                >
                  <Star className="w-4 h-4" />
                  Avaliar Atendimento
                </Button>
              ) : null
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}