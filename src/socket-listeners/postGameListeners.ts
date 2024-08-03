import { Server, Socket } from "socket.io";
import { ClientToServerEvents, ServerToClientEvents } from "../socketTypes";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { Card, ClientRoom, PlayerType, RoomType } from "../types";
import {
  generateClientRoomFromServerRoom,
  generateFullHandDetailsFromCardIDs,
  getIsPlayersTurn,
  getServerPlayer,
  getServerRoom,
} from "../helpers";

const postGameSocketListeners = (
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  io: Server<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, any>
) => {
  /**
   * Need to share which player entered so it is updated
   */
  const onEnterPostGameLobby = (player: PlayerType, room: ClientRoom) => {
    const serverRoom = getServerRoom(room);
    const serverPlayer = getServerPlayer(serverRoom, player);
    serverPlayer.isInPostGameLobby = true;
    const clientRoom = generateClientRoomFromServerRoom(serverRoom);

    io.to(serverRoom.room).emit("onUpdateRoom", {
      updatedRoom: clientRoom,
    });
  };

  const onSelectHand = (params: {
    player: PlayerType;
    room: ClientRoom;
    hand: { id: string }[] & Partial<Card>[];
  }) => {
    const { player, room, hand } = params;

    const serverRoom = getServerRoom(room);
    const serverPlayer = getServerPlayer(serverRoom, player);

    const isPlayersTurn = getIsPlayersTurn(serverRoom, player);
    if (!isPlayersTurn) {
      socket.emit("onBroadcastMessage", { message: "It is not your turn" });
      return;
    }

    // Format the hand to include all of the hand details based on the card ID's and set the hand to that player
    const formattedHand = generateFullHandDetailsFromCardIDs(
      hand,
      serverRoom.deck
    );
    serverPlayer.hand = formattedHand as Card[];

    // Remove that hand from selection and set the available hands to select to the filtered hans
    const filteredAvailableHands = serverRoom.handsToChoose.filter(
      (h) => !h.some((c) => c.id === formattedHand[0].id)
    );
    serverRoom.handsToChoose = filteredAvailableHands;

    // If there are no more hands to choose then send an event that will tell the front end it can start the game
    if (serverRoom.handsToChoose.length === 0) {
      // Socket to tell front end to start the trading process between first and last and if more than 5 players second to last and first to last
    } else {
      // Filter out the first person in the completed players array
      const updatedPlayersCompleted = serverRoom.playersCompleted.filter(
        (_, ix) => ix !== 0
      );

      // Set the players completed to the new array allowing us to just set the next turn to the next player who was out most recently
      serverRoom.playersCompleted = updatedPlayersCompleted;
      serverRoom.currentTurnPlayerId = serverRoom.playersCompleted[0].id;
      serverRoom.currentTurnIx = 0;
    }

    const clientRoom = generateClientRoomFromServerRoom(serverRoom);
    socket.to(serverPlayer.socketID).emit("onUpdatePlayer", {
      updatedPlayer: serverPlayer,
    });
    io.to(room.room).emit("onUpdateRoom", { updatedRoom: clientRoom });
  };

  socket.on("enteredPostGameLobby", onEnterPostGameLobby);
};

export { postGameSocketListeners };
