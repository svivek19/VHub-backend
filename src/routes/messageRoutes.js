import express from "express";
import protect from "../middleware/authMiddleware.js";
import { getMessages } from "../controllers/messageController.js";

const messageRouter = express.Router();

messageRouter.get("/:userId", protect, getMessages);

export default messageRouter;
