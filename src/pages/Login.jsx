import React, { useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Camera, Loader2, LogIn, MapPin, UserPlus, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const getRedirectTarget = (search) => {
  const params = new URLSearchParams(search);
  const redirect = params.get('redirect');

  if (!redirect) {
    return createPageUrl('Home');
  }

  try {
    const url = new URL(redirect, window.location.origin);
    if (url.origin !== window.location.origin) {
      return createPageUrl('Home');
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return createPageUrl('Home');
  }
};

const onlyDigits = (value) => String(value || '').replace(/\D/g, '');

const INITIAL_REGISTER = {
  full_name: '',
  email: '',
  password: '',
  telefone: '',
  cep: '',
  rua: '',
  bairro: '',
  cidade: '',
  estado: '',
  numero: '',
  complemento: '',
  preco_base: '',
  tipo_preco: 'fixo',
};

export default function Login() {
  const location = useLocation();
  const navigate = useNavigate();

  const redirectTo = useMemo(() => getRedirectTarget(location.search), [location.search]);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState(INITIAL_REGISTER);
  const [registerTab, setRegisterTab] = useState('cliente'); // 'cliente' | 'prestador'
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const fotoInputRef = useRef(null);

  const handleLogin = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await base44.auth.login(loginForm.email, loginForm.password);
      toast.success('Login realizado com sucesso.');
      navigate(redirectTo, { replace: true });
    } catch (error) {
      toast.error(error.message || 'Não foi possível entrar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchCep = async (cepValue) => {
    const digits = onlyDigits(cepValue);
    if (digits.length !== 8) return;

    setIsFetchingCep(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${digits}`);
      if (!response.ok) {
        toast.error('CEP não encontrado. Preencha o endereço manualmente.');
        return;
      }
      const data = await response.json();
      setRegisterForm((prev) => ({
        ...prev,
        rua: data.street || prev.rua,
        bairro: data.neighborhood || prev.bairro,
        cidade: data.city || prev.cidade,
        estado: data.state || prev.estado,
      }));
    } catch {
      // Silencioso: usuário preenche manualmente
    } finally {
      setIsFetchingCep(false);
    }
  };

  const handleFotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const removeFoto = () => {
    setFotoFile(null);
    setFotoPreview(null);
    if (fotoInputRef.current) fotoInputRef.current.value = '';
  };

  const handleRegister = async (event) => {
    event.preventDefault();

    if (registerForm.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (!registerForm.telefone.trim()) {
      toast.error('Telefone é obrigatório.');
      return;
    }

    const cepDigits = onlyDigits(registerForm.cep);
    if (cepDigits.length < 8) {
      toast.error('CEP é obrigatório (8 dígitos).');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        full_name: registerForm.full_name,
        email: registerForm.email,
        password: registerForm.password,
        tipo: registerTab,
        telefone: registerForm.telefone.trim(),
        cep: cepDigits,
        rua: registerForm.rua.trim() || null,
        bairro: registerForm.bairro.trim() || null,
        cidade: registerForm.cidade.trim() || null,
        estado: registerForm.estado.trim() || null,
        numero: registerForm.numero.trim() || null,
        complemento: registerForm.complemento.trim() || null,
      };

      if (registerTab === 'prestador' && registerForm.preco_base) {
        payload.preco_base = parseFloat(registerForm.preco_base) || null;
      }

      await base44.auth.register(payload);

      // Upload de foto após o registro (usuário já está autenticado)
      if (registerTab === 'prestador' && fotoFile) {
        try {
          await base44.profile.uploadFoto(fotoFile);
        } catch {
          // Não-fatal — o prestador pode adicionar a foto no perfil depois
        }
      }

      toast.success('Conta criada! Verifique seu email com as credenciais de acesso.');
      navigate(redirectTo, { replace: true });
    } catch (error) {
      toast.error(error.message || 'Não foi possível criar a conta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setField = (field) => (event) =>
    setRegisterForm((prev) => ({ ...prev, [field]: event.target.value }));

  // Campos de endereço compartilhados entre cliente e prestador
  const addressFields = (
    <>
      {/* Telefone */}
      <div className="space-y-2">
        <Label>Telefone *</Label>
        <Input
          type="tel"
          value={registerForm.telefone}
          onChange={setField('telefone')}
          placeholder="(11) 99999-0000"
          required
        />
      </div>

      {/* CEP */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" />
          CEP *
        </Label>
        <div className="relative">
          <Input
            value={registerForm.cep}
            onChange={(e) => {
              const val = e.target.value;
              setRegisterForm((prev) => ({ ...prev, cep: val }));
              if (onlyDigits(val).length === 8) fetchCep(val);
            }}
            placeholder="00000-000"
            maxLength={9}
            required
          />
          {isFetchingCep && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
          )}
        </div>
      </div>

      {/* Rua */}
      <div className="space-y-2">
        <Label>Rua</Label>
        <Input
          value={registerForm.rua}
          onChange={setField('rua')}
          placeholder="Preenchida automaticamente pelo CEP"
        />
      </div>

      {/* Número + Complemento */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Número</Label>
          <Input
            value={registerForm.numero}
            onChange={setField('numero')}
            placeholder="123"
          />
        </div>
        <div className="space-y-2">
          <Label>Complemento</Label>
          <Input
            value={registerForm.complemento}
            onChange={setField('complemento')}
            placeholder="Apto, Bloco..."
          />
        </div>
      </div>

      {/* Bairro */}
      <div className="space-y-2">
        <Label>Bairro</Label>
        <Input
          value={registerForm.bairro}
          onChange={setField('bairro')}
          placeholder="Preenchido automaticamente"
        />
      </div>

      {/* Cidade + Estado */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 space-y-2">
          <Label>Cidade</Label>
          <Input
            value={registerForm.cidade}
            onChange={setField('cidade')}
            placeholder="Preenchida automaticamente"
          />
        </div>
        <div className="space-y-2">
          <Label>Estado</Label>
          <Input
            value={registerForm.estado}
            onChange={setField('estado')}
            placeholder="SP"
            maxLength={2}
          />
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Entrar no ServiJá</CardTitle>
          <CardDescription>
            Use suas credenciais ou crie uma conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="register">Cadastrar</TabsTrigger>
            </TabsList>

            {/* ── LOGIN ─────────────────────────────────────────────── */}
            <TabsContent value="login">
              <form className="space-y-4" onSubmit={handleLogin}>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>

                <Button className="w-full bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4 mr-2" />
                  )}
                  Entrar
                </Button>
              </form>
            </TabsContent>

            {/* ── CADASTRO ──────────────────────────────────────────── */}
            <TabsContent value="register">
              {/* Sub-tabs: Cliente / Prestador */}
              <Tabs
                value={registerTab}
                onValueChange={(v) => {
                  setRegisterTab(v);
                  removeFoto();
                }}
                className="mb-4"
              >
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="cliente">Sou Cliente</TabsTrigger>
                  <TabsTrigger value="prestador">Sou Prestador</TabsTrigger>
                </TabsList>

                {/* ── FORMULÁRIO COMPARTILHADO ──── */}
                <form className="space-y-4" onSubmit={handleRegister}>
                  {/* Nome */}
                  <div className="space-y-2">
                    <Label>Nome completo *</Label>
                    <Input
                      value={registerForm.full_name}
                      onChange={setField('full_name')}
                      placeholder="Seu nome completo"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={registerForm.email}
                      onChange={setField('email')}
                      required
                    />
                  </div>

                  {/* Campos exclusivos de Prestador */}
                  <TabsContent value="prestador" className="mt-0 space-y-4">
                    {/* Foto de perfil */}
                    <div className="space-y-2">
                      <Label>Foto de perfil</Label>
                      {fotoPreview ? (
                        <div className="relative w-24 h-24">
                          <img
                            src={fotoPreview}
                            alt="Preview"
                            className="w-24 h-24 rounded-full object-cover border-2 border-blue-200"
                          />
                          <button
                            type="button"
                            onClick={removeFoto}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fotoInputRef.current?.click()}
                          className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                        >
                          <Camera className="w-4 h-4" />
                          Adicionar foto
                        </button>
                      )}
                      <input
                        ref={fotoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFotoChange}
                      />
                    </div>

                    {/* Preço médio */}
                    <div className="space-y-2">
                      <Label>Preço médio (opcional)</Label>
                      <div className="flex gap-2">
                        <Select
                          value={registerForm.tipo_preco}
                          onValueChange={(v) =>
                            setRegisterForm((prev) => ({ ...prev, tipo_preco: v }))
                          }
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixo">Valor fixo</SelectItem>
                            <SelectItem value="diaria">Diária</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                            R$
                          </span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={registerForm.preco_base}
                            onChange={setField('preco_base')}
                            placeholder="0,00"
                            className="pl-9"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-400">
                        Você poderá ajustar este valor no seu perfil a qualquer momento.
                      </p>
                    </div>
                  </TabsContent>

                  {/* Endereço e contato (compartilhados) */}
                  {addressFields}

                  {/* Senha */}
                  <div className="space-y-2">
                    <Label>Senha *</Label>
                    <Input
                      type="password"
                      value={registerForm.password}
                      onChange={setField('password')}
                      placeholder="Mínimo 6 caracteres"
                      required
                    />
                  </div>

                  <Button className="w-full bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <UserPlus className="w-4 h-4 mr-2" />
                    )}
                    {registerTab === 'prestador' ? 'Criar conta de Prestador' : 'Criar conta'}
                  </Button>
                </form>
              </Tabs>
            </TabsContent>
          </Tabs>

          <div className="mt-4">
            <Link className="text-blue-600 hover:text-blue-700 text-sm" to={createPageUrl('Home')}>
              Voltar para início
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
