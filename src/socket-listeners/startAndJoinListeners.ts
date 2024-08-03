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
  getSortedHandByPoints,
  makeDeck,
  shuffleAndDealDeck,
} from "../helpers";
import { IOType } from "../socketTypes";

const homeSocketListeners = (socket: Socket, io: IOType) => {
  const onCreatedRoom = (params: SocketListenerRoomType) => {
    console.log("Creating the room");

    const { numberOfPlayers, roomName, userName } = params;

    // Generate deck and selectable hands
    const roomDeck = makeDeck(numberOfPlayers);
    const roomHands = shuffleAndDealDeck({
      deck: roomDeck,
      numberOfPlayers: numberOfPlayers,
    });
    // Generate id for the room and new player
    const roomID = randomUUID();

    // Create code for other players to join
    const shareableRoomCode = generateRoomCode(rooms);

    const playerID = randomUUID();

    const player: PlayerType = {
      id: playerID,
      socketID: socket.id,
      hand: getSortedHandByPoints(roomHands[0]),
      isReady: false,
      name: userName,
      position: "",
      wins: 0,
      isHost: true,
      isInPostGameLobby: false,
    };

    // Create a new server room type that holds source of truth
    const serverRoom: RoomType = {
      cardsPlayed: [],
      currentStandings: [],
      deck: [],
      currentTurnIx: 0,
      currentTurnPlayerId: "",
      roomCode: shareableRoomCode,
      handsToChoose: roomHands,
      id: roomID,
      isFirstGame: true,
      lastPlayerPlayed: "",
      numberOfPlayers: numberOfPlayers,
      opportunityForCompletedIt: {
        basePoints: 0,
        card: "",
        numberOfCardsNeeded: numberOfPlayers > 5 ? 8 : 4,
      },
      players: [player],
      playersCompleted: [],
      previousHand: [],
      room: roomName,
      turnCounter: 0,
      placeIndexRemainingPlayersArePlayingFor: 0,
      gameIsOver: false,
      numberOfGames: 1,
    };

    // add in memory to the curr rooms array
    rooms.push(serverRoom);

    // Handle sending over client Room & Player Data
    const adjustedPlayer: ClientAdjustedPlayer = {
      id: playerID,
      isReady: false,
      name: userName,
      numberOfCardsInHand: roomHands[0].length,
      position: { place: 0, title: "" },
      wins: 0,
      isInPostGameLobby: false,
    };

    const clientRoom: ClientRoom = generateClientRoomFromServerRoom(serverRoom);
    socket.join(roomName);
    socket.emit("onCreatedRoom", { room: clientRoom, player: player });
  };

  const onJoinedRoom = (params: SocketListenerRoomType) => {
    const userName = params.userName;
    const roomCode = params.roomName;

    // Find the rooom based on room code and ensure it exists
    const roomIx = rooms.findIndex((r) => r.roomCode === roomCode);

    // If it doesnt exist then send back error response
    if (roomIx < 0) {
      console.error(`Room with code ${roomCode} not found`);
      return;
    }

    // If room does exist initialize room value here
    const roomToJoin = rooms[roomIx];
    // Create player
    const playerJoinedIx = roomToJoin.players.length;
    const playerID = randomUUID();
    const player: PlayerType = {
      hand: getSortedHandByPoints(roomToJoin.handsToChoose[playerJoinedIx]),
      id: playerID,
      socketID: socket.id,
      isReady: false,
      name: userName,
      position: "",
      wins: 0,
      isHost: false,
      isInPostGameLobby: false,
    };

    // Add new player to room
    roomToJoin.players.push(player);

    // Create updated client room
    const adjustedClientRoom: ClientRoom =
      generateClientRoomFromServerRoom(roomToJoin);

    // Join the socket room instance
    socket.join(roomToJoin.room);

    // Send socket instance to the room that shares the new room object with another player
    socket.to(roomToJoin.room).emit("onUpdateRoom", {
      updatedRoom: { ...adjustedClientRoom, messages: [] },
    });

    // Send socket instance to front end sharing the player obj and room with user who called the join room
    socket.emit("onJoinedRoom", {
      room: { ...adjustedClientRoom, messages: [] },
      player: player,
    });
  };

  socket.on("createRoom", onCreatedRoom);
  socket.on("joinRoom", onJoinedRoom);
};

export { homeSocketListeners };
