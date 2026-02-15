import express from "express";
import { getAllUsers } from "../controllers/userController.js";
import protect from "../middleware/authMiddleware.js";

const userRouter = express.Router();

userRouter.get("/", protect, getAllUsers);

export default userRouter;
