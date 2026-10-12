const wsDefault = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;

export const config = {
  apiUrl: import.meta.env.VITE_API_URL || '',
  wsUrl: import.meta.env.VITE_WS_URL || wsDefault,
  useMocks: import.meta.env.VITE_USE_MOCKS === 'true',
};

export const topics = {
  salas: () => '/topic/salas',                                   // catálogo
  sala: (salaId) => `/topic/salas/${salaId}`,                     // detalle: equipos y listos
  inicio: (salaId) => `/topic/salas/${salaId}/inicio`,            // cuenta regresiva y arranque
  timer: (m) => `/topic/partidas/${m}/cronometro`,
  reto: (m) => `/topic/partidas/${m}/reto`,
  resultado: (m) => `/topic/partidas/${m}/resultado`,
  progreso: (m) => `/topic/partidas/${m}/progreso`,
  posiciones: (m, e) => `/topic/partidas/${m}/equipos/${e}/posiciones`,
  inventario: (m, e) => `/topic/partidas/${m}/equipos/${e}/inventario`,
  roles: (m, e) => `/topic/partidas/${m}/equipos/${e}/roles`,
};

export const destinos = {
  registrarSesion: (m, u) => `/app/partidas/${m}/jugadores/${u}/sesion`,
};