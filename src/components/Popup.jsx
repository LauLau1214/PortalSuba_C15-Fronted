import "./Popup.css";

export default function Popup({ titulo, onCerrar, children }) {
  return (
    <div className="popup-fondo" onClick={onCerrar}>
      <div className="panel popup" onClick={(e) => e.stopPropagation()}>
        <h2 className="popup-titulo">{titulo}</h2>
        {children}
      </div>
    </div>
  );
}