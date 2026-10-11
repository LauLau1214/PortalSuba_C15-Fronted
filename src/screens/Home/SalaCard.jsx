import Icono from './Iconos';

export const codigoDe = (sala) => sala.id.slice(0, 4).toUpperCase();

export default function SalaCard({ sala, userId, miniatura, onEntrar }) {
  const llena = sala.jugadoresActuales >= sala.cupoTotal;
  const enPartida = sala.estado === 'EN_PARTIDA';
  const soyAnfitrion = sala.anfitrionId === userId;
  const lider = soyAnfitrion ? 'TÚ' : `JUGADOR ${sala.anfitrionId.slice(0, 4).toUpperCase()}`;
  const libres = sala.cupoTotal - sala.jugadoresActuales;
  const puedeEntrar = soyAnfitrion || (!llena && !enPartida);

  let estado = { texto: libres === 1 ? '1 CUPO LIBRE' : `${libres} CUPOS LIBRES`, clase: 'btn-marron' };
  if (enPartida) estado = { texto: 'EN PROGRESO', clase: 'btn-marron' };
  else if (llena) estado = { texto: 'SALA LLENA', clase: 'btn-rojo' };

  const cupos = Math.min(sala.cupoTotal, 8);

  return (
    <article className="sala">
      <span className="remache tl" /><span className="remache tr" />
      <span className="remache bl" /><span className="remache br" />

      <header className="sala__titulo">
        SALA #{codigoDe(sala)} - {sala.nombre.toUpperCase()}
      </header>

      <div className="sala__cuerpo">
        <div className="sala__mini">
          {miniatura && <img src={miniatura} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />}
        </div>
        <dl className="sala__datos">
          <div><dt>LÍDER:</dt><dd>{lider}</dd></div>
          <div>
            <dt>JUGADORES:</dt>
            <dd>
              {sala.jugadoresActuales}/{sala.cupoTotal}
              <span className="sala__cupos">
                {Array.from({ length: cupos }, (_, i) => (
                  <Icono key={i} nombre="persona" className={i < sala.jugadoresActuales ? 'lleno' : 'vacio'} />
                ))}
              </span>
            </dd>
          </div>
          <div><dt>EQUIPOS:</dt><dd>{sala.numEquipos} X {sala.jugadoresPorEquipo}</dd></div>
        </dl>
      </div>

      <footer className="sala__acciones">
        <button className="btn btn-verde" disabled={!puedeEntrar} onClick={() => onEntrar(sala)}>
          {soyAnfitrion ? 'ENTRAR' : 'UNIRSE'}
        </button>
        <span className={`btn ${estado.clase} btn-estado`}>{estado.texto}</span>
      </footer>
    </article>
  );
}