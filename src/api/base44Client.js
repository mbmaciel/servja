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

export const base44 = {
  auth,
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
