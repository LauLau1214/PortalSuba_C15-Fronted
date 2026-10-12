import { Client } from '@stomp/stompjs';
import { config } from '../config';


const subs = new Map();
const pendientes = [];
const listenersEstado = new Set();
let seq = 0;
let conectado = false;

const client = new Client({
  brokerURL: config.wsUrl,
  reconnectDelay: 2000,
  heartbeatIncoming: 10000,
  heartbeatOutgoing: 10000,
  onConnect: () => {
    setEstado(true);
    subs.forEach((s) => (s.stompSub = suscribirReal(s.destino, s.cb)));
    while (pendientes.length) client.publish(pendientes.shift());
  },
  onWebSocketClose: () => setEstado(false),
  onStompError: (f) => console.error('[STOMP]', f.headers.message),
});

function setEstado(v) {
  conectado = v;
  listenersEstado.forEach((fn) => fn(v));
}

function suscribirReal(destino, cb) {
  return client.subscribe(destino, (msg) => {
    let data = msg.body;
    try { data = JSON.parse(msg.body); } catch { /* texto plano */ }
    cb(data);
  });
}

export const socket = {
  conectar() {
    if (!client.active) client.activate();
  },
  desconectar() {
    subs.clear();
    return client.deactivate();
  },
  suscribir(destino, cb) {
    this.conectar();
    const id = ++seq;
    const s = { destino, cb, stompSub: conectado ? suscribirReal(destino, cb) : null };
    subs.set(id, s);
    return () => {
      s.stompSub?.unsubscribe();
      subs.delete(id);
    };
  },
  enviar(destino, body = {}) {
    const frame = { destination: destino, body: JSON.stringify(body) };
    if (conectado) client.publish(frame);
    else { pendientes.push(frame); this.conectar(); }
  },
  onEstado(fn) {
    listenersEstado.add(fn);
    fn(conectado);
    return () => listenersEstado.delete(fn);
  },
  get conectado() { return conectado; },
};