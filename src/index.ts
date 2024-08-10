import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { Server } from "socket.io";
import { homeSocketListeners } from "./socket-listeners/startAndJoinListeners";
import { RoomType } from "./types";
import { lobbySocketListeners } from "./socket-listeners/lobbyListeners";
import { gameSocketListeners } from "./socket-listeners/gameListeners";
import { IOType } from "./socketTypes";
import { postGameSocketListeners } from "./socket-listeners/postGameListeners";
import { leaveLobbyListeners } from "./socket-listeners/leaveLobbyListeners";
import {
  generateClientRoomFromServerRoom,
  handleRemovingPlayerFromRoom,
} from "./helpers";

const http = require("http");
const cors = require("cors");
// configures dotenv to work in your application
dotenv.config();
const app = express();
const PORT = 3000;

app.use(cors());

const server = http.createServer(app);

const io: IOType = new Server(server, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] },
});

export const rooms: RoomType[] = [];

export const players = [];

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);
  socket.on("test", () => {
    socket.emit("onTest", { serverRoom: rooms[0] });
  });

  socket.on("disconnect", (msg) => {
    // NEED TO REMOVE THE PLAYER FROM THE
    const roomWithDisconnectedPlayer = rooms.find(
      (r) => !!r.players.find((p) => p.socketID === socket.id)
    );

    if (!roomWithDisconnectedPlayer) {
      return console.log("Cannot find room with socket id of" + socket.id);
    }

    const updatedServerRoom = handleRemovingPlayerFromRoom(
      roomWithDisconnectedPlayer,
      socket.id
    );

    const clientRoom = generateClientRoomFromServerRoom(updatedServerRoom);

    io.to(roomWithDisconnectedPlayer.room).emit("onBroadcastMessage", {
      message: `${socket.id} disconnected from the game`,
    });
    io.to(roomWithDisconnectedPlayer.room).emit("onUpdateRoom", {
      updatedRoom: clientRoom,
    });
  });

  homeSocketListeners(socket, io);
  lobbySocketListeners(socket, io);
  gameSocketListeners(socket, io);
  postGameSocketListeners(socket, io);
  leaveLobbyListeners(socket, io);
});

app.get("/", (request: Request, response: Response) => {
  console.log("here");
  response.status(200).send("Hello World");
});

server
  .listen(PORT, () => {
    console.log("Server running at PORT: ", PORT);
  })
  .on("error", (error: any) => {
    console.log(error);
    // gracefully handle error
    throw new Error(error.message);
  });
