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
  getServerRoom,
  getSortedHandByPoints,
  makeDeck,
  shuffleAndDealDeck,
} from "../helpers";
import {
  ClientToServerEvents,
  IOType,
  ServerToClientEvents,
} from "../socketTypes";
import { Socket } from "socket.io";

const homeSocketListeners = (
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  io: IOType
) => {
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
      position: { place: 0, title: "Undecided" },
      wins: 0,
      isHost: true,
      isInPostGameLobby: false,
    };

    // Create a new server room type that holds source of truth
    const serverRoom: RoomType = {
      cardsPlayed: [],
      currentStandings: [],
      deck: roomDeck,
      currentTurnIx: 0,
      numberOfTradesCompleted: 0,
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

  const onJoinedRoom = (params: { userName: string; roomName: string }) => {
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

    if (roomToJoin.players.length === roomToJoin.numberOfPlayers) {
      return socket.emit("onBroadcastMessage", {
        message: "Sorry the room is full",
      });
    }
    // Create player

    // Give them the hand based on when they joined the arr
    let handIndex = roomToJoin.players.length;
    // If a player had left before this player joined then we would need to give them the hand that we should assign to them
    if (roomToJoin.nextAvailableHandIndex !== undefined) {
      handIndex = roomToJoin.nextAvailableHandIndex;

      // After setting this hand index set it to undefined so we can just use the player joined index
      roomToJoin.nextAvailableHandIndex = undefined;
    }

    const playerID = randomUUID();
    const player: PlayerType = {
      hand: getSortedHandByPoints(roomToJoin.handsToChoose[handIndex]),
      id: playerID,
      socketID: socket.id,
      isReady: false,
      name: userName,
      position: { place: 0, title: "Undecided" },
      wins: 0,
      isHost: false,
      isInPostGameLobby: false,
    };

    // Add new player to room
    roomToJoin.players = [...roomToJoin.players, player];
    // roomToJoin.players.push(player);

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
