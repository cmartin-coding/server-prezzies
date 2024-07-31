import { Socket } from "socket.io";

import { ClientRoom, PlayerType } from "../types";

import { rooms } from "..";
import {
  generateClientRoomFromServerRoom,
  getStartingPlayer,
} from "../helpers";
import { IOType } from "../socketTypes";

const lobbySocketListeners = (socket: Socket, io: IOType) => {
  const onReadyUp = (params: {
    player: PlayerType;
    room: ClientRoom;
    readyUpStatus: boolean;
  }) => {
    const { room, player, readyUpStatus } = params;
    // Get curr player in the room and update ready up status on player and in room
    const currRoomIx = rooms.findIndex((r) => r.id === room.id);
    const serverRoom = rooms[currRoomIx];

    const startingPlayerDetail = getStartingPlayer(serverRoom.players);
    serverRoom.currentTurnIx = startingPlayerDetail.playerIndex;
    serverRoom.currentTurnPlayerId = startingPlayerDetail.playerId;

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
