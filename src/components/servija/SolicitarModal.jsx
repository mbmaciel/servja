import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Star, MapPin, BadgeCheck, Send, Loader2, MessageCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function SolicitarModal({ prestador, open, onOpenChange, user }) {
  const whatsappMessage = 'Quero mais informações. Entrei em contato  através do site ServeJa.com';
  const [descricao, setDescricao] = useState('');
  const [precoOferta, setPrecoOferta] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const getPrecoMinimoServico = () => {
    let servicos = prestador?.servicos;
    if (typeof servicos === 'string') {
      try {
        servicos = JSON.parse(servicos);
      } catch {
        servicos = [];
      }
    }

    if (!Array.isArray(servicos)) return null;

    const precos = servicos
      .map((servico) => Number(servico?.preco))
      .filter((preco) => Number.isFinite(preco) && preco >= 0);

    if (precos.length === 0) return null;
    return Math.min(...precos);
  };

  const precoReferencia = getPrecoMinimoServico();

  const getInitials = (name) => {
    if (!name) return 'P';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const buildWhatsappUrl = (telefone) => {
    const digits = String(telefone || '').replace(/\D/g, '');
    if (!digits) return null;

    const phone = digits.length <= 11 ? `55${digits}` : digits;
    return `https://wa.me/${phone}?text=${encodeURIComponent(whatsappMessage)}`;
  };

  const handleWhatsappClick = () => {
    const whatsappUrl = buildWhatsappUrl(prestador?.telefone);

    if (!whatsappUrl) {
      toast.error('Telefone do prestador não disponível para WhatsApp');
      return;
    }

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Você precisa estar logado para solicitar um serviço');
      base44.auth.redirectToLogin();
      return;
    }

    if (!descricao.trim()) {
      toast.error('Por favor, descreva o serviço que você precisa');
      return;
    }

    setIsLoading(true);

    try {
      await base44.entities.Solicitacao.create({
        cliente_id: user.id,
        cliente_email: user.email,
        cliente_nome: user.full_name,
        prestador_id: prestador.id,
        prestador_email: prestador.user_email,
        prestador_nome: prestador.nome,
        categoria_nome: prestador.categoria_nome,
        descricao: descricao.trim(),
        preco_proposto: precoOferta ? Number(precoOferta) : null,
        status: 'aberto'
      });

      // Track service request event
      base44.analytics.track({
        eventName: 'service_request_created',
        properties: {
          categoria: prestador.categoria_nome,
          prestador_id: prestador.id,
          preco_proposto: precoOferta ? Number(precoOferta) : null,
          tem_oferta_customizada: !!precoOferta
        }
      });

      toast.success('Solicitação enviada com sucesso!');
      setDescricao('');
      setPrecoOferta('');
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao enviar solicitação. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!prestador) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar Serviço</DialogTitle>
        </DialogHeader>

        {/* Prestador Info */}
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
          <Avatar className="w-16 h-16">
            <AvatarImage src={prestador.foto} />
            <AvatarFallback className="bg-blue-100 text-blue-600 text-lg font-bold">
              {getInitials(prestador.nome)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900">{prestador.nome}</h3>
              {prestador.destaque && (
                <BadgeCheck className="w-5 h-5 text-blue-500" />
              )}
            </div>
            <p className="text-sm text-gray-500">{prestador.categoria_nome}</p>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="text-sm font-medium">{prestador.avaliacao?.toFixed(1) || '5.0'}</span>
              </div>
              {prestador.cidade && (
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <MapPin className="w-4 h-4" />
                  {prestador.cidade}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="descricao">Descreva o serviço que você precisa *</Label>
            <Textarea
              id="descricao"
              placeholder="Ex: Preciso de uma faxina completa em apartamento de 2 quartos..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="min-h-[100px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="preco">Sua oferta de preço (opcional)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
              <Input
                id="preco"
                type="number"
                placeholder={precoReferencia !== null ? precoReferencia.toFixed(2) : '0.00'}
                value={precoOferta}
                onChange={(e) => setPrecoOferta(e.target.value)}
                className="pl-10"
                min="0"
                step="0.01"
              />
            </div>
            <p className="text-xs text-gray-500">
              {precoReferencia !== null
                ? `Faixa inicial dos serviços cadastrados: R$ ${precoReferencia.toFixed(2)}`
                : 'Se preferir, deixe em branco e combine o valor com o prestador'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-green-600 text-green-700 hover:bg-green-50 hover:text-green-700"
              onClick={handleWhatsappClick}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Whatsapp
            </Button>
            <Button 
              type="submit" 
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Solicitação
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
