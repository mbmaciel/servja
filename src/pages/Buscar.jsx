import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Grid, Map, Loader2, Search } from 'lucide-react';
import { Button } from "@/components/ui/button";
import PrestadorCard from '@/components/servija/PrestadorCard';
import FiltrosBusca from '@/components/servija/FiltrosBusca';
import MapaPrestadores from '@/components/servija/MapaPrestadores';
import SolicitarModal from '@/components/servija/SolicitarModal';

export default function Buscar() {
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [prestadores, setPrestadores] = useState([]);
  const [filteredPrestadores, setFilteredPrestadores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPrestador, setSelectedPrestador] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  
  const [filtros, setFiltros] = useState({
    busca: searchParams.get('q') || '',
    categoria: searchParams.get('categoria') || '',
    cidade: '',
    precoMin: 0,
    precoMax: 500,
    somenteDestaque: searchParams.get('destaque') === 'true',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filtros, prestadores]);

  const getPrecoInicial = (prestador) => {
    let servicos = prestador?.servicos;
    if (typeof servicos === 'string') {
      try {
        servicos = JSON.parse(servicos);
      } catch {
        servicos = [];
      }
    }

    if (Array.isArray(servicos)) {
      const precos = servicos
        .map((servico) => Number(servico?.preco))
        .filter((preco) => Number.isFinite(preco) && preco >= 0);

      if (precos.length > 0) {
        return Math.min(...precos);
      }
    }

    if (typeof prestador?.preco_base === 'number') {
      return prestador.preco_base;
    }

    return 0;
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [categoriasData, prestadoresData, userData] = await Promise.all([
        base44.entities.Categoria.filter({ ativo: true }),
        base44.entities.Prestador.filter({ ativo: true }),
        base44.auth.me().catch(() => null)
      ]);
      
      setCategorias(categoriasData);
      // Sort by destaque first
      const sortedPrestadores = prestadoresData.sort((a, b) => {
        if (a.destaque && !b.destaque) return -1;
        if (!a.destaque && b.destaque) return 1;
        return 0;
      });
      setPrestadores(sortedPrestadores);
      setUser(userData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...prestadores];

    // Busca por texto
    if (filtros.busca) {
      const searchLower = filtros.busca.toLowerCase();
      result = result.filter(p => 
        p.nome?.toLowerCase().includes(searchLower) ||
        p.descricao?.toLowerCase().includes(searchLower) ||
        p.categoria_nome?.toLowerCase().includes(searchLower)
      );
    }

    // Categoria
    if (filtros.categoria) {
      result = result.filter(p => p.categoria_id === filtros.categoria);
    }

    // Cidade
    if (filtros.cidade) {
      const cidadeLower = filtros.cidade.toLowerCase();
      result = result.filter(p => p.cidade?.toLowerCase().includes(cidadeLower));
    }

    // Preço
    if (filtros.precoMin) {
      result = result.filter(p => getPrecoInicial(p) >= filtros.precoMin);
    }
    if (filtros.precoMax) {
      result = result.filter(p => getPrecoInicial(p) <= filtros.precoMax);
    }

    // Somente destaques
    if (filtros.somenteDestaque) {
      result = result.filter(p => p.destaque);
    }

    setFilteredPrestadores(result);
  };

  const handleSolicitar = (prestador) => {
    setSelectedPrestador(prestador);
    setShowModal(true);
  };

  const handleLimparFiltros = () => {
    setFiltros({
      busca: '',
      categoria: '',
      cidade: '',
      precoMin: 0,
      precoMax: 500,
      somenteDestaque: false,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Buscar Prestadores</h1>
              <p className="text-gray-500">
                {filteredPrestadores.length} profissional{filteredPrestadores.length !== 1 ? 'is' : ''} encontrado{filteredPrestadores.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'bg-blue-600' : ''}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'map' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('map')}
                className={viewMode === 'map' ? 'bg-blue-600' : ''}
              >
                <Map className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Filters */}
          <aside className="lg:w-80 flex-shrink-0">
            <FiltrosBusca 
              filtros={filtros}
              setFiltros={setFiltros}
              categorias={categorias}
              onLimpar={handleLimparFiltros}
            />
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : filteredPrestadores.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Nenhum prestador encontrado
                </h3>
                <p className="text-gray-500 mb-6">
                  Tente ajustar os filtros para encontrar mais resultados
                </p>
                <Button variant="outline" onClick={handleLimparFiltros}>
                  Limpar Filtros
                </Button>
              </div>
            ) : viewMode === 'map' ? (
              <MapaPrestadores 
                prestadores={filteredPrestadores}
                onSolicitar={handleSolicitar}
                height="calc(100vh - 200px)"
              />
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredPrestadores.map((prestador) => (
                  <PrestadorCard 
                    key={prestador.id}
                    prestador={prestador}
                    onSolicitar={handleSolicitar}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

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
