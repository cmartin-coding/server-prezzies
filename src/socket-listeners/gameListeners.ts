import { Server, Socket } from "socket.io";
import { ClientToServerEvents, ServerToClientEvents } from "../socketTypes";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { SocketType } from "dgram";
import { Card, ClientRoom, PlayerType } from "../types";
import {
  generateClientRoomFromServerRoom,
  getHandIsValid,
  getIsPlayersTurn,
  getNewTurnIndex,
  getServerPlayer,
  getServerRoom,
} from "../helpers";

const gameSocketListeners = (
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
  const onPlayHand: (params: {
    hand: Card[];
    player: PlayerType;
    room: ClientRoom;
  }) => void = (params) => {
    const { hand, player, room } = params;

    const serverRoom = getServerRoom(room);
    const serverPlayer = getServerPlayer(serverRoom, player);

    // Check that they are the current player to play
    const isPlayersTurn = getIsPlayersTurn(serverRoom, player);

    // If it is not their turn we will emit a socket to update their state with an error message
    if (!isPlayersTurn) {
      io.in(room.room).emit("onBroadcastMessage", {
        message: "You tried to play out of turn!",
      });
      return;
    }

    // Check hand is valid
    const { isValid, errorMsg } = getHandIsValid({
      room: serverRoom,
      hand: hand,
      isFirstTurn: room.turnCounter === 0,
    });

    if (!isValid) {
      io.in(room.room).emit("onBroadcastMessage", {
        message: errorMsg as string,
      });
      return;
    }

    {
      /** HAND AND TURN IS CHECKED NOW DO REST OF LOGIC */
    }

    // Remove the cards from the server players hand
    const filteredHand = serverPlayer.hand.filter(
      (currCard) => !hand.some((card) => currCard.id === card.id)
    );

    serverPlayer.hand = filteredHand;

    // CHECK IF PLAYER IS OUT
    const playerIsOut = serverPlayer.hand.length === 0;
    if (playerIsOut) {
      serverRoom.playersCompleted.push(serverPlayer);
    }

    // HANDLE PLAYING A TWO LOGIC -- Do not change turn index and delete the previous hand
    const isPlayingTwo = hand.length == 1 && hand[0].points === 12;
    if (isPlayingTwo) {
      // Set the previous hand to empty as they will be able to play again
      serverRoom.previousHand = [];
      // Set the cardsPlayed to empty to show that they cleared the field
      serverRoom.cardsPlayed = [];
    }
    // HANDLE ALL OTHER HAND LOGIC
    else {
      // get the next turn index
      const turnIndex = getNewTurnIndex(serverRoom);
      // Set the next turn index
      serverRoom.currentTurnIx = turnIndex;
      // Set the next turn index player id
      serverRoom.currentTurnPlayerId = serverRoom.players[turnIndex].id;

      // If a user plays the same amount of card(s) and they share the same base value it will skip the next person
      if (
        hand.length === serverRoom.previousHand.length &&
        hand[0].points === serverRoom.previousHand[0].points
      ) {
        const newTurnIndex = getNewTurnIndex(serverRoom);
        // Set the next turn index
        serverRoom.currentTurnIx = newTurnIndex;
        // Set the next turn index player id
        serverRoom.currentTurnPlayerId = serverRoom.players[newTurnIndex].id;

        io.in(room.room).emit("onBroadcastMessage", {
          message: `${serverRoom.players[turnIndex].name} has been skipped!`,
        });
      }
      // Add the hand to the cards played arr
      serverRoom.cardsPlayed = [...serverRoom.cardsPlayed, ...hand];
      // Set the previous hand to the hand that was played
      serverRoom.previousHand = hand;
      serverRoom.turnCounter++;

      // If the previous hand
    }

    // HANDLE CHECK IF USER IS OUT
    // TODO: HANDLE GAME OVER CHECK

    const clientRoom = generateClientRoomFromServerRoom(serverRoom);
    socket.emit("onPlayedHand", {
      updatedRoom: clientRoom,
      updatedPlayer: serverPlayer,
    });
    socket.to(room.room).emit("onUpdateRoom", { updatedRoom: clientRoom });
  };

  socket.on("playHand", onPlayHand);
};

export { gameSocketListeners };
