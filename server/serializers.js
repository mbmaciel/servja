const toIsoIfDate = (value) => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
};

const BOOLEAN_FIELDS = new Set(['ativo', 'destaque']);

export const serializeRow = (row) => {
  if (!row || typeof row !== 'object') {
    return row;
  }

  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      if ((key === 'fotos_trabalhos' || key === 'servicos') && typeof value === 'string') {
        try {
          return [key, JSON.parse(value)];
        } catch {
          return [key, []];
        }
      }

      if (BOOLEAN_FIELDS.has(key) && typeof value === 'number') {
        return [key, value === 1];
      }

      return [key, toIsoIfDate(value)];
    })
  );
};

export const serializeRows = (rows) => rows.map(serializeRow);

export const toPublicUser = (userRow) => {
  if (!userRow) {
    return null;
  }

  const serialized = serializeRow(userRow);
  const { password_hash, ...user } = serialized;

  return {
    ...user,
    role: user.tipo === 'admin' ? 'admin' : 'user',
  };
};
