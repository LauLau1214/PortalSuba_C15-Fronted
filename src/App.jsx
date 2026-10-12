import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import Login from "./screens/Login/Login";
import Home from "./screens/Home/Home";
import CrearSala from './screens/CrearSala/CrearSala';
import Partida from './screens/Partida/Partida';
import RetoHeroeVerdugo from './screens/RetoHeroeVerdugo/RetoHeroeVerdugo';
import Resumen from './screens/Resumen/Resumen';

const Pendiente = ({ nombre }) => <h1 style={{ color: "white" }}>{nombre} (pendiente)</h1>;

function LoginRuta() {
  const navigate = useNavigate();
  return (
    <Login
      onExito={(usuario) => {
        sessionStorage.setItem("usuario", JSON.stringify(usuario)); // { userId, username }
        navigate("/home");
      }}
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginRuta />} />
        <Route path="/home" element={<Home />} />
        <Route path="/crear-sala" element={<CrearSala />} />
        <Route path="/partida/:salaId" element={<Partida />} />
        <Route path="/sala/:salaId" element={<Partida />} />
        <Route path="/reto/:matchId" element={<RetoHeroeVerdugo />} />m
        <Route path="/resumen/:matchId" element={<Resumen />} />
      </Routes>
    </BrowserRouter>
  );
}