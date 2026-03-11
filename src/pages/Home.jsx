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
      <section className="relative overflow-hidden bg-[#2658db]">
        <img
          src={homeHeroImage}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-[70%_center] opacity-[0.98]"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(96,165,250,0.20),_transparent_28%)]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#2658db] via-[#2658db]/95 via-[#2658db]/82 to-[#2658db]/44" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2658db]/28 via-transparent to-[#2658db]/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_34%_44%,_rgba(37,99,235,0.28),_transparent_18%),radial-gradient(circle_at_74%_42%,_rgba(255,255,255,0.07),_transparent_16%)]" />

        <div className="relative z-30 mx-auto max-w-7xl px-4 py-16 md:py-24 lg:min-h-[620px] lg:py-28">
          <div className="max-w-2xl lg:max-w-[48rem]">
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
