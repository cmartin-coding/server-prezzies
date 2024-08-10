import { Server, Socket } from "socket.io";
import { ClientToServerEvents, ServerToClientEvents } from "../socketTypes";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { ClientRoom, PlayerType } from "../types";
import {
  generateClientRoomFromServerRoom,
  getServerPlayer,
  getServerRoom,
} from "../helpers";

const leaveLobbyListeners = (
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  io: Server<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, any>
) => {
  const onLeaveGameFromLobby = (params: {
    room: ClientRoom;
    player: PlayerType;
  }) => {
    const { player, room } = params;
    const serverRoom = getServerRoom(room);
    const roomHands = serverRoom.handsToChoose;

    const handIndex = roomHands.findIndex((hand) =>
      hand.find((card) => card.id === player.hand[0].id)
    );
    console.log(handIndex);
    const filteredServerPlayers = serverRoom.players.filter(
      (p) => p.id !== player.id
    );
    serverRoom.players = filteredServerPlayers;
    serverRoom.nextAvailableHandIndex = handIndex;

    socket.leave(room.room);
    const clientRoom = generateClientRoomFromServerRoom(serverRoom);
    io.emit("onUpdateRoom", { updatedRoom: clientRoom });
  };

  socket.on("leaveGameFromLobby", onLeaveGameFromLobby);
};

export { leaveLobbyListeners };
