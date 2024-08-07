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
  getStartingPlayer,
  handleCheckForLastPlaceTradedBestCards,
  handleTradingCardToPlayer,
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

    if (room.handsToChoose.length === 0) {
      socket.to(serverPlayer.socketID).emit("onBroadcastMessage", {
        message: "There are no hands to choose.",
      });
      return;
    }

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
    // if (serverRoom.handsToChoose.length === 0) {
    //   // Socket to tell front end to start the trading process between first and last and if more than 5 players second to last and first to last
    // } else {

    // Filter out the first person in the completed players array
    const updatedPlayersCompleted = serverRoom.playersCompleted.filter(
      (_, ix) => ix !== 0
    );

    // Set the players completed to the new array allowing us to just set the next turn to the next player who was out most recently
    serverRoom.playersCompleted = updatedPlayersCompleted;
    if (serverRoom.playersCompleted.length > 0) {
      serverRoom.currentTurnPlayerId = serverRoom.playersCompleted[0].id;
      serverRoom.currentTurnIx = 0;
    }

    const clientRoom = generateClientRoomFromServerRoom(serverRoom);
    socket.emit("onUpdatePlayer", {
      updatedPlayer: serverPlayer,
    });
    io.to(room.room).emit("onUpdateRoom", { updatedRoom: clientRoom });
  };

  const onTradeHand = (params: {
    player: PlayerType;
    room: ClientRoom;
    cardsToTrade: Card[];
  }) => {
    const { player, room, cardsToTrade } = params;
    const serverRoom = getServerRoom(room);
    const serverPlayer = getServerPlayer(serverRoom, player);

    const numberOfPlayersTrading = serverRoom.numberOfPlayers <= 5 ? 2 : 4;

    // Create a helper function to get the player role and the recipient role.

    // If scum or scummy scum do this
    // Else do this
    const president = serverRoom.players.find((s) => s.position.place === 0);

    const vicePresident = serverRoom.players.find(
      (s) => s.position.place === 1
    );
    const scum = serverRoom.players.find(
      (s) =>
        s.position.place === serverRoom.numberOfPlayers - 1 ||
        s.position.place === serverRoom.numberOfPlayers - 2
    );
    const scummyScum = serverRoom.players.find(
      (s) => s.position.place === serverRoom.numberOfPlayers - 1
    );

    const playersTrading =
      numberOfPlayersTrading === 2
        ? [president, scum]
        : [president, vicePresident, scum, scummyScum];

    // If there player is not in the players trading arr then they should not be trading.
    if (!playersTrading.find((p) => p?.id === serverPlayer.id)) {
      return socket.emit("onBroadcastMessage", {
        message: "You are not trading",
      });
    }

    const isPresident = serverPlayer.id === president?.id;
    const isVP = serverPlayer.id === vicePresident?.id;
    const isScum = serverPlayer.id === scum?.id;
    const isScummyScum = serverPlayer.id === scummyScum?.id;

    // Handles whether the number of cards to trade is 1 or 2 depending on number of players trading and their position
    let numberOfCardsToTrade = 1;
    if (numberOfPlayersTrading === 4) {
      if (isPresident || isScummyScum) {
        numberOfCardsToTrade = 2;
      }
    }

    // If there are too few or too many cards selected then return
    if (cardsToTrade.length !== numberOfCardsToTrade) {
      return socket.emit("onBroadcastMessage", {
        message: `You tried to trade too little or too many cards. Please only trade ${numberOfCardsToTrade} card(s)`,
      });
    }

    let recipient: PlayerType | null = null;
    if (numberOfPlayersTrading === 2) {
      if (!president || !scum) {
        return socket.emit("onBroadcastMessage", {
          message: "No president or scum during trading. TODO: cancel trading",
        });
      }
      if (isPresident) {
        recipient = scum;
      }
      if (isScum) {
        recipient = president;
      }
    } else {
      if (isPresident) {
        if (!scummyScum) {
          return socket.emit("onBroadcastMessage", {
            message: "No scummy scum trading. TODO: cancel trading",
          });
        }
        recipient = scummyScum;
      }
      if (isVP) {
        if (!scum) {
          return socket.emit("onBroadcastMessage", {
            message: "No scum trading. TODO: cancel trading",
          });
        }
        recipient = scum;
      }
      if (isScum) {
        if (!vicePresident) {
          return socket.emit("onBroadcastMessage", {
            message: "No VP trading. TODO: cancel trading",
          });
        }
        recipient = vicePresident;
      }
      if (isScummyScum) {
        if (!president) {
          return socket.emit("onBroadcastMessage", {
            message: "No president trading. TODO: cancel trading",
          });
        }
        recipient = president;
      }
    }

    if (isScummyScum || isScum) {
      const isCardsValid = handleCheckForLastPlaceTradedBestCards(
        serverPlayer.hand,
        cardsToTrade,
        numberOfCardsToTrade
      );
      if (!isCardsValid) {
        return socket.emit("onBroadcastMessage", {
          message: "Please select your best cards",
        });
      }
    }

    console.log(recipient);
    // Handle the trading card to the player
    const { recipientHand, senderHand } = handleTradingCardToPlayer({
      senderHand: serverPlayer.hand,
      cards: cardsToTrade,
      recipientHand: (recipient as PlayerType).hand,
    });

    console.log("REC,SEND", recipientHand, senderHand);
    // Update the server players hand
    serverPlayer.hand = senderHand;

    // Update the recipient hand
    (recipient as PlayerType).hand = recipientHand;

    socket
      .to((recipient as PlayerType).socketID)
      .emit("onUpdatePlayer", { updatedPlayer: recipient as PlayerType });

    socket.emit("onUpdatePlayer", { updatedPlayer: serverPlayer });

    serverRoom.numberOfTradesCompleted++;

    const isTradingCompleted =
      serverRoom.numberOfTradesCompleted === numberOfPlayersTrading;

    // If trading is completed, then we need to update the current turn player id and turn ix
    if (isTradingCompleted) {
      const { playerId, playerIndex } = getStartingPlayer(serverRoom.players);
      serverRoom.currentTurnPlayerId = playerId;
      serverRoom.currentTurnIx = playerIndex;
      serverRoom.gameIsOver = false;

      const adjustedPlayers = serverRoom.players.map((p) => ({
        ...p,
        isInPostGameLobby: false,
      }));
      serverRoom.players = adjustedPlayers;
    }

    const clientRoom = generateClientRoomFromServerRoom(serverRoom);

    if (isTradingCompleted) {
      io.emit("onTradingCompleted", {
        isTradingCompleted: true,
        room: clientRoom,
      });
    }
    io.to(serverRoom.room).emit("onUpdateRoom", { updatedRoom: clientRoom });
  };

  socket.on("enteredPostGameLobby", onEnterPostGameLobby);
  socket.on("selectHandInPostGameLobby", onSelectHand);
  socket.on("tradeHand", onTradeHand);
};

export { postGameSocketListeners };
