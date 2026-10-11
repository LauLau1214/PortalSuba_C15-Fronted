import { http } from './http';
import { Sesion } from './sesion';

// Los nombres no cambian durante la sesión: se piden una vez por id y se guardan aquí.
const cache = new Map();
const pendientes = new Map(); // id -> petición en curso (la comparten las pantallas que piden lo mismo)

const corto = (id) => String(id).slice(0, 4).toUpperCase();

/**
 * GET /api/usuarios?ids=a,b,c -> [{ userId, username }]. Solo pide los ids que no conoce.
 * Resuelve true si hubo que esperar nombres (hay que repintar).
 */
export function cargarNombres(ids) {
  const unicos = [...new Set(ids)].filter(Boolean);
  const nuevos = unicos.filter((id) => !cache.has(id) && !pendientes.has(id));
  if (nuevos.length) {
    const peticion = http.get('/api/usuarios', { ids: nuevos.join(',') })
      .then((usuarios) => (usuarios ?? []).forEach((u) => cache.set(u.userId, u.username)))
      .catch(() => {}) // se queda el nombre de respaldo; se reintenta cuando cambien los ids
      .finally(() => nuevos.forEach((id) => pendientes.delete(id)));
    nuevos.forEach((id) => pendientes.set(id, peticion));
  }
  const esperando = [...new Set(unicos.map((id) => pendientes.get(id)).filter(Boolean))];
  return esperando.length ? Promise.all(esperando).then(() => true) : Promise.resolve(false);
}

/** Nombre para mostrar. Mientras no llegue el real: JUGADOR XXXX. */
export function nombreDe(id) {
  if (!id) return '';
  if (id === Sesion.userId && Sesion.username) return Sesion.username;
  return cache.get(id) ?? `JUGADOR ${corto(id)}`;
}
