import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  deleteMessage,
  getMessages,
} from "../controllers/messageController.js";

const messageRouter = express.Router();

messageRouter.get("/:userId", protect, getMessages);
messageRouter.delete("/:messageId", protect, deleteMessage);

export default messageRouter;
