import { http } from './http';
import { socket } from './socket';
import { destinos } from '../config';

const p = (m) => `/api/partidas/${m}`;

export const gameplayApi = {
  // --- sesión en tiempo real (necesaria para detectar desconexión) ---
  registrarSesion: (m, userId) => socket.enviar(destinos.registrarSesion(m, userId)),
  salir: (m, userId) => http.del(`${p(m)}/jugadores/${userId}`),

  // --- mapa y movimiento ---
  mapa: (m) => http.get(`${p(m)}/mapa`),
  mover: (m, userId, x, y) => http.post(`${p(m)}/jugadores/${userId}/movimiento`, { x, y }),
  posiciones: (m, equipoId, userId) => http.get(`${p(m)}/equipos/${equipoId}/posiciones`, { userId }),

  // --- roles ---
  miRol: (m, userId) => http.get(`${p(m)}/jugadores/${userId}/rol`),
  rolesEquipo: (m, equipoId) => http.get(`${p(m)}/equipos/${equipoId}/roles`),

  // --- inventario ---
  inventario: (m, equipoId, userId) => http.get(`${p(m)}/equipos/${equipoId}/inventario`, { userId }),
  recolectar: (m, componenteId, userId) => http.post(`${p(m)}/objetos/${componenteId}/recoleccion`, { userId }),

  // --- acertijos ---
  abrirAcertijo: (m, c, userId) => http.post(`${p(m)}/acertijos/${c}/bloqueo`, { userId }),
  cerrarAcertijo: (m, c, userId) => http.del(`${p(m)}/acertijos/${c}/bloqueo`, { userId }),
  clickAcertijo: (m, c, userId, elementoId, valor) =>
    http.post(`${p(m)}/acertijos/${c}/clicks`, { userId, elementoId, valor }),
  entradaAcertijo: (m, c, userId) => http.get(`${p(m)}/acertijos/${c}/clicks`, { userId }),
  reiniciarAcertijo: (m, c, userId) => http.del(`${p(m)}/acertijos/${c}/clicks`, { userId }),
  enviarSolucion: (m, c, userId, respuesta) =>
    http.post(`${p(m)}/acertijos/${c}/solucion`, { userId, respuesta }),

  // --- progreso, cronómetro y resultado ---
  progreso: (m) => http.get(`${p(m)}/progreso`),
  timer: (m) => http.get(`${p(m)}/cronometro`),
  resultado: (m) => http.get(`${p(m)}/resultado`),

  // --- reto Héroe vs Verdugo ---
  estadoReto: (m) => http.get(`${p(m)}/reto`),
  clickReto: (m, userId) => http.post(`${p(m)}/reto/clicks`, { userId }),

  // --- solo desarrollo ---
  devIniciarTimer: (m, segundos = 60) => http.post(`/dev/partidas/${m}/inicio`, undefined, { segundos }),
  devIniciarReto: (m) => http.post(`/dev/partidas/${m}/reto/inicio`),
};