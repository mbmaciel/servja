import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import {
  Loader2, Search, Clock, CheckCircle,
  FileText, Plus, RefreshCw
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SolicitacaoCard from '@/components/servija/SolicitacaoCard';
import AvaliacaoModal from '@/components/servija/AvaliacaoModal';
import { toast } from "sonner";

export default function Cliente() {
  const [user, setUser] = useState(null);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState({});         // { [solicitacao_id]: avaliacao }
  const [avaliacaoModal, setAvaliacaoModal] = useState(null); // solicitacao | null
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const solicitacoesData = await base44.entities.Solicitacao.filter(
        { cliente_email: userData.email },
        '-created_date'
      );
      setSolicitacoes(solicitacoesData);

      // Carrega avaliações das solicitações concluídas
      const concluidas = solicitacoesData.filter(s => s.status === 'concluido');
      const map = {};
      await Promise.all(
        concluidas.map(async (s) => {
          try {
            const av = await base44.avaliacoes.getBySolicitacao(s.id);
            if (av) map[s.id] = av;
          } catch {
            // Ignora erros individuais
          }
        })
      );
      setAvaliacoes(map);
    } catch (error) {
      toast.error('Você precisa estar logado');
      base44.auth.redirectToLogin();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelar = async (solicitacao) => {
    setIsUpdating(true);
    try {
      await base44.entities.Solicitacao.update(solicitacao.id, {
        status: 'cancelado'
      });
      toast.success('Solicitação cancelada');
      loadData();
    } catch (error) {
      toast.error('Erro ao cancelar solicitação');
    } finally {
      setIsUpdating(false);
    }
  };

  const getFilteredSolicitacoes = (status) => {
    if (status === 'all') return solicitacoes;
    return solicitacoes.filter(s => s.status === status);
  };

  const counts = {
    all: solicitacoes.length,
    aberto: solicitacoes.filter(s => s.status === 'aberto').length,
    aceito: solicitacoes.filter(s => s.status === 'aceito').length,
    concluido: solicitacoes.filter(s => s.status === 'concluido').length,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Olá, {user?.full_name?.split(' ')[0]}! 👋
              </h1>
              <p className="text-gray-500 mt-1">
                Acompanhe suas solicitações de serviços
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={loadData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
              <Link to={createPageUrl('Buscar')}>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Search className="w-4 h-4 mr-2" />
                  Buscar Serviços
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{counts.all}</p>
                <p className="text-sm text-gray-500">Total</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{counts.aberto}</p>
                <p className="text-sm text-gray-500">Aguardando</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{counts.aceito}</p>
                <p className="text-sm text-gray-500">Aceitos</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{counts.concluido}</p>
                <p className="text-sm text-gray-500">Concluídos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Solicitações */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-white border border-gray-200">
            <TabsTrigger value="all">Todas ({counts.all})</TabsTrigger>
            <TabsTrigger value="aberto">Aguardando ({counts.aberto})</TabsTrigger>
            <TabsTrigger value="aceito">Aceitas ({counts.aceito})</TabsTrigger>
            <TabsTrigger value="concluido">Concluídas ({counts.concluido})</TabsTrigger>
          </TabsList>

          {['all', 'aberto', 'aceito', 'concluido'].map((status) => (
            <TabsContent key={status} value={status} className="space-y-4">
              {getFilteredSolicitacoes(status).length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Nenhuma solicitação
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Você ainda não tem solicitações {status !== 'all' ? `com status "${status}"` : ''}
                  </p>
                  <Link to={createPageUrl('Buscar')}>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Buscar Serviços
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {getFilteredSolicitacoes(status).map((solicitacao) => (
                    <SolicitacaoCard
                      key={solicitacao.id}
                      solicitacao={solicitacao}
                      tipo="cliente"
                      onCancelar={handleCancelar}
                      avaliacao={avaliacoes[solicitacao.id] ?? null}
                      onAvaliar={
                        solicitacao.status === 'concluido' && !avaliacoes[solicitacao.id]
                          ? () => setAvaliacaoModal(solicitacao)
                          : undefined
                      }
                      isLoading={isUpdating}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Modal de avaliação */}
      {avaliacaoModal && (
        <AvaliacaoModal
          solicitacao={avaliacaoModal}
          onSuccess={() => {
            setAvaliacaoModal(null);
            loadData();
          }}
          onClose={() => setAvaliacaoModal(null)}
        />
      )}
    </div>
  );
}
