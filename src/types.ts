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
  socketID: string;
  name: string;
  hand: Deck;
  isReady: boolean;
  wins: number;
  position: { place: number; title: Positions };
  isHost?: boolean;
  isInPostGameLobby: boolean;
};
export type RoomType = {
  id: string;
  players: PlayerType[];
  playersCompleted: PlayerType[];
  currentStandings: PlayerType[];
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
  numberOfTradesCompleted: number;
};
export type ClientRoom = {
  id: string;
  room: string;
  shareableRoomCode: string;
  players: ClientAdjustedPlayer[];
  handsToChoose: { id?: string }[] & Partial<Card>[];
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
  position: { place: number; title: string };
  wins: number;
  isReady: boolean;
  isInPostGameLobby: boolean;
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
