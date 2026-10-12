import { http } from './http';
import { Sesion } from './sesion';

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