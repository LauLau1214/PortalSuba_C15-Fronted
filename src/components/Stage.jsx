export default function Stage({ fondo, relacion = 16 / 9, children }) {
  const estilo = { "--relacion": relacion };
  if (fondo) estilo.backgroundImage = `url(${fondo})`;

  return (
    <div className="stage-wrap">
      <div className="stage" style={estilo}>
        {children}
      </div>
    </div>
  );
}