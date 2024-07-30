export type SocketListenerRoomType = {
  roomName: string;
  userName: string;
  numberOfPlayers: number;
};

export type Suits = "Clubs" | "Spades" | "Diamonds" | "Hearts";
export type Card = {
  id: string;
  card: string;
  suit: Suits;
  points: number;
  suitPoints: number;
  color: "cardRed" | "black";
};
export type Deck = Card[];
export type PlayerType = {
  id: string;
  name: string;
  hand: Deck;
  isReady: boolean;
  wins: number;
  position: string;
  isHost?: boolean;
};
export type RoomType = {
  id: string;
  players: PlayerType[];
  playersCompleted: PlayerType[];
  roomCode: string;
  room: string;
  deck: Deck;
  handsToChoose: Deck[];
  cardsPlayed: Card[];
  opportunityForCompletedIt: {
    basePoints: number;
    numberOfCardsNeeded: number;
    card: string;
  };
  previousHand: Card[];
  numberOfPlayers: number;
  isFirstGame: boolean;
  turnCounter: number;
  currentTurnPlayerId: string;
  currentTurnIx: number;
  lastPlayerPlayed: string;
  placeIndexRemainingPlayersArePlayingFor: number;
  gameIsOver: boolean;
  numberOfGames: number;
};
export type ClientRoom = {
  id: string;
  room: string;
  shareableRoomCode: string;
  players: ClientAdjustedPlayer[];
  handsToChoose: Deck[];
  isFirstGame: boolean;
  numberOfPlayers: number | null;
  turnCounter: number;
  currentTurnIndex: number;
  currentTurnPlayerId: string;
  cardsPlayed: Card[];
  gameIsOver: boolean;
  lastHand: Card[];
  messages?: string[];
  lastPlayerPlayedId: string;
  numberOfGames: number;
  opportunityForCompletedIt: {
    basePoints: number;
    numberOfCardsNeeded: number;
    card: string;
  };
};
export type ClientAdjustedPlayer = {
  id: string;
  name: string;
  numberOfCardsInHand: number;
  position: string;
  wins: number;
  isReady: boolean;
};
export type Positions =
  | "President"
  | "Vice President"
  | "Upper Class"
  | "Middle Class"
  | "Lower Class"
  | "Poor"
  | "Scum"
  | "Scummy Scum"
  | "Undecided";
