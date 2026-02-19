import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Loader2,
  MapPin,
  FileText,
  Clock,
  CheckCircle,
  RefreshCw,
  Briefcase,
  Edit
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import SolicitacaoCard from '@/components/servija/SolicitacaoCard';
import { toast } from "sonner";

export default function Prestador() {
  const [user, setUser] = useState(null);
  const [prestador, setPrestador] = useState(null);
  const [solicitacoes, setSolicitacoes] = useState([]);
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

      if (userData.tipo !== 'prestador') {
        toast.error('Você precisa ser um prestador para acessar esta página. Atualize seu perfil primeiro.');
        return;
      }

      const [prestadoresData, solicitacoesData] = await Promise.all([
        base44.entities.Prestador.filter({ user_email: userData.email }),
        base44.entities.Solicitacao.filter({ prestador_email: userData.email }, '-created_date')
      ]);

      setSolicitacoes(solicitacoesData);

      if (prestadoresData.length > 0) {
        const p = prestadoresData[0];
        setPrestador(p);
      } else {
        setPrestador(null);
      }
    } catch (error) {
      toast.error('Você precisa estar logado');
      base44.auth.redirectToLogin();
    } finally {
      setIsLoading(false);
    }
  };

  const handleAceitar = async (solicitacao) => {
    setIsUpdating(true);
    try {
      await base44.entities.Solicitacao.update(solicitacao.id, {
        status: 'aceito',
        preco_acordado: solicitacao.preco_proposto
      });
      toast.success('Solicitação aceita!');
      loadData();
    } catch (error) {
      toast.error('Erro ao aceitar solicitação');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRecusar = async (solicitacao) => {
    setIsUpdating(true);
    try {
      await base44.entities.Solicitacao.update(solicitacao.id, {
        status: 'cancelado'
      });
      toast.success('Solicitação recusada');
      loadData();
    } catch (error) {
      toast.error('Erro ao recusar solicitação');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConcluir = async (solicitacao) => {
    setIsUpdating(true);
    try {
      await base44.entities.Solicitacao.update(solicitacao.id, {
        status: 'concluido'
      });
      toast.success('Serviço marcado como concluído!');
      loadData();
    } catch (error) {
      toast.error('Erro ao concluir solicitação');
    } finally {
      setIsUpdating(false);
    }
  };

  const getFilteredSolicitacoes = (status) => {
    if (status === 'all') return solicitacoes;
    return solicitacoes.filter((s) => s.status === status);
  };

  const counts = {
    all: solicitacoes.length,
    aberto: solicitacoes.filter((s) => s.status === 'aberto').length,
    aceito: solicitacoes.filter((s) => s.status === 'aceito').length,
    concluido: solicitacoes.filter((s) => s.status === 'concluido').length,
  };

  const servicosCount = Array.isArray(prestador?.servicos)
    ? prestador.servicos.length
    : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (user?.tipo !== 'prestador') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardHeader className="text-center">
            <Briefcase className="w-12 h-12 mx-auto text-blue-600 mb-4" />
            <CardTitle>Área do Prestador</CardTitle>
            <CardDescription>
              Para acessar esta área, você precisa atualizar seu perfil e selecionar "Prestador" como tipo de conta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a href="/Perfil">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Atualizar Perfil
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Painel do Prestador
              </h1>
              <p className="text-gray-500 mt-1">
                Gerencie seus serviços e solicitações
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={loadData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
              <a href="/Perfil">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Edit className="w-4 h-4 mr-2" />
                  Editar Perfil
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
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
                <p className="text-sm text-gray-500">Pendentes</p>
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
                <p className="text-sm text-gray-500">Em Andamento</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{servicosCount}</p>
                <p className="text-sm text-gray-500">Serviços</p>
              </div>
            </div>
          </div>
        </div>

        {prestador && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Seu Perfil Público
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{prestador.nome}</h3>
                  {prestador.nome_empresa && (
                    <p className="text-sm text-gray-500 mt-1">{prestador.nome_empresa}</p>
                  )}
                  <Badge className="mt-1 bg-blue-50 text-blue-700">
                    {prestador.categoria_nome}
                  </Badge>
                  {prestador.descricao && (
                    <p className="text-gray-600 mt-2">{prestador.descricao}</p>
                  )}
                  <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
                    {prestador.cidade && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" /> {prestador.cidade}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {prestador.destaque && (
                    <Badge className="bg-yellow-100 text-yellow-800">⭐ Destaque</Badge>
                  )}
                  {prestador.ativo ? (
                    <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-800">Inativo</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="aberto" className="space-y-6">
          <TabsList className="bg-white border border-gray-200">
            <TabsTrigger value="aberto">Pendentes ({counts.aberto})</TabsTrigger>
            <TabsTrigger value="aceito">Em Andamento ({counts.aceito})</TabsTrigger>
            <TabsTrigger value="concluido">Concluídos ({counts.concluido})</TabsTrigger>
            <TabsTrigger value="all">Todos ({counts.all})</TabsTrigger>
          </TabsList>

          {['aberto', 'aceito', 'concluido', 'all'].map((status) => (
            <TabsContent key={status} value={status} className="space-y-4">
              {getFilteredSolicitacoes(status).length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Nenhuma solicitação
                  </h3>
                  <p className="text-gray-500">
                    {status === 'aberto' && 'Você não tem solicitações pendentes'}
                    {status === 'aceito' && 'Nenhum serviço em andamento'}
                    {status === 'concluido' && 'Nenhum serviço concluído ainda'}
                    {status === 'all' && 'Você ainda não recebeu solicitações'}
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {getFilteredSolicitacoes(status).map((solicitacao) => (
                    <SolicitacaoCard
                      key={solicitacao.id}
                      solicitacao={solicitacao}
                      tipo="prestador"
                      onAceitar={handleAceitar}
                      onRecusar={handleRecusar}
                      onConcluir={handleConcluir}
                      isLoading={isUpdating}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
