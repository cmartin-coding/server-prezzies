import { Server, Socket } from "socket.io";
import { Card, ClientRoom, Deck, PlayerType, RoomType } from "./types";
import { Client } from "socket.io/dist/client";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export type IOType = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  DefaultEventsMap,
  any
>;

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

  onCompletedIt: (params: {
    updatedPlayer: PlayerType;
    updatedRoom: ClientRoom;
  }) => void;
  onGameIsOver: (params: { updatedRoom: ClientRoom }) => void;
  onLastPlaceUpdated: (params: { updatedPlayer: PlayerType }) => void;
  onPassedTurn: (params: { updatedRoom: ClientRoom }) => void;
  onUpdatePlayerAfterGameCompleted: (params: {
    updatedPlayer: PlayerType;
  }) => void;
  onEnteredPostGameLobby: (params: { updatedRoom: ClientRoom }) => void;
  onUpdatePlayer: (params: { updatedPlayer: PlayerType }) => void;
  onTest: (params: { serverRoom: any }) => void;
  onTradingCompleted: (params: {
    isTradingCompleted: boolean;
    room: ClientRoom;
  }) => void;
  onAllPlayersReady: (params: {
    shouldStartGame: boolean;
    room: ClientRoom;
  }) => void;
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
  passTurn: (params: { room: ClientRoom; player: PlayerType }) => void;
  completedIt: (params: {
    player: PlayerType;
    room: ClientRoom;
    completedItHand: Card[];
  }) => void;

  enteredPostGameLobby: (player: PlayerType, room: ClientRoom) => void;
  selectHandInPostGameLobby: (params: {
    player: PlayerType;
    room: ClientRoom;
    hand: { id: string }[] & Partial<Card>[];
  }) => void;
  test: () => void;
  tradeHand: (params: {
    player: PlayerType;
    room: ClientRoom;
    cardsToTrade: Card[];
  }) => void;
  leaveGameFromLobby: (params: {
    room: ClientRoom;
    player: PlayerType;
  }) => void;
  leaveGameFromCardTable: (params: {
    room: ClientRoom;
    player: PlayerType;
  }) => void;
}

export type SocketType = Socket<ServerToClientEvents, ClientToServerEvents>;
