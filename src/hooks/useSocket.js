import { useEffect, useRef, useState } from 'react';
import { socket } from '../services/socket';

export function useSubscription(destino, onMensaje) {
  const cbRef = useRef(onMensaje);
  cbRef.current = onMensaje;
  useEffect(() => {
    if (!destino) return;
    return socket.suscribir(destino, (data) => cbRef.current(data));
  }, [destino]);
}

export function useTopic(destino, callbackOInicial = null) {
  const esCallback = typeof callbackOInicial === 'function';
  const [valor, setValor] = useState(esCallback ? null : callbackOInicial);
  useSubscription(destino, (data) => {
    if (esCallback) callbackOInicial(data);
    else setValor(data);
  });
  return [valor, setValor];
}

export function useConexion() {
  const [ok, setOk] = useState(socket.conectado);
  useEffect(() => { socket.conectar(); return socket.onEstado(setOk); }, []);
  return ok;
}