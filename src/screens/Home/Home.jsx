import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SalaCard, { codigoDe } from './SalaCard';
import Icono from './Iconos';
import { useTopic } from '../../hooks/useSocket';
import { listarSalas, crearSala, unirseASala } from '../../services/salasApi';
import { Sesion } from '../../services/sesion';
import './Home.css';
import { topics } from '../../config';

const FONDO = '/assets/fondos/Fondo_Lobby.jpeg';
const AVATAR = '/assets/avatares/avatar_1.png';
const MINIATURAS = [
  '/assets/salas/sala_1.png',
  '/assets/salas/sala_2.png',
  '/assets/salas/sala_3.png',
  '/assets/salas/sala_4.png',
];

const TABS = [
  { id: 'salas', texto: 'SALAS', icono: 'salas' },
  { id: 'ranking', texto: 'RANKING', icono: 'ranking' },
  { id: 'amigos', texto: 'AMIGOS', icono: 'persona' },
  { id: 'ajustes', texto: 'AJUSTES', icono: 'ajustes' },
];

export default function Home() {
  const navegar = useNavigate();
  const userId = Sesion.userId;
  const username = Sesion.username;

  const [salas, setSalas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState('');
  const [silenciado, setSilenciado] = useState(false);
  const [tabChat, setTabChat] = useState('mensajes');
  const [codigo, setCodigo] = useState(['', '', '', '']);
  const [popup, setPopup] = useState(false);
  const [nombreSala, setNombreSala] = useState('');
  const [errorCrear, setErrorCrear] = useState('');
  const [creando, setCreando] = useState(false);
  const temporizador = useRef(null);
  const casillas = useRef([]);

  // Sin sesión, de vuelta al login
  useEffect(() => {
    if (!userId) navegar('/');
  }, [userId, navegar]);

  // Carga inicial por REST
  useEffect(() => {
    listarSalas()
      .then(setSalas)
      .catch((e) => avisar(e.message))
      .finally(() => setCargando(false));
  }, []);

  // En vivo: el back manda la lista completa cada vez que algo cambia
   useTopic(topics.salas(), setSalas);

  function avisar(texto) {
    setAviso(texto);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setAviso(''), 3500);
  }

  async function entrar(sala) {
    try {
      // El anfitrión ya está dentro; los demás se unen
      if (sala.anfitrionId !== userId) await unirseASala(sala.id, userId);
      Sesion.guardar('salaId', sala.id);
      navegar(`/sala/${sala.id}`);
    } catch (e) {
      // 409 = sala llena (otro jugador entró primero)
      avisar(e.esConflicto ? 'La sala se llenó, prueba con otra' : e.message);
    }
  }

  // ----- Unirse por código -----
  function escribirCodigo(i, valor) {
    const letra = valor.slice(-1).toUpperCase().replace(/[^0-9A-F]/, '');
    const nuevo = [...codigo];
    nuevo[i] = letra;
    setCodigo(nuevo);
    if (letra && i < 3) casillas.current[i + 1]?.focus();
  }
  function teclaCodigo(i, e) {
    if (e.key === 'Backspace' && !codigo[i] && i > 0) casillas.current[i - 1]?.focus();
    if (e.key === 'Enter') unirsePorCodigo();
  }
  function unirsePorCodigo() {
    const texto = codigo.join('');
    if (texto.length < 4) return avisar('El código tiene 4 caracteres');
    const sala = salas.find((s) => codigoDe(s) === texto);
    if (!sala) return avisar(`No existe una sala con el código ${texto}`);
    entrar(sala);
  }

  // ----- Crear sala -----
  function abrirCrear() {
    navegar('/crear-sala');
  }

  async function crear() {
    const nombre = nombreSala.trim();
    if (!nombre) return setErrorCrear('Ponle un nombre a la sala');

    setCreando(true);
    try {
      const sala = await crearSala(nombre, userId);
      // El back no mete al anfitrión en la sala automáticamente: hay que unirlo
      await unirseASala(sala.id, userId);
      Sesion.guardar('salaId', sala.id);
      navegar(`/sala/${sala.id}`);
    } catch (e) {
      setErrorCrear(e.message);
      setCreando(false);
    }
  }

  function cerrarSesion() {
    Sesion.limpiar();
    navegar('/');
  }

  if (!userId) return null;

  const total = Math.max(4, salas.length + (salas.length % 2));
  const vacias = cargando ? 0 : total - salas.length;

  return (
    <div className="home-root">
      <div className="home-stage" style={{ backgroundImage: `url(${FONDO})` }}>
        {/* ================= BARRA LATERAL ================= */}
        <aside className="lateral">
          {/* Identificación */}
          <section className="placa placa-id">
            <p className="placa__rotulo">IDENTIFIC.</p>
            <div className="carnet">
              <div className="carnet__barra"><Icono nombre="tarjeta" /> IDENTIFIC.</div>
              <div className="carnet__cuerpo">
                <div className="carnet__avatar">
                  <span>{username?.[0]?.toUpperCase()}</span>
                  <img src={AVATAR} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
                </div>
                <div className="carnet__datos">
                  <p className="carnet__nombre">{username}</p>
                  <p className="carnet__rango">SOBREVIVIENTE</p>
                  <hr />
                  <p className="carnet__puntos"><Icono nombre="llave" /> PUNTOS: 0</p>
                </div>
              </div>
            </div>
          </section>

          {/* Mensajes / amigos (fuera del sprint 1: solo maqueta) */}
          <section className="placa placa-chat">
            <div className="chat-tabs">
              <button className={tabChat === 'mensajes' ? 'activa' : ''} onClick={() => setTabChat('mensajes')}>MENSAJES</button>
              <button className={tabChat === 'amigos' ? 'activa' : ''} onClick={() => setTabChat('amigos')}>AMIGOS</button>
            </div>
            <div className="chat-lista" title="Disponible en una próxima versión">
              {[0, 1].map((i) => (
                <div className="chat-fila" key={i}>
                  <span className="chat-avatar" />
                  <span className={`chat-punto ${i === 0 ? 'on' : 'off'}`} />
                  <span className="chat-lineas"><i /><i /></span>
                </div>
              ))}
              <span className="chat-scroll" />
            </div>
          </section>

          {/* Unirse por código */}
          <section className="placa placa-codigo">
            <p className="codigo-titulo"><Icono nombre="llave" /> UNIRSE POR CÓDIGO</p>
            <p className="codigo-ayuda">EL CÓDIGO APARECE EN EL TÍTULO DE CADA SALA</p>
            <div className="codigo-casillas">
              {codigo.map((letra, i) => (
                <input
                  key={i}
                  ref={(el) => (casillas.current[i] = el)}
                  value={letra}
                  placeholder="-"
                  maxLength={2}
                  onChange={(e) => escribirCodigo(i, e.target.value)}
                  onKeyDown={(e) => teclaCodigo(i, e)}
                  className={letra ? 'llena' : ''}
                />
              ))}
            </div>
            <button className="btn btn-verde btn-ancho" onClick={unirsePorCodigo}>
              <Icono nombre="candado" /> UNIRSE
            </button>
          </section>

          {/* Crear sala */}
          <section className="placa placa-crear">
            <div className="peligro">
              <button className="btn-crear" onClick={abrirCrear}>+ CREAR SALA</button>
            </div>
          </section>
        </aside>

        {/* ================= CONTENIDO ================= */}
        <main className="contenido">
          <p className="rotulo-nav">NAVEGACIÓN</p>
          <nav className="nav">
            <div className="tabs">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  className={`tab ${t.id === 'salas' ? 'activa' : ''}`}
                  onClick={() => t.id !== 'salas' && avisar(`${t.texto} no está disponible en esta versión`)}
                >
                  <Icono nombre={t.icono} /> {t.texto}
                </button>
              ))}
            </div>
            <button className="icono-btn" onClick={() => setSilenciado(!silenciado)}
                    title={silenciado ? 'Activar sonido' : 'Silenciar'}>
              <Icono nombre={silenciado ? 'mute' : 'sonido'} />
            </button>
            <button className="icono-btn" onClick={() => avisar('El chat no está disponible en esta versión')}
                    title="Mensajes">
              <Icono nombre="sobre" />
            </button>
            <button className="cerrar" onClick={cerrarSesion}>
              <Icono nombre="salir" /><span>CERRAR<br />SESIÓN</span>
            </button>
          </nav>

          <h1 className="titulo-salas">SALAS DISPONIBLES</h1>

          <div className="grid-salas">
            {cargando && <p className="mensaje-grid">CARGANDO SALAS...</p>}

            {!cargando && salas.map((sala, i) => (
              <SalaCard
                key={sala.id}
                sala={sala}
                userId={userId}
                miniatura={MINIATURAS[i % MINIATURAS.length]}
                onEntrar={entrar}
              />
            ))}

            {Array.from({ length: vacias }, (_, i) => (
              <button key={'v' + i} className="sala vacia" onClick={abrirCrear}>
                <span>ESPACIO LIBRE</span>
                <small>+ CREAR UNA SALA</small>
              </button>
            ))}
          </div>
        </main>

        <button className="volver" onClick={cerrarSesion} title="Volver al inicio">
          <Icono nombre="flecha" />
        </button>

        {/* ================= POPUP CREAR SALA ================= */}
        {popup && (
          <div className="popup-fondo" onClick={() => !creando && setPopup(false)}>
            <div className="popup" onClick={(e) => e.stopPropagation()}>
              <header className="sala__titulo">NUEVA SALA</header>
              <input
                className="popup-input"
                value={nombreSala}
                maxLength={30}
                autoFocus
                placeholder="NOMBRE DE LA SALA"
                onChange={(e) => setNombreSala(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && crear()}
              />
              <p className="popup-error">{errorCrear}</p>
              <div className="popup-botones">
                <button className="btn btn-marron" onClick={() => setPopup(false)} disabled={creando}>CANCELAR</button>
                <button className="btn btn-verde" onClick={crear} disabled={creando}>
                  {creando ? 'CREANDO...' : 'CREAR'}
                </button>
              </div>
            </div>
          </div>
        )}

        {aviso && <div className="aviso">{aviso}</div>}
      </div>
    </div>
  );
}