import { io } from "socket.io-client";

export function connectCanvas(canvasId, token) {
  return io({ auth: { canvasId, token }, autoConnect: false });
}
