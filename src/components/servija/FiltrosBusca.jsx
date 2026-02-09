import React from 'react';
import { Search, SlidersHorizontal, Star, X } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";

export default function FiltrosBusca({ 
  filtros, 
  setFiltros, 
  categorias,
  onLimpar 
}) {
  const FilterContent = () => (
    <div className="space-y-6">
      {/* Categoria */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">Categoria</Label>
        <Select 
          value={filtros.categoria || 'all'} 
          onValueChange={(v) => setFiltros({...filtros, categoria: v === 'all' ? '' : v})}
        >
          <SelectTrigger>
            <SelectValue placeholder="Todas as categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categorias.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cidade */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">Cidade</Label>
        <Input 
          placeholder="Digite a cidade"
          value={filtros.cidade || ''}
          onChange={(e) => setFiltros({...filtros, cidade: e.target.value})}
        />
      </div>

      {/* Faixa de preço */}
      <div className="space-y-4">
        <Label className="text-sm font-medium text-gray-700">
          Faixa de preço: R$ {filtros.precoMin || 0} - R$ {filtros.precoMax || 500}
        </Label>
        <div className="px-2">
          <Slider
            value={[filtros.precoMin || 0, filtros.precoMax || 500]}
            onValueChange={([min, max]) => setFiltros({...filtros, precoMin: min, precoMax: max})}
            max={500}
            min={0}
            step={10}
            className="w-full"
          />
        </div>
        <div className="flex gap-3">
          <Input 
            type="number"
            placeholder="Mín"
            value={filtros.precoMin || ''}
            onChange={(e) => setFiltros({...filtros, precoMin: Number(e.target.value)})}
            className="text-center"
          />
          <Input 
            type="number"
            placeholder="Máx"
            value={filtros.precoMax || ''}
            onChange={(e) => setFiltros({...filtros, precoMax: Number(e.target.value)})}
            className="text-center"
          />
        </div>
      </div>

      {/* Somente Destaques */}
      <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-xl">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
          <Label className="text-sm font-medium text-gray-700">Somente Destaques</Label>
        </div>
        <Switch 
          checked={filtros.somenteDestaque || false}
          onCheckedChange={(v) => setFiltros({...filtros, somenteDestaque: v})}
        />
      </div>

      {/* Botão Limpar */}
      <Button 
        variant="outline" 
        className="w-full"
        onClick={onLimpar}
      >
        <X className="w-4 h-4 mr-2" />
        Limpar Filtros
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Barra de busca */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input 
            placeholder="Buscar prestadores..."
            value={filtros.busca || ''}
            onChange={(e) => setFiltros({...filtros, busca: e.target.value})}
            className="pl-10 h-12 bg-white"
          />
        </div>
        
        {/* Mobile Filters */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-12 w-12 lg:hidden">
              <SlidersHorizontal className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FilterContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Filters */}
      <div className="hidden lg:block bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <SlidersHorizontal className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Filtros</h3>
        </div>
        <FilterContent />
      </div>
    </div>
  );
}