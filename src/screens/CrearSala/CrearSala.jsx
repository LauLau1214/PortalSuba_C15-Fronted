import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icono from '../Home/Iconos';
import { useTopic } from '../../hooks/useSocket';
import { listarSalas, crearSala, configurarSala, unirseASala } from '../../services/salasApi';
import { Sesion } from '../../services/sesion';
import './CrearSala.css';
import { topics } from '../../config';

const FONDO = '/assets/fondos/Fondo_Lobby.jpeg';

const TEMATICAS = [
  { id: 'mazmorra', nombre: 'MAZMORRA', imagen: '/assets/salas/sala_1.png', dificultad: 3 },
  { id: 'biblioteca', nombre: 'BIBLIOTECA', imagen: '/assets/salas/sala_2.png', dificultad: 2 },
  { id: 'laboratorio', nombre: 'LABORATORIO', imagen: '/assets/salas/sala_3.png', dificultad: 4 },
  { id: 'sotano', nombre: 'SÓTANO OSCURO', imagen: '/assets/salas/sala_4.png', dificultad: 5 },
];
const TIEMPOS = [10, 15, 30, 45];
const NIVELES = ['', 'MUY FÁCIL', 'FÁCIL', 'MEDIA', 'DIFÍCIL', 'EXTREMA'];
const MAX_NOMBRE = 24;
const MIN_JUGADORES = 2;
const MAX_JUGADORES = 4;
const NUM_EQUIPOS = 2;

