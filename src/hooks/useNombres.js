import { useCallback, useEffect, useState } from 'react';
import { cargarNombres, nombreDe } from '../services/usuariosApi';

/**
 * Pide al back los nombres de esos jugadores y devuelve nombreDe(id).
 * La función cambia cuando llegan nombres nuevos, así la pantalla se vuelve a pintar.
 */
export function useNombres(ids) {
  const [version, setVersion] = useState(0);
  const clave = [...new Set((ids ?? []).filter(Boolean))].sort().join(',');

  useEffect(() => {
    if (!clave) return;
    let vivo = true;
    cargarNombres(clave.split(',')).then((nuevos) => {
      if (vivo && nuevos) setVersion((v) => v + 1);
    });
    return () => { vivo = false; };
  }, [clave]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback((id) => nombreDe(id), [version]);
}
