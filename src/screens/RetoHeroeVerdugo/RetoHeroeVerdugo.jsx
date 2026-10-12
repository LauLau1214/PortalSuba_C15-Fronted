import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icono from '../Home/Iconos';
import { Personaje, colorDe } from '../Partida/MapaIso';
import { listarEquipos } from '../../services/salasApi';
import { gameplayApi } from '../../services/gameplayApi';
import { Sesion } from '../../services/sesion';
import { useConexion } from '../../hooks/useSocket';
import { useNombres } from '../../hooks/useNombres';
import { useReto, activarDemoReto, esDemoReto, retoActivo } from '../../hooks/useReto';
import './RetoHeroeVerdugo.css';

const FONDO = '/assets/fondos/Fondo_Reto.jpeg';
const ASPECTO = 16 / 9;
const VOLVER_EN = 8;

const BANCO_IZQ = [[16, 57], [21, 53], [26, 49], [31, 45]];
const BANCO_DER = [[69, 45], [74, 49], [79, 53], [84, 57]];
const PEDESTAL = [50, 47];

/** Carga equipos y roles; cuando están listos monta la arena. */
export default function RetoHeroeVerdugo() {
  const { matchId } = useParams();
  const navegar = useNavigate();
  const userId = Sesion.userId;
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) { navegar('/'); return; }
    (async () => {
      try {
        const equipos = (await listarEquipos(matchId))
          .filter((e) => e.miembros.length)
          .sort((a, b) => a.numero - b.numero);
        const roles = {};
        await Promise.all(equipos.map((e) =>
          gameplayApi.rolesEquipo(matchId, e.id).then((r) => Object.assign(roles, r.roles)).catch(() => {})
        ));
        if (esDemoReto() && !Object.keys(roles).length) {
          equipos.forEach((e) => e.miembros.forEach((id, i) => { roles[id] = i === 0 && id !== userId ? 'VERDUGO' : 'HEROE'; }));
        }
        setDatos({ equipos, roles });
      } catch (e) {
        setError(e.message);
      }
    })();
  }, [matchId, userId, navegar]);

  if (error) {
    return (
      <div className="rt-root">
        <div className="rt-modal-fondo">
          <div className="rt-resultado">
            <p className="rt-resultado__titulo">NO SE PUDO ENTRAR AL RETO</p>
            <p>{error.toUpperCase()}</p>
            <button className="rt-btn rt-btn-marron" onClick={() => navegar(`/partida/${matchId}`)}>VOLVER</button>
          </div>
        </div>
      </div>
    );
  }
  if (!datos) return <div className="rt-root"><div className="rt-modal-fondo"><p className="rt-cargando">ENTRANDO AL COLISEO...</p></div></div>;
  return <Arena matchId={matchId} {...datos} />;
}

