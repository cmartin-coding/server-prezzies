import { Server, Socket } from "socket.io";
import { ClientToServerEvents, ServerToClientEvents } from "../socketTypes";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { SocketType } from "dgram";
import { Card, ClientRoom, PlayerType } from "../types";
import {
  generateClientRoomFromServerRoom,
  getHandIsValid,
  getIsPlayersTurn,
  getNextTurnIndex,
  getServerPlayer,
  getServerRoom,
  // handlePlacementWhenTwoIsPlayedLast,
  getIsCompletedItValid,
  makeDeck,
  shuffleAndDealDeck,
  handleResetServerRoom,
  handlePlayedTwoAsLastCard,
} from "../helpers";
import { positionTitles } from "../const";
import { Client } from "socket.io/dist/client";

const gameSocketListeners = (
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  io: Server<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, any>
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
      socket.emit("onBroadcastMessage", {
        message: `It is not your turn yet`,
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
      // Set the cardsPlayed to empty to show that they cleared the field
      serverRoom.cardsPlayed = [];
      socket.emit("onBroadcastMessage", {
        message: "Get that shit outtta here",
      });
      socket.to(room.room).emit("onBroadcastMessage", {
        message: `Get that shit outta here -${serverPlayer.name}`,
      });
    } else {
      // HANDLE ALL OTHER HAND LOGIC

      // handle Turn change
      const turnIndex = getNextTurnIndex(serverRoom);
      serverRoom.currentTurnIx = turnIndex;
      serverRoom.currentTurnPlayerId = serverRoom.players[turnIndex].id;

      // If a user plays the same amount of card(s) and they share the same base value it will skip the next person by running turn change again
      if (
        hand.length === serverRoom.previousHand.length &&
        hand[0].points === serverRoom.previousHand[0].points
      ) {
        const turnIndex = getNextTurnIndex(serverRoom);
        const skippedPlayer = serverRoom.players.find(
          (p) => p.id === serverRoom.currentTurnPlayerId
        );
        serverRoom.currentTurnIx = turnIndex;
        serverRoom.currentTurnPlayerId = serverRoom.players[turnIndex].id;

        socket
          .to(serverRoom.room)
          .except(skippedPlayer?.socketID as string)
          .emit("onBroadcastMessage", {
            message: `${skippedPlayer?.name} has been skipped!`,
          });
        socket
          .to(skippedPlayer?.socketID as string)
          .emit("onBroadcastMessage", { message: "You were skipped" });
        socket.emit("onBroadcastMessage", {
          message: `You skipped ${skippedPlayer?.name}`,
        });
      }

      // Add the hand to the cards played arr
      serverRoom.cardsPlayed = [...serverRoom.cardsPlayed, ...hand];
    }

    const nextTurnPlayer = serverRoom.players.find(
      (p) => p.id === serverRoom.currentTurnPlayerId
    );
    socket
      .to(nextTurnPlayer?.socketID as string)
      .emit("onBroadcastMessage", { message: "It is your turn" });

    // HANDLE CHECK IF USER IS OUT
    // If the curr player no longer has any cards then they are out. And give them a position
    if (serverPlayer.hand.length === 0) {
      // If they played a 2 last then they will come in last as that is against the rules!
      if (hand.length === 1 && hand[0].points === 12) {
        const adjustedPlayersCompleted = handlePlayedTwoAsLastCard({
          playersCompleted: serverRoom.playersCompleted,
          indexToPlacePlayer: serverRoom.numberOfPlayers - 1,
          player: serverPlayer,
          numberOfTotalPlayers: serverRoom.numberOfPlayers,
        });
        const position =
          positionTitles[serverRoom.numberOfPlayers][
            serverRoom.numberOfPlayers - 1
          ];
        serverRoom.playersCompleted = adjustedPlayersCompleted;
        serverPlayer.position = {
          title: position,
          place: serverRoom.numberOfPlayers - 1,
        };
      } else {
        // Set the player into the players completed arr based on the current place everyone is playing for
        serverRoom.playersCompleted[
          serverRoom.placeIndexRemainingPlayersArePlayingFor
        ] = serverPlayer;

        // If players leave below 4 people then we may want to spit back out to home screen
        // Update the player position
        serverPlayer.position = {
          title:
            positionTitles[serverRoom.numberOfPlayers][
              serverRoom.placeIndexRemainingPlayersArePlayingFor
            ],
          place: serverRoom.placeIndexRemainingPlayersArePlayingFor,
        };

        // If the place they are playing for is index of 0 (ie: 1st place) then increment that players win counter
        if (serverRoom.placeIndexRemainingPlayersArePlayingFor === 0) {
          serverPlayer.wins++;
        }

        // Increment the position everyone is playing for
        serverRoom.placeIndexRemainingPlayersArePlayingFor++;
      }
    }

    // HANDLE COMPLETED IT CHECKING ------------------
    const previousHand = serverRoom.previousHand;
    const previousHandAveragePoints =
      previousHand.length > 0 ? previousHand[0].points : 10000;
    const overallCompletedItCardTotal = serverRoom.numberOfPlayers > 5 ? 8 : 4;

    const currHandAveragePoints = hand[0].points;

    {
      /*
        Given the previous hand base card points (ex: hand of sixes) is equal to the hand currently being played (ex: also 6's)
        And the length between previous hand and the current hand played is not equal to the total amount of cards in the deck
        Then there is room to complete it and it will be the quantity of that card needed to complete it.
      */
    }

    if (
      previousHandAveragePoints === currHandAveragePoints &&
      room.opportunityForCompletedIt.numberOfCardsNeeded - hand.length > 0
    ) {
      const amountOfCardsNeededToCompleteIt =
        room.opportunityForCompletedIt.numberOfCardsNeeded - hand.length;

      serverRoom.opportunityForCompletedIt = {
        basePoints: currHandAveragePoints,
        card: hand[0].card,
        numberOfCardsNeeded: amountOfCardsNeededToCompleteIt,
      };
    } else if (
      previousHandAveragePoints !== currHandAveragePoints &&
      hand.length < overallCompletedItCardTotal
    ) {
      serverRoom.opportunityForCompletedIt = {
        basePoints: hand[0].points,
        card: hand[0].card,
        numberOfCardsNeeded: overallCompletedItCardTotal - hand.length,
      };
    } else {
      serverRoom.opportunityForCompletedIt = {
        basePoints: 0,
        card: "Any",
        numberOfCardsNeeded: overallCompletedItCardTotal,
      };
    }

    // ------------------------------------------------

    serverRoom.previousHand = hand;
    serverRoom.turnCounter++;
    serverRoom.lastPlayerPlayed = player.id;

    // If the players completed length is the number of players minus one then the game is over
    if (serverRoom.playersCompleted.length === serverRoom.numberOfPlayers - 1) {
      const remainingPlayer = serverRoom.players.filter(
        (p) => !serverRoom.playersCompleted.some((player) => player.id === p.id)
      )[0];

      remainingPlayer.position = {
        title:
          positionTitles[serverRoom.numberOfPlayers][
            serverRoom.placeIndexRemainingPlayersArePlayingFor
          ],
        place: serverRoom.placeIndexRemainingPlayersArePlayingFor,
      };
      serverRoom.playersCompleted[
        serverRoom.placeIndexRemainingPlayersArePlayingFor
      ] = remainingPlayer;

      serverRoom.gameIsOver = true;
    }

    const clientRoom = serverRoom.gameIsOver
      ? generateClientRoomFromServerRoom(handleResetServerRoom(serverRoom))
      : generateClientRoomFromServerRoom(serverRoom);

    if (clientRoom.gameIsOver) {
      // Update all players in case they were changed based on how the game ended
      for (let i = 0; i < serverRoom.numberOfPlayers; i++) {
        const player = serverRoom.players[i];
        socket
          .to(player.socketID)
          .emit("onUpdatePlayerAfterGameCompleted", { updatedPlayer: player });
      }
      io.in(room.room).emit("onGameIsOver", { updatedRoom: clientRoom });
    } else {
      socket.emit("onPlayedHand", {
        updatedRoom: clientRoom,
        updatedPlayer: serverPlayer,
      });
      socket.to(room.room).emit("onUpdateRoom", { updatedRoom: clientRoom });
    }
  };

  const onPass = (params: { room: ClientRoom; player: PlayerType }) => {
    const { room, player } = params;
    const serverRoom = getServerRoom(room);
    // if it is the first turn then the player cannot pass
    const isPlayersTurn = getIsPlayersTurn(serverRoom, player);

    // If it is not the players turn then they cant do anything and send them a message
    if (!isPlayersTurn) {
      socket.emit("onBroadcastMessage", {
        message: `It is not your turn`,
      });
      return;
    }

    // If it is the first turn then they must play the 3 of clubs
    if (room.turnCounter === 0) {
      socket.emit("onBroadcastMessage", {
        message: `You have to play the 3 of clubs.`,
      });
      return;
    }

    // Increment the turn index once
    let turnIndex = getNextTurnIndex(serverRoom, true);
    // Set the serverRoom to that turn index
    serverRoom.currentTurnIx = turnIndex;

    // While the current turn index player has 0 cards in their hand
    while (serverRoom.players[turnIndex].hand.length === 0) {
      // Check if they are also the last player played and if so cancel out the cards playeds and previous hand
      if (serverRoom.players[turnIndex].id === serverRoom.lastPlayerPlayed) {
        serverRoom.cardsPlayed = [];
        serverRoom.previousHand = [];
      }
      // Increment the turn index to the next player
      turnIndex = getNextTurnIndex(serverRoom, true);
      // Set the serverRoom current turn ix to next val and it will run the while loop again if that person also has 0 cards
      serverRoom.currentTurnIx = turnIndex;
    }

    if (serverRoom.players[turnIndex].id === serverRoom.lastPlayerPlayed) {
      serverRoom.cardsPlayed = [];
      serverRoom.previousHand = [];
    }

    // This checks that if a player who was out before played last then this will reset the cards
    serverRoom.currentTurnPlayerId = serverRoom.players[turnIndex].id;
    serverRoom.turnCounter++;

    const nextTurnPlayer = serverRoom.players.find(
      (p) => p.id === serverRoom.currentTurnPlayerId
    );
    socket
      .to(nextTurnPlayer?.socketID as string)
      .emit("onBroadcastMessage", { message: "It is your turn" });

    const updatedRoom = generateClientRoomFromServerRoom(serverRoom);

    socket.to(room.room).emit("onBroadcastMessage", {
      message: `${player.name} passed their turn`,
    });
    // io.in(room.room).emit("onBroadcastMessage", {
    //   message: `It is ${
    //     serverRoom.players[serverRoom.currentTurnIx].name
    //   }'s turn`,
    // });

    io.in(room.room).emit("onPassedTurn", { updatedRoom: updatedRoom });
  };

  const onCompletedIt = (params: {
    player: PlayerType;
    room: ClientRoom;
    completedItHand: Card[];
  }) => {
    const { room, completedItHand, player } = params;
    const serverRoom = getServerRoom(room);
    const serverPlayer = getServerPlayer(serverRoom, player);

    const isCompleted = getIsCompletedItValid({
      completedItHand: completedItHand,
      room: serverRoom,
    });

    if (isCompleted) {
      // Step 1 - Remove the cards from the players hand
      const filteredHand = serverPlayer.hand.filter(
        (currCard) => !completedItHand.some((card) => currCard.id === card.id)
      );
      serverPlayer.hand = filteredHand;

      // Step 2 - Add the completed it hand to the cards played
      serverRoom.cardsPlayed = [...serverRoom.cardsPlayed, ...completedItHand];

      // Step 3 - Update opportunity for completed it
      serverRoom.opportunityForCompletedIt = {
        basePoints: 0,
        card: "Any",
        numberOfCardsNeeded: serverRoom.numberOfPlayers > 5 ? 8 : 4,
      };
      socket.emit("onBroadcastMessage", { message: "COMPLETED IT" });
      socket.to(room.room).emit("onBroadcastMessage", {
        message: `${player.name} COMPLETED IT`,
      });

      if (serverPlayer.hand.length === 0) {
        serverRoom.playersCompleted[
          serverRoom.placeIndexRemainingPlayersArePlayingFor
        ] = serverPlayer;

        // Update the player position
        serverPlayer.position = {
          title:
            positionTitles[serverRoom.numberOfPlayers][
              serverRoom.placeIndexRemainingPlayersArePlayingFor
            ],
          place: serverRoom.placeIndexRemainingPlayersArePlayingFor,
        };

        // If the place they are playing for is index of 0 (ie: 1st place) then increment that players win counter
        if (serverRoom.placeIndexRemainingPlayersArePlayingFor === 0) {
          serverPlayer.wins++;
        }

        // Increment the position everyone is playing for
        serverRoom.placeIndexRemainingPlayersArePlayingFor++;
      }

      // If the players completed length is the number of players minus one then the game is over
      if (
        serverRoom.playersCompleted.length ===
        serverRoom.numberOfPlayers - 1
      ) {
        const remainingPlayer = serverRoom.players.filter(
          (p) =>
            !serverRoom.playersCompleted.some((player) => player.id === p.id)
        )[0];

        remainingPlayer.position = {
          title:
            positionTitles[serverRoom.numberOfPlayers][
              serverRoom.placeIndexRemainingPlayersArePlayingFor
            ],
          place: serverRoom.placeIndexRemainingPlayersArePlayingFor,
        };

        serverRoom.playersCompleted[
          serverRoom.placeIndexRemainingPlayersArePlayingFor
        ] = remainingPlayer;

        serverRoom.gameIsOver = true;
      }

      const clientRoom = serverRoom.gameIsOver
        ? generateClientRoomFromServerRoom(handleResetServerRoom(serverRoom))
        : generateClientRoomFromServerRoom(serverRoom);

      if (clientRoom.gameIsOver) {
        // Update all players in case they were changed based on how the game ended
        for (let i = 0; i < serverRoom.numberOfPlayers; i++) {
          const player = serverRoom.players[i];
          socket.to(player.socketID).emit("onUpdatePlayerAfterGameCompleted", {
            updatedPlayer: player,
          });
        }
        io.in(room.room).emit("onGameIsOver", { updatedRoom: clientRoom });
      }

      socket.emit("onCompletedIt", {
        updatedPlayer: serverPlayer,
        updatedRoom: clientRoom,
      });
      socket.to(room.room).emit("onUpdateRoom", { updatedRoom: clientRoom });
    } else {
      socket.emit("onBroadcastMessage", {
        message: `You did not completed it`,
      });
    }
  };

  socket.on("completedIt", onCompletedIt);
  socket.on("playHand", onPlayHand);
  socket.on("passTurn", onPass);
};

export { gameSocketListeners };
