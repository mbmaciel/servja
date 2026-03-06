/**
 * Utilitários compartilhados para dados de prestadores.
 * Evita duplicação em PrestadorCard, SolicitarModal, MapaPrestadores, Layout, Perfil, Buscar.
 */

/**
 * Retorna as iniciais de um nome (máx 2 letras maiúsculas).
 */
export const getInitials = (name, fallback = 'U') => {
  if (!name) return fallback;
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Retorna o menor preço disponível de um prestador.
 * Verifica servicos[] primeiro, depois preco_base e valor_hora.
 * Retorna null se nenhum preço disponível.
 */
export const getPrecoInicial = (prestador) => {
  let servicos = prestador?.servicos;
  if (typeof servicos === 'string') {
    try { servicos = JSON.parse(servicos); } catch { servicos = []; }
  }

  if (Array.isArray(servicos) && servicos.length > 0) {
    const precos = servicos
      .map((s) => Number(s?.preco))
      .filter((p) => Number.isFinite(p) && p >= 0);
    if (precos.length > 0) return Math.min(...precos);
  }

  if (typeof prestador?.preco_base === 'number' && prestador.preco_base > 0) {
    return prestador.preco_base;
  }

  if (typeof prestador?.valor_hora === 'number' && prestador.valor_hora > 0) {
    return prestador.valor_hora;
  }

  return null;
};

/**
 * Normaliza fotos_trabalhos de um prestador (JSON string ou array) → string[].
 */
export const getFotosTrabalhos = (prestador) => {
  const ft = prestador?.fotos_trabalhos;
  if (Array.isArray(ft)) return ft.filter(Boolean);
  if (typeof ft === 'string') {
    try { return JSON.parse(ft).filter(Boolean); } catch { return []; }
  }
  return [];
};

/**
 * Constrói URL de WhatsApp com mensagem padrão.
 */
export const buildWhatsappUrl = (telefone, message = 'Olá! Vi seu perfil no SeviJa e gostaria de mais informações.') => {
  const digits = String(telefone || '').replace(/\D/g, '');
  if (!digits) return null;
  const phone = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};
