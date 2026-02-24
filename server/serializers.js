const toIsoIfDate = (value) => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
};

const BOOLEAN_FIELDS = new Set(['ativo', 'destaque']);
const DATE_ONLY_FIELDS = new Set(['data_nascimento']);

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

      if (DATE_ONLY_FIELDS.has(key)) {
        if (value instanceof Date) {
          return [key, value.toISOString().slice(0, 10)];
        }

        if (typeof value === 'string') {
          const datePrefixMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
          if (datePrefixMatch?.[1]) {
            return [key, datePrefixMatch[1]];
          }
        }
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
