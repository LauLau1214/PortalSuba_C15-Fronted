import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { detalleSala, marcarListo, desmarcarListo, unirseAEquipo } from '../../services/salasApi';
import { Sesion } from '../../services/sesion';
import { topics } from '../../config';
import { useSubscription } from '../../hooks/useSocket';
import { codigoDe } from '../Home/SalaCard';
import './PanelEspera.css';

const MIN_EQUIPOS = 2;
const MIN_JUGADORES = 2;

const corto = (id) => String(id).slice(0, 4).toUpperCase();

export default function PanelEspera({ salaId, onIniciada, onVolver, onDetalle }) {
  const userId = Sesion.userId;
  const username = Sesion.username;

  const [detalle, setDetalle] = useState(null);
  const [cuenta, setCuenta] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const iniciadaRef = useRef(false);

  const config = (() => { try { return Sesion.obtener('configSala'); } catch { return null; } })();
  const esPrivada = config && (config.privada === true || String(config.visibilidad ?? '').toUpperCase() === 'PRIVADA');

  const aplicarDetalle = useCallback((d) => {
    if (!d) return;
    setDetalle(d);
    onDetalle?.(d);
    if (d.estado === 'EN_PARTIDA' && !iniciadaRef.current) {
      iniciadaRef.current = true;
      onIniciada?.(salaId);
    }
  }, [onDetalle, onIniciada, salaId]);

  // Carga inicial
  useEffect(() => {
    let vivo = true;
    detalleSala(salaId)
      .then((d) => { if (vivo) aplicarDetalle(d); })
      .catch(() => { if (vivo) setAviso('NO SE PUDO CARGAR LA SALA'); });
    return () => { vivo = false; };
  }, [salaId, aplicarDetalle]);

  // Cambios de la sala en vivo (entradas, equipos, listos)
  useSubscription(topics.sala(salaId), aplicarDetalle);

  // Cuenta regresiva del back
  useSubscription(topics.inicio(salaId), (m) => {
    if (m?.estado === 'CUENTA_REGRESIVA') setCuenta(m.segundos ?? 5);
    else if (m?.estado === 'CANCELADA') setCuenta(null);
    else if (m?.estado === 'INICIADA' && !iniciadaRef.current) {
      iniciadaRef.current = true;
      setCuenta(0);
      onIniciada?.(m.matchId ?? salaId);
    }
  });

  // Baja la cuenta localmente entre mensajes
  useEffect(() => {
    if (cuenta == null || cuenta <= 0) return;
    const t = setTimeout(() => setCuenta((c) => (c == null ? c : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [cuenta]);

  // Derivados
  const equipos = useMemo(
    () => [...(detalle?.equipos ?? [])].sort((a, b) => a.numero - b.numero),
    [detalle]
  );
  const miEquipo = equipos.find((e) => (e.miembros ?? []).includes(userId));
  const yoListo = !!miEquipo && (miEquipo.listos ?? []).includes(userId);
  const nombreDe = (id) => (id === userId && username ? username.toUpperCase() : `JUGADOR ${corto(id)}`);

  const totalJugadores = detalle?.jugadores?.length ?? 0;
  const totalListos = equipos.reduce((n, e) => n + (e.listos?.length ?? 0), 0);

  const motivos = useMemo(() => {
    if (!detalle) return [];
    const r = [];
    const conJugadores = equipos.filter((e) => (e.miembros?.length ?? 0) > 0);
    if (conJugadores.length < MIN_EQUIPOS) r.push(`FALTAN EQUIPOS CON JUGADORES (${conJugadores.length} DE ${MIN_EQUIPOS})`);
    conJugadores.forEach((e) => {
      if (e.miembros.length < MIN_JUGADORES) r.push(`EL EQUIPO ${e.numero} NECESITA AL MENOS ${MIN_JUGADORES} JUGADORES`);
    });
    if (detalle.sinEquipo?.length) {
      r.push(`SIN EQUIPO: ${detalle.sinEquipo.map(nombreDe).join(', ')}`);
    }
    const faltan = conJugadores.flatMap((e) => e.miembros.filter((m) => !(e.listos ?? []).includes(m)));
    if (faltan.length) r.push(`FALTA MARCAR LISTO: ${faltan.map(nombreDe).join(', ')}`);
    return r;
  }, [detalle, equipos]);

  // Acciones
  const alternarListo = async () => {
    if (!miEquipo || ocupado) return;
    setOcupado(true); setAviso(null);
    try {
      const d = yoListo ? await desmarcarListo(salaId, userId) : await marcarListo(salaId, userId);
      if (d?.equipos) aplicarDetalle(d);
    } catch (e) {
      setAviso(e?.esConflicto ? 'LA PARTIDA YA INICIÓ' : 'NO SE PUDO CAMBIAR TU ESTADO');
    } finally { setOcupado(false); }
  };

  const cambiarEquipo = async (equipo) => {
    if (ocupado) return;
    setOcupado(true); setAviso(null);
    try {
      await unirseAEquipo(equipo.id, userId);
      Sesion.guardar('equipoId', equipo.id);
      const d = await detalleSala(salaId);
      aplicarDetalle(d);
    } catch (e) {
      setAviso(e?.esConflicto ? 'OTRO JUGADOR TOMÓ ESE CUPO PRIMERO' : 'NO SE PUDO CAMBIAR DE EQUIPO');
    } finally { setOcupado(false); }
  };

  const copiar = async () => {
    const codigo = codigoDe({ id: salaId });
    try { await navigator.clipboard.writeText(codigo); }
    catch {
      const t = document.createElement('textarea');
      t.value = codigo; document.body.appendChild(t); t.select();
      document.execCommand('copy'); t.remove();
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };

  const volver = async () => {
    // El back no tiene "salir de sala": al menos quitamos el listo
    if (yoListo) { try { await desmarcarListo(salaId, userId); } catch { /* nada */ } }
    onVolver?.();
  };

  const enCuenta = cuenta != null;

  return (
    <div className="pe-velo">
      <section className={`pe-panel ${enCuenta ? 'pe-panel--cuenta' : ''}`}>
        <h2 className="pe-titulo">{enCuenta ? '¡LA PARTIDA VA A COMENZAR!' : 'ESPERANDO EL INICIO'}</h2>

        {/* Código para compartir */}
        <div className="pe-codigo">
          <div className="pe-codigo__info">
            <span className="pe-codigo__etq">
              {esPrivada ? 'SALA PRIVADA · COMPARTE ESTE CÓDIGO' : 'CÓDIGO DE LA SALA'}
            </span>
            <span className="pe-codigo__valor">#{codigoDe({ id: salaId })}</span>
          </div>
          <button className="pe-boton pe-boton--oro pe-boton--chico" onClick={copiar}>
            {copiado ? '¡COPIADO!' : 'COPIAR'}
          </button>
        </div>

        {enCuenta ? (
          <div className="pe-cuenta">
            <span className="pe-cuenta__num">{Math.max(0, cuenta)}</span>
            <span className="pe-cuenta__txt">SI ALGUIEN SE DESMARCA, LA CUENTA SE CANCELA</span>
          </div>
        ) : (
          <p className="pe-regla">
            LA PARTIDA ARRANCA SOLA CUANDO HAY AL MENOS 2 EQUIPOS DE 2 JUGADORES Y TODOS ESTÁN LISTOS.
          </p>
        )}

        <div className="pe-contador">
          LISTOS <b>{totalListos}</b> DE <b>{totalJugadores}</b>
        </div>

        {/* Equipos */}
        <div className="pe-equipos">
          {equipos.map((e) => {
            const mio = e.id === miEquipo?.id;
            const lleno = (e.miembros?.length ?? 0) >= e.cupoMaximo;
            return (
              <div key={e.id} className={`pe-equipo ${mio ? 'pe-equipo--mio' : ''} ${e.listo ? 'pe-equipo--listo' : ''}`}>
                <div className="pe-equipo__cab">
                  <span>EQUIPO {e.numero}{mio ? ' (TÚ)' : ''}</span>
                  <span className="pe-equipo__cupo">{e.miembros?.length ?? 0}/{e.cupoMaximo}</span>
                </div>
                <ul className="pe-equipo__lista">
                  {(e.miembros ?? []).map((m) => {
                    const listo = (e.listos ?? []).includes(m);
                    return (
                      <li key={m} className={`pe-jugador ${listo ? 'pe-jugador--listo' : ''}`}>
                        <span className="pe-jugador__nombre">{nombreDe(m)}</span>
                        <span className="pe-jugador__estado">{listo ? '✓ LISTO' : 'NO LISTO'}</span>
                      </li>
                    );
                  })}
                  {(e.miembros?.length ?? 0) === 0 && <li className="pe-jugador pe-jugador--vacio">SIN JUGADORES</li>}
                </ul>
                {!mio && !lleno && !enCuenta && (
                  <button className="pe-cambiar" disabled={ocupado} onClick={() => cambiarEquipo(e)}>
                    CAMBIARME A ESTE EQUIPO
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Diagnóstico */}
        {!enCuenta && motivos.length > 0 && (
          <div className="pe-motivos">
            <span className="pe-motivos__titulo">¿POR QUÉ NO ARRANCA?</span>
            <ul>{motivos.map((m) => <li key={m}>{m}</li>)}</ul>
          </div>
        )}

        {aviso && <p className="pe-aviso">{aviso}</p>}

        <div className="pe-botones">
          <button className="pe-boton pe-boton--cafe" onClick={volver} disabled={enCuenta}>VOLVER</button>
          <button
            className={`pe-boton ${yoListo ? 'pe-boton--gris' : 'pe-boton--verde'}`}
            onClick={alternarListo}
            disabled={!miEquipo || ocupado || (enCuenta && cuenta <= 1)}
          >
            {yoListo ? 'YA NO ESTOY LISTO' : 'ESTOY LISTO'}
          </button>
        </div>
      </section>
    </div>
  );
}