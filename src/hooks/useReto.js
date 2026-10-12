import { useCallback, useEffect, useRef, useState } from 'react';
import { config, topics } from '../config';
import { gameplayApi } from '../services/gameplayApi';
import { useSubscription } from './useSocket';

export function esDemoReto() {
  try { return config.useMocks || sessionStorage.getItem('c15.retoDemo') === '1'; } catch { return false; }
}
export function activarDemoReto(activo = true) {
  try { activo ? sessionStorage.setItem('c15.retoDemo', '1') : sessionStorage.removeItem('c15.retoDemo'); } catch { /* nada */ }
}

export const retoActivo = (estado) => estado === 'INICIADO' || estado === 'EN_CURSO';

export function useReto(matchId, { userId, miEquipoId, miRol, equipoIds = [] } = {}) {
  const [reto, setReto] = useState({ estado: null, segundosRestantes: null, puntajes: {}, equipoGanadorId: null });
  const [misClics, setMisClics] = useState(0);
  const estadoRef = useRef(null);
  const sim = useRef(null);
  const demo = esDemoReto();

  const recibir = useCallback((msg) => {
    estadoRef.current = msg.estado;
    setReto((r) => ({ ...r, ...msg }));
  }, []);

  // Estado inicial por REST (por si llegamos con el reto ya corriendo)
  useEffect(() => {
    if (demo || !matchId) return;
    gameplayApi.estadoReto(matchId)
      .then(recibir)
      .catch((e) => {
        if (e.esNoEncontrado && !estadoRef.current) recibir({ estado: 'SIN_RETO' });
      });
  }, [demo, matchId, recibir]);

  // Tiempo real
  useSubscription(!demo && matchId ? topics.reto(matchId) : null, recibir);

  // Modo demo (sin back): simula al servidor con bots
  useEffect(() => {
    if (!demo) return;
    sim.current = crearSimulador(recibir, { miEquipoId, equipoIds });
    return () => sim.current?.detener();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, matchId]);

  const presionar = useCallback(() => {
    if (!retoActivo(estadoRef.current) || !miRol) return;
    setMisClics((n) => n + 1);
    if (demo) { sim.current?.click(miRol); return; }
    // Cada clic es una petición; el back los cuenta en paralelo sin perder ninguno
    gameplayApi.clickReto(matchId, userId).catch(() => { /* 409: el reto terminó */ });
  }, [demo, matchId, userId, miRol]);

  return { reto, misClics, presionar, demo };
}

/* ---------------- Simulador (solo modo demo) ---------------- */
function crearSimulador(emitir, { miEquipoId, equipoIds }) {
  const yo = miEquipoId ?? 'equipo-a';
  const rival = equipoIds.find((id) => id !== yo) ?? 'equipo-b';
  const puntajes = { [yo]: 0, [rival]: 0 };
  const duracion = 20;
  let restante = duracion * 5; // ticks de 200 ms
  let activo = true;

  emitir({ estado: 'INICIADO', segundosRestantes: duracion, puntajes: { ...puntajes }, equipoGanadorId: null });
  const tick = setInterval(() => {
    restante -= 1;
    // héroes rivales suman ~7/s, su verdugo nos resta ~2/s
    puntajes[rival] += Math.random() < 0.7 ? 1 : 2;
    if (Math.random() < 0.4) puntajes[yo] -= 1;
    if (restante <= 0) {
      clearInterval(tick);
      activo = false;
      const ganador = puntajes[yo] === puntajes[rival] ? null : puntajes[yo] > puntajes[rival] ? yo : rival;
      emitir({ estado: 'TERMINADO', segundosRestantes: 0, puntajes: { ...puntajes }, equipoGanadorId: ganador });
      return;
    }
    emitir({ estado: 'EN_CURSO', segundosRestantes: Math.ceil(restante / 5), puntajes: { ...puntajes }, equipoGanadorId: null });
  }, 200);

  return {
    click(rol) {
      if (!activo) return;
      if (rol === 'HEROE') puntajes[yo] += 1;
      else puntajes[rival] -= 1;
    },
    detener() { clearInterval(tick); },
  };
}