import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../services/authApi';
import { salasApi } from '../../services/salasApi';
import { topics } from '../../config';
import { useConexion, useSubscription } from '../../hooks/useSocket';
import './Login.css';

const FONDO = '/assets/fondos/Fondo_Login.jpeg';
const LLAVE = '/assets/iconos/llave.png';

const LINEA = {
  esperando: '> ESPERANDO CREDENCIALES',
  verificando: '> VERIFICANDO',
  ok: '> ACCESO CONCEDIDO',
};

export default function Login() {
  const navigate = useNavigate();
  const conectado = useConexion();
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [estado, setEstado] = useState('esperando');
  const [mensaje, setMensaje] = useState('');
  const [salasActivas, setSalasActivas] = useState(null);

  useEffect(() => {
    if (authApi.sesionActual()) navigate('/home', { replace: true });
  }, [navigate]);

  // Contador de salas en tiempo real
  useEffect(() => {
    salasApi.listar().then((s) => setSalasActivas(s.length)).catch(() => {});
  }, []);
  useSubscription(topics.salas(), (salas) => setSalasActivas(salas.length));

  function limpiarError() {
    if (estado === 'error') setEstado('esperando');
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (estado === 'verificando' || estado === 'ok') return;
    if (!usuario.trim()) {
      setMensaje('INGRESE SU ID');
      setEstado('error');
      return;
    }
    setEstado('verificando');
    try {
      await authApi.login(usuario);
      setEstado('ok');
      setTimeout(() => navigate('/home'), 800);
    } catch (err) {
      setMensaje(err.status === 409 ? 'ID EN USO' : (err.message || 'ERROR').toUpperCase());
      setEstado('error');
    }
  }

  const linea = estado === 'error' ? `> ACCESO DENEGADO: ${mensaje}` : LINEA[estado];
  const textoBoton = { verificando: 'VERIFICANDO...', ok: 'ACCESO CONCEDIDO' }[estado] || 'DESBLOQUEAR ACCESO';

  return (
    <div className="login-root">
      <div className="login-stage" style={{ backgroundImage: `url(${FONDO})` }}>
        <div className="login-columna">
          <header className="login-logo">
            <h1 className="login-logo__titulo">
              PORTAL <span>15</span>
            </h1>
            <p className="login-logo__sub">CADA EQUIPO TIENE SU PROPIA SALIDA</p>
          </header>

          <form className="login-form" onSubmit={onSubmit} noValidate>
            <div className="login-monitor-wrap">
              <div className={`login-monitor ${estado === 'error' ? 'is-error' : ''}`}>
                <div className="login-monitor__pantalla">
                  <p className="login-monitor__titulo">
                    SISTEMA BLOQUEADO –<br />INGRESE CREDENCIALES
                  </p>

                  <label className="login-campo">
                    <span>ID DE USUARIO</span>
                    <input
                      value={usuario}
                      onChange={(e) => { setUsuario(e.target.value); limpiarError(); }}
                      maxLength={20}
                      autoComplete="username"
                      autoFocus
                      disabled={estado === 'verificando' || estado === 'ok'}
                    />
                  </label>

                  <label className="login-campo">
                    <span>CLAVE DE ACCESO</span>
                    <input
                      type="password"
                      value={clave}
                      onChange={(e) => { setClave(e.target.value); limpiarError(); }}
                      autoComplete="current-password"
                      disabled={estado === 'verificando' || estado === 'ok'}
                    />
                  </label>

                  <p className={`login-monitor__estado is-${estado}`} role="status">
                    {linea}
                    <span className="login-cursor">_</span>
                  </p>
                </div>

                <div className="login-monitor__lateral" aria-hidden="true">
                  <span /><span /><span /><span /><span />
                </div>
                <div className="login-monitor__controles" aria-hidden="true">
                  <span className="login-perilla" />
                  <span className={`login-led is-${estado}`} />
                </div>
              </div>

              <div className="login-etiqueta" aria-hidden="true">
                <img src={LLAVE} alt="" />
                <span>¡ESCAPE!</span>
              </div>
            </div>

            <div className="login-panel">
              <button type="submit" className={`login-boton is-${estado}`} disabled={estado === 'verificando'}>
                {textoBoton}
                <Candado abierto={estado === 'ok'} />
              </button>
              <button type="button" className="login-registro" onClick={() => navigate('/registro')}>
                ¿SIN CUENTA? REGISTRATE
              </button>
            </div>
          </form>
        </div>

        <footer className="login-footer">
          <span className="login-version">v1.0</span>
          <span className={`login-online ${conectado ? '' : 'is-off'}`}>
            {conectado
              ? `SISTEMA EN LÍNEA · ${salasActivas ?? '--'} SALAS ACTIVAS`
              : 'CONECTANDO AL SERVIDOR...'}
          </span>
        </footer>
      </div>
    </div>
  );
}

/** Candado pixel art; se abre cuando el acceso es concedido. */
function Candado({ abierto }) {
  return (
    <svg className="login-candado" viewBox="0 0 8 10" shapeRendering="crispEdges" aria-hidden="true">
      <g fill="currentColor">
        {abierto
          ? <path d="M1 0h4v1H1zM0 1h1v3H0zM5 1h1v1H5z" />
          : <path d="M2 0h4v1H2zM1 1h1v3H1zM6 1h1v3H6z" />}
        <path d="M0 4h8v6H0z" />
      </g>
      <path d="M3 6h2v2H3z" className="login-candado__ojo" />
    </svg>
  );
}