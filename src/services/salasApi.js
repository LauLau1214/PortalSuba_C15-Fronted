import { http } from './http';


export const listarSalas = () => http.get('/api/salas');
/** 409 si la partida ya inició (la sala ya no está abierta). */
export const detalleSala = (salaId) => http.get(`/api/salas/${salaId}`);

/** Acepta crearSala(nombre, anfitrionId) o crearSala({ nombre, anfitrionId }). */
export const crearSala = (nombreOData, anfitrionId) => {
  const datos = typeof nombreOData === 'object'
    ? { nombre: nombreOData.nombre, anfitrionId: nombreOData.anfitrionId ?? anfitrionId }
    : { nombre: nombreOData, anfitrionId };
  return http.post('/api/salas', datos);
};

/** Solo el anfitrión. 403 si no lo es o ya inició; 400 config inválida. */
export const configurarSala = (salaId, solicitanteId, numEquipos, jugadoresPorEquipo) =>
  http.patch(`/api/salas/${salaId}/configuracion`, { solicitanteId, numEquipos, jugadoresPorEquipo });

/** 409 sala llena, 403 partida iniciada. */
export const unirseASala = (salaId, userId) => http.post(`/api/salas/${salaId}/jugadores`, { userId });

export const listarEquipos = (salaId) => http.get(`/api/salas/${salaId}/equipos`);

/** 409 equipo lleno, 403 no está en la sala. */
export const unirseAEquipo = (equipoId, userId) => http.post(`/api/equipos/${equipoId}/miembros`, { userId });

/** Listo / no listo. Cuando todos los equipos están listos, el back arranca solo (cuenta de 5 s). */
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