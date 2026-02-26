import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, LogIn, MapPin, UserPlus } from 'lucide-react';
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
  tipo: 'cliente',
  telefone: '',
  cep: '',
  rua: '',
  bairro: '',
  cidade: '',
  estado: '',
  numero: '',
  complemento: '',
};

export default function Login() {
  const location = useLocation();
  const navigate = useNavigate();

  const redirectTo = useMemo(() => getRedirectTarget(location.search), [location.search]);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState(INITIAL_REGISTER);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingCep, setIsFetchingCep] = useState(false);

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
      await base44.auth.register({
        full_name: registerForm.full_name,
        email: registerForm.email,
        password: registerForm.password,
        tipo: registerForm.tipo,
        telefone: registerForm.telefone.trim(),
        cep: cepDigits,
        rua: registerForm.rua.trim() || null,
        bairro: registerForm.bairro.trim() || null,
        cidade: registerForm.cidade.trim() || null,
        estado: registerForm.estado.trim() || null,
        numero: registerForm.numero.trim() || null,
        complemento: registerForm.complemento.trim() || null,
      });

      toast.success('Conta criada! Verifique seu email e faça login.');
      navigate(redirectTo, { replace: true });
    } catch (error) {
      toast.error(error.message || 'Não foi possível criar a conta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setField = (field) => (event) =>
    setRegisterForm((prev) => ({ ...prev, [field]: event.target.value }));

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

                {/* Tipo de conta */}
                <div className="space-y-2">
                  <Label>Tipo de conta</Label>
                  <Select
                    value={registerForm.tipo}
                    onValueChange={(value) =>
                      setRegisterForm((prev) => ({ ...prev, tipo: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de conta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cliente">Cliente</SelectItem>
                      <SelectItem value="prestador">Prestador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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
                  Criar conta
                </Button>
              </form>
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
