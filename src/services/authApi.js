import { http } from './http';
import { Sesion } from './sesion';

/** POST /api/auth/login -> { userId, username }. 400 nombre inválido, 409 en uso. */
export async function login(username) {
  const sesion = await http.post('/api/auth/login', { username: username.trim() });
  Sesion.iniciar(sesion);
  return sesion;
}

export function sesionActual() {
  return Sesion.userId ? { userId: Sesion.userId, username: Sesion.username } : null;
}

export function logout() {
  Sesion.limpiar();
}

export const authApi = { login, sesionActual, logout };