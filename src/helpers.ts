import { rooms } from ".";
import {
  Card,
  ClientAdjustedPlayer,
  ClientRoom,
  Deck,
  PlayerType,
  RoomType,
  Suits,
} from "./types";

export function makeDeck(numOfPlayers: number) {
  const deck: Card[] = [];
  const suits: { suit: Suits; color: "cardRed" | "black" }[] = [
    { suit: "Clubs", color: "black" },
    { suit: "Spades", color: "black" },
    { suit: "Diamonds", color: "cardRed" },
    { suit: "Hearts", color: "cardRed" },
  ];
  const cards = [3, 4, 5, 6, 7, 8, 9, 10, "J", "Q", "K", "A", 2];
  const numberOfDecks = numOfPlayers > 4 ? 2 : 1;
  for (let i = 0; i < numberOfDecks; i++) {
    for (let j = 0; j < suits.length; j++) {
      for (let k = 0; k < cards.length; k++) {
        const card: Card = {
          id: `${cards[k] + suits[j].suit}`,
          card: `${cards[k]}`,
          suit: suits[j].suit,
          points: k,
          suitPoints: +(0.1 * j).toFixed(1),
          color: suits[j].color,
        };
        deck.push(card);
      }
    }
  }

  return deck;
}

export type deckArgs = { deck: Deck; numberOfPlayers: number };

export function shuffleAndDealDeck(props: deckArgs) {
  // const deck = makeDeck(props.numberOfPlayers);
  const deck = props.deck;
  const playerHands: Deck[] = [];
  //shuffle the deck
  for (let i = deck.length - 1; i > 0; i--) {
    const randomCard = Math.floor(Math.random() * i);
    const temp = deck[i];
    deck[i] = deck[randomCard];
    deck[randomCard] = temp;
  }

  // deal the deck
  const totalHands = deck.length / props.numberOfPlayers;
  for (let i = 0; i < props.numberOfPlayers; i++) {
    playerHands.push([]);
  }
  playerHands.forEach((hand) => {
    for (let i = 0; i < totalHands; i++) {
      if (deck.length > 0) {
        hand.push(deck.pop()!);
      }
    }
  });
  // playerHands.map((hand) =>
  //   hand.sort((a, b) => a.points - b.points || a.suitPoints - b.suitPoints)
  // );

  return playerHands;
}
export function generateRoomCode(rooms: RoomType[]) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let roomCode = "";
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    roomCode += characters[randomIndex];
  }

  // this checks if the in memory rooms already has a shareable code the same as the random generated one. Unlikely but good to check
  const isAlreadyInRoomsMemory = rooms.find((r) => r.roomCode === roomCode);
  if (isAlreadyInRoomsMemory) {
    generateRoomCode(rooms);
  }

  return roomCode;
}

export function generateClientRoomFromServerRoom(serverRoom: RoomType) {
  const serverRoomAdjustedPlayers = serverRoom.players.map((p) => {
    const adjustedPlayer: ClientAdjustedPlayer = {
      id: p.id,
      isReady: p.isReady,
      name: p.name,
      numberOfCardsInHand: p.hand.length,
      position: p.position,
      wins: p.wins,
    };
    return adjustedPlayer;
  });
  const clientRoom: ClientRoom = {
    cardsPlayed: serverRoom.cardsPlayed,
    handsToChoose: serverRoom.isFirstGame ? [] : serverRoom.handsToChoose,
    currentTurnIndex: serverRoom.currentTurnIx,
    currentTurnPlayerId: serverRoom.currentTurnPlayerId,
    gameIsOver: false,
    id: serverRoom.id,
    isFirstGame: serverRoom.isFirstGame,
    lastHand: serverRoom.previousHand,
    numberOfPlayers: serverRoom.numberOfPlayers,
    players: serverRoomAdjustedPlayers,
    room: serverRoom.room,

    shareableRoomCode: serverRoom.roomCode,
    turnCounter: serverRoom.turnCounter,
  };

  return clientRoom;
}

