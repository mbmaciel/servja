import React, { useState, useEffect } from 'react';
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
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
    tipo: 'cliente'
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    setIsLoading(true);
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      setFormData({
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
        tipo: userData.tipo || 'cliente'
      });
    } catch (error) {
      toast.error('Você precisa estar logado para acessar esta página');
      base44.auth.redirectToLogin();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await base44.auth.updateMe(formData);
      toast.success('Perfil atualizado com sucesso!');
      loadUser();
    } catch (error) {
      toast.error('Erro ao atualizar perfil');
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
                  value={user?.full_name || ''} 
                  disabled 
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-400">
                  O nome não pode ser alterado aqui
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  Email
                </Label>
                <Input 
                  value={user?.email || ''} 
                  disabled 
                  className="bg-gray-50"
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
                      onChange={(e) => setFormData({...formData, cep: e.target.value})}
                    />
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