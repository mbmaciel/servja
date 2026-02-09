import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  Loader2, Save, MapPin, DollarSign, FileText,
  Clock, CheckCircle, RefreshCw, Briefcase, Edit
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import SolicitacaoCard from '@/components/servija/SolicitacaoCard';
import { toast } from "sonner";

export default function Prestador() {
  const [user, setUser] = useState(null);
  const [prestador, setPrestador] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    categoria_id: '',
    descricao: '',
    telefone: '',
    cidade: '',
    preco_base: '',
    latitude: '',
    longitude: '',
    foto: ''
  });

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

      const [categoriasData, prestadoresData, solicitacoesData] = await Promise.all([
        base44.entities.Categoria.filter({ ativo: true }),
        base44.entities.Prestador.filter({ user_email: userData.email }),
        base44.entities.Solicitacao.filter({ prestador_email: userData.email }, '-created_date')
      ]);

      setCategorias(categoriasData);
      setSolicitacoes(solicitacoesData);

      if (prestadoresData.length > 0) {
        const p = prestadoresData[0];
        setPrestador(p);
        setFormData({
          nome: p.nome || userData.full_name,
          categoria_id: p.categoria_id || '',
          descricao: p.descricao || '',
          telefone: p.telefone || userData.telefone || '',
          cidade: p.cidade || userData.cidade || '',
          preco_base: p.preco_base || '',
          latitude: p.latitude || '',
          longitude: p.longitude || '',
          foto: p.foto || ''
        });
      } else {
        setFormData(prev => ({
          ...prev,
          nome: userData.full_name,
          telefone: userData.telefone || '',
          cidade: userData.cidade || ''
        }));
      }
    } catch (error) {
      toast.error('Você precisa estar logado');
      base44.auth.redirectToLogin();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePerfil = async () => {
    if (!formData.nome || !formData.categoria_id) {
      toast.error('Nome e categoria são obrigatórios');
      return;
    }

    setIsSaving(true);
    try {
      const categoria = categorias.find(c => c.id === formData.categoria_id);
      const data = {
        ...formData,
        user_id: user.id,
        user_email: user.email,
        categoria_nome: categoria?.nome || '',
        preco_base: Number(formData.preco_base) || 0,
        latitude: Number(formData.latitude) || null,
        longitude: Number(formData.longitude) || null,
        ativo: true
      };

      if (prestador) {
        await base44.entities.Prestador.update(prestador.id, data);
      } else {
        await base44.entities.Prestador.create(data);
      }

      toast.success('Perfil salvo com sucesso!');
      setShowEditModal(false);
      loadData();
    } catch (error) {
      toast.error('Erro ao salvar perfil');
    } finally {
      setIsSaving(false);
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
      {/* Header */}
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
              <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Edit className="w-4 h-4 mr-2" />
                    {prestador ? 'Editar Perfil' : 'Criar Perfil'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {prestador ? 'Editar Perfil de Prestador' : 'Criar Perfil de Prestador'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Nome *</Label>
                      <Input
                        value={formData.nome}
                        onChange={(e) => setFormData({...formData, nome: e.target.value})}
                        placeholder="Seu nome profissional"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Categoria *</Label>
                      <Select
                        value={formData.categoria_id}
                        onValueChange={(v) => setFormData({...formData, categoria_id: v})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {categorias.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Textarea
                        value={formData.descricao}
                        onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                        placeholder="Descreva seus serviços..."
                        className="min-h-[100px]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Telefone</Label>
                        <Input
                          value={formData.telefone}
                          onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                          placeholder="(11) 99999-9999"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cidade</Label>
                        <Input
                          value={formData.cidade}
                          onChange={(e) => setFormData({...formData, cidade: e.target.value})}
                          placeholder="São Paulo, SP"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Preço Base (R$)</Label>
                      <Input
                        type="number"
                        value={formData.preco_base}
                        onChange={(e) => setFormData({...formData, preco_base: e.target.value})}
                        placeholder="100.00"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Latitude</Label>
                        <Input
                          type="number"
                          value={formData.latitude}
                          onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                          placeholder="-23.5505"
                          step="any"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Longitude</Label>
                        <Input
                          type="number"
                          value={formData.longitude}
                          onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                          placeholder="-46.6333"
                          step="any"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Dica: Use Google Maps para encontrar suas coordenadas
                    </p>

                    <div className="space-y-2">
                      <Label>URL da Foto</Label>
                      <Input
                        value={formData.foto}
                        onChange={(e) => setFormData({...formData, foto: e.target.value})}
                        placeholder="https://..."
                      />
                    </div>

                    <Button 
                      onClick={handleSavePerfil}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Salvar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
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
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  R$ {prestador?.preco_base?.toFixed(0) || '0'}
                </p>
                <p className="text-sm text-gray-500">Preço Base</p>
              </div>
            </div>
          </div>
        </div>

        {/* Perfil Preview */}
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
                    {prestador.preco_base && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" /> R$ {prestador.preco_base.toFixed(2)}
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

        {/* Solicitações */}
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