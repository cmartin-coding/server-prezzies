import { Server, Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import {
  ClientAdjustedPlayer,
  ClientRoom,
  PlayerType,
  RoomType,
  SocketListenerRoomType,
} from "../types";
import { randomUUID } from "crypto";
import { rooms } from "..";
import {
  generateClientRoomFromServerRoom,
  generateRoomCode,
  makeDeck,
  shuffleAndDealDeck,
} from "../helpers";

const lobbySocketListeners = (
  socket: Socket,
  io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
  const onReadyUp = (params: {
    player: PlayerType;
    room: ClientRoom;
    readyUpStatus: boolean;
  }) => {
    const { room, player, readyUpStatus } = params;
    // Get curr player in the room and update ready up status on player and in room
    const currRoomIx = rooms.findIndex((r) => r.id === room.id);
    const serverRoom = rooms[currRoomIx];
    const currPlayerIx = serverRoom?.players.findIndex(
      (p) => p.id === player.id
    );
    const serverPlayer = serverRoom?.players[currPlayerIx];
    serverPlayer.isReady = readyUpStatus;
    serverPlayer.hand = player.hand;

    const clientRoom = generateClientRoomFromServerRoom(serverRoom);

    socket.to(room.room).emit("onUpdateRoom", { updatedRoom: clientRoom });

    socket.emit("onReadyUp", {
      updatedRoom: clientRoom,
      updatedPlayer: serverPlayer,
    });
  };

  socket.on("readyUp", onReadyUp);
};

export { lobbySocketListeners };
