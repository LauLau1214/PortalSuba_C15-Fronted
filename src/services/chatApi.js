import { http } from './http';

// Chat de la sala de espera: solo funciona mientras la partida no ha iniciado (si no, 409).
// Los mensajes nuevos llegan por STOMP en topics.chat(salaId).

/** GET -> [{ id, salaId, userId, texto, enviadoEn }] del más viejo al más nuevo. */
export const historialChat = (salaId, userId) => http.get(`/api/salas/${salaId}/chat`, { userId });

export const enviarMensajeChat = (salaId, userId, texto) =>
  http.post(`/api/salas/${salaId}/chat`, { userId, texto });

export const MAX_LONGITUD_MENSAJE = 200;
