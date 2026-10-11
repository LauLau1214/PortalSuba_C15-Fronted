import { useState } from 'react';
import Icono from '../Home/Iconos';
import { gameplayApi } from '../../services/gameplayApi';
import { numeroDe } from './MapaIso';

export default function ModalAcertijo({ dto, matchId, userId, onCerrar, onResuelto }) {
  const [valores, setValores] = useState({});
  const [resultado, setResultado] = useState(dto.resuelto ? { correcto: true, mensaje: 'TU EQUIPO YA RESOLVIÓ ESTE ACERTIJO' } : null);
  const [enviando, setEnviando] = useState(false);
  const [sacudir, setSacudir] = useState(false);
  const resuelto = dto.resuelto || resultado?.correcto;

  function respuesta() {
    return dto.elementos.flatMap((el) => {
      const v = (valores[el.id] || '').trim();
      if (el.tipo === 'lista-ordenable') return v.split(',').map((p) => p.trim()).filter(Boolean);
      return v ? [v] : [];
    });
  }

  async function enviar() {
    const r = respuesta();
    if (!r.length) return setResultado({ correcto: false, mensaje: 'ESCRIBE UNA RESPUESTA' });
    setEnviando(true);
    try {
      const res = await gameplayApi.enviarSolucion(matchId, dto.componenteMapaId, userId, r);
      setResultado({ correcto: res.correcto, mensaje: res.mensaje.toUpperCase() });
      if (res.correcto) onResuelto(dto.componenteMapaId);
      else { setSacudir(true); setTimeout(() => setSacudir(false), 400); }
    } catch (e) {
      setResultado({
        correcto: false,
        mensaje: e.esConflicto ? 'OTRO COMPAÑERO TOMÓ ESTE ACERTIJO' : e.message.toUpperCase(),
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pm-modal-fondo" onKeyDown={(e) => e.key === 'Escape' && onCerrar()}>
      <div className={`pm-acertijo ${sacudir ? 'sacudir' : ''}`} role="dialog" aria-modal="true">
        <header className="pm-acertijo__cabeza">
          <Icono nombre="llave" /> ACERTIJO {numeroDe(dto.componenteMapaId)}
          <span className={`pm-acertijo__estado ${resuelto ? 'ok' : ''}`}>{resuelto ? 'RESUELTO' : 'BLOQUEADO PARA TI'}</span>
        </header>

        <p className="pm-acertijo__enunciado">{dto.enunciado}</p>

        {!resuelto && dto.elementos.map((el) => (
          <label key={el.id} className="pm-acertijo__campo">
            <span>{el.descripcion.toUpperCase()}</span>
            <input
              type={el.tipo === 'campo-numero' ? 'number' : 'text'}
              value={valores[el.id] || ''}
              autoFocus
              placeholder={el.tipo === 'lista-ordenable' ? 'SEPARA CON COMAS: rojo, naranja, ...' : 'TU RESPUESTA'}
              onChange={(e) => { setValores({ ...valores, [el.id]: e.target.value }); setResultado(null); }}
              onKeyDown={(e) => e.key === 'Enter' && enviar()}
            />
          </label>
        ))}

        {resultado && (
          <p className={`pm-acertijo__resultado ${resultado.correcto ? 'ok' : 'mal'}`}>{resultado.mensaje}</p>
        )}

        <div className="pm-acertijo__botones">
          <button className="pm-btn pm-btn-marron" onClick={onCerrar}>{resuelto ? 'CERRAR' : 'SALIR'}</button>
          {!resuelto && (
            <button className="pm-btn pm-btn-verde" onClick={enviar} disabled={enviando}>
              {enviando ? 'VALIDANDO...' : 'ENVIAR'}
            </button>
          )}
        </div>
        <p className="pm-acertijo__nota">MIENTRAS LO TENGAS ABIERTO, TUS COMPAÑEROS NO PUEDEN ABRIRLO NI PUEDES MOVERTE.</p>
      </div>
    </div>
  );
}