import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: Server | null = null;

export function initSocket(server: HttpServer): Server {
  io = new Server(server, { cors: { origin: process.env.FRONTEND_URL! } });
  return io;
}

export function getIO(): Server | null {
  return io;
}
