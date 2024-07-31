import { randomUUID } from "crypto";
import { rooms } from ".";
import {
  Card,
  ClientAdjustedPlayer,
  ClientRoom,
  Deck,
  PlayerType,
  Positions,
  RoomType,
  Suits,
} from "./types";
import { positionTitles } from "./const";

export function makeDeck(numOfPlayers: number) {
  const deck: Card[] = [];
  const suits: { suit: Suits; color: "cardRed" | "black" }[] = [
    { suit: "Clubs", color: "black" },
    { suit: "Spades", color: "black" },
    { suit: "Diamonds", color: "cardRed" },
    { suit: "Hearts", color: "cardRed" },
  ];
  const cards = [3, 4, 5, 6, 7, 8, 9, 10, "J", "Q", "K", "A", 2];
  const numberOfDecks = numOfPlayers > 5 ? 2 : 1;
  for (let i = 0; i < numberOfDecks; i++) {
    for (let j = 0; j < suits.length; j++) {
      for (let k = 0; k < cards.length; k++) {
        const card: Card = {
          id: `${randomUUID()}`,
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

  const numberOfCardsToShow = serverRoom.numberOfPlayers > 5 ? 2 : 1;
  const handsToChooseAdjustedForClientRoom = serverRoom.handsToChoose.map(
    (hand, ix) => {
      return hand.map((c, ix) => {
        if (ix <= numberOfCardsToShow - 1) {
          return { ...c };
        } else {
          return { id: c.id };
        }
      });
    }
  );
  const clientRoom: ClientRoom = {
    cardsPlayed: serverRoom.cardsPlayed,
    handsToChoose: serverRoom.isFirstGame
      ? []
      : handsToChooseAdjustedForClientRoom,
    currentTurnIndex: serverRoom.currentTurnIx,
    currentTurnPlayerId: serverRoom.currentTurnPlayerId,
    gameIsOver: serverRoom.gameIsOver,
    numberOfGames: serverRoom.numberOfGames,
    id: serverRoom.id,
    isFirstGame: serverRoom.isFirstGame,
    lastHand: serverRoom.previousHand,
    numberOfPlayers: serverRoom.numberOfPlayers,
    players: serverRoomAdjustedPlayers,
    room: serverRoom.room,
    lastPlayerPlayedId: serverRoom.lastPlayerPlayed,
    opportunityForCompletedIt: serverRoom.opportunityForCompletedIt,

    shareableRoomCode: serverRoom.roomCode,
    turnCounter: serverRoom.turnCounter,
  };

  return clientRoom;
}

export function getSortedHandByPoints(hand: Deck) {
  const sortedHand = [...hand].sort((a, b) => {
    if (a.points !== b.points) {
      return a.points - b.points;
    } else {
      return a.suitPoints - b.suitPoints;
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
    playerId = playersWith3OfClubs[0]?.id;
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
  // player: PlayerType;
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
      errorMsg: "tried to play cards that were not the same face value",
    };
  }

  // If multiple 2's are played return false
  if (handFacePoints / hand.length === 12 && hand.length > 1) {
    return {
      isValid: false,
      errorMsg: "tried to play multiple 2's in one hand",
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
        errorMsg:
          "tried to play something other than the 3 of clubs on the first turn",
      };
    }
  }

  const isATwo = hand.length === 1 && handFacePoints === 12;
  const twoWasPlayedLast =
    room.previousHand.length === 1 && room.previousHand[0].points === 12;
  {
    /*
       If total points in hand is less than prev hand 
       AND it is not a two 
       AND the curr hand does not have more cards than the previous hand
       THEN return false 
      */
  }
  if (
    handTotalPoints < getTotalPointsForHand(room.previousHand) &&
    !isATwo &&
    hand.length <= room.previousHand.length &&
    !twoWasPlayedLast
  ) {
    return {
      isValid: false,
      errorMsg: "tried to play a hand that does not beat the previous hands",
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

export function getNextTurnIndex(serverRoom: RoomType, isPassed?: boolean) {
  let turnIndex = serverRoom.currentTurnIx;

  const findNextPlayerWithCards = (startIndex: number): number => {
    let index = startIndex;
    const playerCount = serverRoom.players.length;

    for (let i = 0; i < playerCount; i++) {
      if (serverRoom.players[index].hand.length > 0) {
        return index;
      }
      index = (index + 1) % playerCount;
    }

    return startIndex;
  };

  turnIndex = isPassed
    ? (turnIndex + 1) % serverRoom.players.length
    : findNextPlayerWithCards((turnIndex + 1) % serverRoom.players.length);

  return turnIndex;
}

// export function handlePlacementWhenTwoIsPlayedLast(
//   lastPlaceIndex: number,
//   serverRoom: RoomType,
//   playerWhoPlayedTwoLast: PlayerType
// ) {
//   const completedPlayers = [...serverRoom.playersCompleted];

//   // If someone currently occupies the last place spot then do logic
//   if (!!serverRoom.playersCompleted[lastPlaceIndex]) {
//     const tempPlayer = serverRoom.playersCompleted[lastPlaceIndex];
//     completedPlayers[lastPlaceIndex] = playerWhoPlayedTwoLast;
//     handlePlacementWhenTwoIsPlayedLast(
//       lastPlaceIndex - 1,
//       serverRoom,
//       tempPlayer
//     );
//   } else {
//     // If someone does not occupy last place slot then put the player who played 2 last in last place spot
//     completedPlayers[lastPlaceIndex] = playerWhoPlayedTwoLast;
//   }

//   return serverRoom;
// }

export function getIsCompletedItValid(params: {
  completedItHand: Card[];

  room: RoomType;
}) {
  const { completedItHand, room } = params;

  const completedItHandLength = completedItHand.length;
  const baseCompletedItHandLengthRequirement = room.numberOfPlayers > 5 ? 8 : 4;

  const completedItAveragePoints =
    completedItHand.reduce((prev, acc) => prev + acc.points, 0) /
    completedItHandLength;

  const completedItHandIsAllTheSameCard =
    completedItHand[0].points === completedItAveragePoints;

  // First check is that all of the cards in the completed it are the same
  if (!completedItHandIsAllTheSameCard) {
    return false;
  }

  // If the length of the completedItHand is equal to the total amount of the cards in deck
  if (completedItHand.length === baseCompletedItHandLengthRequirement) {
    return true;
  }

  // If the length is the same as the opportunity for completed it then we need to check that it matches the current points val
  if (
    completedItHand.length ===
      room.opportunityForCompletedIt.numberOfCardsNeeded &&
    completedItAveragePoints === room.opportunityForCompletedIt.basePoints
  ) {
    return true;
  }

  return false;
}

export function handleResetServerRoom(serverRoom: RoomType) {
  const roomDeck = makeDeck(serverRoom.numberOfPlayers);
  const roomHands = shuffleAndDealDeck({
    deck: roomDeck,
    numberOfPlayers: serverRoom.numberOfPlayers,
  });

  // Update the available hands to choose from before starting next round
  serverRoom.handsToChoose = roomHands;

  // Increment number of games played
  serverRoom.numberOfGames++;

  // Reset the turn counter to 0
  serverRoom.turnCounter = 0;

  // Reset the cards played thus far
  serverRoom.cardsPlayed = [];

  // Get the winner to handle setting turn index for hand selections
  const winner = serverRoom.playersCompleted[0];
  serverRoom.currentTurnIx = 0;
  serverRoom.currentTurnPlayerId = winner.id;

  // Reset all the players hands to be emptyy
  const updatedPlayersWithoutCardsInHand = serverRoom.players.map((p) => ({
    ...p,
    hand: [],
    // this makes sure that the correct positions are updated for everyone
    position: serverRoom.playersCompleted.find((pl) => pl.id === p.id)
      ?.position as Positions,
  }));
  serverRoom.players = updatedPlayersWithoutCardsInHand;

  // Reset the opportunity for completed it to take any
  serverRoom.opportunityForCompletedIt = {
    basePoints: 0,
    card: "Any",
    numberOfCardsNeeded: serverRoom.numberOfPlayers > 5 ? 8 : 4,
  };

  // Reset the place everyone is playing for
  serverRoom.placeIndexRemainingPlayersArePlayingFor = 0;

  //Reset previous hand to empty
  serverRoom.previousHand = [];

  // Set the isFirstGame Flag to false
  serverRoom.isFirstGame = false;

  return serverRoom;
}

export function handlePlayedTwoAsLastCard(params: {
  playersCompleted: PlayerType[];
  indexToPlacePlayer: number;
  player: PlayerType;
  numberOfTotalPlayers: number;
}) {
  const { indexToPlacePlayer, player, playersCompleted, numberOfTotalPlayers } =
    params;

  const adjustedPlayer = { ...player };
  adjustedPlayer.position =
    positionTitles[numberOfTotalPlayers][indexToPlacePlayer];
  const adjustedPlayersCompleted = [...playersCompleted];

  // If there is not someone in last place already then just put the player in last and return the updated completed players.
  if (indexToPlacePlayer < 0 || !adjustedPlayersCompleted[indexToPlacePlayer]) {
    adjustedPlayersCompleted[indexToPlacePlayer] = player;
    return adjustedPlayersCompleted;
  } else {
    // If there is someone in last place then we need to adjust the last place person to second to last, etc.
    const tempPlayer = adjustedPlayersCompleted[indexToPlacePlayer];
    adjustedPlayersCompleted[indexToPlacePlayer] = player;
    return handlePlayedTwoAsLastCard({
      playersCompleted: adjustedPlayersCompleted,
      indexToPlacePlayer: indexToPlacePlayer - 1,
      player: tempPlayer,
      numberOfTotalPlayers,
    });
  }
}
