import { useEffect, useRef, useState } from 'react';
import Icono from '../Home/Iconos';

const SEGMENTOS = 10;

export default function ModalDesafio({ miEquipo, rival, miRol, segundos = 3, onFin }) {
  const [restante, setRestante] = useState(segundos);
  const finRef = useRef(onFin);
  finRef.current = onFin;

  useEffect(() => {
    const id = setInterval(() => setRestante((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (restante <= 0) finRef.current();
  }, [restante]);

  const encendidos = Math.ceil((Math.max(restante, 0) / segundos) * SEGMENTOS);
  const efecto = miRol === 'VERDUGO'
    ? 'CADA CLIC RESTA 1 PUNTO AL EQUIPO RIVAL'
    : miRol === 'HEROE' ? 'CADA CLIC SUMA 1 PUNTO A TU EQUIPO' : 'NO TIENES ROL EN ESTE RETO';

  return (
    <div className="pm-modal-fondo pm-fondo-rol">
      <div className="pm-desafio" role="dialog" aria-modal="true">
        <p className="pm-desafio__led">DESAFÍO HÉROE VS VERDUGO</p>

        <p className="pm-desafio__titulo">A PUNTO DE COMENZAR</p>

        <div className="pm-desafio__reloj">
          <span className="pm-desafio__digitos">{String(Math.max(restante, 0)).padStart(2, '0')}</span>
          <span className="pm-desafio__leyenda">TIEMPO ANTES DE ENTRAR<br /><strong>SEGUNDOS</strong></span>
        </div>

        <div className="pm-desafio__barra" aria-hidden="true">
          {Array.from({ length: SEGMENTOS }, (_, i) => (
            <span key={i} className={i < encendidos ? 'on' : ''} />
          ))}
        </div>

        <div className="pm-desafio__duelo">
          <div className="pm-desafio__tarjeta heroe yo">
            <header><Icono nombre="persona" /> TU EQUIPO</header>
            <div className="pm-desafio__persona">
              <span className="pm-desafio__avatar"><Icono nombre={miRol === 'VERDUGO' ? 'calavera' : 'persona'} /></span>
              <span>
                <strong>EQUIPO {miEquipo?.numero ?? '?'}</strong>
                <small>ERES {miRol === 'VERDUGO' ? 'VERDUGO' : miRol === 'HEROE' ? 'HÉROE' : 'ESPECTADOR'}</small>
              </span>
            </div>
          </div>
          <span className="pm-desafio__vs">VS</span>
          <div className="pm-desafio__tarjeta verdugo">
            <header><Icono nombre="calavera" /> RIVAL</header>
            <div className="pm-desafio__persona">
              <span className="pm-desafio__avatar"><Icono nombre="persona" /></span>
              <span>
                <strong>EQUIPO {rival?.numero ?? '?'}</strong>
                <small>{rival?.miembros?.length ?? 0} JUGADORES</small>
              </span>
            </div>
          </div>
        </div>

        <p className="pm-desafio__efecto">{efecto}</p>
        <p className="pm-desafio__pie">¡PREPÁRENSE PARA EL RETO!</p>
      </div>
    </div>
  );
}