import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./src/config/db.js";
import authRouter from "./src/routes/authRoutes.js";
import socketHandler from "./src/sockets/socketHandler.js";
import messageRouter from "./src/routes/messageRoutes.js";
import userRouter from "./src/routes/userRoutes.js";
import conversationRouter from "./src/routes/conversationRoutes.js";

dotenv.config();
const app = express();

connectDB();

app.use(express.json());
app.use(cors());
app.use(morgan("dev"));
app.use(helmet());

app.use("/auth", authRouter);
app.use("/messages", messageRouter);
app.use("/conversations", conversationRouter);
app.use("/users", userRouter);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

socketHandler(io);

app.get("/", (req, res) => {
  res.status(200).json({ message: `VHub API is running.. ${Date.now()}` });
});

const PORT = process.env.PORT;

server.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});
