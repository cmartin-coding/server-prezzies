import { Server, Socket } from "socket.io";
import { Card, ClientRoom, Deck, PlayerType } from "./types";
import { Client } from "socket.io/dist/client";

export interface ServerToClientEvents {
  noArg: () => void;
  basicEmit: (a: number, b: string, c: Buffer) => void;
  withAck: (d: string, callback: (e: number) => void) => void;
  onCreatedRoom: (params: { room: ClientRoom; player: PlayerType }) => void;
  onJoinedRoom: (params: { room: ClientRoom; player: PlayerType }) => void;
  onUpdateRoom: (params: { updatedRoom: ClientRoom }) => void;
  onReadyUp: (params: {
    updatedRoom: ClientRoom;
    updatedPlayer: PlayerType;
  }) => void;
  onPlayedHand: (params: {
    updatedRoom: ClientRoom;
    updatedPlayer: PlayerType;
  }) => void;
  onSendErrorMessage: (params: { errorMessage: string }) => void;
  onBroadcastMessage: (params: { message: string }) => void;
}
export interface ClientToServerEvents {
  createRoom: (params: {
    roomName: string;
    userName: string;
    numberOfPlayers: number;
  }) => void;
  joinRoom: (params: { roomName: string; userName: string }) => void;
  readyUp: (params: {
    player: PlayerType;
    room: ClientRoom;
    readyUpStatus: boolean;
  }) => void;
  playHand: (params: {
    hand: Card[];
    player: PlayerType;
    room: ClientRoom;
  }) => void;
}

export type SocketType = Socket<ServerToClientEvents, ClientToServerEvents>;
