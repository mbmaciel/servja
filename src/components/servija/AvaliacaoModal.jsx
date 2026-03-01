import { useState, useRef } from 'react';
import { Star, X, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';

const MAX_FOTOS = 5;

function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none"
          aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
        >
          <Star
            className={`w-9 h-9 transition-colors ${
              n <= active
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function AvaliacaoModal({ solicitacao, onSuccess, onClose }) {
  const [estrelas, setEstrelas] = useState(0);
  const [comentario, setComentario] = useState('');
  const [fotos, setFotos] = useState([]);       // { file, preview }[]
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    const restantes = MAX_FOTOS - fotos.length;
    const novas = selected.slice(0, restantes).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    if (novas.length < selected.length) {
      toast.warning(`Máximo de ${MAX_FOTOS} fotos permitidas.`);
    }
    setFotos((prev) => [...prev, ...novas]);
    e.target.value = '';
  };

  const removerFoto = (index) => {
    setFotos((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async () => {
    if (estrelas === 0) {
      toast.error('Selecione uma nota em estrelas.');
      return;
    }

    setIsSubmitting(true);
    try {
      const avaliacao = await base44.avaliacoes.create({
        solicitacao_id: solicitacao.id,
        estrelas,
        comentario: comentario.trim() || undefined,
      });

      for (const { file } of fotos) {
        try {
          await base44.avaliacoes.uploadFoto(avaliacao.id, file);
        } catch {
          toast.warning('Uma ou mais fotos não puderam ser enviadas.');
        }
      }

      toast.success('Avaliação enviada! Obrigado pelo seu feedback.');
      onSuccess();
    } catch (err) {
      toast.error(err?.message || 'Erro ao enviar avaliação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const labelEstrelas = ['', 'Ruim', 'Regular', 'Bom', 'Muito bom', 'Excelente'];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Avalie o atendimento de {solicitacao.prestador_nome}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Estrelas */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Nota *</p>
            <StarRating value={estrelas} onChange={setEstrelas} />
            {estrelas > 0 && (
              <p className="text-sm text-yellow-600 font-medium">{labelEstrelas[estrelas]}</p>
            )}
          </div>

          {/* Comentário */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Comentário (opcional)</p>
            <Textarea
              placeholder="Como foi o atendimento? O serviço foi realizado conforme o combinado?"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={3}
              maxLength={1000}
            />
          </div>

          {/* Fotos */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              Fotos do serviço (opcional — máx. {MAX_FOTOS})
            </p>

            {fotos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {fotos.map(({ preview }, i) => (
                  <div key={i} className="relative aspect-square rounded-md overflow-hidden border">
                    <img src={preview} alt={`foto ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removerFoto(i)}
                      className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {fotos.length < MAX_FOTOS && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Adicionar fotos
                </Button>
              </>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Agora não
          </Button>
          <Button onClick={handleSubmit} disabled={estrelas === 0 || isSubmitting} className="gap-2">
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Enviar Avaliação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
