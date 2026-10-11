import { useEffect, useRef, useState } from 'react';
import Icono from '../Home/Iconos';
import './ModalRol.css';

const SEGUNDOS = 5;

const ROLES = {
  HEROE: {
    titulo: 'HÉROE',
    imagen: '/assets/iconos/heroe.png',
    icono: 'check',
    lema: 'PROTEGE A TU EQUIPO',
    texto: 'EN ALGÚN MOMENTO DE LA PARTIDA APARECERÁ EL RETO HÉROE VS VERDUGO. CADA VEZ QUE PRESIONES EL BOTÓN ROJO, TU EQUIPO SUMA UN PUNTO.',
  },
  VERDUGO: {
    titulo: 'VERDUGO',
    imagen: '/assets/iconos/verdugo.png',
    icono: 'calavera',
    lema: 'SABOTEA AL RIVAL',
    texto: 'EN ALGÚN MOMENTO DE LA PARTIDA APARECERÁ EL RETO HÉROE VS VERDUGO. CADA VEZ QUE PRESIONES EL BOTÓN ROJO, EL EQUIPO RIVAL PIERDE UN PUNTO.',
  },
};

/**
 * Anuncio del rol secreto al iniciar la partida.
 * Props: rol ('HEROE' | 'VERDUGO'), username, equipoNumero, onCerrar
 */
export default function ModalRol({ rol, username, equipoNumero, onCerrar }) {
  const datos = ROLES[String(rol).toUpperCase()] ?? ROLES.HEROE;
  const [restante, setRestante] = useState(SEGUNDOS);
  const [sinImagen, setSinImagen] = useState(false);

  // La cuenta usa un ref para no reiniciarse con los re-render de Partida
  const cerrarRef = useRef(onCerrar);
  cerrarRef.current = onCerrar;

  useEffect(() => {
    const id = setInterval(() => {
      setRestante((s) => {
        if (s <= 1) {
          clearInterval(id);
          setTimeout(() => cerrarRef.current?.(), 0);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const esVerdugo = datos === ROLES.VERDUGO;

  return (
    <div className="mr-fondo" onClick={() => cerrarRef.current?.()}>
      <section className={`mr-panel ${esVerdugo ? 'mr-panel--verdugo' : 'mr-panel--heroe'}`} onClick={(e) => e.stopPropagation()}>
        <p className="mr-sup">{username ? `${username.toUpperCase()}, ` : ''}HAS SIDO ELEGIDO COMO</p>

        <div className="mr-retrato">
          {!sinImagen ? (
            <img src={datos.imagen} alt={datos.titulo} onError={() => setSinImagen(true)} />
          ) : (
            <Icono nombre={datos.icono} className="mr-retrato__icono" />
          )}
        </div>

        <h2 className="mr-titulo">{datos.titulo}</h2>
        <p className="mr-lema">{datos.lema}{equipoNumero ? ` · EQUIPO ${equipoNumero}` : ''}</p>
        <p className="mr-texto">{datos.texto}</p>
        <p className="mr-secreto">TU ROL ES SECRETO: SOLO TÚ LO VES</p>

        <div className="mr-barra"><span style={{ width: `${(restante / SEGUNDOS) * 100}%` }} /></div>
        <button className="mr-boton" onClick={() => cerrarRef.current?.()}>
          ¡ENTENDIDO! ({restante})
        </button>
      </section>
    </div>
  );
}