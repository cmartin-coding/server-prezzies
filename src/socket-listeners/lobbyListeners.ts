import { Server, Socket } from "socket.io";

import { ClientRoom, PlayerType } from "../types";

import { rooms } from "..";
import {
  generateClientRoomFromServerRoom,
  getStartingPlayer,
} from "../helpers";
import {
  ClientToServerEvents,
  IOType,
  ServerToClientEvents,
} from "../socketTypes";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

const lobbySocketListeners = (
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  io: Server<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, any>
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

    const numOfPlayersReady = clientRoom.players.reduce((prev, acc) => {
      if (acc.isReady) {
        return prev + 1;
      }
      {
        return prev;
      }
    }, 0);

    const isGameReadyToStart = numOfPlayersReady === clientRoom.numberOfPlayers;
    console.log(numOfPlayersReady, clientRoom.numberOfPlayers);
    if (isGameReadyToStart) {
      console.log("here is ready");
      io.to(room.room).emit("onAllPlayersReady", {
        room: clientRoom,
        shouldStartGame: true,
      });
    }

    socket.to(room.room).emit("onUpdateRoom", { updatedRoom: clientRoom });

    socket.emit("onReadyUp", {
      updatedRoom: clientRoom,
      updatedPlayer: serverPlayer,
    });
  };

  socket.on("readyUp", onReadyUp);
};

export { lobbySocketListeners };
