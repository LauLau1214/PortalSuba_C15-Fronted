const KEY = 'c15.sesion';

function leer() {
  try { return JSON.parse(sessionStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function escribir(datos) {
  try { sessionStorage.setItem(KEY, JSON.stringify(datos)); } catch { /* modo privado */ }
}

export const Sesion = {
  get userId() { return leer().userId ?? null; },
  get username() { return leer().username ?? null; },
  get salaId() { return leer().salaId ?? null; },
  get equipoId() { return leer().equipoId ?? null; },
  get matchId() { return leer().matchId ?? null; },

  obtener(clave) { return leer()[clave] ?? null; },
  guardar(clave, valor) { escribir({ ...leer(), [clave]: valor }); },
  iniciar({ userId, username }) { escribir({ userId, username }); },
  limpiar() { try { sessionStorage.removeItem(KEY); } catch { /* nada */ } },
};