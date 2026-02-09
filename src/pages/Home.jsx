import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Search, Star, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PrestadorCard from '@/components/servija/PrestadorCard';
import CategoriaCard from '@/components/servija/CategoriaCard';
import MapaPrestadores from '@/components/servija/MapaPrestadores';
import SolicitarModal from '@/components/servija/SolicitarModal';

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
        base44.auth.me().catch(() => null)
      ]);
      
      setCategorias(categoriasData);
      setPrestadores(prestadoresData);
      setPrestadoresDestaque(prestadoresData.filter(p => p.destaque).slice(0, 4));
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
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1920')] bg-cover bg-center opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-blue-900/50 to-transparent" />
        
        <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-28">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Encontre o profissional 
              <span className="text-yellow-400"> perfeito</span> para você
            </h1>
            <p className="text-lg md:text-xl text-blue-100 mb-8">
              Conectamos você aos melhores prestadores de serviços da sua região. 
              Rápido, seguro e com preços transparentes.
            </p>
            
            {/* Search Bar */}
            <div className="bg-white rounded-2xl p-2 shadow-2xl flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input 
                  placeholder="O que você precisa?"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-12 h-14 border-0 text-lg bg-transparent focus-visible:ring-0"
                />
              </div>
              <Link to={createPageUrl('Buscar') + `?q=${busca}`}>
                <Button className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-lg w-full sm:w-auto">
                  <Search className="w-5 h-5 mr-2" />
                  Buscar
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mt-12">
              <div>
                <p className="text-3xl md:text-4xl font-bold text-white">
                  {prestadores.length}+
                </p>
                <p className="text-blue-200 text-sm">Profissionais</p>
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-bold text-white">
                  {categorias.length}
                </p>
                <p className="text-blue-200 text-sm">Categorias</p>
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-bold text-white">5.0</p>
                <p className="text-blue-200 text-sm">Avaliação média</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categorias */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                Categorias de Serviços
              </h2>
              <p className="text-gray-500 mt-1">Encontre o que você precisa</p>
            </div>
            <Link to={createPageUrl('Buscar')}>
              <Button variant="ghost" className="text-blue-600 hover:text-blue-700">
                Ver todas
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {categorias.slice(0, 8).map((categoria) => (
                <Link key={categoria.id} to={createPageUrl('Buscar') + `?categoria=${categoria.id}`}>
                  <CategoriaCard categoria={categoria} onClick={() => {}} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Mapa */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              Prestadores Próximos a Você
            </h2>
            <p className="text-gray-500 mt-1">Explore no mapa e encontre profissionais na sua região</p>
          </div>

          {isLoading ? (
            <div className="h-[400px] bg-gray-200 rounded-2xl flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
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

      {/* Destaques */}
      {prestadoresDestaque.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                    Profissionais em Destaque
                  </h2>
                </div>
                <p className="text-gray-500">Os melhores avaliados da plataforma</p>
              </div>
              <Link to={createPageUrl('Buscar') + '?destaque=true'}>
                <Button variant="ghost" className="text-blue-600 hover:text-blue-700">
                  Ver todos
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-blue-800">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Quer oferecer seus serviços?
          </h2>
          <p className="text-blue-100 text-lg mb-8">
            Cadastre-se como prestador e alcance milhares de clientes na sua região
          </p>
          <Link to={createPageUrl('Perfil')}>
            <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 px-8">
              Cadastrar como Prestador
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Modal */}
      <SolicitarModal 
        prestador={selectedPrestador}
        open={showModal}
        onOpenChange={setShowModal}
        user={user}
      />
    </div>
  );
}