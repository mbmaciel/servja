const TOKEN_KEY = 'servija_token';

export const tokenStorage = {
  get() {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.localStorage.getItem(TOKEN_KEY);
  },
  set(token) {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(TOKEN_KEY, token);
  },
  clear() {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.removeItem(TOKEN_KEY);
  },
};

const parseErrorPayload = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const apiRequest = async (path, options = {}) => {
  const { auth = false, headers = {}, ...rest } = options;
  const token = tokenStorage.get();

  const response = await fetch(path, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const payload = await parseErrorPayload(response);
    const error = new Error(payload?.message || 'Erro de requisição.');
    error.status = response.status;
    error.data = payload;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
};
