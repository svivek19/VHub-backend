import express from "express";
import protect from "../middleware/authMiddleware.js";
import { getConversations } from "../controllers/conversationController.js";

const conversationRouter = express.Router();

conversationRouter.get("/", protect, getConversations);

export default conversationRouter;
