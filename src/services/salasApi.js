import { http } from './http';
import { socket } from './socket';
import { destinos } from '../config';


export const listarSalas = () => http.get('/api/salas');
export const detalleSala = (salaId) => http.get(`/api/salas/${salaId}`);

/** Acepta crearSala*/
export const crearSala = (nombreOData, anfitrionId) => {
  const datos = typeof nombreOData === 'object'
    ? { nombre: nombreOData.nombre, anfitrionId: nombreOData.anfitrionId ?? anfitrionId }
    : { nombre: nombreOData, anfitrionId };
  return http.post('/api/salas', datos);
};

/** Solo el anfitrión.*/
export const configurarSala = (salaId, solicitanteId, numEquipos, jugadoresPorEquipo) =>
  http.patch(`/api/salas/${salaId}/configuracion`, { solicitanteId, numEquipos, jugadoresPorEquipo });

export const unirseASala = (salaId, userId) => http.post(`/api/salas/${salaId}/jugadores`, { userId });

export const listarEquipos = (salaId) => http.get(`/api/salas/${salaId}/equipos`);

export const unirseAEquipo = (equipoId, userId) => http.post(`/api/equipos/${equipoId}/miembros`, { userId });

export const marcarListo = (salaId, userId) => http.post(`/api/salas/${salaId}/listo`, { userId });
export const desmarcarListo = (salaId, userId) => http.del(`/api/salas/${salaId}/listo`, { userId });

// Alias por si alguna pantalla usa los otros nombres
export const unirseSala = unirseASala;
export const unirseEquipo = unirseAEquipo;

export const salasApi = {
  listar: listarSalas,
  detalle: detalleSala,
  crear: crearSala,
  configurar: configurarSala,
  unirse: unirseASala,
  equipos: listarEquipos,
  unirseEquipo: unirseAEquipo,
  marcarListo,
  desmarcarListo,
};

/** Salir del lobby (VOLVER): si es el anfitrión, el back cierra la sala y avisa a los demás. */
export const salirDeSala = (salaId, userId) => http.del(`/api/salas/${salaId}/jugadores/${userId}`);

/** Avisa al back que este jugador está en el lobby con esta conexión (se usa para detectar que cerró la página). */
export const registrarSesionSala = (salaId, userId) => socket.enviar(destinos.registrarSesionSala(salaId, userId));
