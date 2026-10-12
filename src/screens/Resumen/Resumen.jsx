import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Icono from '../Home/Iconos';
import { Sesion } from '../../services/sesion';
import { listarEquipos } from '../../services/salasApi';
import { gameplayApi } from '../../services/gameplayApi';
import { topics } from '../../config';
import { useSubscription } from '../../hooks/useSocket';
import { useNombres } from '../../hooks/useNombres';
import './Resumen.css';

const FONDO = '/assets/fondos/Fondo_Resumen.jpeg';
const FONDO_RESPALDO = '/assets/fondos/Fondo_Lobby.jpeg';

// Igual a la duración de la partida en el back (c15.partida.duracion = 5 min)
const DURACION_DEFECTO_SEG = 5 * 60;

const mmss = (seg) => {
  if (seg == null || Number.isNaN(seg)) return '--:--';
  const s = Math.max(0, Math.round(seg));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

const idDe = (m) => (typeof m === 'string' ? m : m?.userId ?? m?.id ?? '');
const formatoPuntos = (n) => Number(n ?? 0).toLocaleString('es-CO');
/** acertijosResueltos puede venir como número o como lista de ids */
const cantidad = (v) => (Array.isArray(v) ? v.length : Number(v ?? 0));

function useConteo(objetivo, duracionMs = 1200) {
  const [valor, setValor] = useState(0);
  useEffect(() => {
    if (objetivo == null) return;
    const inicio = performance.now();
    let raf;
    const paso = (t) => {
      const p = Math.min(1, (t - inicio) / duracionMs);
      setValor(Math.round(objetivo * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [objetivo, duracionMs]);
  return valor;
}

export default function Resumen() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();

  const userId = Sesion.userId;
  const miEquipoId = Sesion.equipoId;

  const [resultado, setResultado] = useState(state?.resultado ?? null);
  const [equipos, setEquipos] = useState(state?.equipos ?? []);
  const [roles, setRoles] = useState({});
  const [totalAcertijos, setTotalAcertijos] = useState(null);
  const [segRestantes, setSegRestantes] = useState(state?.segundosRestantes ?? null);
  const [error, setError] = useState(null);
  const [mute, setMute] = useState(() => {
    try { return sessionStorage.getItem('c15.mute') === '1'; } catch { return false; }
  });

  // Si no hay sesión, al login
  useEffect(() => {
    if (!userId) navigate('/');
  }, [userId, navigate]);

  useSubscription(matchId ? topics.resultado(matchId) : null, (r) => setResultado(r));

  useEffect(() => {
    let vivo = true;
    (async () => {
      if (!resultado) {
        try {
          const r = await gameplayApi.resultado(matchId);
          if (vivo) setResultado(r);
        } catch (e) {
          if (vivo) setError(e?.esNoEncontrado ? 'LA PARTIDA AÚN NO TIENE RESULTADO' : 'NO SE PUDO CARGAR EL RESULTADO');
        }
      }

      // Equipos y roles de mi equipo
      try {
        // Si la sala ya se borró (partida terminada) da 404: se quedan los equipos que mandó la partida
        const eqs = await listarEquipos(matchId).catch(() => null);
        if (!vivo) return;
        if (eqs?.length) setEquipos(eqs);
        if (miEquipoId) {
          const r = await gameplayApi.rolesEquipo(matchId, miEquipoId).catch(() => null);
          if (vivo && r) {
            const fuente = r.roles ?? r;
            const mapa = {};
            if (Array.isArray(fuente)) fuente.forEach((x) => { mapa[x.userId] = x.rol; });
            else Object.assign(mapa, fuente);
            setRoles(mapa);
          }
        }
      } catch { /* sin equipos: tarjetas vacías */ }

      // Total de acertijos
      try {
        const m = await gameplayApi.mapa(matchId);
        const total = (m?.componentes ?? []).filter((c) => c.tipo === 'ACERTIJO').length;
        if (vivo && total > 0) setTotalAcertijos(total);
      } catch { /* opcional */ }

      // Tiempo restante
      if (segRestantes == null) {
        try {
          const t = await gameplayApi.timer(matchId);
          if (vivo) setSegRestantes(t?.tiempoAgotado ? 0 : t?.segundosRestantes ?? null);
        } catch { /* opcional */ }
      }
    })();
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  //Datos derivados
  const clasificacion = useMemo(
    () => [...(resultado?.clasificacion ?? [])].sort((a, b) => (b.puntaje ?? 0) - (a.puntaje ?? 0)),
    [resultado]
  );
  const miFila = clasificacion.find((c) => c.equipoId === miEquipoId);
  const posicion = miFila ? clasificacion.indexOf(miFila) + 1 : null;
  const miEquipo = equipos.find((e) => e.id === miEquipoId);
  const numeroEquipo = (id) => equipos.find((e) => e.id === id)?.numero ?? '?';

  const empate = !!resultado?.empate &&
    ((resultado?.equiposEmpatados ?? []).length === 0 || resultado.equiposEmpatados.includes(miEquipoId));
  const gane = !empate && !!resultado && resultado.equipoGanadorId === miEquipoId;
  const perdi = !!resultado && !gane && !empate;

  const titulo = !resultado ? 'FIN DE LA PARTIDA'
    : gane ? '¡SALA COMPLETADA!'
    : empate ? '¡EMPATE!'
    : resultado.motivo === 'ACERTIJOS_COMPLETOS' ? '¡TE GANARON LA SALIDA!'
    : '¡TIEMPO AGOTADO!';

  const subtitulo = !resultado ? ''
    : gane ? `EL EQUIPO ${numeroEquipo(miEquipoId)} LOGRÓ ESCAPAR`
    : empate ? 'NINGÚN EQUIPO SE IMPUSO'
    : resultado.equipoGanadorId ? `EL EQUIPO ${numeroEquipo(resultado.equipoGanadorId)} ESCAPÓ PRIMERO`
    : 'NADIE LOGRÓ ESCAPAR';

  const duracion = resultado?.duracionSegundos ?? DURACION_DEFECTO_SEG;
  const usado = segRestantes == null ? null : duracion - segRestantes;
  const puntos = useConteo(miFila?.puntaje ?? 0);

  const miembros = (miEquipo?.miembros ?? []).map(idDe);
  const nombreDe = useNombres(miembros);
  const tarjetas = [...miembros];
  while (tarjetas.length < (miEquipo?.cupoMaximo ?? 2)) tarjetas.push(null);

  const estadoDe = (id) => {
    const rol = String(roles[id] ?? '').toUpperCase();
    if (rol.startsWith('HER')) return { texto: 'HÉROE', clase: 'heroe' };
    if (rol.startsWith('VER')) return { texto: 'VERDUGO', clase: 'verdugo' };
    return { texto: 'PARTICIPÓ', clase: 'participo' };
  };

  //Acciones
  const limpiarPartida = () => {
    Sesion.guardar('salaId', null);
    Sesion.guardar('equipoId', null);
    Sesion.guardar('matchId', null);
  };
  const volverCatalogo = () => { limpiarPartida(); navigate('/home'); };
  const jugarOtraVez = () => { limpiarPartida(); navigate('/crear-sala'); };
  const alternarSonido = () => {
    setMute((m) => {
      try { sessionStorage.setItem('c15.mute', m ? '0' : '1'); } catch { /* nada */ }
      return !m;
    });
  };

  return (
    <div className="rs-root" style={{ '--rs-fondo': `url(${FONDO}), url(${FONDO_RESPALDO})` }}>
      <div className="rs-fondo" />
      <div className="rs-velo" />

      <button className="rs-esquina rs-esquina--izq" onClick={volverCatalogo} title="Volver">
        <Icono nombre="izquierda" className="rs-esquina__icono" />
      </button>
      <button className="rs-esquina rs-esquina--der" onClick={alternarSonido} title="Sonido">
        <Icono nombre={mute ? 'mute' : 'sonido'} className="rs-esquina__icono" />
      </button>

      <main className={`rs-panel ${perdi ? 'rs-panel--derrota' : ''}`}>
        <div className="rs-llave"><Icono nombre="llave" className="rs-llave__icono" /></div>

        <header className="rs-cabecera">
          <h1 className="rs-titulo">{titulo}</h1>
          {subtitulo && <p className="rs-subtitulo">{subtitulo}</p>}
        </header>

        {error && !resultado && <p className="rs-error">{error}</p>}

        {/* Tiempo y puntos */}
        <section className="rs-fila rs-fila--dos">
          <div className="rs-caja">
            <span className="rs-caja__etq">TIEMPO</span>
            <span className="rs-caja__valor">{mmss(usado)}</span>
            <span className="rs-caja__extra">DE {mmss(duracion)}</span>
          </div>
          <div className="rs-caja">
            <span className="rs-caja__etq">PUNTOS DEL EQUIPO</span>
            <span className="rs-caja__valor rs-caja__valor--oro">{formatoPuntos(puntos)}</span>
            <span className={`rs-sello rs-sello--${gane ? 'gana' : empate ? 'empate' : 'pierde'}`}>
              {gane ? 'GANADOR' : empate ? 'EMPATE' : resultado ? 'DERROTA' : '...'}
            </span>
          </div>
        </section>

        {/* Jugadores del equipo */}
        <section className="rs-jugadores">
          {tarjetas.map((id, i) => {
            if (!id) {
              return (
                <div key={`vacio-${i}`} className="rs-jugador rs-jugador--vacio">
                  <Icono nombre="persona" className="rs-jugador__avatar" />
                  <span className="rs-jugador__nombre">CUPO LIBRE</span>
                </div>
              );
            }
            const soyYo = id === userId;
            const est = estadoDe(id);
            return (
              <div key={id} className={`rs-jugador ${soyYo ? 'rs-jugador--yo' : ''}`}>
                {soyYo && <span className="rs-jugador__tu">TÚ</span>}
                <Icono nombre="persona" className="rs-jugador__avatar" />
                <span className="rs-jugador__nombre">
                  {nombreDe(id).toUpperCase()}
                </span>
                <span className={`rs-jugador__estado rs-jugador__estado--${est.clase}`}>{est.texto}</span>
              </div>
            );
          })}
        </section>

        {/* Estadísticas */}
        <section className="rs-fila rs-fila--tres">
          <div className="rs-caja rs-caja--chica">
            <span className="rs-caja__etq">ACERTIJOS RESUELTOS</span>
            <span className="rs-caja__valor">
              {cantidad(miFila?.acertijosResueltos)}{totalAcertijos != null && <small>/{totalAcertijos}</small>}
            </span>
          </div>
          <div className="rs-caja rs-caja--chica">
            <span className="rs-caja__etq">RETOS GANADOS</span>
            <span className="rs-caja__valor">{miFila?.retosGanados ?? 0}</span>
          </div>
          <div className="rs-caja rs-caja--chica">
            <span className="rs-caja__etq">POSICIÓN EN LA PARTIDA</span>
            <span className="rs-caja__valor">
              #{posicion ?? '-'}<small> DE {clasificacion.length || '-'}</small>
            </span>
          </div>
        </section>

        {/* Clasificación de todos los equipos */}
        {clasificacion.length > 0 && (
          <ol className="rs-tabla">
            {clasificacion.map((c, i) => (
              <li key={c.equipoId} className={`rs-tabla__fila ${c.equipoId === miEquipoId ? 'rs-tabla__fila--mio' : ''}`}>
                <span>#{i + 1}</span>
                <span>EQUIPO {numeroEquipo(c.equipoId)}</span>
                <span>{cantidad(c.acertijosResueltos)} ACERTIJOS</span>
                <span>{c.retosGanados ?? 0} RETOS</span>
                <span className="rs-tabla__pts">{formatoPuntos(c.puntaje)} PTS</span>
              </li>
            ))}
          </ol>
        )}

        <footer className="rs-botones">
          <button className="rs-boton rs-boton--gris" disabled title="Próximo sprint">
            VER RANKING<small>PRÓXIMO SPRINT</small>
          </button>
          <button className="rs-boton rs-boton--verde" onClick={jugarOtraVez}>
            JUGAR OTRA VEZ
          </button>
          <button className="rs-boton rs-boton--oro" onClick={volverCatalogo}>
            VOLVER AL CATÁLOGO
          </button>
        </footer>
      </main>

      <button className="rs-esquina rs-esquina--abajo" onClick={volverCatalogo} title="Salir">
        <Icono nombre="salir" className="rs-esquina__icono" />
      </button>
    </div>
  );
}