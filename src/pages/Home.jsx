import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Star, ArrowRight, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PrestadorCard from '@/components/servija/PrestadorCard';
import CategoriaCard from '@/components/servija/CategoriaCard';
import MapaPrestadores from '@/components/servija/MapaPrestadores';
import SolicitarModal from '@/components/servija/SolicitarModal';
import homeHeroImage from '../../home.png';

export default function Home() {
  const [user, setUser] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [prestadores, setPrestadores] = useState([]);
  const [prestadoresDestaque, setPrestadoresDestaque] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [selectedPrestador, setSelectedPrestador] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [categoriasData, prestadoresData, userData] = await Promise.all([
        base44.entities.Categoria.filter({ ativo: true }),
        base44.entities.Prestador.filter({ ativo: true }),
        base44.auth.me().catch(() => null),
      ]);

      setCategorias(categoriasData);
      setPrestadores(prestadoresData);
      setPrestadoresDestaque(prestadoresData.filter((prestador) => prestador.destaque).slice(0, 4));
      setUser(userData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSolicitar = (prestador) => {
    setSelectedPrestador(prestador);
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.14),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.12),_transparent_28%)]" />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-950/72 via-blue-800/24 to-blue-700/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_56%_50%,_rgba(59,130,246,0.24),_transparent_18%),radial-gradient(circle_at_73%_38%,_rgba(255,255,255,0.08),_transparent_18%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-blue-950/24 via-transparent to-white/6" />

        <div className="relative z-30 mx-auto max-w-7xl px-4 py-16 md:py-24 lg:min-h-[620px] lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)] lg:gap-8">
            <div className="max-w-2xl lg:max-w-[42rem] xl:max-w-[46rem]">
              <h1 className="mb-6 text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
                Encontre o profissional
                <span className="text-yellow-400"> perfeito</span> para você
              </h1>
              <p className="mb-8 text-lg text-blue-100 md:text-xl">
                Conectamos você aos melhores prestadores de serviços da sua região.
                Rápido, seguro e com preços transparentes.
              </p>

              <div className="flex max-w-4xl flex-col gap-2 rounded-2xl bg-white/96 p-2 shadow-[0_24px_80px_rgba(15,23,42,0.28)] ring-1 ring-white/45 backdrop-blur sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="O que você precisa?"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="h-14 border-0 bg-transparent pl-12 text-lg focus-visible:ring-0"
                  />
                </div>
                <Link to={createPageUrl('Buscar') + `?q=${busca}`}>
                  <Button className="h-14 w-full bg-blue-600 px-8 text-lg hover:bg-blue-700 sm:w-auto">
                    <Search className="mr-2 h-5 w-5" />
                    Buscar
                  </Button>
                </Link>
              </div>

              <div className="mt-12 grid max-w-2xl grid-cols-3 gap-6">
                <div>
                  <p className="text-3xl font-bold text-white md:text-4xl">{prestadores.length}+</p>
                  <p className="text-sm text-blue-200">Profissionais</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-white md:text-4xl">{categorias.length}</p>
                  <p className="text-sm text-blue-200">Categorias</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-white md:text-4xl">5.0</p>
                  <p className="text-sm text-blue-200">Avaliação média</p>
                </div>
              </div>
            </div>

            <div className="relative hidden min-h-[430px] overflow-hidden lg:block">
              <div className="absolute left-[-2%] top-1/2 z-0 h-80 w-28 -translate-y-1/2 rounded-full bg-sky-300/22 blur-3xl" />
              <img
                src={homeHeroImage}
                alt=""
                aria-hidden="true"
                className="absolute right-[-24%] top-1/2 z-10 w-[1080px] max-w-none -translate-y-[49%] object-contain opacity-[0.9] drop-shadow-[0_30px_90px_rgba(8,47,73,0.12)]"
              />
              <div className="absolute inset-0 z-20 bg-gradient-to-r from-blue-700 via-blue-700/18 to-transparent" />
              <div className="absolute inset-y-0 left-0 z-30 w-48 bg-gradient-to-r from-blue-700 via-blue-700/95 via-blue-700/74 to-transparent" />
              <div className="absolute inset-y-0 right-0 z-30 w-24 bg-gradient-to-l from-blue-700/72 via-blue-700/24 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 z-30 h-36 bg-gradient-to-t from-blue-700 via-blue-700/60 to-transparent" />
              <div className="absolute inset-x-0 top-0 z-30 h-24 bg-gradient-to-b from-blue-700/50 via-blue-700/18 to-transparent" />
              <div className="absolute inset-0 z-30 bg-[radial-gradient(circle_at_28%_50%,_rgba(37,99,235,0.34),_transparent_22%),radial-gradient(circle_at_76%_54%,_rgba(37,99,235,0.16),_transparent_28%)]" />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">Categorias de Serviços</h2>
              <p className="mt-1 text-gray-500">Encontre o que você precisa</p>
            </div>
            <Link to={createPageUrl('Buscar')}>
              <Button variant="ghost" className="text-blue-600 hover:text-blue-700">
                Ver todas
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {categorias.slice(0, 8).map((categoria) => (
                <Link key={categoria.id} to={createPageUrl('Buscar') + `?categoria=${categoria.id}`}>
                  <CategoriaCard categoria={categoria} onClick={() => {}} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">Prestadores Próximos a Você</h2>
            <p className="mt-1 text-gray-500">Explore no mapa e encontre profissionais na sua região</p>
          </div>

          {isLoading ? (
            <div className="flex h-[400px] items-center justify-center rounded-2xl bg-gray-200">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <MapaPrestadores
              prestadores={prestadores}
              onSolicitar={handleSolicitar}
              height="500px"
            />
          )}
        </div>
      </section>

      {prestadoresDestaque.length > 0 && (
        <section className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                  <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">Profissionais em Destaque</h2>
                </div>
                <p className="text-gray-500">Os melhores avaliados da plataforma</p>
              </div>
              <Link to={createPageUrl('Buscar') + '?destaque=true'}>
                <Button variant="ghost" className="text-blue-600 hover:text-blue-700">
                  Ver todos
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {prestadoresDestaque.map((prestador) => (
                <PrestadorCard
                  key={prestador.id}
                  prestador={prestador}
                  onSolicitar={handleSolicitar}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-gradient-to-br from-blue-600 to-blue-800 py-20">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
            Quer oferecer seus serviços?
          </h2>
          <p className="mb-8 text-lg text-blue-100">
            Cadastre-se como prestador e alcance milhares de clientes na sua região
          </p>
          <Link to={createPageUrl('Perfil')}>
            <Button size="lg" className="bg-white px-8 text-blue-600 hover:bg-blue-50">
              Cadastrar como Prestador
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      <SolicitarModal
        prestador={selectedPrestador}
        open={showModal}
        onOpenChange={setShowModal}
        user={user}
      />
    </div>
  );
}