export function getSortedHandByPoints(hand: Deck) {
  const sortedHand = [...hand].sort((a, b) => {
    if (a.suitPoints !== b.suitPoints) {
      return a.suitPoints - b.suitPoints;
    } else {
      return a.points - b.points;
    }
  });
  return sortedHand;
}

export function getStartingPlayer(players: PlayerType[]): {
  playerId: string;
  playerIndex: number;
} {
  let playerId = "";
  let playerIx = 0;
  // If there are is more than one deck there could be two people with the 3 of clubs
  const playersWith3OfClubs = players.filter(
    (p) => p.hand.findIndex((c) => c.points + c.suitPoints === 0) > -1
  );

  if (playersWith3OfClubs.length > 1) {
    const randomIndex = Math.floor(Math.random() * 2);
    playerId = playersWith3OfClubs[randomIndex].id;
  } else {
    playerId = playersWith3OfClubs[0].id;
  }

  playerIx = players.findIndex((p) => p.id === playerId);

  return { playerId: playerId, playerIndex: playerIx };
}

export function getIsPlayersTurn(room: RoomType, player: PlayerType) {
  return room.currentTurnPlayerId === player.id;
}

export function getTotalPointsForHand(hand: Card[]) {
  return hand.reduce((prev, acc) => prev + acc.points + acc.suitPoints, 0);
}

export function getServerRoom(room: ClientRoom): RoomType {
  const serverRoom = rooms.find((r) => r.id === room.id);
  if (!serverRoom) {
    throw new Error("Room could not be found");
  }
  return serverRoom;
}

export function getHandIsValid(params: {
  room: RoomType;
  hand: Card[];
  isFirstTurn?: boolean;
}): { isValid: boolean; errorMsg?: string } {
  const { hand, room, isFirstTurn } = params;

  // First check that all the cards in the hand have the same amount of points
  const cardOne = hand[0];
  const handTotalPoints = getTotalPointsForHand(hand);
  const handFacePoints = hand.reduce((prev, acc) => prev + acc.points, 0);
  const isAllCardsSameFaceValue =
    handFacePoints / hand.length === cardOne.points;

  // If they submitted a hand with mixed base card vals then do not them pass
  if (!isAllCardsSameFaceValue) {
    return {
      isValid: false,
      errorMsg: "All of the cards are not the same face value",
    };
  }

  // If multiple 2's are played return false
  if (handFacePoints / hand.length === 12 && hand.length > 1) {
    return {
      isValid: false,
      errorMsg: "Multiple 2's were played which is not allowed",
    };
  }

  // If first turn then just check for 3 of clubs
  if (isFirstTurn) {
    // If not the 3 of clubs then return false
    const isValidFirstHand =
      hand.length === 1 && hand[0].points + hand[0].suitPoints === 0;
    if (!isValidFirstHand) {
      return {
        isValid: false,
        errorMsg: "You can only play the 3 of clubs on the first turn",
      };
    }
  }

  const isATwo = hand.length === 1 && handFacePoints === 12;
  // If current hand points is not higher than the previous hand then return false
  if (handTotalPoints < getTotalPointsForHand(room.previousHand) && !isATwo) {
    return {
      isValid: false,
      errorMsg: "The hand you tried to play does not beat the previous hand",
    };
  }

  return { isValid: true };
}

export function getServerPlayer(room: RoomType, player: PlayerType) {
  const serverPlayer = room.players.find((p) => p.id === player.id);
  if (!serverPlayer) {
    throw new Error(
      "There is not a player in that server room with id " + player.id
    );
  }

  return serverPlayer;
}

export function getHasBeenPassedFullyAround(
  turnIndex: number,
  room: RoomType
) {}

export function getNewTurnIndex(room: RoomType) {
  let turnIndex = room.currentTurnIx;
  if (turnIndex === room.players.length - 1) {
    turnIndex = 0;
  } else {
    turnIndex++;
  }

  if (room.players[turnIndex].hand.length === 0) {
    getNewTurnIndex({ ...room, currentTurnIx: turnIndex });
  }

  return turnIndex;
}
