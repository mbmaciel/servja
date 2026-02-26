import React, { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Plus, Edit2, Trash2, ChevronDown, ChevronRight,
  Search, Loader2, ClipboardList, AlertCircle, CheckCircle2,
  Code2, Briefcase, FileText, Tag, CreditCard, User,
  LayoutDashboard, Shield, Bell, Package, KeyRound,
  Paperclip, Download, X, Upload, CheckSquare, Eye, FileImage,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

// ─── Configurações ────────────────────────────────────────────────────────────

const MODULOS = [
  { value: 'autenticacao',  label: 'Autenticação & Usuários', Icon: KeyRound,       color: 'text-purple-600' },
  { value: 'prestadores',   label: 'Prestadores',             Icon: Briefcase,      color: 'text-blue-600'   },
  { value: 'solicitacoes',  label: 'Solicitações',            Icon: FileText,       color: 'text-indigo-600' },
  { value: 'categorias',    label: 'Categorias',              Icon: Tag,            color: 'text-pink-600'   },
  { value: 'busca',         label: 'Busca & Filtros',         Icon: Search,         color: 'text-cyan-600'   },
  { value: 'pagamentos',    label: 'Pagamentos',              Icon: CreditCard,     color: 'text-emerald-600'},
  { value: 'perfil',        label: 'Perfil',                  Icon: User,           color: 'text-amber-600'  },
  { value: 'dashboard',     label: 'Dashboard',               Icon: LayoutDashboard,color: 'text-sky-600'    },
  { value: 'admin',         label: 'Painel Admin',            Icon: Shield,         color: 'text-red-600'    },
  { value: 'notificacoes',  label: 'Notificações',            Icon: Bell,           color: 'text-yellow-600' },
  { value: 'api',           label: 'API & Integrações',       Icon: Code2,          color: 'text-gray-600'   },
  { value: 'outros',        label: 'Outros / Geral',          Icon: Package,        color: 'text-stone-600'  },
];

const MODULO_MAP = Object.fromEntries(MODULOS.map((m) => [m.value, m]));

const STATUS_CONFIG = {
  pendente:          { label: 'Pendente',          cls: 'bg-gray-100 text-gray-700 border-gray-300'       },
  em_desenvolvimento:{ label: 'Em Desenvolvimento',cls: 'bg-blue-100 text-blue-700 border-blue-300'       },
  testando:          { label: 'Testando',           cls: 'bg-yellow-100 text-yellow-700 border-yellow-300'},
  atrasada:          { label: 'Atrasada',           cls: 'bg-orange-100 text-orange-700 border-orange-300'},
  concluido:         { label: 'Concluído',          cls: 'bg-green-100 text-green-700 border-green-300'  },
  cancelado:         { label: 'Cancelado',          cls: 'bg-red-100 text-red-700 border-red-300'        },
};

const PRIORIDADE_CONFIG = {
  baixa:   { label: 'Baixa',   badge: 'bg-green-100 text-green-700',  border: 'border-l-green-400'  },
  media:   { label: 'Média',   badge: 'bg-orange-100 text-orange-700',border: 'border-l-orange-400' },
  alta:    { label: 'Alta',    badge: 'bg-red-100 text-red-700',      border: 'border-l-red-500'    },
  urgente: { label: 'Urgente', badge: 'bg-red-200 text-red-800',      border: 'border-l-red-700'    },
};

const EMPTY_FORM = {
  titulo: '', descricao: '', modulo: 'outros', prioridade: 'media', status: 'pendente',
};

const formatBytes = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AtividadesTab() {
  const [atividades, setAtividades]       = useState([]);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [deletingId, setDeletingId]       = useState(null);
  const [filters, setFilters]             = useState({ q: '', modulo: '', status: '', prioridade: '' });
  const [showModal, setShowModal]         = useState(false);
  const [editingId, setEditingId]         = useState(null);
  const [formData, setFormData]           = useState(EMPTY_FORM);
  const [expandedModulos, setExpandedModulos] = useState(
    () => new Set(MODULOS.map((m) => m.value))
  );
  const [showCompleted, setShowCompleted] = useState(false);

  // Diálogo de resolução
  const [resolucaoDialog, setResolucaoDialog]       = useState({ open: false, atividadeId: null });
  const [resolucaoText, setResolucaoText]           = useState('');
  const [savingResolucao, setSavingResolucao]       = useState(false);
  const [resolucaoPendingFiles, setResolucaoPendingFiles] = useState([]);
  const resolucaoFileRef = useRef(null);

  // Modal de anexos
  const [anexosModal, setAnexosModal]   = useState({ open: false, atividade: null });
  const [anexos, setAnexos]             = useState([]);
  const [loadingAnexos, setLoadingAnexos]   = useState(false);
  const [uploadingAnexo, setUploadingAnexo] = useState(false);
  const fileInputRef = useRef(null);

  // Arquivos pendentes no modal de criação/edição
  const [pendingFiles, setPendingFiles] = useState([]);
  const modalFileRef = useRef(null);

  // Lightbox de imagem
  const [imagePreview, setImagePreview] = useState({ open: false, url: null, nome: null });
  const closeImagePreview = () => {
    if (imagePreview.url) URL.revokeObjectURL(imagePreview.url);
    setImagePreview({ open: false, url: null, nome: null });
  };

  // ── Carregamento ─────────────────────────────────────────────────────────────

  const loadAtividades = useCallback(async () => {
    setLoading(true);
    try {
      const items = await base44.atividades.list();
      setAtividades(items);
    } catch {
      toast.error('Erro ao carregar atividades.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAtividades(); }, [loadAtividades]);

  // ── Filtros ───────────────────────────────────────────────────────────────────

  // Atividades ativas (excluindo concluídas — vão para seção separada)
  const activeAtividades = atividades.filter((a) => a.status !== 'concluido');
  const completedAtividades = atividades.filter((a) => a.status === 'concluido');

  const filtered = activeAtividades.filter((a) => {
    if (filters.modulo    && a.modulo    !== filters.modulo)    return false;
    if (filters.status    && a.status    !== filters.status)    return false;
    if (filters.prioridade && a.prioridade !== filters.prioridade) return false;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      if (
        !a.titulo?.toLowerCase().includes(q) &&
        !a.descricao?.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const grouped = MODULOS
    .map((mod) => ({ ...mod, items: filtered.filter((a) => a.modulo === mod.value) }))
    .filter((g) => g.items.length > 0);

  // ── Stats ─────────────────────────────────────────────────────────────────────

  const stats = {
    total:              atividades.length,
    pendente:           atividades.filter((a) => a.status === 'pendente').length,
    em_desenvolvimento: atividades.filter((a) => a.status === 'em_desenvolvimento').length,
    concluido:          completedAtividades.length,
  };

  // ── Ações ─────────────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setPendingFiles([]);
    setShowModal(true);
  };

  const openEdit = (a) => {
    setEditingId(a.id);
    setFormData({
      titulo:    a.titulo    || '',
      descricao: a.descricao || '',
      modulo:    a.modulo    || 'outros',
      prioridade:a.prioridade|| 'media',
      status:    a.status    || 'pendente',
    });
    setPendingFiles([]);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.titulo.trim()) { toast.error('Título é obrigatório.'); return; }
    setSaving(true);
    try {
      if (editingId) {
        const updated = await base44.atividades.update(editingId, formData);
        if (pendingFiles.length > 0) {
          for (const file of pendingFiles) {
            await base44.atividades.uploadAnexo(editingId, file);
          }
          updated.anexos_count = (Number(updated.anexos_count) || 0) + pendingFiles.length;
        }
        setAtividades((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
        toast.success('Atividade atualizada!');
      } else {
        const created = await base44.atividades.create(formData);
        if (pendingFiles.length > 0) {
          for (const file of pendingFiles) {
            await base44.atividades.uploadAnexo(created.id, file);
          }
          created.anexos_count = pendingFiles.length;
        }
        setAtividades((prev) => [created, ...prev]);
        toast.success('Atividade criada com sucesso!');
      }
      setShowModal(false);
      setPendingFiles([]);
    } catch {
      toast.error('Erro ao salvar atividade.');
    } finally {
      setSaving(false);
    }
  };

  // Troca de status — intercepta "concluido" para pedir resolução
  const handleStatusChange = async (atividade, newStatus) => {
    if (newStatus === 'concluido' && atividade.status !== 'concluido') {
      setResolucaoText('');
      setResolucaoDialog({ open: true, atividadeId: atividade.id });
      return;
    }
    try {
      const updated = await base44.atividades.update(atividade.id, { status: newStatus });
      setAtividades((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      toast.success('Status atualizado.');
    } catch {
      toast.error('Erro ao atualizar status.');
    }
  };

  const handleConfirmResolucao = async () => {
    setSavingResolucao(true);
    try {
      const updated = await base44.atividades.update(resolucaoDialog.atividadeId, {
        status:    'concluido',
        resolucao: resolucaoText.trim() || null,
      });
      if (resolucaoPendingFiles.length > 0) {
        for (const file of resolucaoPendingFiles) {
          await base44.atividades.uploadAnexo(resolucaoDialog.atividadeId, file);
        }
        updated.anexos_count = (Number(updated.anexos_count) || 0) + resolucaoPendingFiles.length;
      }
      setAtividades((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setResolucaoDialog({ open: false, atividadeId: null });
      setResolucaoPendingFiles([]);
      toast.success('Atividade concluída!');
    } catch {
      toast.error('Erro ao concluir atividade.');
    } finally {
      setSavingResolucao(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await base44.atividades.delete(id);
      setAtividades((prev) => prev.filter((a) => a.id !== id));
      toast.success('Atividade removida.');
    } catch {
      toast.error('Erro ao remover atividade.');
    } finally {
      setDeletingId(null);
    }
  };

  const toggleModulo = (val) => {
    setExpandedModulos((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val); else next.add(val);
      return next;
    });
  };

  const setFilter = (key, val) => setFilters((f) => ({ ...f, [key]: val }));
  const clearFilters = () => setFilters({ q: '', modulo: '', status: '', prioridade: '' });
  const hasFilters = Object.values(filters).some(Boolean);

  // ── Anexos ────────────────────────────────────────────────────────────────────

  const openAnexos = async (atividade) => {
    setAnexosModal({ open: true, atividade });
    setAnexos([]);
    setLoadingAnexos(true);
    try {
      const items = await base44.atividades.listAnexos(atividade.id);
      setAnexos(items);
    } catch {
      toast.error('Erro ao carregar anexos.');
    } finally {
      setLoadingAnexos(false);
    }
  };

  const handleUploadAnexo = async (file) => {
    if (!file) return;
    setUploadingAnexo(true);
    try {
      const item = await base44.atividades.uploadAnexo(anexosModal.atividade.id, file);
      setAnexos((prev) => [...prev, item]);
      setAtividades((prev) =>
        prev.map((a) =>
          a.id === anexosModal.atividade.id
            ? { ...a, anexos_count: (Number(a.anexos_count) || 0) + 1 }
            : a
        )
      );
      toast.success('Arquivo enviado!');
    } catch (err) {
      toast.error(err.message || 'Erro no upload.');
    } finally {
      setUploadingAnexo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAnexo = async (anexoId) => {
    try {
      await base44.atividades.deleteAnexo(anexoId);
      setAnexos((prev) => prev.filter((a) => a.id !== anexoId));
      setAtividades((prev) =>
        prev.map((a) =>
          a.id === anexosModal.atividade?.id
            ? { ...a, anexos_count: Math.max(0, (Number(a.anexos_count) || 1) - 1) }
            : a
        )
      );
      toast.success('Arquivo removido.');
    } catch {
      toast.error('Erro ao remover arquivo.');
    }
  };

  const handleOpenFile = async (anexo) => {
    const isImage = anexo.mime_type?.startsWith('image/');
    try {
      const url = await base44.atividades.downloadAnexo(anexo.id);
      if (isImage) {
        setImagePreview({ open: true, url, nome: anexo.nome_original });
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = anexo.nome_original;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }
    } catch {
      toast.error('Erro ao abrir arquivo.');
    }
  };

  const handleDownloadFromPreview = () => {
    if (!imagePreview.url) return;
    const a = document.createElement('a');
    a.href = imagePreview.url;
    a.download = imagePreview.nome;
    a.click();
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Cards de resumo ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<ClipboardList className="w-7 h-7 text-gray-400" />}
          value={stats.total} label="Total" />
        <StatCard icon={<AlertCircle className="w-7 h-7 text-orange-400" />}
          value={stats.pendente} label="Pendentes" valueColor="text-orange-600" />
        <StatCard icon={<Code2 className="w-7 h-7 text-blue-400" />}
          value={stats.em_desenvolvimento} label="Em Desenvolvimento"
          valueColor="text-blue-600" cardCls="bg-blue-50" />
        <StatCard icon={<CheckCircle2 className="w-7 h-7 text-green-400" />}
          value={stats.concluido} label="Concluídas"
          valueColor="text-green-600" cardCls="bg-green-50" />
      </div>

      {/* ── Filtros e botão Nova ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar atividades..."
            value={filters.q}
            onChange={(e) => setFilter('q', e.target.value)}
            className="pl-9"
          />
        </div>

        <FilterSelect
          value={filters.modulo}
          placeholder="Módulo"
          onChange={(v) => setFilter('modulo', v)}
          options={MODULOS.map((m) => ({ value: m.value, label: m.label }))}
          all="Todos os módulos"
          className="w-44"
        />

        <FilterSelect
          value={filters.status}
          placeholder="Status"
          onChange={(v) => setFilter('status', v)}
          options={Object.entries(STATUS_CONFIG)
            .filter(([k]) => k !== 'concluido')
            .map(([k, v]) => ({ value: k, label: v.label }))}
          all="Todos os status"
          className="w-44"
        />

        <FilterSelect
          value={filters.prioridade}
          placeholder="Prioridade"
          onChange={(v) => setFilter('prioridade', v)}
          options={Object.entries(PRIORIDADE_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))}
          all="Todas"
          className="w-36"
        />

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-400 hover:text-gray-600">
            Limpar filtros
          </Button>
        )}

        <Button onClick={openCreate} className="ml-auto">
          <Plus className="w-4 h-4 mr-1" />
          Nova Atividade
        </Button>
      </div>

      {/* ── Lista vazia ───────────────────────────────────────────────────────── */}
      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-gray-400">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-gray-600">Nenhuma atividade encontrada</p>
            <p className="text-sm mt-1">
              {hasFilters
                ? 'Tente ajustar os filtros de busca.'
                : 'Clique em "Nova Atividade" para registrar a primeira ideia.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Grupos por módulo ─────────────────────────────────────────────────── */}
      {grouped.map(({ value: modVal, label: modLabel, Icon, color, items }) => {
        const isExpanded = expandedModulos.has(modVal);
        return (
          <Card key={modVal} className="overflow-hidden">
            <button
              onClick={() => toggleModulo(modVal)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100"
            >
              {isExpanded
                ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
              <Icon className={`w-5 h-5 shrink-0 ${color}`} />
              <span className="font-semibold text-gray-800">{modLabel}</span>
              <Badge variant="secondary" className="ml-auto text-xs">{items.length}</Badge>
            </button>

            {isExpanded && (
              <CardContent className="p-3 space-y-2">
                {items.map((atividade) => (
                  <AtividadeCard
                    key={atividade.id}
                    atividade={atividade}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onStatusChange={handleStatusChange}
                    onOpenAnexos={openAnexos}
                    deletingId={deletingId}
                  />
                ))}
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* ── Seção de atividades concluídas ───────────────────────────────────── */}
      {completedAtividades.length > 0 && (
        <Card className="overflow-hidden border-green-200">
          <button
            onClick={() => setShowCompleted((v) => !v)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-green-50 transition-colors text-left border-b border-green-100 bg-green-50"
          >
            {showCompleted
              ? <ChevronDown className="w-4 h-4 text-green-500 shrink-0" />
              : <ChevronRight className="w-4 h-4 text-green-500 shrink-0" />}
            <CheckSquare className="w-5 h-5 shrink-0 text-green-600" />
            <span className="font-semibold text-green-800">Atividades Concluídas</span>
            <Badge className="ml-auto text-xs bg-green-100 text-green-700 border-green-300">
              {completedAtividades.length}
            </Badge>
          </button>

          {showCompleted && (
            <CardContent className="p-3 space-y-2">
              {completedAtividades.map((atividade) => {
                const pCfg = PRIORIDADE_CONFIG[atividade.prioridade] ?? PRIORIDADE_CONFIG.media;
                const mod  = MODULO_MAP[atividade.modulo];
                return (
                  <div
                    key={atividade.id}
                    className={`flex gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100 border-l-4 border-l-green-400 shadow-sm opacity-80`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 flex-wrap">
                        <p className="font-medium text-sm text-gray-700 flex-1 leading-snug line-through decoration-gray-400">
                          {atividade.titulo}
                        </p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pCfg.badge}`}>
                          {pCfg.label}
                        </span>
                      </div>

                      {atividade.resolucao && (
                        <div className="mt-2 text-xs text-gray-600 bg-white rounded border border-gray-200 px-2 py-1.5">
                          <span className="font-semibold text-green-700">Resolução: </span>
                          {atividade.resolucao}
                        </div>
                      )}

                      <div className="flex items-center gap-1 mt-2">
                        <span className="text-xs text-gray-400 mr-0.5">Retornar para:</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs px-2 py-0 text-gray-600 hover:bg-gray-100"
                          onClick={() => handleStatusChange(atividade, 'pendente')}
                        >
                          Pendente
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs px-2 py-0 text-orange-600 border-orange-200 hover:bg-orange-50"
                          onClick={() => handleStatusChange(atividade, 'atrasada')}
                        >
                          Atrasada
                        </Button>
                      </div>

                      <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-gray-400">
                        {mod && (
                          <span className={`flex items-center gap-1 ${mod.color}`}>
                            <mod.Icon className="w-3 h-3" />
                            {mod.label}
                          </span>
                        )}
                        {atividade.completed_at && (
                          <span className="text-green-600">
                            Concluído em {new Date(atividade.completed_at).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                        {atividade.criado_por_nome && (
                          <span>{atividade.criado_por_nome}</span>
                        )}
                        <button
                          onClick={() => openAnexos(atividade)}
                          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                          title="Ver anexos"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          {Number(atividade.anexos_count) > 0 && (
                            <span className="font-medium">{atividade.anexos_count}</span>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 shrink-0">
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => handleDelete(atividade.id)}
                        disabled={deletingId === atividade.id}
                        title="Remover"
                      >
                        {deletingId === atividade.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5 text-red-300" />}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          )}
        </Card>
      )}

      {/* ── Modal criar / editar ─────────────────────────────────────────────── */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar Atividade' : 'Nova Atividade'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div>
              <Label htmlFor="at-titulo">Título *</Label>
              <Input
                id="at-titulo"
                placeholder="O que você gostaria que o sistema fizesse?"
                value={formData.titulo}
                onChange={(e) => setFormData((f) => ({ ...f, titulo: e.target.value }))}
                className="mt-1"
                autoFocus
              />
            </div>

            <div>
              <Label htmlFor="at-descricao">Descrição</Label>
              <Textarea
                id="at-descricao"
                placeholder="Descreva com mais detalhes como deveria funcionar, exemplos de uso, etc..."
                value={formData.descricao}
                onChange={(e) => setFormData((f) => ({ ...f, descricao: e.target.value }))}
                className="mt-1 min-h-[90px] resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Módulo do sistema</Label>
                <Select
                  value={formData.modulo}
                  onValueChange={(v) => setFormData((f) => ({ ...f, modulo: v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULOS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Prioridade</Label>
                <Select
                  value={formData.prioridade}
                  onValueChange={(v) => setFormData((f) => ({ ...f, prioridade: v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORIDADE_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {editingId && (
              <div>
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData((f) => ({ ...f, status: v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* ── Anexos no modal ─────────────────────────────────────────── */}
            <div>
              <Label>Anexos (opcional)</Label>
              <div
                className="mt-1 border-2 border-dashed border-gray-200 rounded-lg px-3 py-2 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                onClick={() => modalFileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const dropped = Array.from(e.dataTransfer.files);
                  setPendingFiles((prev) => [...prev, ...dropped]);
                }}
              >
                <Paperclip className="w-4 h-4 inline mr-1 text-gray-400" />
                <span className="text-sm text-gray-400">
                  {pendingFiles.length > 0
                    ? `${pendingFiles.length} arquivo(s) selecionado(s) — clique para adicionar mais`
                    : 'Clique ou arraste arquivos para anexar'}
                </span>
                <input
                  ref={modalFileRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setPendingFiles((prev) => [...prev, ...files]);
                    e.target.value = '';
                  }}
                />
              </div>

              {pendingFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  {pendingFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs bg-gray-50 rounded px-2 py-1 border border-gray-100">
                      <Paperclip className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="flex-1 truncate text-gray-700">{f.name}</span>
                      <span className="text-gray-400 shrink-0">{formatBytes(f.size)}</span>
                      <button
                        onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                        className="text-red-400 hover:text-red-600 shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setShowModal(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {editingId ? 'Salvar Alterações' : 'Criar Atividade'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Diálogo de resolução (ao concluir) ──────────────────────────────── */}
      <Dialog open={resolucaoDialog.open} onOpenChange={(o) => { if (!o) { setResolucaoDialog({ open: false, atividadeId: null }); setResolucaoPendingFiles([]); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Concluir Atividade
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <div>
              <Label htmlFor="resolucao-text">Comentário de resolução</Label>
              <Textarea
                id="resolucao-text"
                placeholder="Descreva o que foi feito, como o problema foi resolvido, ou qualquer informação relevante..."
                value={resolucaoText}
                onChange={(e) => setResolucaoText(e.target.value)}
                className="mt-1 min-h-[100px] resize-none"
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1">Opcional — mas ajuda a manter histórico do que foi desenvolvido.</p>
            </div>

            <div>
              <Label>Fotos da conclusão (opcional)</Label>
              <div
                className="mt-1 border-2 border-dashed border-gray-200 rounded-lg px-3 py-2 text-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors"
                onClick={() => resolucaoFileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const dropped = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
                  setResolucaoPendingFiles((prev) => [...prev, ...dropped]);
                }}
              >
                <FileImage className="w-4 h-4 inline mr-1 text-gray-400" />
                <span className="text-sm text-gray-400">
                  {resolucaoPendingFiles.length > 0
                    ? `${resolucaoPendingFiles.length} foto(s) selecionada(s) — clique para adicionar mais`
                    : 'Clique ou arraste fotos para anexar'}
                </span>
                <input
                  ref={resolucaoFileRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setResolucaoPendingFiles((prev) => [...prev, ...files]);
                    e.target.value = '';
                  }}
                />
              </div>
              {resolucaoPendingFiles.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {resolucaoPendingFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-1 text-xs bg-green-50 rounded px-2 py-1 border border-green-100">
                      <FileImage className="w-3 h-3 text-green-500 shrink-0" />
                      <span className="truncate max-w-[110px] text-gray-700">{f.name}</span>
                      <button
                        onClick={() => setResolucaoPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                        className="text-red-400 hover:text-red-600 shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              variant="outline"
              onClick={() => setResolucaoDialog({ open: false, atividadeId: null })}
              disabled={savingResolucao}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmResolucao}
              disabled={savingResolucao}
              className="bg-green-600 hover:bg-green-700"
            >
              {savingResolucao && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Confirmar Conclusão
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal de anexos ──────────────────────────────────────────────────── */}
      <Dialog open={anexosModal.open} onOpenChange={(o) => !o && setAnexosModal({ open: false, atividade: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="w-5 h-5 text-gray-600" />
              Anexos — {anexosModal.atividade?.titulo}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-1">
            {/* Área de upload */}
            <div
              className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) handleUploadAnexo(file);
              }}
            >
              {uploadingAnexo
                ? <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
                : <Upload className="w-6 h-6 text-gray-400 mx-auto" />}
              <p className="text-sm text-gray-500 mt-1">
                {uploadingAnexo ? 'Enviando...' : 'Clique ou arraste um arquivo (máx. 10 MB)'}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadAnexo(file);
                }}
              />
            </div>

            {/* Lista de anexos */}
            {loadingAnexos ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : anexos.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-4">Nenhum anexo ainda.</p>
            ) : (
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {anexos.map((a) => {
                  const isImage = a.mime_type?.startsWith('image/');
                  return isImage ? (
                    // ── Item de imagem — clicável para preview ────────────────
                    <div
                      key={a.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors"
                      onClick={() => handleOpenFile(a)}
                    >
                      <FileImage className="w-4 h-4 text-blue-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-blue-700 truncate font-medium">{a.nome_original}</p>
                        <p className="text-xs text-blue-400">
                          {formatBytes(a.tamanho)}
                          {a.created_at && ` · ${new Date(a.created_at).toLocaleDateString('pt-BR')}`}
                        </p>
                      </div>
                      <Eye className="w-4 h-4 text-blue-400 shrink-0" />
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                        onClick={(e) => { e.stopPropagation(); handleDeleteAnexo(a.id); }}
                        title="Remover"
                      >
                        <X className="w-3.5 h-3.5 text-red-400" />
                      </Button>
                    </div>
                  ) : (
                    // ── Item de arquivo comum ─────────────────────────────────
                    <div
                      key={a.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100"
                    >
                      <Paperclip className="w-4 h-4 text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate">{a.nome_original}</p>
                        <p className="text-xs text-gray-400">
                          {formatBytes(a.tamanho)}
                          {a.created_at && ` · ${new Date(a.created_at).toLocaleDateString('pt-BR')}`}
                        </p>
                      </div>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                        onClick={() => handleOpenFile(a)}
                        title="Baixar"
                      >
                        <Download className="w-3.5 h-3.5 text-blue-500" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                        onClick={() => handleDeleteAnexo(a.id)}
                        title="Remover"
                      >
                        <X className="w-3.5 h-3.5 text-red-400" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2 border-t">
            <Button variant="outline" onClick={() => setAnexosModal({ open: false, atividade: null })}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* ── Lightbox de imagem ───────────────────────────────────────────────── */}
      <Dialog open={imagePreview.open} onOpenChange={(o) => !o && closeImagePreview()}>
        <DialogContent className="max-w-[92vw] max-h-[92vh] p-0 overflow-hidden bg-black/95 border-none">
          {/* Barra superior */}
          <div className="flex items-center justify-between px-4 py-2 bg-black/60">
            <span className="text-white text-sm font-medium truncate max-w-[70%]">
              {imagePreview.nome}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost" size="sm"
                className="text-white hover:bg-white/20 h-8"
                onClick={handleDownloadFromPreview}
                title="Baixar"
              >
                <Download className="w-4 h-4 mr-1" />
                Baixar
              </Button>
              <Button
                variant="ghost" size="icon"
                className="text-white hover:bg-white/20 h-8 w-8"
                onClick={closeImagePreview}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Imagem */}
          <div className="flex items-center justify-center p-4" style={{ maxHeight: 'calc(92vh - 52px)' }}>
            {imagePreview.url && (
              <img
                src={imagePreview.url}
                alt={imagePreview.nome}
                className="max-w-full max-h-full object-contain rounded"
                style={{ maxHeight: 'calc(92vh - 80px)' }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Cartão de atividade ──────────────────────────────────────────────────────

function AtividadeCard({ atividade, onEdit, onDelete, onStatusChange, onOpenAnexos, deletingId }) {
  const pCfg = PRIORIDADE_CONFIG[atividade.prioridade] ?? PRIORIDADE_CONFIG.media;
  const sCfg = STATUS_CONFIG[atividade.status]         ?? STATUS_CONFIG.pendente;
  const anexosCount = Number(atividade.anexos_count) || 0;

  return (
    <div className={`flex gap-3 p-3 rounded-lg bg-white border border-gray-100 border-l-4 ${pCfg.border} shadow-sm`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <p className="font-medium text-sm text-gray-800 flex-1 leading-snug">
            {atividade.titulo}
          </p>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pCfg.badge}`}>
            {pCfg.label}
          </span>
        </div>

        {atividade.descricao && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            {atividade.descricao}
          </p>
        )}

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Select
            value={atividade.status}
            onValueChange={(v) => onStatusChange(atividade, v)}
          >
            <SelectTrigger className={`h-6 text-xs w-fit px-2 border ${sCfg.cls}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {atividade.criado_por_nome && (
            <span className="text-xs text-gray-400">{atividade.criado_por_nome}</span>
          )}
          {atividade.created_at && (
            <span className="text-xs text-gray-400">
              {new Date(atividade.created_at).toLocaleDateString('pt-BR')}
            </span>
          )}

          {/* Botão de anexos */}
          <button
            onClick={() => onOpenAnexos(atividade)}
            className={`flex items-center gap-1 text-xs transition-colors ml-1 ${
              anexosCount > 0 ? 'text-blue-500 hover:text-blue-700' : 'text-gray-300 hover:text-gray-500'
            }`}
            title="Anexos"
          >
            <Paperclip className="w-3.5 h-3.5" />
            {anexosCount > 0 && <span className="font-medium">{anexosCount}</span>}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1 shrink-0">
        <Button
          variant="ghost" size="icon" className="h-7 w-7"
          onClick={() => onEdit(atividade)}
          title="Editar"
        >
          <Edit2 className="w-3.5 h-3.5 text-gray-400" />
        </Button>
        <Button
          variant="ghost" size="icon" className="h-7 w-7"
          onClick={() => onDelete(atividade.id)}
          disabled={deletingId === atividade.id}
          title="Remover"
        >
          {deletingId === atividade.id
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Trash2 className="w-3.5 h-3.5 text-red-400" />}
        </Button>
      </div>
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function StatCard({ icon, value, label, valueColor = 'text-gray-800', cardCls = 'bg-gray-50' }) {
  return (
    <Card className={cardCls}>
      <CardContent className="p-4 flex items-center gap-3">
        {icon}
        <div>
          <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function FilterSelect({ value, placeholder, onChange, options, all, className }) {
  return (
    <Select value={value || '__all__'} onValueChange={(v) => onChange(v === '__all__' ? '' : v)}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">{all}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
