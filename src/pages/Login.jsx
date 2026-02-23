import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, LogIn, UserPlus } from 'lucide-react';
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

export default function Login() {
  const location = useLocation();
  const navigate = useNavigate();

  const redirectTo = useMemo(() => getRedirectTarget(location.search), [location.search]);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    full_name: '',
    email: '',
    password: '',
    tipo: 'cliente',
    cpf: '',
    cnpj: '',
    nome_empresa: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleRegister = async (event) => {
    event.preventDefault();

    const tipo = registerForm.tipo === 'prestador' ? 'prestador' : 'cliente';
    const cpfDigits = onlyDigits(registerForm.cpf);
    const cnpjDigits = onlyDigits(registerForm.cnpj);

    if (registerForm.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (cpfDigits.length !== 11) {
      toast.error('Informe um CPF válido.');
      return;
    }

    if (cnpjDigits.length > 0 && cnpjDigits.length !== 14) {
      toast.error('Informe um CNPJ válido.');
      return;
    }

    if (tipo === 'prestador' && !registerForm.nome_empresa.trim()) {
      toast.error('Informe o nome da empresa para prestador.');
      return;
    }

    setIsSubmitting(true);

    try {
      const createdUser = await base44.auth.register({
        full_name: registerForm.full_name,
        email: registerForm.email,
        password: registerForm.password,
        tipo,
        cpf: registerForm.cpf,
        cnpj: registerForm.cnpj,
        nome_empresa: tipo === 'prestador' ? registerForm.nome_empresa.trim() : null,
      });

      if (createdUser?.tipo === 'prestador' && createdUser?.ativo === false) {
        toast.success('Conta de prestador criada. Aguarde ativação do administrador.');
      } else {
        toast.success('Conta criada com sucesso.');
      }
      navigate(redirectTo, { replace: true });
    } catch (error) {
      toast.error(error.message || 'Não foi possível criar a conta.');
    } finally {
      setIsSubmitting(false);
    }
  };

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

            <TabsContent value="login">
              <form className="space-y-4" onSubmit={handleLogin}>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={loginForm.email}
                    onChange={(event) =>
                      setLoginForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input
                    type="password"
                    value={loginForm.password}
                    onChange={(event) =>
                      setLoginForm((prev) => ({ ...prev, password: event.target.value }))
                    }
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

            <TabsContent value="register">
              <form className="space-y-4" onSubmit={handleRegister}>
                <div className="space-y-2">
                  <Label>Nome completo</Label>
                  <Input
                    value={registerForm.full_name}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({ ...prev, full_name: event.target.value }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={registerForm.email}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de conta</Label>
                  <Select
                    value={registerForm.tipo}
                    onValueChange={(value) =>
                      setRegisterForm((prev) => ({
                        ...prev,
                        tipo: value,
                        nome_empresa: value === 'prestador' ? prev.nome_empresa : '',
                      }))
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

                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input
                    value={registerForm.cpf}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({ ...prev, cpf: event.target.value }))
                    }
                    placeholder="000.000.000-00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input
                    value={registerForm.cnpj}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({ ...prev, cnpj: event.target.value }))
                    }
                    placeholder="00.000.000/0000-00"
                  />
                </div>

                {registerForm.tipo === 'prestador' && (
                  <div className="space-y-2">
                    <Label>Nome da empresa</Label>
                    <Input
                      value={registerForm.nome_empresa}
                      onChange={(event) =>
                        setRegisterForm((prev) => ({ ...prev, nome_empresa: event.target.value }))
                      }
                      placeholder="Nome da empresa"
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input
                    type="password"
                    value={registerForm.password}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({ ...prev, password: event.target.value }))
                    }
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

          <div className="mt-6 text-sm text-gray-500 space-y-1">
            </div>

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
