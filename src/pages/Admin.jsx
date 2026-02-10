import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  Loader2, Users, Briefcase, Tag, Plus, Save, Trash2,
  CheckCircle, XCircle, Star, Shield, RefreshCw, Edit, Search,
  FileText, TrendingUp, DollarSign, Clock
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const iconOptions = [
  'Home', 'Sparkles', 'Baby', 'Heart', 'Dog', 'Footprints',
  'Zap', 'Droplets', 'Hammer', 'PaintBucket', 'Package', 'Wind',
  'Flower', 'Key', 'Dumbbell', 'GraduationCap', 'Hand', 'Scissors', 'User'
];

export default function Admin() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [prestadores, setPrestadores] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCategoriaModal, setShowCategoriaModal] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [categoriaForm, setCategoriaForm] = useState({
    nome: '',
    icone: 'User',
    ativo: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const userData = await base44.auth.me();
      
      if (userData.role !== 'admin' && userData.tipo !== 'admin') {
        toast.error('Acesso negado. Apenas administradores podem acessar esta página.');
        return;
      }

      setUser(userData);

      const [usersData, prestadoresData, categoriasData, solicitacoesData] = await Promise.all([
        base44.entities.User.list('-created_date'),
        base44.entities.Prestador.list('-created_date'),
        base44.entities.Categoria.list(),
        base44.entities.Solicitacao.list('-created_date')
      ]);

      const prestadorProfileByUserId = new Map(
        prestadoresData.filter((item) => item.user_id).map((item) => [item.user_id, item])
      );
      const prestadorProfileByEmail = new Map(
        prestadoresData.filter((item) => item.user_email).map((item) => [item.user_email, item])
      );

      const prestadoresReais = usersData
        .filter((item) => (item.tipo || item.role) === 'prestador')
        .map((item) => {
          const perfil =
            prestadorProfileByUserId.get(item.id) ||
            prestadorProfileByEmail.get(item.email) ||
            null;

          return {
            id: item.id,
            user_id: item.id,
            user_email: item.email,
            nome: perfil?.nome || item.full_name,
            categoria_nome: perfil?.categoria_nome || null,
            cidade: perfil?.cidade || item.cidade || null,
            preco_base: perfil?.preco_base ?? null,
            destaque: Boolean(perfil?.destaque),
            ativo: typeof item.ativo === 'boolean' ? item.ativo : Boolean(perfil?.ativo),
            perfil_id: perfil?.id || null,
          };
        });

      setUsers(usersData);
      setPrestadores(prestadoresReais);
      setCategorias(categoriasData);
      setSolicitacoes(solicitacoesData);
    } catch (error) {
      toast.error('Você precisa estar logado como administrador');
      base44.auth.redirectToLogin();
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePrestadorAtivo = async (prestador) => {
    setIsUpdating(true);
    try {
      await base44.entities.User.update(prestador.user_id, {
        ativo: !prestador.ativo
      });
      toast.success(`Prestador ${prestador.ativo ? 'desativado' : 'ativado'}`);
      loadData();
    } catch (error) {
      toast.error('Erro ao atualizar prestador');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTogglePrestadorDestaque = async (prestador) => {
    if (!prestador.perfil_id) {
      toast.error('Este prestador ainda não criou perfil profissional.');
      return;
    }

    setIsUpdating(true);
    try {
      await base44.entities.Prestador.update(prestador.perfil_id, {
        destaque: !prestador.destaque
      });
      toast.success(`Prestador ${prestador.destaque ? 'removido do' : 'adicionado ao'} destaque`);
      loadData();
    } catch (error) {
      toast.error('Erro ao atualizar prestador');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveCategoria = async () => {
    if (!categoriaForm.nome) {
      toast.error('Nome é obrigatório');
      return;
    }

    setIsUpdating(true);
    try {
      if (editingCategoria) {
        await base44.entities.Categoria.update(editingCategoria.id, categoriaForm);
        toast.success('Categoria atualizada');
      } else {
        await base44.entities.Categoria.create(categoriaForm);
        toast.success('Categoria criada');
      }
      setShowCategoriaModal(false);
      setCategoriaForm({ nome: '', icone: 'User', ativo: true });
      setEditingCategoria(null);
      loadData();
    } catch (error) {
      toast.error('Erro ao salvar categoria');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditCategoria = (categoria) => {
    setEditingCategoria(categoria);
    setCategoriaForm({
      nome: categoria.nome,
      icone: categoria.icone || 'User',
      ativo: categoria.ativo
    });
    setShowCategoriaModal(true);
  };

  const handleDeleteCategoria = async (categoria) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;

    setIsUpdating(true);
    try {
      await base44.entities.Categoria.delete(categoria.id);
      toast.success('Categoria excluída');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir categoria');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangeUserType = async (targetUser, nextTipo) => {
    setIsUpdating(true);
    try {
      await base44.entities.User.update(targetUser.id, { tipo: nextTipo });
      toast.success(
        nextTipo === 'admin'
          ? 'Usuário convertido para administrador.'
          : 'Administrador convertido para cliente.'
      );
      loadData();
    } catch (error) {
      toast.error(error.message || 'Erro ao atualizar perfil do usuário');
    } finally {
      setIsUpdating(false);
    }
  };

  const getUserProfile = (targetUser) => {
    if (targetUser?.tipo) {
      return targetUser.tipo;
    }

    if (targetUser?.role === 'admin') {
      return 'admin';
    }

    return 'cliente';
  };

  const matchesSearch = (targetUser) =>
    targetUser.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    targetUser.email?.toLowerCase().includes(searchTerm.toLowerCase());

  const filteredClientes = users.filter(
    (targetUser) => getUserProfile(targetUser) === 'cliente' && matchesSearch(targetUser)
  );

  const filteredAdmins = users.filter(
    (targetUser) => getUserProfile(targetUser) === 'admin' && matchesSearch(targetUser)
  );

  const filteredPrestadores = prestadores.filter(p =>
    p.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.categoria_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.user_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (user?.role !== 'admin' && user?.tipo !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardHeader className="text-center">
            <Shield className="w-12 h-12 mx-auto text-red-600 mb-4" />
            <CardTitle>Acesso Restrito</CardTitle>
            <CardDescription>
              Esta área é reservada apenas para administradores.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Painel Administrativo
              </h1>
              <p className="text-gray-500 mt-1">
                Gerencie usuários, prestadores e categorias
              </p>
            </div>
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                <p className="text-sm text-gray-500">Usuários</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{prestadores.length}</p>
                <p className="text-sm text-gray-500">Prestadores</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{solicitacoes.length}</p>
                <p className="text-sm text-gray-500">Solicitações</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Star className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {prestadores.filter(p => p.destaque).length}
                </p>
                <p className="text-sm text-gray-500">Destaques</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Tag className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{categorias.length}</p>
                <p className="text-sm text-gray-500">Categorias</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Solicitações por Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-600" />
                    <span className="font-medium text-gray-900">Abertas</span>
                  </div>
                  <span className="text-xl font-bold text-yellow-600">
                    {solicitacoes.filter(s => s.status === 'aberto').length}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-gray-900">Aceitas</span>
                  </div>
                  <span className="text-xl font-bold text-blue-600">
                    {solicitacoes.filter(s => s.status === 'aceito').length}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-gray-900">Concluídas</span>
                  </div>
                  <span className="text-xl font-bold text-green-600">
                    {solicitacoes.filter(s => s.status === 'concluido').length}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="font-medium text-gray-900">Canceladas</span>
                  </div>
                  <span className="text-xl font-bold text-red-600">
                    {solicitacoes.filter(s => s.status === 'cancelado').length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Valores em Negociação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Total Proposto</p>
                  <p className="text-3xl font-bold text-green-600">
                    R$ {solicitacoes
                      .filter(s => s.preco_proposto)
                      .reduce((sum, s) => sum + (s.preco_proposto || 0), 0)
                      .toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Total Acordado</p>
                  <p className="text-3xl font-bold text-blue-600">
                    R$ {solicitacoes
                      .filter(s => s.preco_acordado)
                      .reduce((sum, s) => sum + (s.preco_acordado || 0), 0)
                      .toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Média por solicitação</span>
                  <span className="font-bold text-gray-900">
                    R$ {solicitacoes.length > 0 
                      ? (solicitacoes
                          .filter(s => s.preco_proposto || s.preco_acordado)
                          .reduce((sum, s) => sum + (s.preco_acordado || s.preco_proposto || 0), 0) / 
                          solicitacoes.filter(s => s.preco_proposto || s.preco_acordado).length)
                          .toFixed(2)
                      : '0.00'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="prestadores" className="space-y-6">
          <TabsList className="bg-white border border-gray-200">
            <TabsTrigger value="prestadores">
              <Briefcase className="w-4 h-4 mr-2" />
              Prestadores
            </TabsTrigger>
            <TabsTrigger value="solicitacoes">
              <FileText className="w-4 h-4 mr-2" />
              Solicitações
            </TabsTrigger>
            <TabsTrigger value="usuarios">
              <Users className="w-4 h-4 mr-2" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="administradores">
              <Shield className="w-4 h-4 mr-2" />
              Administradores
            </TabsTrigger>
            <TabsTrigger value="categorias">
              <Tag className="w-4 h-4 mr-2" />
              Categorias
            </TabsTrigger>
          </TabsList>

          {/* Prestadores */}
          <TabsContent value="prestadores">
            <Card>
              <CardHeader>
                <CardTitle>Prestadores</CardTitle>
                <CardDescription>Gerencie os prestadores da plataforma</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Cidade</TableHead>
                        <TableHead>Preço</TableHead>
                        <TableHead>Destaque</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPrestadores.map((prestador) => (
                        <TableRow key={prestador.user_id || prestador.id}>
                          <TableCell className="font-medium">{prestador.nome}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{prestador.categoria_nome || '-'}</Badge>
                          </TableCell>
                          <TableCell>{prestador.cidade || '-'}</TableCell>
                          <TableCell>
                            {typeof prestador.preco_base === 'number'
                              ? `R$ ${prestador.preco_base.toFixed(2)}`
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={prestador.destaque}
                              onCheckedChange={() => handleTogglePrestadorDestaque(prestador)}
                              disabled={isUpdating || !prestador.perfil_id}
                            />
                          </TableCell>
                          <TableCell>
                            {prestador.ativo ? (
                              <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800">Inativo</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTogglePrestadorAtivo(prestador)}
                              disabled={isUpdating}
                            >
                              {prestador.ativo ? (
                                <XCircle className="w-4 h-4 text-red-500" />
                              ) : (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Solicitações */}
          <TabsContent value="solicitacoes">
            <Card>
              <CardHeader>
                <CardTitle>Solicitações de Serviço</CardTitle>
                <CardDescription>Todas as solicitações da plataforma</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Prestador</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Valor Proposto</TableHead>
                        <TableHead>Valor Acordado</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {solicitacoes.map((sol) => (
                        <TableRow key={sol.id}>
                          <TableCell className="font-medium">
                            {sol.cliente_nome || sol.cliente_email}
                          </TableCell>
                          <TableCell>
                            {sol.prestador_nome || sol.prestador_email}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{sol.categoria_nome}</Badge>
                          </TableCell>
                          <TableCell>
                            {sol.preco_proposto ? `R$ ${sol.preco_proposto.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell>
                            {sol.preco_acordado ? `R$ ${sol.preco_acordado.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge className={`
                              ${sol.status === 'aberto' ? 'bg-yellow-100 text-yellow-800' : ''}
                              ${sol.status === 'aceito' ? 'bg-blue-100 text-blue-800' : ''}
                              ${sol.status === 'concluido' ? 'bg-green-100 text-green-800' : ''}
                              ${sol.status === 'cancelado' ? 'bg-red-100 text-red-800' : ''}
                            `}>
                              {sol.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {new Date(sol.created_date).toLocaleDateString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Usuários */}
          <TabsContent value="usuarios">
            <Card>
              <CardHeader>
                <CardTitle>Usuários</CardTitle>
                <CardDescription>Lista de usuários com perfil cliente</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Cidade</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClientes.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.full_name}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>{u.cidade || '-'}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleChangeUserType(u, 'admin')}
                              disabled={isUpdating}
                            >
                              <Shield className="w-4 h-4 text-purple-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Administradores */}
          <TabsContent value="administradores">
            <Card>
              <CardHeader>
                <CardTitle>Administradores</CardTitle>
                <CardDescription>Lista de usuários com perfil administrador</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Perfil</TableHead>
                        <TableHead>Cidade</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAdmins.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.full_name}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>
                            <Badge className="bg-purple-100 text-purple-800">admin</Badge>
                          </TableCell>
                          <TableCell>{u.cidade || '-'}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleChangeUserType(u, 'cliente')}
                              disabled={isUpdating}
                            >
                              <Users className="w-4 h-4 text-blue-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categorias */}
          <TabsContent value="categorias">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Categorias</CardTitle>
                  <CardDescription>Gerencie as categorias de serviços</CardDescription>
                </div>
                <Dialog open={showCategoriaModal} onOpenChange={(open) => {
                  setShowCategoriaModal(open);
                  if (!open) {
                    setEditingCategoria(null);
                    setCategoriaForm({ nome: '', icone: 'User', ativo: true });
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Categoria
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingCategoria ? 'Editar Categoria' : 'Nova Categoria'}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>Nome *</Label>
                        <Input
                          value={categoriaForm.nome}
                          onChange={(e) => setCategoriaForm({...categoriaForm, nome: e.target.value})}
                          placeholder="Nome da categoria"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Ícone</Label>
                        <Select
                          value={categoriaForm.icone}
                          onValueChange={(v) => setCategoriaForm({...categoriaForm, icone: v})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {iconOptions.map(icon => (
                              <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Ativo</Label>
                        <Switch
                          checked={categoriaForm.ativo}
                          onCheckedChange={(v) => setCategoriaForm({...categoriaForm, ativo: v})}
                        />
                      </div>
                      <Button 
                        onClick={handleSaveCategoria}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Salvar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Ícone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categorias.map((categoria) => (
                        <TableRow key={categoria.id}>
                          <TableCell className="font-medium">{categoria.nome}</TableCell>
                          <TableCell>{categoria.icone || 'User'}</TableCell>
                          <TableCell>
                            {categoria.ativo ? (
                              <Badge className="bg-green-100 text-green-800">Ativa</Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800">Inativa</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditCategoria(categoria)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteCategoria(categoria)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
