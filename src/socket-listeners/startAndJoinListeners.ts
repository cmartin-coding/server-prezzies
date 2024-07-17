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
import { generateRoomCode, makeDeck, shuffleAndDealDeck } from "../helpers";

const homeSocketListeners = (
  socket: Socket,
  io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
  const onCreatedRoom = (params: SocketListenerRoomType) => {
    console.log("Creating the room");
    const { numberOfPlayers, roomName, userName } = params;

    const roomDeck = makeDeck(numberOfPlayers);
    const roomHands = shuffleAndDealDeck({
      deck: roomDeck,
      numberOfPlayers: numberOfPlayers,
    });
    // Generate id for the room and new player
    const roomID = randomUUID();

    const shareableRoomCode = generateRoomCode(rooms);

    const playerID = randomUUID();
    // Create a new server room type
    const serverRoom: RoomType = {
      cardsPlayed: [],
      deck: [],
      roomCode: shareableRoomCode,
      handsToChoose: roomHands,
      id: roomID,
      isFirstGame: true,
      lastPlayerPlayed: "",
      numberOfPlayers: numberOfPlayers,
      opportunityForCompletedIt: [],
      players: [],
      playersCompleted: [],
      previousHand: [],
      room: roomName,
      turnCounter: 0,
    };

    // add in memory to the curr rooms array
    rooms.push(serverRoom);

    // Handle sending over client Room & Player Data
    const adjustedPlayer: ClientAdjustedPlayer = {
      id: playerID,
      isReady: false,
      name: userName,
      numberOfCardsInHand: roomHands[0].length,
      position: "",
      wins: 0,
    };
    const clientRoom: ClientRoom = {
      cardsPlayed: [],
      gameIsOver: false,
      room: roomName,
      turnCounter: 0,
      handsToChoose: [],
      shareableRoomCode: shareableRoomCode,
      id: roomID,
      isFirstGame: true,
      lastHand: [],
      numberOfPlayers: numberOfPlayers,
      players: [adjustedPlayer],
    };

    const clientPlayer: PlayerType = {
      id: playerID,
      hand: roomHands[0],
      isReady: false,
      name: userName,
      position: "",
      wins: 0,
      isHost: true,
    };

    socket.emit("onCreatedRoom", { room: clientRoom, player: clientPlayer });
  };

  socket.on("createRoom", onCreatedRoom);
};

export { homeSocketListeners };
