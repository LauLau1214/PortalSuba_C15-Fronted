import { useMemo } from 'react';

export const ISO = { origenX: 50.5, origenY: 44, mediaAncho: 2.55, mediaAlto: 2.25 };

/** Centro de la celda (x, y) en % del mapa. */
export function aPantalla(x, y) {
  return {
    left: ISO.origenX + (x - y) * ISO.mediaAncho,
    top: ISO.origenY + (x + y + 1) * ISO.mediaAlto,
  };
}

const COLORES = ['#c0392b', '#2e86c1', '#27ae60', '#8e44ad', '#d35400', '#16a085', '#c2185b', '#7f8c8d'];
const PIELES = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524'];
export function colorDe(id) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return { ropa: COLORES[h % COLORES.length], piel: PIELES[(h >> 3) % PIELES.length] };
}
export const numeroDe = (componenteId) => componenteId.split('-')[1];

export default function MapaIso({
  mapa, jugadores, userId, nombreDe, ocultos, resueltos, cercano,
  mostrarGrid, moviendo, onCelda,
}) {
  const ocupadas = useMemo(() => {
    const s = new Set();
    mapa.componentes.forEach((c) => s.add(`${c.x},${c.y}`));
    return s;
  }, [mapa]);

  const celdas = [];
  for (let x = 0; x < mapa.ancho; x++) {
    for (let y = 0; y < mapa.alto; y++) {
      const { left, top } = aPantalla(x, y);
      const bloqueada = ocupadas.has(`${x},${y}`);
      celdas.push(
        <button
          key={`${x},${y}`}
          className={`pm-celda ${bloqueada ? 'bloqueada' : ''} ${mostrarGrid ? 'visible' : ''}`}
          style={{
            left: `${left - ISO.mediaAncho}%`,
            top: `${top - ISO.mediaAlto}%`,
            width: `${ISO.mediaAncho * 2}%`,
            height: `${ISO.mediaAlto * 2}%`,
          }}
          onClick={() => !bloqueada && onCelda({ x, y })}
          tabIndex={-1}
          aria-label={`Celda ${x},${y}`}
        >
          {mostrarGrid && <span className="pm-celda__txt">{x},{y}</span>}
        </button>
      );
    }
  }

  return (
    <>
      <div className={`pm-celdas ${moviendo ? 'moviendo' : ''}`}>{celdas}</div>

      {/* Componentes del mapa */}
      {mapa.componentes.map((c) => {
        if (ocultos.has(c.id)) return null;
        const { left, top } = aPantalla(c.x, c.y);
        const esCercano = cercano?.id === c.id;
        const resuelto = resueltos.has(c.id);
        return (
          <div
            key={c.id}
            className={`pm-objeto pm-obj-${c.tipo.toLowerCase()} ${esCercano ? 'cercano' : ''} ${resuelto ? 'resuelto' : ''}`}
            style={{ left: `${left}%`, top: `${top}%`, zIndex: esCercano ? 200 : 10 + c.x + c.y }}
          >
            <Sprite tipo={c.tipo} resuelto={resuelto} />
            {esCercano && <Burbuja componente={c} resuelto={resuelto} />}
          </div>
        );
      })}

      {/* Jugadores del equipo */}
      {jugadores.map((j) => {
        const { left, top } = aPantalla(j.x, j.y);
        const yo = j.userId === userId;
        const { ropa, piel } = colorDe(j.userId);
        return (
          <div
            key={j.userId}
            className={`pm-jugador ${yo ? 'yo' : ''}`}
            style={{ left: `${left}%`, top: `${top}%`, zIndex: 10 + j.x + j.y + 0.5 }}
          >
            <span className="pm-jugador__nombre">{nombreDe(j.userId)}</span>
            <Personaje ropa={ropa} piel={piel} />
            <span className="pm-jugador__sombra" />
          </div>
        );
      })}
    </>
  );
}

function Burbuja({ componente, resuelto }) {
  const n = numeroDe(componente.id);
  const textos = {
    ACERTIJO: [`ACERTIJO ${n}`, resuelto ? 'RESUELTO · [E] VER' : '[E] EXAMINAR'],
    LLAVE: [`LLAVE ${n}`, '[E] RECOGER'],
    PUERTA: ['PUERTA', '[E] REVISAR'],
  }[componente.tipo];
  if (!textos) return null;
  return (
    <div className="pm-burbuja">
      <strong>{textos[0]}</strong>
      <span>{textos[1]}</span>
    </div>
  );
}

export function Personaje({ ropa, piel }) {
  return (
    <svg className="pm-personaje" viewBox="0 0 10 14" shapeRendering="crispEdges" aria-hidden="true">
      <path d="M3 0h4v1H3zM2 1h6v2H2z" fill="#3b2a1a" />
      <path d="M2 3h6v3H2z" fill={piel} />
      <path d="M3 4h1v1H3zM6 4h1v1H6z" fill="#1a1a1a" />
      <path d="M2 6h6v4H2z" fill={ropa} />
      <path d="M1 7h1v3H1zM8 7h1v3H8z" fill={ropa} opacity="0.75" />
      <path d="M1 10h1v1H1zM8 10h1v1H8z" fill={piel} />
      <path d="M3 10h1v3H3zM6 10h1v3H6z" fill="#2a2018" />
    </svg>
  );
}

function Sprite({ tipo, resuelto }) {
  if (tipo === 'ACERTIJO') {
    return (
      <svg className="pm-sprite" viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true">
        <path d="M3 0h2v2H3zM0 3h2v2H0zM6 3h2v2H6zM3 6h2v2H3z" fill={resuelto ? '#6fd46a' : '#ffe08a'} />
        <path d="M2 2h4v4H2z" fill={resuelto ? '#4f8a47' : '#f0b429'} />
        <path d="M3 3h2v2H3z" fill="#fff8dc" />
      </svg>
    );
  }
  if (tipo === 'LLAVE') {
    return (
      <svg className="pm-sprite" viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true">
        <path d="M0 2h3v3H0zM3 3h5v1H3zM6 4h1v2H6zM4 4h1v1H4z" fill="#f0b429" />
        <path d="M1 3h1v1H1z" fill="#5a3a12" />
      </svg>
    );
  }
  if (tipo === 'PUERTA') {
    return (
      <svg className="pm-sprite pm-sprite-alto" viewBox="0 0 8 10" shapeRendering="crispEdges" aria-hidden="true">
        <path d="M1 0h6v10H1z" fill="#5a3a1f" />
        <path d="M2 1h4v9H2z" fill="#7a5230" />
        <path d="M5 5h1v1H5z" fill="#f0b429" />
      </svg>
    );
  }
  return (
    <svg className="pm-sprite" viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true">
      <path d="M0 1h8v7H0z" fill="#6b4a2b" />
      <path d="M0 1h8v1H0zM0 4h8v1H0zM0 7h8v1H0z" fill="#4a3220" />
      <path d="M1 2h1v2H1zM6 5h1v2H6z" fill="#8a6440" />
    </svg>
  );
}