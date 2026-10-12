import { useEffect, useState } from 'react';
import { gameplayApi } from '../services/gameplayApi';
import { topics } from '../config';
import { useSubscription } from './useSocket';

export function useCronometro(matchId) {
  const [segundos, setSegundos] = useState(null);
  const [timeUp, setTimeUp] = useState(false);

  useEffect(() => {
    if (!matchId) return;
    gameplayApi.timer(matchId)
      .then((t) => { setSegundos(t.segundosRestantes); setTimeUp(t.tiempoAgotado); })
      .catch(() => {}); // 404 = aún no arranca
  }, [matchId]);

  useSubscription(matchId ? topics.timer(matchId) : null, (t) => {
    setSegundos(t.segundosRestantes);
    setTimeUp(t.tiempoAgotado);
  });

  useEffect(() => {
    if (segundos == null || timeUp) return;
    const id = setInterval(() => setSegundos((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [segundos == null, timeUp]);

  const mmss = segundos == null ? '--:--'
    : `${String(Math.floor(segundos / 60)).padStart(2, '0')}:${String(segundos % 60).padStart(2, '0')}`;
  return { segundos, timeUp, mmss };
}