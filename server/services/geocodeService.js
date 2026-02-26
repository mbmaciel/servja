/**
 * Serviço de geocodificação usando Nominatim (OpenStreetMap).
 * Gratuito, sem chave de API. Limite: 1 req/s.
 */

/**
 * Converte endereço/CEP em coordenadas geográficas.
 * Retorna { latitude, longitude } ou null se falhar.
 * @param {{ rua?: string, bairro?: string, cidade?: string, estado?: string, cep?: string }} params
 */
export async function geocodeByCep({ rua, bairro, cidade, estado, cep } = {}) {
  const parts = [rua, bairro, cidade, estado, cep, 'Brasil'].filter(Boolean);
  if (parts.length < 2) return null;

  const query = parts.join(', ');
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'br');

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'ServiJa-App/1.0 (admin@servija.com)',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const result = data[0];
    const latitude = parseFloat(result.lat);
    const longitude = parseFloat(result.lon);

    if (isNaN(latitude) || isNaN(longitude)) return null;

    return { latitude, longitude };
  } catch {
    return null;
  }
}
