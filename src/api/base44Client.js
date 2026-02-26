import { apiRequest, tokenStorage } from '@/api/httpClient';

const createQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

const createEntityClient = (endpoint) => ({
  async list(sort) {
    const query = createQueryString({ sort });
    const response = await apiRequest(`/api/${endpoint}${query}`, { auth: true });
    return response.items;
  },
  async filter(filters = {}, sort) {
    const query = createQueryString({ ...filters, sort });
    const response = await apiRequest(`/api/${endpoint}${query}`, {
      auth: endpoint === 'solicitacoes' || endpoint === 'users',
    });
    return response.items;
  },
  async create(payload) {
    const response = await apiRequest(`/api/${endpoint}`, {
      method: 'POST',
      body: JSON.stringify(payload),
      auth: true,
    });

    return response.item;
  },
  async update(id, payload) {
    const response = await apiRequest(`/api/${endpoint}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      auth: true,
    });

    return response.item;
  },
  async delete(id) {
    await apiRequest(`/api/${endpoint}/${id}`, {
      method: 'DELETE',
      auth: true,
    });
  },
});

const auth = {
  async login(email, password) {
    const response = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    tokenStorage.set(response.token);
    return response.user;
  },
  async register(full_nameOrPayload, email, password) {
    const payload =
      typeof full_nameOrPayload === 'object' && full_nameOrPayload !== null
        ? full_nameOrPayload
        : { full_name: full_nameOrPayload, email, password };

    const response = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (response?.token) {
      tokenStorage.set(response.token);
    } else {
      tokenStorage.clear();
    }
    return response.user;
  },
  async me() {
    const response = await apiRequest('/api/auth/me', { auth: true });
    return response.user;
  },
  async updateMe(payload) {
    const response = await apiRequest('/api/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
      auth: true,
    });

    return response.user;
  },
  logout(redirectTo = null) {
    tokenStorage.clear();
    apiRequest('/api/auth/logout', {
      method: 'POST',
    }).catch(() => {
      // Sem estado no backend; limpar token é suficiente.
    });

    if (typeof window !== 'undefined' && redirectTo) {
      window.location.href = redirectTo;
    }
  },
  redirectToLogin(redirectTo) {
    if (typeof window === 'undefined') {
      return;
    }

    const target = redirectTo || window.location.href;
    const query = new URLSearchParams({ redirect: target });
    window.location.href = `/login?${query.toString()}`;
  },
};

const profile = {
  async getPrestador() {
    return apiRequest('/api/profile/prestador', { auth: true });
  },
  async savePrestador(payload) {
    return apiRequest('/api/profile/prestador', {
      method: 'PATCH',
      body: JSON.stringify(payload),
      auth: true,
    });
  },
};

const atividades = {
  async list(filters = {}, sort) {
    const query = createQueryString({ ...filters, sort });
    const response = await apiRequest(`/api/atividades${query}`, { auth: true });
    return response.items;
  },
  async create(payload) {
    const response = await apiRequest('/api/atividades', {
      method: 'POST',
      body: JSON.stringify(payload),
      auth: true,
    });
    return response.item;
  },
  async update(id, payload) {
    const response = await apiRequest(`/api/atividades/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      auth: true,
    });
    return response.item;
  },
  async delete(id) {
    await apiRequest(`/api/atividades/${id}`, { method: 'DELETE', auth: true });
  },
  async listAnexos(atividadeId) {
    const response = await apiRequest(`/api/atividades/${atividadeId}/anexos`, { auth: true });
    return response.items;
  },
  async uploadAnexo(atividadeId, file) {
    const form = new FormData();
    form.append('arquivo', file);
    const token = tokenStorage.get();
    const res = await fetch(`/api/atividades/${atividadeId}/anexos`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      const err = new Error(payload?.message || 'Erro no upload.');
      err.status = res.status;
      throw err;
    }
    return (await res.json()).item;
  },
  async deleteAnexo(anexoId) {
    await apiRequest(`/api/atividades/file/${anexoId}`, { method: 'DELETE', auth: true });
  },
  async downloadAnexo(anexoId) {
    const token = tokenStorage.get();
    const res = await fetch(`/api/atividades/file/${anexoId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Erro ao baixar arquivo.');
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },
};

const users = {
  async deleteUser(id) {
    await apiRequest(`/api/users/${id}`, { method: 'DELETE', auth: true });
  },
};

export const base44 = {
  auth,
  profile,
  atividades,
  users,
  entities: {
    Categoria: createEntityClient('categorias'),
    Prestador: createEntityClient('prestadores'),
    Solicitacao: createEntityClient('solicitacoes'),
    User: createEntityClient('users'),
  },
  analytics: {
    track() {
      return apiRequest('/api/events', {
        method: 'POST',
        body: JSON.stringify({ event: 'analytics' }),
      }).catch(() => null);
    },
  },
  appLogs: {
    logUserInApp(pageName) {
      return apiRequest('/api/events', {
        method: 'POST',
        body: JSON.stringify({ event: 'navigation', pageName }),
      }).catch(() => null);
    },
  },
};