export default function CrearSala() {
  const navegar = useNavigate();
  const userId = Sesion.userId;

  const [nombre, setNombre] = useState('');
  const [tematica, setTematica] = useState(0);
  const [tiempo, setTiempo] = useState(15);
  const [jugadores, setJugadores] = useState(2);
  const [dificultad, setDificultad] = useState(TEMATICAS[0].dificultad);
  const [visibilidad, setVisibilidad] = useState('publica');
  const [salas, setSalas] = useState([]);
  const [error, setError] = useState('');
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    if (!userId) navegar('/');
  }, [userId, navegar]);

  // Catálogo en vivo para validar que el nombre no esté repetido
  useEffect(() => {
    listarSalas().then(setSalas).catch(() => {});
  }, []);
    useTopic(topics.salas(), setSalas);

  const tema = TEMATICAS[tematica];
  const nombreLimpio = nombre.trim();
  const repetido = useMemo(
    () => salas.some((s) => s.nombre.trim().toLowerCase() === nombreLimpio.toLowerCase()),
    [salas, nombreLimpio]
  );

  function cambiarTematica(paso) {
    const i = (tematica + paso + TEMATICAS.length) % TEMATICAS.length;
    setTematica(i);
    setDificultad(TEMATICAS[i].dificultad); // la dificultad sugerida se aplica al cambiar
  }

  async function crear() {
    if (!nombreLimpio) return setError('PONLE UN NOMBRE A LA SALA');
    if (repetido) return setError('YA EXISTE UNA SALA CON ESE NOMBRE');

    setError('');
    setCreando(true);
    try {
      // 1. Crear (el back la crea con 2 equipos x 4 por defecto)
      const sala = await crearSala(nombreLimpio, userId);
      // 2. Ajustar cupo si cambió
      if (jugadores !== 4) await configurarSala(sala.id, userId, NUM_EQUIPOS, jugadores);
      // 3. El back no mete al anfitrión automáticamente
      await unirseASala(sala.id, userId);

      // Lo que el back aún no guarda (temática, tiempo, dificultad, visibilidad)
      Sesion.guardar('salaId', sala.id);
      Sesion.guardar('configSala', {
        salaId: sala.id,
        tematica: tema.id,
        minutos: tiempo,
        dificultad,
        visibilidad,
      });
      navegar(`/sala/${sala.id}`);
    } catch (e) {
      setError((e.message || 'NO SE PUDO CREAR LA SALA').toUpperCase());
      setCreando(false);
    }
  }

  function cerrarSesion() {
    Sesion.limpiar();
    navegar('/');
  }

  if (!userId) return null;

  return (
    <div className="cs-root">
      <div className="cs-stage" style={{ backgroundImage: `url(${FONDO})` }}>
        {/* Esquinas */}
        <button className="cs-esquina cs-tl" onClick={() => navegar('/home')} title="Volver">
          <Icono nombre="izquierda" />
        </button>
        <button className="cs-esquina cs-tr cs-rojo" onClick={cerrarSesion} title="Cerrar sesión">
          <Icono nombre="salir" />
        </button>
        <button className="cs-esquina cs-bl cs-chica" onClick={() => navegar('/home')} title="Volver">
          <Icono nombre="flecha" />
        </button>
        <button className="cs-esquina cs-br cs-chica cs-rojo" onClick={cerrarSesion} title="Cerrar sesión">
          <Icono nombre="salir" />
        </button>

        <h1 className="cs-titulo">CREAR SALA</h1>

        <div className="cs-cuerpo">
          {/* ============ COLUMNA IZQUIERDA ============ */}
          <div className="cs-col">
            <section className="cs-panel cs-panel-izq">
              <span className="remache tl" /><span className="remache tr" />
              <span className="remache bl" /><span className="remache br" />

              <label className="cs-label" htmlFor="cs-nombre">NOMBRE DE LA SALA</label>
              <div className={`cs-input ${repetido ? 'is-error' : ''}`}>
                <input
                  id="cs-nombre"
                  value={nombre}
                  maxLength={MAX_NOMBRE}
                  autoFocus
                  placeholder="Sala de los valientes"
                  onChange={(e) => { setNombre(e.target.value); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && crear()}
                />
                <span className="cs-contador">{nombre.length}/{MAX_NOMBRE}</span>
              </div>
              <p className={`cs-ayuda ${repetido ? 'is-error' : ''}`}>
                {repetido ? 'ESE NOMBRE YA ESTÁ EN EL CATÁLOGO' : `MÁX. ${MAX_NOMBRE} CARACTERES · DEBE SER ÚNICO EN EL CATÁLOGO`}
              </p>

              <p className="cs-label">TEMÁTICA</p>
              <div className="cs-carrusel">
                <button className="cs-flecha" onClick={() => cambiarTematica(-1)} aria-label="Temática anterior">
                  <Icono nombre="izquierda" />
                </button>

                <div className="cs-mapa">
                  <div className="cs-mapa__marco">
                    {/* key fuerza la animación al cambiar */}
                    <img key={tema.id} src={tema.imagen} alt={tema.nombre}
                         onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
                  </div>
                  <p className="cs-mapa__nombre">{tema.nombre}</p>
                  <div className="cs-mapa__puntos">
                    TEMÁTICA {tematica + 1} DE {TEMATICAS.length}
                    {TEMATICAS.map((t, i) => (
                      <button key={t.id} className={i === tematica ? 'activo' : ''}
                              onClick={() => { setTematica(i); setDificultad(t.dificultad); }}
                              aria-label={t.nombre} />
                    ))}
                  </div>
                </div>

                <button className="cs-flecha" onClick={() => cambiarTematica(1)} aria-label="Temática siguiente">
                  <Icono nombre="derecha" />
                </button>
              </div>

              <p className="cs-label cs-sugerida">
                DIFICULTAD SUGERIDA: {tema.dificultad}/5
                <Calaveras valor={tema.dificultad} />
              </p>
            </section>

            <div className="cs-panel-boton">
              <button className="cs-crear" onClick={crear} disabled={creando}>
                <Icono nombre="check" /> {creando ? 'CREANDO...' : 'CREAR SALA'}
              </button>
              {error && <p className="cs-error">{error}</p>}
            </div>
          </div>

          {/* ============ COLUMNA DERECHA ============ */}
          <div className="cs-col">
            <section className="cs-panel cs-panel-der">
              <span className="remache tl" /><span className="remache tr" />
              <span className="remache bl" /><span className="remache br" />
              <p className="cs-pestana">CONFIGURACIÓN</p>

              <p className="cs-label">TIEMPO DE LA PARTIDA</p>
              <div className="cs-opciones cs-cuatro">
                {TIEMPOS.map((m) => (
                  <button key={m} className={`cs-opcion ${tiempo === m ? 'activa' : ''}`} onClick={() => setTiempo(m)}>
                    {m} MIN
                  </button>
                ))}
              </div>

              <div className="cs-fila">
                <p className="cs-label">JUGADORES POR EQUIPO</p>
                <span className="cs-nota">MÍN. {MIN_JUGADORES} · MÁX. {MAX_JUGADORES}</span>
              </div>
              <div className="cs-stepper">
                <button className="cs-opcion" disabled={jugadores <= MIN_JUGADORES}
                        onClick={() => setJugadores(jugadores - 1)} aria-label="Menos">
                  <Icono nombre="menos" />
                </button>
                <span className="cs-stepper__valor">{jugadores}</span>
                <button className="cs-opcion" disabled={jugadores >= MAX_JUGADORES}
                        onClick={() => setJugadores(jugadores + 1)} aria-label="Más">
                  <Icono nombre="mas" />
                </button>
              </div>

              <div className="cs-fila">
                <p className="cs-label">DIFICULTAD</p>
                <span className="cs-nota cs-nota-clara">{dificultad}/5 · {NIVELES[dificultad]}</span>
              </div>
              <div className="cs-calaveras">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} className={n <= dificultad ? 'llena' : ''} onClick={() => setDificultad(n)}
                          aria-label={`Dificultad ${n}`}>
                    <Icono nombre="calavera" />
                  </button>
                ))}
              </div>

              <p className="cs-label">VISIBILIDAD</p>
              <div className="cs-opciones cs-dos">
                <button className={`cs-opcion ${visibilidad === 'publica' ? 'activa' : ''}`} onClick={() => setVisibilidad('publica')}>
                  <Icono nombre="mundo" /> PÚBLICA
                </button>
                <button className={`cs-opcion ${visibilidad === 'privada' ? 'activa' : ''}`} onClick={() => setVisibilidad('privada')}>
                  <Icono nombre="candado" /> PRIVADA
                </button>
              </div>
            </section>

            <section className="cs-resumen">
              <p className="cs-resumen__tag">RESUMEN</p>
              <p className="cs-resumen__linea">
                {tema.nombre} · {tiempo} MIN · {jugadores} VS {jugadores}
              </p>
              <p className="cs-resumen__detalle">
                TOTAL: {jugadores * NUM_EQUIPOS} JUGADORES · DIFICULTAD {dificultad}/5 · {visibilidad === 'publica' ? 'PÚBLICA' : 'PRIVADA'}
              </p>
            </section>

            <p className="cs-info">
              <Icono nombre="info" />
              LOS ROLES (HÉROE / VERDUGO) SE ASIGNAN AL AZAR CUANDO EMPIEZA LA PARTIDA.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Calaveras({ valor }) {
  return (
    <span className="cs-mini-calaveras">
      {[1, 2, 3, 4, 5].map((n) => (
        <Icono key={n} nombre="calavera" className={n <= valor ? 'llena' : ''} />
      ))}
    </span>
  );
}