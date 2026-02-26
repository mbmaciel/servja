import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import {
  User, Mail, Phone, Save, Loader2, Building, Shield, Calendar, CreditCard, Home,
  Camera, Plus, X, ChevronLeft, ChevronRight, ImageIcon, Trash2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  const [isUploadingFoto, setIsUploadingFoto] = useState(false);
  const [isUploadingTrabalho, setIsUploadingTrabalho] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const cepLookupTimeoutRef = useRef(null);
  const cepAbortControllerRef = useRef(null);
  const lastCepLookupRef = useRef('');
  const fotoInputRef = useRef(null);
  const trabalhoInputRef = useRef(null);

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

  // Photo state (separate from formData to avoid coupling)
  const [foto, setFoto] = useState('');
  const [fotosTrabalhos, setFotosTrabalhos] = useState([]);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    return () => {
      if (cepLookupTimeoutRef.current) clearTimeout(cepLookupTimeoutRef.current);
      if (cepAbortControllerRef.current) cepAbortControllerRef.current.abort();
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

      // Load photo state
      setFoto(prestadorData?.foto || userData?.avatar || '');
      const ft = prestadorData?.fotos_trabalhos;
      setFotosTrabalhos(Array.isArray(ft) ? ft : []);
      setCarouselIndex(0);

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

    if (!trimmedName) { toast.error('Nome é obrigatório'); return; }
    if (!trimmedEmail) { toast.error('Email é obrigatório'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) { toast.error('Informe um email válido'); return; }
    if (formData.tipo === 'prestador' && !formData.categoria_id) {
      toast.error('Selecione uma categoria para conta de prestador'); return;
    }
    if (formData.tipo === 'prestador' && !formData.telefone?.trim()) {
      toast.error('Telefone é obrigatório para conta de prestador'); return;
    }
    if (formData.tipo === 'prestador' && formData.preco_base !== '') {
      const v = Number(formData.preco_base);
      if (!Number.isFinite(v) || v < 0) { toast.error('Informe um preço válido'); return; }
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
        tipo: formData.tipo,
        avatar: foto || null,
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
                preco_base: precoBaseNumero,
                foto: foto || null,
                fotos_trabalhos: fotosTrabalhos,
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

  const handleFotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingFoto(true);
    try {
      const url = await base44.profile.uploadFoto(file);
      setFoto(url);
      toast.success('Foto de perfil atualizada.');
    } catch (err) {
      toast.error(err.message || 'Erro ao fazer upload da foto.');
    } finally {
      setIsUploadingFoto(false);
      e.target.value = '';
    }
  };

  const handleTrabalhoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingTrabalho(true);
    try {
      const url = await base44.profile.uploadFotoTrabalho(file);
      setFotosTrabalhos(prev => {
        const next = [...prev, url];
        setCarouselIndex(next.length - 1);
        return next;
      });
      toast.success('Foto adicionada.');
    } catch (err) {
      toast.error(err.message || 'Erro ao fazer upload.');
    } finally {
      setIsUploadingTrabalho(false);
      e.target.value = '';
    }
  };

  const handleRemoveTrabalho = (index) => {
    setFotosTrabalhos(prev => {
      const next = prev.filter((_, i) => i !== index);
      setCarouselIndex(i => Math.min(i, Math.max(0, next.length - 1)));
      return next;
    });
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
    if (cepAbortControllerRef.current) cepAbortControllerRef.current.abort();
    const controller = new AbortController();
    cepAbortControllerRef.current = controller;
    setIsCepLoading(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`, { signal: controller.signal });
      if (response.status === 404) { toast.error('CEP não encontrado'); return; }
      if (!response.ok) throw new Error('Erro ao consultar CEP');
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
      if (error.name !== 'AbortError') toast.error('Não foi possível buscar o CEP');
    } finally {
      if (!controller.signal.aborted) setIsCepLoading(false);
    }
  };

  const handleCepChange = (e) => {
    const formattedCep = formatCep(e.target.value);
    const cepDigits = formattedCep.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, cep: formattedCep }));
    if (cepLookupTimeoutRef.current) clearTimeout(cepLookupTimeoutRef.current);
    if (cepDigits.length !== 8) {
      if (cepAbortControllerRef.current) { cepAbortControllerRef.current.abort(); cepAbortControllerRef.current = null; }
      setIsCepLoading(false);
      lastCepLookupRef.current = '';
      return;
    }
    if (cepDigits === lastCepLookupRef.current) return;
    cepLookupTimeoutRef.current = setTimeout(() => fillAddressFromCep(cepDigits), 400);
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

        {/* Profile Card com foto */}
        <Card className="mb-6 overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-blue-500 to-blue-600" />
          <CardContent className="relative pt-0">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
              {/* Avatar com botão de upload */}
              <div className="relative group w-24 h-24">
                <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
                  <AvatarImage src={foto} />
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl font-bold">
                    {getInitials(user?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={() => fotoInputRef.current?.click()}
                  disabled={isUploadingFoto}
                >
                  {isUploadingFoto
                    ? <Loader2 className="w-6 h-6 text-white animate-spin" />
                    : <Camera className="w-6 h-6 text-white" />
                  }
                </button>
                <input
                  ref={fotoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFotoUpload}
                />
              </div>

              <div className="flex-1 pb-2">
                <h2 className="text-2xl font-bold text-gray-900">{user?.full_name}</h2>
                <p className="text-gray-500">{user?.email}</p>
                <p className="text-xs text-gray-400 mt-1">Clique na foto para alterar</p>
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
            <CardDescription>Atualize suas informações de contato e localização</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" /> Nome
                </Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" /> Email
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
                  <Phone className="w-4 h-4 text-gray-500" /> Telefone / WhatsApp *
                </Label>
                <Input
                  placeholder="(11) 99999-9999"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gray-500" /> CPF
                </Label>
                <Input
                  placeholder="000.000.000-00"
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" /> Data de Nascimento
              </Label>
              <Input
                type="date"
                value={formData.data_nascimento}
                onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
              />
            </div>

            {/* Endereço */}
            <div className="pt-4 border-t">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Home className="w-5 h-5" /> Endereço Completo
              </h3>
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CEP</Label>
                    <Input placeholder="00000-000" value={formData.cep} onChange={handleCepChange} />
                    {isCepLoading && (
                      <p className="text-xs text-gray-500 flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" /> Buscando endereço...
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Estado (UF)</Label>
                    <Input
                      placeholder="SP"
                      maxLength={2}
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase() })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input value={formData.cidade} onChange={(e) => setFormData({ ...formData, cidade: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input value={formData.bairro} onChange={(e) => setFormData({ ...formData, bairro: e.target.value })} />
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Rua</Label>
                    <Input value={formData.rua} onChange={(e) => setFormData({ ...formData, rua: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Número</Label>
                    <Input value={formData.numero} onChange={(e) => setFormData({ ...formData, numero: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Complemento</Label>
                  <Input
                    placeholder="Apto 45, Bloco B"
                    value={formData.complemento}
                    onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Tipo de conta */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building className="w-4 h-4 text-gray-500" /> Tipo de Conta
              </Label>
              <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cliente">Cliente - Buscar serviços</SelectItem>
                  <SelectItem value="prestador">Prestador - Oferecer serviços</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">Escolha "Prestador" se deseja oferecer seus serviços na plataforma</p>
            </div>

            {/* Campos específicos de prestador */}
            {formData.tipo === 'prestador' && (
              <>
                <div className="space-y-2">
                  <Label>Categoria de Serviço *</Label>
                  <Select
                    value={formData.categoria_id || ''}
                    onValueChange={(v) => setFormData({ ...formData, categoria_id: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
                    <SelectContent>
                      {categorias.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

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

                {/* ── Fotos dos serviços realizados ── */}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-gray-500" /> Fotos dos Serviços
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Mostre seu trabalho para novos clientes
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => trabalhoInputRef.current?.click()}
                      disabled={isUploadingTrabalho}
                    >
                      {isUploadingTrabalho
                        ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        : <Plus className="w-4 h-4 mr-1" />
                      }
                      Adicionar
                    </Button>
                    <input
                      ref={trabalhoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleTrabalhoUpload}
                    />
                  </div>

                  {fotosTrabalhos.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => trabalhoInputRef.current?.click()}
                      className="w-full h-36 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
                    >
                      <ImageIcon className="w-8 h-8 mb-2" />
                      <span className="text-sm">Clique para adicionar fotos</span>
                    </button>
                  ) : (
                    <div className="relative">
                      {/* Carrossel */}
                      <div className="overflow-hidden rounded-xl border border-gray-100">
                        <div
                          className="flex transition-transform duration-300"
                          style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
                        >
                          {fotosTrabalhos.map((url, i) => (
                            <div key={i} className="min-w-full relative">
                              <img
                                src={url}
                                alt={`Serviço ${i + 1}`}
                                className="w-full h-52 object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveTrabalho(i)}
                                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                                {i + 1} / {fotosTrabalhos.length}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Navegação */}
                      {fotosTrabalhos.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() => setCarouselIndex(i => Math.max(0, i - 1))}
                            disabled={carouselIndex === 0}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-1.5 shadow-md disabled:opacity-30 transition-opacity"
                          >
                            <ChevronLeft className="w-5 h-5 text-gray-700" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCarouselIndex(i => Math.min(fotosTrabalhos.length - 1, i + 1))}
                            disabled={carouselIndex === fotosTrabalhos.length - 1}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-1.5 shadow-md disabled:opacity-30 transition-opacity"
                          >
                            <ChevronRight className="w-5 h-5 text-gray-700" />
                          </button>
                        </>
                      )}

                      {/* Dots */}
                      {fotosTrabalhos.length > 1 && (
                        <div className="flex justify-center gap-1.5 mt-2">
                          {fotosTrabalhos.map((_, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setCarouselIndex(i)}
                              className={`w-2 h-2 rounded-full transition-colors ${
                                i === carouselIndex ? 'bg-blue-600' : 'bg-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            <Button
              onClick={handleSave}
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Alterações
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
