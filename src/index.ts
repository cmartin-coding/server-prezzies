import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { Server } from "socket.io";
import { homeSocketListeners } from "./socket-listeners/startAndJoinListeners";
import { RoomType } from "./types";
import { lobbySocketListeners } from "./socket-listeners/lobbyListeners";
import { gameSocketListeners } from "./socket-listeners/gameListeners";

const http = require("http");
const cors = require("cors");
// configures dotenv to work in your application
dotenv.config();
const app = express();
const PORT = 3000;

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] },
});

export const rooms: RoomType[] = [];

export const players = [];

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  homeSocketListeners(socket, io);
  lobbySocketListeners(socket, io);
  gameSocketListeners(socket, io);
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
