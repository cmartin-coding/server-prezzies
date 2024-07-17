import { Card, Deck, RoomType } from "./types";

export function makeDeck(numOfPlayers: number) {
  const deck: Card[] = [];
  const suits: { suit: string; color: "cardRed" | "black" }[] = [
    { suit: "C", color: "black" },
    { suit: "S", color: "black" },
    { suit: "D", color: "cardRed" },
    { suit: "H", color: "cardRed" },
  ];
  const cards = [3, 4, 5, 6, 7, 8, 9, 10, "J", "Q", "K", "A", 2];
  const numberOfDecks = numOfPlayers > 4 ? 2 : 1;
  for (let i = 0; i < numberOfDecks; i++) {
    for (let j = 0; j < suits.length; j++) {
      for (let k = 0; k < cards.length; k++) {
        const card: Card = {
          card: `${cards[k] + suits[j].suit}`,
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
