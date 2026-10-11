const PATHS = {
  salas: 'M0 0h3v3H0zM5 0h3v3H5zM0 5h3v3H0zM5 5h3v3H5z',
  ranking: 'M1 0h6v2H1zM2 2h4v1H2zM3 3h2v2H3zM2 5h4v1H2zM1 6h6v2H1z',
  persona: 'M3 0h2v1H3zM2 1h4v2H2zM3 3h2v1H3zM1 4h6v1H1zM0 5h8v3H0z',
  ajustes: 'M3 0h2v1H3zM1 1h6v6H1zM0 3h1v2H0zM7 3h1v2H7zM3 7h2v1H3zM3 3h2v2H3z',
  sonido: 'M0 3h2v2H0zM2 2h1v4H2zM3 1h1v6H3zM5 2h1v1H5zM6 3h1v2H6zM5 5h1v1H5z',
  mute: 'M0 3h2v2H0zM2 2h1v4H2zM3 1h1v6H3zM5 2h1v1H5zM7 2h1v1H7zM6 3h1v2H6zM5 5h1v1H5zM7 5h1v1H7z',
  sobre: 'M0 1h8v1H0zM0 2h1v5H0zM7 2h1v5H7zM0 6h8v1H0zM1 2h1v1H1zM2 3h1v1H2zM3 4h2v1H3zM5 3h1v1H5zM6 2h1v1H6z',
  salir: 'M0 0h4v1H0zM0 1h1v6H0zM0 7h4v1H0zM2 3h4v2H2zM5 2h1v4H5zM6 3h1v2H6z',
  llave: 'M0 2h3v3H0zM3 3h5v1H3zM6 4h1v2H6zM4 4h1v1H4zM1 3h1v1H1z',
  candado: 'M2 0h4v1H2zM1 1h1v3H1zM6 1h1v3H6zM0 4h8v4H0zM3 5h2v2H3z',
  flecha: 'M3 1h1v1H3zM2 2h1v1H2zM1 3h6v2H1zM2 5h1v1H2zM3 6h1v1H3z',
  tarjeta: 'M0 1h8v6H0zM1 2h3v4H1zM5 2h2v1H5zM5 4h2v1H5z',
  izquierda: 'M5 0h1v1H5zM4 1h1v1H4zM3 2h1v1H3zM2 3h1v2H2zM3 5h1v1H3zM4 6h1v1H4zM5 7h1v1H5z',
  derecha: 'M2 0h1v1H2zM3 1h1v1H3zM4 2h1v1H4zM5 3h1v2H5zM4 5h1v1H4zM3 6h1v1H3zM2 7h1v1H2z',
  calavera: 'M2 0h4v1H2zM1 1h6v4H1zM2 2h1v1H2zM5 2h1v1H5zM2 5h4v1H2zM2 6h1v1H2zM5 6h1v1H5zM3 6h2v1H3z',
  check: 'M6 1h1v1H6zM5 2h1v1H5zM4 3h1v1H4zM1 3h1v1H1zM2 4h1v1H2zM3 4h1v1H3zM3 5h1v1H3z',
  info: 'M2 0h4v1H2zM1 1h1v1H1zM6 1h1v1H6zM0 2h1v4H0zM7 2h1v4H7zM1 6h1v1H1zM6 6h1v1H6zM2 7h4v1H2zM3 2h2v1H3zM3 3h2v3H3z',
  mundo: 'M2 0h4v1H2zM1 1h6v6H1zM2 7h4v1H2zM0 2h1v4H0zM7 2h1v4H7zM2 2h1v1H2zM4 3h2v2H4zM2 5h1v1H2z',
  mas: 'M3 1h2v2H3zM1 3h6v2H1zM3 5h2v2H3z',
  menos: 'M1 3h6v2H1z',
};

export default function Icono({ nombre, className = '' }) {
  return (
    <svg className={`icono-px ${className}`} viewBox="0 0 8 8" shapeRendering="crispEdges"
         fillRule="evenodd" aria-hidden="true">
      <path d={PATHS[nombre]} fill="currentColor" />
    </svg>
  );
}