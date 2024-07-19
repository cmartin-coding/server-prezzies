import {
  Card,
  ClientAdjustedPlayer,
  ClientRoom,
  Deck,
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
          suitPoints: 0.1 * j,
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
