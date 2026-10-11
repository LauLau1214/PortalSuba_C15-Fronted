import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icono from '../Home/Iconos';
import { codigoDe } from '../Home/SalaCard';
import MapaIso, { numeroDe } from './MapaIso';
import ModalAcertijo from './ModalAcertijo';
import ModalDesafio from './ModalDesafio';
import ModalRol from './ModalRol';
import PanelEspera from './PanelEspera';
import { activarDemoReto, retoActivo } from '../../hooks/useReto';
import { gameplayApi } from '../../services/gameplayApi';
import { listarSalas, listarEquipos, unirseAEquipo } from '../../services/salasApi';
import { Sesion } from '../../services/sesion';
import { topics } from '../../config';
import { useConexion, useSubscription } from '../../hooks/useSocket';
import { useCronometro } from '../../hooks/useCronometro';
import { useNombres } from '../../hooks/useNombres';
import './Partida.css';

const FONDO = '/assets/fondos/Fondo_mapa.jpeg';
const ASPECTO = 16 / 9;
const PASO_MS = 150;
const ESPERA_RESUMEN_MS = 2500;
const TECLAS = {
  ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
  ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
  ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
  ArrowRight: [1, 0], d: [1, 0], D: [1, 0],
};
const PRIORIDAD = { ACERTIJO: 0, LLAVE: 1, PUERTA: 2 };
const adyacente = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const textoRol = (r) => (typeof r === 'string' ? r : r?.rol ?? null);

