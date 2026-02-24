import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  User, Mail, Phone, Save, Loader2, Building, Shield, Calendar, CreditCard, Home
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";

export default function Perfil() {
  const [user, setUser] = useState(null);
  const [prestadorPerfil, setPrestadorPerfil] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCepLoading, setIsCepLoading] = useState(false);
  const cepLookupTimeoutRef = useRef(null);
  const cepAbortControllerRef = useRef(null);
  const lastCepLookupRef = useRef('');
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    telefone: '',
    cpf: '',
    data_nascimento: '',
    rua: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    tipo: 'cliente',
    categoria_id: '',
    preco_base: ''
  });

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    return () => {
      if (cepLookupTimeoutRef.current) {
        clearTimeout(cepLookupTimeoutRef.current);
      }
      if (cepAbortControllerRef.current) {
        cepAbortControllerRef.current.abort();
      }
    };
  }, []);

  const loadUser = async () => {
    setIsLoading(true);
    try {
      const [categoriasData, profileData] = await Promise.all([
        base44.entities.Categoria.filter({ ativo: true }),
        base44.profile.getPrestador(),
      ]);
      const userData = profileData?.user || null;
      const prestadorData = profileData?.prestador || null;

      setUser(userData);
      setCategorias(categoriasData);
      setPrestadorPerfil(prestadorData);
      setFormData({
        full_name: userData.full_name || '',
        email: userData.email || '',
        telefone: userData.telefone || '',
        cpf: userData.cpf || '',
        data_nascimento: userData.data_nascimento || '',
        rua: userData.rua || '',
        numero: userData.numero || '',
        complemento: userData.complemento || '',
        bairro: userData.bairro || '',
        cidade: userData.cidade || '',
        estado: userData.estado || '',
        cep: userData.cep || '',
        tipo: userData.tipo || 'cliente',
        categoria_id: prestadorData?.categoria_id || '',
        preco_base:
          prestadorData?.preco_base !== undefined && prestadorData?.preco_base !== null
            ? String(prestadorData.preco_base)
            : ''
      });
    } catch (error) {
      toast.error('Você precisa estar logado para acessar esta página');
      base44.auth.redirectToLogin();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    const trimmedName = formData.full_name.trim();
    const trimmedEmail = formData.email.trim().toLowerCase();

    if (!trimmedName) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (!trimmedEmail) {
      toast.error('Email é obrigatório');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error('Informe um email válido');
      return;
    }

    if (formData.tipo === 'prestador' && !formData.categoria_id) {
      toast.error('Selecione uma categoria para conta de prestador');
      return;
    }

    if (formData.tipo === 'prestador' && !formData.telefone?.trim()) {
      toast.error('Telefone é obrigatório para conta de prestador');
      return;
    }

    if (formData.tipo === 'prestador' && formData.preco_base !== '') {
      const precoBaseNumero = Number(formData.preco_base);
      if (!Number.isFinite(precoBaseNumero) || precoBaseNumero < 0) {
        toast.error('Informe um preço válido');
        return;
      }
    }

    setIsSaving(true);
    try {
      const userPayload = {
        full_name: trimmedName,
        email: trimmedEmail,
        telefone: formData.telefone,
        cpf: formData.cpf,
        data_nascimento: formData.data_nascimento,
        rua: formData.rua,
        numero: formData.numero,
        complemento: formData.complemento,
        bairro: formData.bairro,
        cidade: formData.cidade,
        estado: formData.estado,
        cep: formData.cep,
        tipo: formData.tipo
      };

      const categoriaSelecionada = categorias.find(c => c.id === formData.categoria_id);
      const precoBaseNumero = formData.preco_base === '' ? null : Number(formData.preco_base);
      const profileData = await base44.profile.savePrestador({
        user: userPayload,
        prestador:
          formData.tipo === 'prestador'
            ? {
                categoria_id: formData.categoria_id,
                categoria_nome: categoriaSelecionada?.nome || '',
                preco_base: precoBaseNumero
              }
            : null,
      });

      setUser(profileData?.user || null);
      setPrestadorPerfil(profileData?.prestador || null);

      toast.success('Perfil atualizado com sucesso!');
      loadUser();
    } catch (error) {
      toast.error(error.message || 'Erro ao atualizar perfil');
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatCep = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  const fillAddressFromCep = async (cep) => {
    if (cepAbortControllerRef.current) {
      cepAbortControllerRef.current.abort();
    }

    const controller = new AbortController();
    cepAbortControllerRef.current = controller;
    setIsCepLoading(true);

    try {
      const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`, {
        signal: controller.signal
      });

      if (response.status === 404) {
        toast.error('CEP não encontrado');
        return;
      }

      if (!response.ok) {
        throw new Error('Erro ao consultar CEP');
      }

      const data = await response.json();

      setFormData(prev => ({
        ...prev,
        rua: data.street || '',
        bairro: data.neighborhood || '',
        cidade: data.city || '',
        estado: (data.state || '').toUpperCase()
      }));

      lastCepLookupRef.current = cep;
    } catch (error) {
      if (error.name !== 'AbortError') {
        toast.error('Não foi possível buscar o CEP');
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsCepLoading(false);
      }
    }
  };

  const handleCepChange = (e) => {
    const formattedCep = formatCep(e.target.value);
    const cepDigits = formattedCep.replace(/\D/g, '');

    setFormData(prev => ({ ...prev, cep: formattedCep }));

    if (cepLookupTimeoutRef.current) {
      clearTimeout(cepLookupTimeoutRef.current);
    }

    if (cepDigits.length !== 8) {
      if (cepAbortControllerRef.current) {
        cepAbortControllerRef.current.abort();
        cepAbortControllerRef.current = null;
      }
      setIsCepLoading(false);
      lastCepLookupRef.current = '';
      return;
    }

    if (cepDigits === lastCepLookupRef.current) {
      return;
    }

    cepLookupTimeoutRef.current = setTimeout(() => {
      fillAddressFromCep(cepDigits);
    }, 400);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Meu Perfil</h1>
          <p className="text-gray-500 mt-1">Gerencie suas informações pessoais</p>
        </div>

        {/* Profile Card */}
        <Card className="mb-6 overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-blue-500 to-blue-600" />
          <CardContent className="relative pt-0">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
              <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
                <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl font-bold">
                  {getInitials(user?.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 pb-2">
                <h2 className="text-2xl font-bold text-gray-900">{user?.full_name}</h2>
                <p className="text-gray-500">{user?.email}</p>
              </div>
              {user?.tipo && (
                <Badge className={`
                  ${user.tipo === 'admin' ? 'bg-purple-100 text-purple-700' : ''}
                  ${user.tipo === 'prestador' ? 'bg-green-100 text-green-700' : ''}
                  ${user.tipo === 'cliente' ? 'bg-blue-100 text-blue-700' : ''}
                `}>
                  <Shield className="w-3 h-3 mr-1" />
                  {user.tipo.charAt(0).toUpperCase() + user.tipo.slice(1)}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>
              Atualize suas informações de contato e localização
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  Nome
                </Label>
                <Input 
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  Email
                </Label>
                <Input 
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  Telefone / WhatsApp *
                </Label>
                <Input 
                  placeholder="(11) 99999-9999"
                  value={formData.telefone}
                  onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  CPF
                </Label>
                <Input 
                  placeholder="000.000.000-00"
                  value={formData.cpf}
                  onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                Data de Nascimento
              </Label>
              <Input 
                type="date"
                value={formData.data_nascimento}
                onChange={(e) => setFormData({...formData, data_nascimento: e.target.value})}
              />
            </div>

            <div className="pt-4 border-t">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Home className="w-5 h-5" />
                Endereço Completo
              </h3>
              
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CEP</Label>
                    <Input 
                      placeholder="00000-000"
                      value={formData.cep}
                      onChange={handleCepChange}
                    />
                    {isCepLoading && (
                      <p className="text-xs text-gray-500 flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Buscando endereço pelo CEP...
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Estado (UF)</Label>
                    <Input 
                      placeholder="SP"
                      maxLength={2}
                      value={formData.estado}
                      onChange={(e) => setFormData({...formData, estado: e.target.value.toUpperCase()})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input 
                    placeholder="São Paulo"
                    value={formData.cidade}
                    onChange={(e) => setFormData({...formData, cidade: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input 
                    placeholder="Centro"
                    value={formData.bairro}
                    onChange={(e) => setFormData({...formData, bairro: e.target.value})}
                  />
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Rua</Label>
                    <Input 
                      placeholder="Avenida Paulista"
                      value={formData.rua}
                      onChange={(e) => setFormData({...formData, rua: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Número</Label>
                    <Input 
                      placeholder="123"
                      value={formData.numero}
                      onChange={(e) => setFormData({...formData, numero: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Complemento</Label>
                  <Input 
                    placeholder="Apto 45, Bloco B"
                    value={formData.complemento}
                    onChange={(e) => setFormData({...formData, complemento: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building className="w-4 h-4 text-gray-500" />
                Tipo de Conta
              </Label>
              <Select 
                value={formData.tipo} 
                onValueChange={(v) => setFormData({...formData, tipo: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cliente">Cliente - Buscar serviços</SelectItem>
                  <SelectItem value="prestador">Prestador - Oferecer serviços</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">
                Escolha "Prestador" se deseja oferecer seus serviços na plataforma
              </p>
            </div>

            {formData.tipo === 'prestador' && (
              <div className="space-y-2">
                <Label>Categoria de Serviço *</Label>
                <Select
                  value={formData.categoria_id || ''}
                  onValueChange={(v) => setFormData({ ...formData, categoria_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((categoria) => (
                      <SelectItem key={categoria.id} value={categoria.id}>
                        {categoria.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.tipo === 'prestador' && (
              <div className="space-y-2">
                <Label>Preço Base (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="100.00"
                  value={formData.preco_base}
                  onChange={(e) => setFormData({ ...formData, preco_base: e.target.value })}
                />
              </div>
            )}

            <Button 
              onClick={handleSave} 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Alterações
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
