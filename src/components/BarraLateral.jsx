import { useState } from "react";
import "./BarraLateral.css";

export default function BarraLateral({ username, onCrearSala, onAviso }) {
  const [pestana, setPestana] = useState("mensajes");
  const [codigo, setCodigo] = useState(["", "", "", ""]);
  const inicial = (username || "?").charAt(0).toUpperCase();

  function cambiarLetra(i, valor) {
    const letra = valor.slice(-1).toUpperCase();
    setCodigo((c) => c.map((x, j) => (j === i ? letra : x)));
    if (letra) document.getElementById(`cod-${i + 1}`)?.focus();
  }

  return (
    <aside className="barra">
      {/* Carnet */}
      <section className="panel perfil">
        <h2 className="panel-titulo">IDENTIFICACIÓN</h2>
        <div className="carnet">
          <div className="carnet-cab">▣ IDENTIFICACIÓN</div>
          <div className="carnet-cuerpo">
            <div className="avatar">{inicial}</div>
            <div className="carnet-datos">
              <strong title={username}>{username}</strong>
              <span>SOBREVIVIENTE</span>
              <span className="puntos">🗝 PUNTOS: --</span>
            </div>
          </div>
        </div>
      </section>

      {/* Mensajes / Amigos (decorativo: el chat aún no existe en el back) */}
      <section className="panel chat">
        <div className="chat-tabs">
          <button className={pestana === "mensajes" ? "activa" : ""}
                  onClick={() => setPestana("mensajes")}>MENSAJES</button>
          <button className={pestana === "amigos" ? "activa" : ""}
                  onClick={() => setPestana("amigos")}>AMIGOS</button>
        </div>
        <div className="chat-lista" aria-hidden="true">
          {["ok", "off", "ok"].map((estado, i) => (
            <div className="chat-fila" key={i}>
              <i className={"punto " + estado} />
              <div className="barras"><b /><b /></div>
            </div>
          ))}
        </div>
      </section>

      {/* Unirse por código (decorativo: el back no tiene códigos de sala) */}
      <section className="panel codigo">
        <h2 className="panel-titulo">🗝 UNIRSE POR CÓDIGO</h2>
        <p className="codigo-ayuda">INGRESA EL CÓDIGO DE LA SALA</p>
        <div className="casillas">
          {codigo.map((letra, i) => (
            <input key={i} id={`cod-${i}`} value={letra} maxLength={2}
                   onChange={(e) => cambiarLetra(i, e.target.value)} />
          ))}
        </div>
        <button className="btn btn-verde"
                onClick={() => onAviso("Unirse por código aún no está disponible")}>
          🔒 UNIRSE
        </button>
      </section>

      {/* Crear sala */}
      <section className="panel crear">
        <div className="franjas">
          <button className="btn-crear" onClick={onCrearSala}>+ CREAR SALA</button>
        </div>
      </section>
    </aside>
  );
}