export default function Partida() {
  const { salaId } = useParams();
  const matchId = salaId;
  const navegar = useNavigate();
  const userId = Sesion.userId;
  const username = Sesion.username;
  const conectado = useConexion();
  const { mmss, segundos, timeUp } = useCronometro(matchId);

  const [fase, setFase] = useState('cargando');
  const [errorFatal, setErrorFatal] = useState('');
  const [sala, setSala] = useState(null);
  const [equipo, setEquipo] = useState(null);
  const [mapa, setMapa] = useState(null);
  const [posiciones, setPosiciones] = useState({});
  const [rol, setRol] = useState(null);
  const [verRol, setVerRol] = useState(false);
  const [inventario, setInventario] = useState([]);
  const [resueltos, setResueltos] = useState(() => new Set());
  const [acertijo, setAcertijo] = useState(null);
  const [moviendo, setMoviendo] = useState(false);
  const [aviso, setAviso] = useState('');
  const [feed, setFeed] = useState(null);
  const [panel, setPanel] = useState(false);
  const [ajustes, setAjustes] = useState(false);
  const [grid, setGrid] = useState(false);
  const [salir, setSalir] = useState(false);
  const [equipos, setEquipos] = useState([]);
  const [detalle, setDetalle] = useState(null);
  const [desafio, setDesafio] = useState(false);
  const [resultado, setResultado] = useState(null);

  const posRef = useRef(posiciones);
  posRef.current = posiciones;
  const movRef = useRef(false);
  const tAviso = useRef(null);
  const tFeed = useRef(null);
  const invRef = useRef([]);
  const retoVisto = useRef(false);
  const entrandoRef = useRef(false);
  const faseRef = useRef(fase);
  faseRef.current = fase;

  const miPos = posiciones[userId];

  const nombreDe = useNombres([...(equipo?.miembros ?? []), ...Object.keys(posiciones)]);

  function avisar(texto) {
    setAviso(texto);
    clearTimeout(tAviso.current);
    tAviso.current = setTimeout(() => setAviso(''), 2600);
  }
  function anunciar(texto) {
    setFeed(texto);
    clearTimeout(tFeed.current);
    tFeed.current = setTimeout(() => setFeed(null), 4500);
  }

  //CARGA INICIAL
  useEffect(() => {
    if (!userId) { navegar('/'); return; }
    let vivo = true;
    (async () => {
      try {
        const salas = await listarSalas();
        const s = salas.find((x) => x.id === salaId);
        if (!s) throw new Error('LA SALA NO EXISTE');
        if (vivo) setSala(s);

        // Equipo del jugador.
        let lista = await listarEquipos(salaId);
        let mio = lista.find((e) => e.miembros.includes(userId));
        if (!mio) {
          const libre = [...lista]
            .filter((e) => e.miembros.length < e.cupoMaximo)
            .sort((a, b) => a.miembros.length - b.miembros.length)[0];
          if (!libre) throw new Error('TODOS LOS EQUIPOS ESTÁN LLENOS');
          mio = await unirseAEquipo(libre.id, userId);
        }
        if (!vivo) return;
        setEquipo(mio);
        setEquipos(await listarEquipos(salaId).catch(() => lista));
        Sesion.guardar('equipoId', mio.id);
        Sesion.guardar('matchId', matchId);
        await entrar(mio.id);
      } catch (e) {
        if (vivo) { setErrorFatal(e.message); setFase('error'); }
      }
    })();
    return () => { vivo = false; };
  }, [salaId, userId]);

  async function entrar(eqId = equipoIdRef.current) {
    if (!eqId || entrandoRef.current || faseRef.current === 'jugando') return faseRef.current === 'jugando';
    entrandoRef.current = true;
    try {
      const m = await gameplayApi.mapa(matchId);
      setMapa(m);
      try {
        const lista = await gameplayApi.posiciones(matchId, eqId, userId);
        if (!lista.some((p) => p.userId === userId)) throw Object.assign(new Error('no registrado'), { esNoEncontrado: true });
        setPosiciones(Object.fromEntries(lista.map((p) => [p.userId, p])));
      } catch (e) {
        if (e.esNoEncontrado) { setFase('esperando'); return false; } // partida no iniciada
        throw e;
      }
      gameplayApi.registrarSesion(matchId, userId);
      setFase('jugando');
      listarEquipos(salaId).then(setEquipos).catch(() => {});

      gameplayApi.progreso(matchId).then((pr) => aplicarProgreso(pr, eqId)).catch(() => {});
      gameplayApi.resultado(matchId).then(setResultado).catch(() => {}); // 404 = sigue en juego
      gameplayApi.estadoReto(matchId)
        .then((r) => { if (retoActivo(r.estado)) irAlReto(); }) // llegamos con el reto corriendo
        .catch(() => {});

      gameplayApi.inventario(matchId, eqId, userId)
        .then((inv) => { invRef.current = inv.objetos; setInventario(inv.objetos); })
        .catch(() => {});
      gameplayApi.miRol(matchId, userId).then((r) => mostrarRol(r)).catch(() => {});
      return true;
    } finally {
      entrandoRef.current = false;
    }
  }

  async function alIniciarPartida() {
    for (let i = 0; i < 8; i++) {
      try {
        if (await entrar()) return;
      } catch { /* reintenta */ }
      await esperar(600);
    }
    avisar('LA PARTIDA INICIÓ PERO NO SE PUDO ENTRAR AL MAPA, RECARGA');
  }

  function mostrarRol(r) {
    const valor = textoRol(r);
    if (!valor) return;
    setRol(valor);
    const clave = `rolVisto_${matchId}`;
    if (!Sesion.obtener(clave)) {
      Sesion.guardar(clave, true);
      setVerRol(true);
    }
  }

  // TIEMPO REAL
  const equipoId = equipo?.id;
  const equipoIdRef = useRef(null);
  equipoIdRef.current = equipoId;

  const alDetalleEspera = useCallback((d) => {
    setDetalle(d);
    const mio = d?.equipos?.find((e) => (e.miembros ?? []).includes(userId));
    if (mio) {
      setEquipo(mio);
      Sesion.guardar('equipoId', mio.id);
    }
    if (d?.equipos) setEquipos(d.equipos);
  }, [userId]);

  //Progreso: acertijos resueltos por equipo, en vivo
  function aplicarProgreso(prog, eqId = equipoIdRef.current) {
    const mio = prog.equipos?.find((e) => e.equipoId === eqId);
    if (mio) setResueltos(new Set(mio.acertijosResueltos));
  }
  useSubscription(fase === 'jugando' ? topics.progreso(matchId) : null, (pr) => aplicarProgreso(pr));

  //Fin de partida
  useSubscription(fase === 'jugando' ? topics.resultado(matchId) : null, (r) => {
    if (acertijo) cerrarAcertijo();
    setResultado(r);
  });

  useEffect(() => {
    if (!resultado) return;
    setDesafio(false);
    setVerRol(false);
    setSalir(false);
    const t = setTimeout(() => irAlResumen(), ESPERA_RESUMEN_MS);
    return () => clearTimeout(t);
  }, [resultado]);

  function irAlResumen() {
    navegar(`/resumen/${matchId}`, {
      state: { resultado, segundosRestantes: timeUp ? 0 : segundos },
    });
  }

  // Roles: llegan a todo el equipo cuando arranca la partida
  useSubscription(equipoId ? topics.roles(matchId, equipoId) : null, (msg) => {
    mostrarRol(msg.roles?.[userId]);
    if (faseRef.current !== 'jugando') alIniciarPartida();
  });

  // Posiciones de los compañeros
  useSubscription(equipoId ? topics.posiciones(matchId, equipoId) : null, (p) => {
    if (p.userId === userId) {
      if (!p.conectado) { setErrorFatal('SALISTE DE LA PARTIDA'); setFase('error'); }
      return;
    }
    const antes = posRef.current[p.userId];
    if (!p.conectado && antes) anunciar(`${nombreDe(p.userId)} SALIÓ DE LA PARTIDA`);
    if (p.conectado && !antes) anunciar(`${nombreDe(p.userId)} ENTRÓ AL MAPA`);
    setPosiciones((prev) => {
      const next = { ...prev };
      if (p.conectado) next[p.userId] = p;
      else delete next[p.userId];
      return next;
    });
  });

  // Inventario compartido del equipo
  useSubscription(equipoId ? topics.inventario(matchId, equipoId) : null, (inv) => {
    const nuevos = inv.objetos.filter((o) => !invRef.current.some((v) => v.id === o.id));
    nuevos.forEach((o) => anunciar(`${nombreDe(o.recolectadoPor)} RECOGIÓ ${o.nombre.toUpperCase()}`));
    invRef.current = inv.objetos;
    setInventario(inv.objetos);
  });

  // Reto Héroe vs Verdugo
  useSubscription(fase === 'jugando' ? topics.reto(matchId) : null, (msg) => {
    if (retoActivo(msg.estado) && !retoVisto.current && !resultado) abrirDesafio();
  });

  function abrirDesafio() {
    retoVisto.current = true;
    if (acertijo) cerrarAcertijo();
    setPanel(false);
    setAjustes(false);
    setVerRol(false);
    setDesafio(true);
  }
  function irAlReto() {
    retoVisto.current = true;
    navegar(`/reto/${matchId}`);
  }

  async function iniciarRetoDev() {
    setAjustes(false);
    try { await gameplayApi.devIniciarReto(matchId); } catch (e) { avisar(e.message.toUpperCase()); }
  }
  function simularReto() {
    activarDemoReto(true);
    abrirDesafio();
  }

  //MOVIMIENTO
  async function moverA(destino) {
    const yo = posRef.current[userId];
    if (!yo || movRef.current || acertijo || fase !== 'jugando' || timeUp || resultado) return;
    if (destino.x === yo.x && destino.y === yo.y) return;
    if (destino.x < 0 || destino.y < 0 || destino.x >= mapa.ancho || destino.y >= mapa.alto) return;

    movRef.current = true;
    setMoviendo(true);
    try {
      const mov = await gameplayApi.mover(matchId, userId, destino.x, destino.y);
      for (const paso of mov.ruta) {
        setPosiciones((prev) => ({ ...prev, [userId]: { ...prev[userId], x: paso.x, y: paso.y } }));
        await esperar(PASO_MS);
      }
    } catch (e) {
      avisar(e.message.toUpperCase());
    } finally {
      movRef.current = false;
      setMoviendo(false);
    }
  }

  // Objeto al lado del jugador
  const ocultos = useMemo(() => new Set(inventario.map((o) => o.id)), [inventario]);
  const cercano = useMemo(() => {
    if (!mapa || !miPos) return null;
    return mapa.componentes
      .filter((c) => c.tipo !== 'OBSTACULO' && !ocultos.has(c.id) && adyacente(c, miPos))
      .sort((a, b) => PRIORIDAD[a.tipo] - PRIORIDAD[b.tipo])[0] || null;
  }, [mapa, miPos, ocultos]);

  async function interactuar() {
    if (!cercano || acertijo || movRef.current || resultado) return;
    try {
      if (cercano.tipo === 'ACERTIJO') {
        const dto = await gameplayApi.abrirAcertijo(matchId, cercano.id, userId);
        if (dto.resuelto) setResueltos((s) => new Set(s).add(cercano.id));
        setAcertijo(dto);
      } else if (cercano.tipo === 'LLAVE') {
        await gameplayApi.recolectar(matchId, cercano.id, userId);
      } else if (cercano.tipo === 'PUERTA') {
        const llaves = inventario.length;
        avisar(llaves ? `TU EQUIPO TIENE ${llaves} LLAVE(S)` : 'LA PUERTA ESTÁ CERRADA · BUSCA LAS LLAVES');
      }
    } catch (e) {
      if (e.esConflicto) {
        avisar(cercano.tipo === 'LLAVE' ? 'UN COMPAÑERO YA LA RECOGIÓ' : 'UN COMPAÑERO ESTÁ RESOLVIENDO ESTE ACERTIJO');
      } else {
        avisar(e.message.toUpperCase());
      }
    }
  }

  function cerrarAcertijo() {
    if (acertijo && !resueltos.has(acertijo.componenteMapaId)) {
      gameplayApi.cerrarAcertijo(matchId, acertijo.componenteMapaId, userId).catch(() => {});
    }
    setAcertijo(null);
  }

  function acertijoResuelto(componenteId) {
    setResueltos((s) => new Set(s).add(componenteId));
    anunciar(`${username} RESOLVIÓ EL ACERTIJO ${numeroDe(componenteId)}`);
    setTimeout(() => setAcertijo(null), 1500);
  }

  //TECLADO
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === 'g' || e.key === 'G') { setGrid((v) => !v); return; }
      if (e.key === 'Escape') { setPanel(false); setAjustes(false); setSalir(false); return; }
      if (verRol || acertijo || salir || desafio || resultado || fase !== 'jugando') return;
      if (TECLAS[e.key] && posRef.current[userId]) {
        e.preventDefault();
        const [dx, dy] = TECLAS[e.key];
        const yo = posRef.current[userId];
        moverA({ x: yo.x + dx, y: yo.y + dy });
      }
      if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') interactuar();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  async function salirDePartida() {
    await gameplayApi.salir(matchId, userId).catch(() => {});
    navegar('/home');
  }

  //RENDER
  const jugadores = Object.values(posiciones);
  const presentes = new Set(jugadores.map((j) => j.userId));
  const acertijos = mapa?.componentes.filter((c) => c.tipo === 'ACERTIJO') || [];
  const nuevosEnPanel = inventario.length;
  const urgente = segundos != null && segundos <= 60;
  const listosEspera = new Set((detalle?.equipos ?? []).flatMap((e) => e.listos ?? []));
  const gane = resultado && !resultado.empate && resultado.equipoGanadorId === equipoId;

  return (
    <div className="pm-root">
      {/* ---------- MAPA ---------- */}
      <div className="pm-mapa" style={{ '--pm-aspecto': ASPECTO, backgroundImage: `url(${FONDO})` }}>
        {mapa && fase === 'jugando' && (
          <MapaIso
            mapa={mapa}
            jugadores={jugadores}
            userId={userId}
            nombreDe={nombreDe}
            ocultos={ocultos}
            resueltos={resueltos}
            cercano={cercano}
            mostrarGrid={grid}
            moviendo={moviendo}
            onCelda={moverA}
          />
        )}
      </div>

      {/* ---------- HUD ---------- */}
      <div className="pm-hud">
        {/* Placa de la sala */}
        <section className="pm-placa pm-sala">
          <span className="pm-puerta-ico" />
          <div>
            <p className="pm-sala__nombre">{sala ? `SALA #${codigoDe(sala)} - ${sala.nombre.toUpperCase()}` : 'CARGANDO...'}</p>
            <p className="pm-sala__sub">ACERTIJOS {resueltos.size} DE {acertijos.length || 3}</p>
          </div>
        </section>

        {/* Reloj + estado */}
        <section className="pm-placa pm-reloj">
          <span className="pm-reloj__ico"><Icono nombre="ranking" /></span>
          <span className={`pm-reloj__tiempo ${urgente ? 'urgente' : ''}`}>{timeUp ? '00:00' : mmss}</span>
          <div className="pm-reloj__estado">
            <span className={`pm-chip ${conectado ? 'on' : 'off'}`}>
              <Icono nombre="mundo" /> {conectado ? 'CONECTADO' : 'RECONECTANDO'}
            </span>
            <span className="pm-llaves"><Icono nombre="llave" /> LLAVES: {inventario.length}</span>
          </div>
        </section>
        <button className="pm-cuadro pm-engranaje" onClick={() => setAjustes(!ajustes)} title="Ajustes">
          <Icono nombre="ajustes" />
        </button>
        {ajustes && (
          <div className="pm-ajustes">
            <button onClick={() => setGrid(!grid)}>{grid ? 'OCULTAR' : 'MOSTRAR'} CUADRÍCULA (G)</button>
            <button onClick={iniciarRetoDev}>INICIAR RETO AHORA (DEV)</button>
            <button onClick={simularReto}>SIMULAR RETO SIN BACK (DEMO)</button>
            <button onClick={() => { setAjustes(false); setSalir(true); }}>SALIR DE LA PARTIDA</button>
          </div>
        )}

        {/* Pestaña del panel */}
        <button className={`pm-tab-panel ${panel ? 'abierto' : ''}`} onClick={() => setPanel(!panel)}>
          {nuevosEnPanel > 0 && <span className="pm-badge">{nuevosEnPanel}</span>}
          <span className="pm-tab-panel__txt">PANEL</span>
          <Icono nombre={panel ? 'derecha' : 'izquierda'} />
        </button>
        {panel && (
          <aside className="pm-panel">
            <p className="pm-panel__titulo">INVENTARIO DEL EQUIPO</p>
            {inventario.length === 0 && <p className="pm-panel__vacio">AÚN NO HAN RECOGIDO NADA</p>}
            {inventario.map((o) => (
              <p key={o.id} className="pm-panel__item">
                <Icono nombre="llave" /> {o.nombre.toUpperCase()}
                <small>{nombreDe(o.recolectadoPor)}</small>
              </p>
            ))}
            <p className="pm-panel__titulo">ACERTIJOS</p>
            {acertijos.map((c) => (
              <p key={c.id} className={`pm-panel__item ${resueltos.has(c.id) ? 'ok' : ''}`}>
                <Icono nombre={resueltos.has(c.id) ? 'check' : 'info'} /> ACERTIJO {numeroDe(c.id)}
                <small>{resueltos.has(c.id) ? 'RESUELTO' : 'PENDIENTE'}</small>
              </p>
            ))}
            <p className="pm-panel__titulo">CONTROLES</p>
            <p className="pm-panel__ayuda">CLIC EN EL PISO O WASD / FLECHAS PARA MOVERTE<br />E O ENTER PARA INTERACTUAR<br />G PARA VER LA CUADRÍCULA</p>
          </aside>
        )}

        {/* Equipo: en la espera muestra quién está LISTO; jugando, quién está en el mapa */}
        {equipo && (
          <section className="pm-equipo">
            <header>
              EQUIPO {equipo.numero} - {fase === 'jugando' ? (presentes.size || equipo.miembros.length) : equipo.miembros.length}/{equipo.cupoMaximo}
            </header>
            {equipo.miembros.map((id) => {
              const ok = fase === 'jugando' ? presentes.has(id) : listosEspera.has(id);
              const etiqueta = fase === 'jugando' ? 'AUSENTE' : 'NO LISTO';
              return (
                <div key={id} className="pm-equipo__fila">
                  <span className="pm-equipo__avatar"><Icono nombre="persona" /></span>
                  <span className="pm-equipo__datos">
                    <span className="pm-equipo__nombre">{nombreDe(id)}{id === userId && rol ? ` · ${rol === 'VERDUGO' ? 'VERDUGO' : 'HÉROE'}` : ''}</span>
                    {!ok && <small>{etiqueta}</small>}
                  </span>
                  <span className={`pm-equipo__estado ${ok ? 'ok' : 'espera'}`}>
                    <Icono nombre={ok ? 'check' : 'ranking'} />
                  </span>
                </div>
              );
            })}
            {Array.from({ length: Math.max(0, equipo.cupoMaximo - equipo.miembros.length) }, (_, i) => (
              <div key={'v' + i} className="pm-equipo__vacio">+</div>
            ))}
          </section>
        )}

        {/* Noticias del equipo */}
        {feed && (
          <div className="pm-feed">
            <span className="pm-feed__avatar"><Icono nombre="persona" /></span>
            {feed}
          </div>
        )}

        {/* Brújula y salir */}
        <div className="pm-brujula" aria-hidden="true"><span /></div>
        <button className="pm-cuadro pm-salir" onClick={() => setSalir(true)} title="Salir">
          <Icono nombre="flecha" />
        </button>

        {aviso && <div className="pm-aviso">{aviso}</div>}
      </div>

      {/* ---------- ESTADOS ---------- */}
      {fase === 'cargando' && <div className="pm-modal-fondo"><p className="pm-cargando">ENTRANDO A LA SALA...</p></div>}

      {fase === 'esperando' && (
        <PanelEspera
          salaId={salaId}
          onIniciada={alIniciarPartida}
          onVolver={() => navegar('/home')}
          onDetalle={alDetalleEspera}
        />
      )}

      {fase === 'error' && (
        <div className="pm-modal-fondo">
          <div className="pm-espera">
            <p className="pm-espera__titulo">NO SE PUDO ENTRAR</p>
            <p>{errorFatal.toUpperCase()}</p>
            <button className="pm-btn pm-btn-marron" onClick={() => navegar('/home')}>VOLVER AL INICIO</button>
          </div>
        </div>
      )}

      {/* Fin de partida: aviso corto y luego pasa solo al Resumen */}
      {(resultado || timeUp) && fase === 'jugando' && (
        <div className="pm-modal-fondo">
          <div className="pm-espera">
            <p className="pm-espera__titulo">
              {!resultado ? '¡SE ACABÓ EL TIEMPO!'
                : resultado.empate ? '¡EMPATE!'
                : gane ? '¡SALA COMPLETADA!' : 'TU EQUIPO PERDIÓ'}
            </p>
            {resultado ? (
              <>
                <p>{resultado.motivo === 'ACERTIJOS_COMPLETOS' ? 'UN EQUIPO RESOLVIÓ TODOS LOS ACERTIJOS' : 'SE ACABÓ EL TIEMPO'}</p>
                <p>CARGANDO EL RESUMEN...</p>
                <button className="pm-btn pm-btn-verde" onClick={irAlResumen}>VER RESUMEN</button>
              </>
            ) : (
              <p>CALCULANDO EL RESULTADO...</p>
            )}
          </div>
        </div>
      )}

      {acertijo && (
        <ModalAcertijo
          dto={acertijo}
          matchId={matchId}
          userId={userId}
          onCerrar={cerrarAcertijo}
          onResuelto={acertijoResuelto}
        />
      )}

      {verRol && rol && !resultado && (
        <ModalRol rol={rol} username={username} equipoNumero={equipo?.numero} onCerrar={() => setVerRol(false)} />
      )}

      {desafio && !resultado && (
        <ModalDesafio
          miEquipo={equipo}
          rival={equipos.find((e) => e.id !== equipoId && e.miembros.length)}
          miRol={rol}
          onFin={irAlReto}
        />
      )}

      {salir && !resultado && (
        <div className="pm-modal-fondo" onClick={() => setSalir(false)}>
          <div className="pm-espera" onClick={(e) => e.stopPropagation()}>
            <p className="pm-espera__titulo">¿SALIR DE LA PARTIDA?</p>
            <p>TU EQUIPO SEGUIRÁ SIN TI Y NO PODRÁS VOLVER A ENTRAR.</p>
            <div className="pm-espera__botones">
              <button className="pm-btn pm-btn-marron" onClick={() => setSalir(false)}>QUEDARME</button>
              <button className="pm-btn pm-btn-rojo" onClick={salirDePartida}>SALIR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}