import { config } from '../config';

export class ApiError extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
  get esConflicto() { return this.status === 409; }
  get esProhibido() { return this.status === 403; }
  get esNoEncontrado() { return this.status === 404; }
  get sinConexion() { return this.status === 0; }
}

async function request(method, path, { body, query } = {}) {
  const qs = query ? '?' + new URLSearchParams(query).toString() : '';
  let res;
  try {
    res = await fetch(`${config.apiUrl}${path}${qs}`, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor');
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error || `Error ${res.status}`);
  return data;
}

export const http = {
  get: (p, query) => request('GET', p, { query }),
  post: (p, body, query) => request('POST', p, { body, query }),
  patch: (p, body) => request('PATCH', p, { body }),
  del: (p, query) => request('DELETE', p, { query }),
};