function Arena({ matchId, equipos, roles }) {
  const navegar = useNavigate();
  const userId = Sesion.userId;
  const conectado = useConexion();
  const miEquipo = equipos.find((e) => e.miembros.includes(userId));
  const rival = equipos.find((e) => e.id !== miEquipo?.id);
  const miRol = roles[userId] ?? null;
  const { reto, misClics, presionar, demo } = useReto(matchId, {
    userId, miEquipoId: miEquipo?.id, miRol, equipoIds: equipos.map((e) => e.id),
  });
  const [sonido, setSonido] = useState(true);
  const [aviso, setAviso] = useState('');
  const tAviso = useRef(null);

  const nombreDe = useNombres(equipos.flatMap((e) => e.miembros));
  const numeroDe = (equipoId) => equipos.find((e) => e.id === equipoId)?.numero ?? '?';
  const activo = retoActivo(reto.estado);
  const terminado = reto.estado === 'TERMINADO';

  function avisar(t) {
    setAviso(t);
    clearTimeout(tAviso.current);
    tAviso.current = setTimeout(() => setAviso(''), 2500);
  }

  function volver() {
    activarDemoReto(false);
    navegar(`/partida/${matchId}`);
  }

  const [vuelta, setVuelta] = useState(VOLVER_EN);
  useEffect(() => {
    if (!terminado) return;
    if (vuelta <= 0) { volver(); return; }
    const id = setTimeout(() => setVuelta((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [terminado, vuelta]);

  const led = !reto.estado ? 'CONECTANDO CON EL RETO...'
    : reto.estado === 'SIN_RETO' ? 'NO HAY UN RETO EN CURSO'
    : activo ? `¡RETO EN CURSO! · ${reto.segundosRestantes ?? 0}S`
    : reto.equipoGanadorId ? `GANA EL EQUIPO ${numeroDe(reto.equipoGanadorId)}` : 'EMPATE';

  return (
    <div className="rt-root">
      {/* ---------- ESCENARIO ---------- */}
      <div className="rt-escenario" style={{ '--rt-aspecto': ASPECTO, backgroundImage: `url(${FONDO})` }}>
        <span className={`rt-pedestal ${activo ? 'activo' : ''}`} style={{ left: `${PEDESTAL[0]}%`, top: `${PEDESTAL[1]}%` }} />

        {equipos.slice(0, 2).map((eq, ei) =>
          eq.miembros.map((id, i) => {
            const lado = ei === 0 ? 'izq' : 'der';
            const [x, y] = (lado === 'izq' ? BANCO_IZQ : BANCO_DER)[i % 4];
            const { ropa, piel } = colorDe(id);
            const rol = roles[id];
            return (
              <div
                key={id}
                className={`rt-jugador ${id === userId ? 'yo' : ''} ${rol === 'HEROE' ? 'heroe' : rol === 'VERDUGO' ? 'verdugo' : ''} ${lado} ${activo ? 'presionando' : ''}`}
                style={{ left: `${x}%`, top: `${y}%`, zIndex: Math.round(y) }}
              >
                <span className="rt-jugador__nombre">{nombreDe(id)}</span>
                <Personaje ropa={ropa} piel={piel} />
                <span className="rt-jugador__sombra" />
              </div>
            );
          })
        )}
      </div>

      {/* ---------- HUD ---------- */}
      <div className="rt-hud">
        <section className="rt-placa rt-sala">
          <span className="rt-puerta-ico" />
          <div>
            <p className="rt-sala__nombre">SALA COMPARTIDA</p>
            <p className="rt-sala__sub">RETO HÉROE VS VERDUGO</p>
          </div>
        </section>

        <p className={`rt-led ${activo ? 'duelo' : terminado ? 'fin' : ''}`}>{led}</p>

        <div className="rt-arriba-der">
          <span className={`rt-chip ${conectado || demo ? 'on' : 'off'}`}>
            <Icono nombre="mundo" /> {demo ? 'DEMO' : conectado ? 'CONECTADO' : 'RECONECTANDO'}
          </span>
          <button className="rt-cuadro" onClick={() => setSonido(!sonido)} title="Sonido">
            <Icono nombre={sonido ? 'sonido' : 'mute'} />
          </button>
          <button className="rt-cuadro rt-rojo" onClick={volver} title="Volver a la partida">
            <Icono nombre="salir" />
          </button>
        </div>

        <button className="rt-tab-chat" onClick={() => avisar('EL CHAT NO ESTÁ DISPONIBLE EN ESTA VERSIÓN')}>
          <span>CHAT</span>
          <Icono nombre="sobre" />
        </button>

        {equipos.slice(0, 2).map((eq, ei) => (
          <section key={eq.id} className={`rt-equipo ${ei === 0 ? 'izq' : 'der'}`}>
            <header>
              EQUIPO {eq.numero}{eq.id === miEquipo?.id ? ' (TÚ)' : ''} · {reto.puntajes?.[eq.id] ?? 0} PTS
            </header>
            {eq.miembros.map((id) => {
              const rol = roles[id];
              return (
                <div key={id} className="rt-equipo__fila">
                  <span className="rt-equipo__avatar"><Icono nombre={rol === 'VERDUGO' ? 'calavera' : 'persona'} /></span>
                  <span className="rt-equipo__datos">
                    <span className="rt-equipo__nombre">{nombreDe(id)}</span>
                    <small className="ok">{rol === 'VERDUGO' ? 'RESTA AL RIVAL' : rol === 'HEROE' ? 'SUMA A SU EQUIPO' : 'SIN ROL'}</small>
                  </span>
                  {rol && <span className={`rt-equipo__rol ${rol === 'HEROE' ? 'heroe' : 'verdugo'}`}>{rol === 'HEROE' ? 'HÉROE' : 'VERDUGO'}</span>}
                </div>
              );
            })}
          </section>
        ))}

        {aviso && <p className="rt-aviso">{aviso}</p>}
      </div>

      {/* ---------- SIN RETO ---------- */}
      {reto.estado === 'SIN_RETO' && (
        <div className="rt-modal-fondo">
          <div className="rt-resultado">
            <p className="rt-resultado__titulo">NO HAY RETO EN CURSO</p>
            <p>EL RETO YA TERMINÓ O AÚN NO HA EMPEZADO.</p>
            <button className="rt-btn rt-btn-verde" onClick={volver}>VOLVER A LA PARTIDA</button>
          </div>
        </div>
      )}

      {/* ---------- DURANTE EL RETO ---------- */}
      {activo && (
        miRol && miEquipo
          ? <BotonDuelo reto={reto} miRol={miRol} miEquipo={miEquipo} rival={rival} misClics={misClics} onPresionar={presionar} />
          : <Marcador reto={reto} equipos={equipos} />
      )}

      {/* ---------- RESULTADO ---------- */}
      {terminado && (
        <div className="rt-modal-fondo">
          <div className={`rt-resultado ${reto.equipoGanadorId === miEquipo?.id ? 'heroe' : reto.equipoGanadorId ? 'verdugo' : ''}`}>
            <p className="rt-resultado__led">FIN DEL RETO</p>
            <p className="rt-resultado__titulo">
              {!reto.equipoGanadorId ? '¡EMPATE!' : `¡GANA EL EQUIPO ${numeroDe(reto.equipoGanadorId)}!`}
            </p>
            {miEquipo && reto.equipoGanadorId && (
              <p className="rt-resultado__sub">{reto.equipoGanadorId === miEquipo.id ? 'TU EQUIPO GANÓ EL RETO' : 'TU EQUIPO PERDIÓ EL RETO'}</p>
            )}
            <div className="rt-resultado__marcador">
              {equipos.slice(0, 2).map((e, i) => (
                <span key={e.id} className={i === 0 ? 'heroe' : 'verdugo'}>
                  EQUIPO {e.numero}<strong>{reto.puntajes?.[e.id] ?? 0}</strong>
                </span>
              )).reduce((acc, el, i) => (i ? [...acc, <span key="vs" className="rt-vs">VS</span>, el] : [el]), [])}
            </div>
            {miRol && <p className="rt-resultado__sub">HICISTE {misClics} CLICS COMO {miRol === 'HEROE' ? 'HÉROE' : 'VERDUGO'}</p>}
            <p className="rt-resultado__nota">EL EQUIPO GANADOR SUMA 1 PUNTO EN LA PARTIDA, COMO UN ACERTIJO.</p>
            <button className="rt-btn rt-btn-verde" onClick={volver}>VOLVER A LA PARTIDA ({Math.max(vuelta, 0)})</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Popup para los jugadores con rol */
function BotonDuelo({ reto, miRol, miEquipo, rival, misClics, onPresionar }) {
  const [hundido, setHundido] = useState(false);
  const mio = reto.puntajes?.[miEquipo.id] ?? 0;
  const suyo = rival ? reto.puntajes?.[rival.id] ?? 0 : 0;
  const pct = porcentaje(mio, suyo);

  function presionar() {
    onPresionar();
    setHundido(true);
    setTimeout(() => setHundido(false), 70);
  }

  useEffect(() => {
    function onKey(e) {
      if (e.repeat) return;
      if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); presionar(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="rt-modal-fondo">
      <div className={`rt-duelo ${miRol === 'VERDUGO' ? 'verdugo' : 'heroe'}`}>
        <p className="rt-duelo__led">¡PRESIONA EL BOTÓN!</p>
        <p className="rt-duelo__tiempo">{reto.segundosRestantes ?? 0}<small>S</small></p>

        <div className="rt-duelo__cuentas">
          <span className="yo"><small>TU EQUIPO · {miEquipo.numero}</small><strong>{mio}</strong></span>
          <span className="rival"><small>RIVAL · {rival?.numero ?? '?'}</small><strong>{suyo}</strong></span>
        </div>
        <div className="rt-tira">
          <span className="rt-tira__yo" style={{ width: `${pct}%` }} />
        </div>

        <p className="rt-duelo__efecto">
          ERES <strong>{miRol === 'VERDUGO' ? 'VERDUGO' : 'HÉROE'}</strong> ·{' '}
          {miRol === 'VERDUGO' ? 'CADA CLIC LE RESTA 1 AL RIVAL' : 'CADA CLIC LE SUMA 1 A TU EQUIPO'}
        </p>

        <button
          className={`rt-boton-rojo ${hundido ? 'hundido' : ''}`}
          onPointerDown={(e) => { e.preventDefault(); presionar(); }}
          aria-label="Presionar"
        >
          <span>PRESIONA</span>
        </button>
        <p className="rt-duelo__ayuda">TUS CLICS: {misClics} · TOCA, HAZ CLIC O USA LA BARRA ESPACIADORA</p>
      </div>
    </div>
  );
}

/** Lo que ven los jugadores sin rol durante el reto. */
function Marcador({ reto, equipos }) {
  const [a, b] = equipos;
  const pa = reto.puntajes?.[a?.id] ?? 0;
  const pb = reto.puntajes?.[b?.id] ?? 0;
  return (
    <div className="rt-marcador">
      <p className="rt-marcador__tiempo">{reto.segundosRestantes ?? 0}S</p>
      <div className="rt-marcador__fila">
        <span className="heroe"><small>EQUIPO {a?.numero}</small><strong>{pa}</strong></span>
        <span className="rt-vs">VS</span>
        <span className="verdugo"><small>EQUIPO {b?.numero}</small><strong>{pb}</strong></span>
      </div>
      <div className="rt-tira">
        <span className="rt-tira__yo heroe" style={{ width: `${porcentaje(pa, pb)}%` }} />
      </div>
    </div>
  );
}

/** Parte de la barra para "a" */
function porcentaje(a, b) {
  const base = Math.min(0, a, b);
  const x = a - base;
  const y = b - base;
  return x + y === 0 ? 50 : (x / (x + y)) * 100;
}